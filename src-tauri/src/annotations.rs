use ab_glyph::{FontRef, PxScale};
use image::{Rgba, RgbaImage};
use imageproc::drawing::{
    draw_filled_ellipse_mut, draw_filled_rect_mut, draw_hollow_ellipse_mut,
    draw_hollow_rect_mut, draw_text_mut,
};
use imageproc::rect::Rect;

use crate::processing::parse_hex_color;

const DEFAULT_FONT_BYTES: &[u8] = include_bytes!("fonts/Inter-Regular.ttf");

/// Annotation types matching the frontend AnnotationShape union, dispatched by "type" field.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum CliAnnotation {
    #[serde(rename = "text")]
    Text {
        x: f64,
        y: f64,
        text: String,
        #[serde(default = "default_font_size")]
        font_size: f64,
        #[serde(default = "default_fill")]
        fill: String,
        #[serde(default = "default_stroke")]
        stroke: String,
        #[serde(default = "default_opacity")]
        opacity: f64,
        #[serde(default)]
        width: Option<f64>,
    },
    #[serde(rename = "rectangle")]
    Rectangle {
        x: f64,
        y: f64,
        width: f64,
        height: f64,
        #[serde(default = "default_stroke")]
        stroke: String,
        #[serde(default = "default_stroke_width")]
        stroke_width: f64,
        #[serde(default)]
        fill: Option<String>,
        #[serde(default = "default_opacity")]
        opacity: f64,
    },
    #[serde(rename = "ellipse")]
    Ellipse {
        x: f64,
        y: f64,
        radius_x: f64,
        radius_y: f64,
        #[serde(default = "default_stroke")]
        stroke: String,
        #[serde(default = "default_stroke_width")]
        stroke_width: f64,
        #[serde(default)]
        fill: Option<String>,
        #[serde(default = "default_opacity")]
        opacity: f64,
    },
    #[serde(rename = "arrow")]
    Arrow {
        points: Vec<f64>,
        #[serde(default = "default_stroke")]
        stroke: String,
        #[serde(default = "default_stroke_width")]
        stroke_width: f64,
        #[serde(default = "default_opacity")]
        opacity: f64,
    },
    /// Unsupported annotation types (speechBubble, spotlight, emoji, callout) are skipped.
    #[serde(other)]
    Unsupported,
}

fn default_font_size() -> f64 {
    24.0
}
fn default_fill() -> String {
    "#000000".to_string()
}
fn default_stroke() -> String {
    "#ff0000".to_string()
}
fn default_stroke_width() -> f64 {
    2.0
}
fn default_opacity() -> f64 {
    1.0
}

/// Draw a thick anti-aliased line by drawing multiple parallel lines.
fn draw_thick_line(
    img: &mut RgbaImage,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    thickness: f32,
    color: Rgba<u8>,
) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len = (dx * dx + dy * dy).sqrt();
    if len < 0.001 {
        return;
    }
    // Normal perpendicular to line direction
    let nx = -dy / len;
    let ny = dx / len;

    let half = thickness / 2.0;
    let steps = (half.ceil() as i32).max(1);

    for i in -steps..=steps {
        let offset = i as f32 * half / steps as f32;
        let ox = nx * offset;
        let oy = ny * offset;
        imageproc::drawing::draw_antialiased_line_segment_mut(
            img,
            ((x1 + ox) as i32, (y1 + oy) as i32),
            ((x2 + ox) as i32, (y2 + oy) as i32),
            color,
            imageproc::pixelops::interpolate,
        );
    }
}

/// Draw an arrowhead at the end of a line.
fn draw_arrowhead(
    img: &mut RgbaImage,
    x1: f32,
    y1: f32,
    x2: f32,
    y2: f32,
    head_size: f32,
    color: Rgba<u8>,
) {
    let dx = x2 - x1;
    let dy = y2 - y1;
    let len = (dx * dx + dy * dy).sqrt();
    if len < 0.001 {
        return;
    }
    let ux = dx / len;
    let uy = dy / len;

    // Two points at the base of the arrowhead
    let base_x = x2 - ux * head_size;
    let base_y = y2 - uy * head_size;
    let perp_x = -uy * head_size * 0.4;
    let perp_y = ux * head_size * 0.4;

    let p1 = (base_x + perp_x, base_y + perp_y);
    let p2 = (base_x - perp_x, base_y - perp_y);

    // Draw two lines forming the arrowhead
    draw_thick_line(img, p1.0, p1.1, x2, y2, 2.0, color);
    draw_thick_line(img, p2.0, p2.1, x2, y2, 2.0, color);
    draw_thick_line(img, p1.0, p1.1, p2.0, p2.1, 2.0, color);
}

/// Render annotations onto an image buffer.
pub fn render_annotations(img: &mut RgbaImage, annotations: &[CliAnnotation]) -> Result<(), String> {
    let font = FontRef::try_from_slice(DEFAULT_FONT_BYTES)
        .map_err(|e| format!("Failed to load embedded font: {e}"))?;

    for annotation in annotations {
        match annotation {
            CliAnnotation::Text {
                x,
                y,
                text,
                font_size,
                fill,
                opacity,
                ..
            } => {
                let color = parse_hex_color(fill).unwrap_or(Rgba([0, 0, 0, 255]));
                let alpha = (*opacity * color[3] as f64) as u8;
                let color = Rgba([color[0], color[1], color[2], alpha]);
                let scale = PxScale::from(*font_size as f32);
                draw_text_mut(img, color, *x as i32, *y as i32, scale, &font, text);
            }

            CliAnnotation::Rectangle {
                x,
                y,
                width,
                height,
                stroke,
                stroke_width,
                fill,
                opacity,
            } => {
                let rect_x = *x as i32;
                let rect_y = *y as i32;
                let rect_w = *width as u32;
                let rect_h = *height as u32;

                if rect_w == 0 || rect_h == 0 {
                    continue;
                }

                // Fill if specified
                if let Some(fill_color) = fill {
                    if let Ok(mut fc) = parse_hex_color(fill_color) {
                        fc[3] = (*opacity * fc[3] as f64) as u8;
                        let rect = Rect::at(rect_x, rect_y).of_size(rect_w, rect_h);
                        draw_filled_rect_mut(img, rect, fc);
                    }
                }

                // Stroke
                if *stroke_width > 0.0 {
                    if let Ok(mut sc) = parse_hex_color(stroke) {
                        sc[3] = (*opacity * sc[3] as f64) as u8;
                        let rect = Rect::at(rect_x, rect_y).of_size(rect_w, rect_h);
                        draw_hollow_rect_mut(img, rect, sc);
                    }
                }
            }

            CliAnnotation::Ellipse {
                x,
                y,
                radius_x,
                radius_y,
                stroke,
                stroke_width,
                fill,
                opacity,
            } => {
                let cx = *x as i32;
                let cy = *y as i32;
                let rx = *radius_x as i32;
                let ry = *radius_y as i32;

                if rx == 0 || ry == 0 {
                    continue;
                }

                // Fill if specified
                if let Some(fill_color) = fill {
                    if let Ok(mut fc) = parse_hex_color(fill_color) {
                        fc[3] = (*opacity * fc[3] as f64) as u8;
                        draw_filled_ellipse_mut(img, (cx, cy), rx, ry, fc);
                    }
                }

                // Stroke
                if *stroke_width > 0.0 {
                    if let Ok(mut sc) = parse_hex_color(stroke) {
                        sc[3] = (*opacity * sc[3] as f64) as u8;
                        draw_hollow_ellipse_mut(img, (cx, cy), rx, ry, sc);
                    }
                }
            }

            CliAnnotation::Arrow {
                points,
                stroke,
                stroke_width,
                opacity,
            } => {
                if points.len() < 4 {
                    continue;
                }

                let mut color = parse_hex_color(stroke).unwrap_or(Rgba([255, 0, 0, 255]));
                color[3] = (*opacity * color[3] as f64) as u8;

                // Draw line segments between consecutive point pairs
                let pairs: Vec<(f32, f32)> = points
                    .chunks(2)
                    .filter(|c| c.len() == 2)
                    .map(|c| (c[0] as f32, c[1] as f32))
                    .collect();

                for window in pairs.windows(2) {
                    let (x1, y1) = window[0];
                    let (x2, y2) = window[1];
                    draw_thick_line(img, x1, y1, x2, y2, *stroke_width as f32, color);
                }

                // Draw arrowhead at the last point
                if pairs.len() >= 2 {
                    let (x1, y1) = pairs[pairs.len() - 2];
                    let (x2, y2) = pairs[pairs.len() - 1];
                    let head_size = *stroke_width as f32 * 5.0;
                    draw_arrowhead(img, x1, y1, x2, y2, head_size, color);
                }
            }

            CliAnnotation::Unsupported => {
                eprintln!("Warning: skipping unsupported annotation type");
            }
        }
    }

    Ok(())
}

/// Simple text watermark helper for the annotate CLI command.
pub fn render_text_watermark(
    img: &mut RgbaImage,
    text: &str,
    x: i32,
    y: i32,
    font_size: f32,
    color: Rgba<u8>,
) -> Result<(), String> {
    let font = FontRef::try_from_slice(DEFAULT_FONT_BYTES)
        .map_err(|e| format!("Failed to load embedded font: {e}"))?;
    let scale = PxScale::from(font_size);
    draw_text_mut(img, color, x, y, scale, &font, text);
    Ok(())
}
