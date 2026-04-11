use crate::processing;
use image::{ImageBuffer, Rgba};
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

    let (final_img, _final_w, _final_h) = processing::scale_image(img, scale);

    let path = PathBuf::from(&output_path);
    processing::encode_to_file(&final_img, &path, &format, quality)?;

    Ok(output_path)
}
