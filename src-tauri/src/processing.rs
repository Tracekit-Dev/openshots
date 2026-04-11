use image::{ImageBuffer, ImageEncoder, Rgba, RgbaImage};
use std::path::Path;

/// Preset structure matching the frontend CanvasPreset JSON shape.
#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliPreset {
    pub name: String,
    pub canvas_width: u32,
    pub canvas_height: u32,
    pub padding: u32,
    pub background: CliBackground,
    pub corner_radius: u32,
    pub shadow_enabled: bool,
    pub shadow_blur: u32,
    pub shadow_offset_y: i32,
    pub inset_border_enabled: bool,
    pub inset_border_width: u32,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CliBackground {
    pub bg_type: String,
    pub color: Option<String>,
    pub gradient_start: Option<String>,
    pub gradient_end: Option<String>,
    pub gradient_angle: Option<f64>,
}

/// Privacy region for blur/pixelate operations.
#[derive(Debug, Clone, serde::Deserialize)]
pub struct PrivacyRegion {
    pub region_type: String,
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub intensity: u32,
}

/// Apply pixelation to a rectangular region of the image.
fn pixelate_region(img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>, x: u32, y: u32, w: u32, h: u32, block_size: u32) {
    let block = block_size.max(1);
    let (img_w, img_h) = img.dimensions();

    let mut by = y;
    while by < (y + h).min(img_h) {
        let mut bx = x;
        while bx < (x + w).min(img_w) {
            let bw = block.min((x + w).min(img_w) - bx);
            let bh = block.min((y + h).min(img_h) - by);

            // Average the block
            let mut r_sum: u64 = 0;
            let mut g_sum: u64 = 0;
            let mut b_sum: u64 = 0;
            let mut a_sum: u64 = 0;
            let mut count: u64 = 0;

            for py in by..by + bh {
                for px in bx..bx + bw {
                    let p = img.get_pixel(px, py);
                    r_sum += p[0] as u64;
                    g_sum += p[1] as u64;
                    b_sum += p[2] as u64;
                    a_sum += p[3] as u64;
                    count += 1;
                }
            }

            if count > 0 {
                let avg = Rgba([
                    (r_sum / count) as u8,
                    (g_sum / count) as u8,
                    (b_sum / count) as u8,
                    (a_sum / count) as u8,
                ]);
                for py in by..by + bh {
                    for px in bx..bx + bw {
                        img.put_pixel(px, py, avg);
                    }
                }
            }

            bx += block;
        }
        by += block;
    }
}

/// Apply privacy regions (blur/pixelate) to an image.
pub fn apply_privacy_regions(
    img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>,
    regions: &[PrivacyRegion],
    scale: f64,
) {
    for region in regions {
        let x = (region.x as f64 * scale) as u32;
        let y = (region.y as f64 * scale) as u32;
        let w = (region.width as f64 * scale) as u32;
        let h = (region.height as f64 * scale) as u32;
        let block_size = region.intensity.max(4);
        pixelate_region(img, x, y, w, h, block_size);
    }
}

/// Scale an image by an integer factor using Lanczos3 resampling.
pub fn scale_image(
    img: ImageBuffer<Rgba<u8>, Vec<u8>>,
    scale: u32,
) -> (ImageBuffer<Rgba<u8>, Vec<u8>>, u32, u32) {
    if scale <= 1 {
        let w = img.width();
        let h = img.height();
        return (img, w, h);
    }
    let new_w = img.width() * scale;
    let new_h = img.height() * scale;
    let resized = image::imageops::resize(&img, new_w, new_h, image::imageops::FilterType::Lanczos3);
    (resized, new_w, new_h)
}

/// Encode an RGBA image to a file in the specified format (png, jpeg, webp).
pub fn encode_to_file(
    img: &ImageBuffer<Rgba<u8>, Vec<u8>>,
    path: &Path,
    format: &str,
    quality: u32,
) -> Result<(), String> {
    let w = img.width();
    let h = img.height();
    let file = std::fs::File::create(path).map_err(|e| format!("Failed to create file: {e}"))?;
    let writer = std::io::BufWriter::new(file);

    match format {
        "png" => {
            image::codecs::png::PngEncoder::new(writer)
                .write_image(img.as_raw(), w, h, image::ExtendedColorType::Rgba8)
                .map_err(|e| format!("PNG encoding failed: {e}"))?;
        }
        "jpeg" | "jpg" => {
            let rgb_img = image::DynamicImage::ImageRgba8(img.clone()).to_rgb8();
            image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality as u8)
                .write_image(rgb_img.as_raw(), w, h, image::ExtendedColorType::Rgb8)
                .map_err(|e| format!("JPEG encoding failed: {e}"))?;
        }
        "webp" => {
            image::codecs::webp::WebPEncoder::new_lossless(writer)
                .write_image(img.as_raw(), w, h, image::ExtendedColorType::Rgba8)
                .map_err(|e| format!("WebP encoding failed: {e}"))?;
        }
        _ => return Err(format!("Unsupported format: {format}")),
    }

    Ok(())
}

/// Parse a hex color string (#RRGGBB or #RRGGBBAA) into an Rgba pixel.
fn parse_hex_color(hex: &str) -> Result<Rgba<u8>, String> {
    let hex = hex.trim_start_matches('#');
    match hex.len() {
        6 => {
            let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
            let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
            let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;
            Ok(Rgba([r, g, b, 255]))
        }
        8 => {
            let r = u8::from_str_radix(&hex[0..2], 16).map_err(|e| e.to_string())?;
            let g = u8::from_str_radix(&hex[2..4], 16).map_err(|e| e.to_string())?;
            let b = u8::from_str_radix(&hex[4..6], 16).map_err(|e| e.to_string())?;
            let a = u8::from_str_radix(&hex[6..8], 16).map_err(|e| e.to_string())?;
            Ok(Rgba([r, g, b, a]))
        }
        _ => Err(format!("Invalid hex color: #{hex}")),
    }
}

/// Linearly interpolate between two Rgba colors.
fn lerp_color(a: Rgba<u8>, b: Rgba<u8>, t: f64) -> Rgba<u8> {
    let t = t.clamp(0.0, 1.0);
    Rgba([
        (a[0] as f64 * (1.0 - t) + b[0] as f64 * t) as u8,
        (a[1] as f64 * (1.0 - t) + b[1] as f64 * t) as u8,
        (a[2] as f64 * (1.0 - t) + b[2] as f64 * t) as u8,
        (a[3] as f64 * (1.0 - t) + b[3] as f64 * t) as u8,
    ])
}

/// Fill a canvas with a background based on the preset configuration.
fn fill_background(canvas: &mut RgbaImage, bg: &CliBackground) {
    let (w, h) = canvas.dimensions();
    match bg.bg_type.as_str() {
        "solid" => {
            let color = bg
                .color
                .as_deref()
                .and_then(|c| parse_hex_color(c).ok())
                .unwrap_or(Rgba([255, 255, 255, 255]));
            for pixel in canvas.pixels_mut() {
                *pixel = color;
            }
        }
        "gradient" => {
            let start = bg
                .gradient_start
                .as_deref()
                .and_then(|c| parse_hex_color(c).ok())
                .unwrap_or(Rgba([0, 0, 0, 255]));
            let end = bg
                .gradient_end
                .as_deref()
                .and_then(|c| parse_hex_color(c).ok())
                .unwrap_or(Rgba([255, 255, 255, 255]));
            let angle_deg = bg.gradient_angle.unwrap_or(180.0);
            let angle_rad = angle_deg.to_radians();
            let cos_a = angle_rad.cos();
            let sin_a = angle_rad.sin();
            // Project each pixel onto the gradient direction
            let cx = w as f64 / 2.0;
            let cy = h as f64 / 2.0;
            let max_proj = (cx * cos_a.abs() + cy * sin_a.abs()).max(1.0);

            for y in 0..h {
                for x in 0..w {
                    let dx = x as f64 - cx;
                    let dy = y as f64 - cy;
                    let proj = dx * cos_a + dy * sin_a;
                    let t = (proj / max_proj + 1.0) / 2.0;
                    canvas.put_pixel(x, y, lerp_color(start, end, t));
                }
            }
        }
        _ => {
            // Fallback: white background for unsupported types (mesh, image)
            for pixel in canvas.pixels_mut() {
                *pixel = Rgba([255, 255, 255, 255]);
            }
        }
    }
}

/// Apply rounded corner alpha mask to an image in-place.
fn apply_corner_radius(img: &mut RgbaImage, radius: u32) {
    if radius == 0 {
        return;
    }
    let (w, h) = img.dimensions();
    let r = radius.min(w / 2).min(h / 2) as f64;

    // Process four corners
    let corners: [(u32, u32); 4] = [
        (0, 0),                    // top-left
        (w.saturating_sub(radius.min(w)), 0), // top-right
        (0, h.saturating_sub(radius.min(h))), // bottom-left
        (w.saturating_sub(radius.min(w)), h.saturating_sub(radius.min(h))), // bottom-right
    ];
    let centers: [(f64, f64); 4] = [
        (r, r),
        (w as f64 - r, r),
        (r, h as f64 - r),
        (w as f64 - r, h as f64 - r),
    ];

    for (corner_idx, (cx, cy)) in centers.iter().enumerate() {
        let (sx, sy) = corners[corner_idx];
        let ex = (sx + radius.min(w)).min(w);
        let ey = (sy + radius.min(h)).min(h);
        for y in sy..ey {
            for x in sx..ex {
                let dx = x as f64 - cx;
                let dy = y as f64 - cy;
                // Only process pixels outside the circle
                let check_x = match corner_idx {
                    0 | 2 => dx < 0.0,
                    _ => dx > 0.0,
                };
                let check_y = match corner_idx {
                    0 | 1 => dy < 0.0,
                    _ => dy > 0.0,
                };
                if check_x || check_y {
                    let dist = (dx * dx + dy * dy).sqrt();
                    if dist > r {
                        let p = img.get_pixel_mut(x, y);
                        p[3] = 0; // Fully transparent outside radius
                    } else if dist > r - 1.0 {
                        // Anti-alias the edge
                        let alpha = (r - dist).clamp(0.0, 1.0);
                        let p = img.get_pixel_mut(x, y);
                        p[3] = (p[3] as f64 * alpha) as u8;
                    }
                }
            }
        }
    }
}

/// Render a simple shadow (darkened, offset rectangle behind the image).
fn render_shadow(
    canvas: &mut RgbaImage,
    img_x: u32,
    img_y: u32,
    img_w: u32,
    img_h: u32,
    blur: u32,
    offset_y: i32,
) {
    let (cw, ch) = canvas.dimensions();
    let shadow_alpha: u8 = 60; // Subtle shadow
    let spread = blur as i32;

    let sx_start = (img_x as i32 - spread).max(0) as u32;
    let sy_start = (img_y as i32 - spread + offset_y).max(0) as u32;
    let sx_end = ((img_x + img_w) as i32 + spread).min(cw as i32) as u32;
    let sy_end = ((img_y + img_h) as i32 + spread + offset_y).min(ch as i32) as u32;

    for y in sy_start..sy_end {
        for x in sx_start..sx_end {
            // Distance from image rect
            let dx = if x < img_x {
                img_x - x
            } else if x >= img_x + img_w {
                x - (img_x + img_w) + 1
            } else {
                0
            };
            let dy_val = (y as i32 - offset_y) as u32;
            let dy = if dy_val < img_y {
                img_y - dy_val
            } else if dy_val >= img_y + img_h {
                dy_val - (img_y + img_h) + 1
            } else {
                0
            };
            let dist = ((dx * dx + dy * dy) as f64).sqrt();
            let alpha = if dist == 0.0 {
                shadow_alpha as f64
            } else if dist < blur as f64 {
                shadow_alpha as f64 * (1.0 - dist / blur as f64)
            } else {
                0.0
            };
            if alpha > 0.0 {
                let p = canvas.get_pixel(x, y);
                // Blend shadow (black with alpha) onto existing pixel
                let sa = alpha / 255.0;
                let r = (p[0] as f64 * (1.0 - sa)) as u8;
                let g = (p[1] as f64 * (1.0 - sa)) as u8;
                let b = (p[2] as f64 * (1.0 - sa)) as u8;
                canvas.put_pixel(x, y, Rgba([r, g, b, p[3]]));
            }
        }
    }
}

/// Draw an inset border on an image.
fn draw_inset_border(img: &mut RgbaImage, border_width: u32) {
    if border_width == 0 {
        return;
    }
    let (w, h) = img.dimensions();
    let border_color = Rgba([255, 255, 255, 40]); // Subtle white inset

    for y in 0..h {
        for x in 0..w {
            if x < border_width || x >= w - border_width || y < border_width || y >= h - border_width
            {
                let p = img.get_pixel(x, y);
                // Alpha blend the border
                let ba = border_color[3] as f64 / 255.0;
                let r = (border_color[0] as f64 * ba + p[0] as f64 * (1.0 - ba)) as u8;
                let g = (border_color[1] as f64 * ba + p[1] as f64 * (1.0 - ba)) as u8;
                let b = (border_color[2] as f64 * ba + p[2] as f64 * (1.0 - ba)) as u8;
                let a = (p[3] as f64 + border_color[3] as f64 * (1.0 - p[3] as f64 / 255.0)) as u8;
                img.put_pixel(x, y, Rgba([r, g, b, a]));
            }
        }
    }
}

/// Compose an image with a preset (background, padding, shadow, border, corner radius)
/// and write the result to the output path.
pub fn compose_with_preset(
    input_path: &Path,
    preset: &CliPreset,
    output_path: &Path,
    format: &str,
    quality: u32,
) -> Result<(), String> {
    // Load input image
    let input_img = image::open(input_path)
        .map_err(|e| format!("Failed to open {}: {e}", input_path.display()))?
        .to_rgba8();

    let (src_w, src_h) = input_img.dimensions();

    // Calculate canvas and image placement
    let canvas_w = preset.canvas_width;
    let canvas_h = preset.canvas_height;
    let padding = preset.padding;

    // Scale image to fit within canvas minus padding
    let available_w = canvas_w.saturating_sub(padding * 2);
    let available_h = canvas_h.saturating_sub(padding * 2);

    let scale_x = available_w as f64 / src_w as f64;
    let scale_y = available_h as f64 / src_h as f64;
    let scale = scale_x.min(scale_y).min(1.0); // Don't upscale

    let img_w = (src_w as f64 * scale) as u32;
    let img_h = (src_h as f64 * scale) as u32;

    let scaled_img = if scale < 1.0 {
        image::imageops::resize(
            &input_img,
            img_w,
            img_h,
            image::imageops::FilterType::Lanczos3,
        )
    } else {
        input_img.clone()
    };

    // Apply corner radius to the screenshot
    let mut rounded_img = scaled_img;
    apply_corner_radius(&mut rounded_img, preset.corner_radius);

    // Apply inset border
    if preset.inset_border_enabled {
        draw_inset_border(&mut rounded_img, preset.inset_border_width);
    }

    // Create canvas with background
    let mut canvas = RgbaImage::new(canvas_w, canvas_h);
    fill_background(&mut canvas, &preset.background);

    // Center the image on the canvas
    let img_x = (canvas_w.saturating_sub(img_w)) / 2;
    let img_y = (canvas_h.saturating_sub(img_h)) / 2;

    // Render shadow if enabled
    if preset.shadow_enabled {
        render_shadow(
            &mut canvas,
            img_x,
            img_y,
            img_w,
            img_h,
            preset.shadow_blur,
            preset.shadow_offset_y,
        );
    }

    // Overlay the screenshot onto the canvas
    image::imageops::overlay(&mut canvas, &rounded_img, img_x as i64, img_y as i64);

    // Encode output
    encode_to_file(&canvas, output_path, format, quality)
}
