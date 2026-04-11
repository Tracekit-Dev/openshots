use image::{ImageBuffer, ImageEncoder, Rgba};
use std::path::PathBuf;

/// Export raw RGBA image data to a file in the specified format.
/// The save dialog is handled on the frontend via @tauri-apps/plugin-dialog.
#[tauri::command]
pub async fn export_image(
    image_data: Vec<u8>,
    width: u32,
    height: u32,
    output_path: String,
    format: String,
    quality: u32,
    scale: u32,
) -> Result<String, String> {
    let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(width, height, image_data)
            .ok_or_else(|| "Invalid image data dimensions".to_string())?;

    let (final_img, final_w, final_h) = if scale > 1 {
        let new_w = width * scale;
        let new_h = height * scale;
        let resized = image::imageops::resize(
            &img,
            new_w,
            new_h,
            image::imageops::FilterType::Lanczos3,
        );
        (resized, new_w, new_h)
    } else {
        (img, width, height)
    };

    let path = PathBuf::from(&output_path);
    let file =
        std::fs::File::create(&path).map_err(|e| format!("Failed to create file: {e}"))?;
    let writer = std::io::BufWriter::new(file);

    match format.as_str() {
        "png" => {
            image::codecs::png::PngEncoder::new(writer)
                .write_image(
                    final_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| format!("PNG encoding failed: {e}"))?;
        }
        "jpeg" | "jpg" => {
            let rgb_img = image::DynamicImage::ImageRgba8(final_img).to_rgb8();
            image::codecs::jpeg::JpegEncoder::new_with_quality(writer, quality as u8)
                .write_image(
                    rgb_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgb8,
                )
                .map_err(|e| format!("JPEG encoding failed: {e}"))?;
        }
        "webp" => {
            image::codecs::webp::WebPEncoder::new_lossless(writer)
                .write_image(
                    final_img.as_raw(),
                    final_w,
                    final_h,
                    image::ExtendedColorType::Rgba8,
                )
                .map_err(|e| format!("WebP encoding failed: {e}"))?;
        }
        _ => return Err(format!("Unsupported format: {format}")),
    }

    Ok(output_path)
}

/// Write a text string to a file at the given path.
/// Used by the frontend to save project files (.openshots JSON).
#[tauri::command]
pub async fn save_text_file(path: String, contents: String) -> Result<String, String> {
    std::fs::write(&path, contents.as_bytes())
        .map_err(|e| format!("Failed to write file: {e}"))?;
    Ok(path)
}

/// Read a text file and return its contents as a string.
/// Used by the frontend to load project files (.openshots JSON).
#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read file: {e}"))
}
