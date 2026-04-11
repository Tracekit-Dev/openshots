use crate::annotations::{render_annotations, CliAnnotation};
use crate::processing::{self, CliBackground, PrivacyRegion};
use base64::engine::general_purpose::STANDARD;
use base64::Engine as _;
use image::RgbaImage;
use std::path::Path;

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub version: u32,
    pub canvas: ProjectCanvas,
    pub images: Vec<ProjectImage>,
    #[serde(default)]
    pub annotations: Vec<serde_json::Value>,
    #[serde(default)]
    pub privacy_regions: Vec<ProjectPrivacyRegion>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectCanvas {
    pub width: u32,
    pub height: u32,
    pub padding: u32,
    pub background: ProjectBackground,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectBackground {
    #[serde(rename = "type")]
    pub bg_type: String,
    #[serde(default)]
    pub color: String,
    #[serde(default)]
    pub gradient_colors: Vec<String>,
    #[serde(default)]
    pub gradient_angle: f64,
    #[serde(default)]
    pub image_src: Option<String>,
    #[serde(default)]
    pub blur: f64,
    #[serde(default)]
    pub grain: f64,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectImage {
    pub id: String,
    pub src: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default)]
    pub rotation: f64,
    #[serde(default)]
    pub corner_radius: f64,
    #[serde(default)]
    pub flip_x: bool,
    #[serde(default)]
    pub flip_y: bool,
}

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectPrivacyRegion {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
    #[serde(default = "default_intensity")]
    pub intensity: u32,
}

fn default_intensity() -> u32 {
    12
}

/// Load an image from a data URL or file path.
fn load_image_from_src(src: &str) -> Result<RgbaImage, String> {
    if src.starts_with("data:") {
        // Data URL: split on comma, base64-decode
        let parts: Vec<&str> = src.splitn(2, ',').collect();
        if parts.len() != 2 {
            return Err("Invalid data URL: missing comma separator".to_string());
        }
        let bytes = STANDARD
            .decode(parts[1])
            .map_err(|e| format!("Base64 decode failed: {e}"))?;
        let img = image::load_from_memory(&bytes)
            .map_err(|e| format!("Failed to decode image from data URL: {e}"))?;
        Ok(img.to_rgba8())
    } else {
        // File path
        let img = image::open(src).map_err(|e| format!("Failed to open image '{}': {e}", src))?;
        Ok(img.to_rgba8())
    }
}

/// Convert project background to CLI background for reuse of fill_background.
fn project_bg_to_cli_bg(bg: &ProjectBackground) -> CliBackground {
    match bg.bg_type.as_str() {
        "solid" => CliBackground {
            bg_type: "solid".to_string(),
            color: Some(if bg.color.is_empty() {
                "#ffffff".to_string()
            } else {
                bg.color.clone()
            }),
            gradient_start: None,
            gradient_end: None,
            gradient_angle: None,
        },
        "linear-gradient" | "gradient" => {
            let start = bg.gradient_colors.first().cloned();
            let end = bg.gradient_colors.get(1).cloned();
            CliBackground {
                bg_type: "gradient".to_string(),
                color: None,
                gradient_start: start.or_else(|| Some("#000000".to_string())),
                gradient_end: end.or_else(|| Some("#ffffff".to_string())),
                gradient_angle: Some(bg.gradient_angle),
            }
        }
        _ => {
            // Fallback to solid white for unsupported types (mesh, image, etc.)
            CliBackground {
                bg_type: "solid".to_string(),
                color: Some("#ffffff".to_string()),
                gradient_start: None,
                gradient_end: None,
                gradient_angle: None,
            }
        }
    }
}

/// Render a .openshots project file to an image.
///
/// Parses the JSON, creates a canvas with background, composites images,
/// renders annotations, applies privacy regions, and encodes to output.
pub fn render_project_file(
    project_json: &str,
    output_path: &Path,
    format: &str,
    quality: u32,
) -> Result<(), String> {
    let project: ProjectFile = serde_json::from_str(project_json)
        .map_err(|e| format!("Failed to parse project file: {e}"))?;

    // Create canvas
    let mut canvas = RgbaImage::new(project.canvas.width, project.canvas.height);

    // Fill background
    let cli_bg = project_bg_to_cli_bg(&project.canvas.background);
    processing::fill_background(&mut canvas, &cli_bg);

    // Composite images one at a time (T-16-03 mitigation: not loading all upfront)
    for image_entry in &project.images {
        let src_img = match load_image_from_src(&image_entry.src) {
            Ok(img) => img,
            Err(e) => {
                eprintln!(
                    "Warning: Failed to load image '{}': {e}. Skipping.",
                    image_entry.id
                );
                continue;
            }
        };

        // Resize to target dimensions
        let target_w = image_entry.width as u32;
        let target_h = image_entry.height as u32;

        if target_w == 0 || target_h == 0 {
            continue;
        }

        let mut resized = image::imageops::resize(
            &src_img,
            target_w,
            target_h,
            image::imageops::FilterType::Lanczos3,
        );

        // Apply corner radius if specified
        if image_entry.corner_radius > 0.0 {
            processing::apply_corner_radius(&mut resized, image_entry.corner_radius as u32);
        }

        // Apply flip transforms
        if image_entry.flip_x {
            image::imageops::flip_horizontal_in_place(&mut resized);
        }
        if image_entry.flip_y {
            image::imageops::flip_vertical_in_place(&mut resized);
        }

        // Overlay onto canvas
        let x = image_entry.x as i64;
        let y = image_entry.y as i64;
        image::imageops::overlay(&mut canvas, &resized, x, y);
    }

    // Parse and render annotations
    let mut parsed_annotations: Vec<CliAnnotation> = Vec::new();
    for (i, value) in project.annotations.iter().enumerate() {
        match serde_json::from_value::<CliAnnotation>(value.clone()) {
            Ok(ann) => parsed_annotations.push(ann),
            Err(e) => {
                eprintln!(
                    "Warning: Failed to parse annotation {}: {e}. Skipping.",
                    i
                );
            }
        }
    }
    render_annotations(&mut canvas, &parsed_annotations)?;

    // Apply privacy regions
    if !project.privacy_regions.is_empty() {
        let regions: Vec<PrivacyRegion> = project
            .privacy_regions
            .iter()
            .map(|pr| PrivacyRegion {
                region_type: "pixelate".to_string(),
                x: pr.x as u32,
                y: pr.y as u32,
                width: pr.width as u32,
                height: pr.height as u32,
                intensity: pr.intensity,
            })
            .collect();
        processing::apply_privacy_regions(&mut canvas, &regions, 1.0);
    }

    // Encode output
    processing::encode_to_file(&canvas, output_path, format, quality)
}
