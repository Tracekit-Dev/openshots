use image::{ImageBuffer, ImageEncoder, Rgba};
use imageproc::filter::gaussian_blur_f32;
use serde::Deserialize;
use std::path::PathBuf;

#[derive(Deserialize)]
pub struct PrivacyRegionExport {
    region_type: String,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
    intensity: u32,
}

fn pixelate_region(
    img: &mut ImageBuffer<Rgba<u8>, Vec<u8>>,
    rx: u32,
    ry: u32,
    rw: u32,
    rh: u32,
    block_size: u32,
) {
    let block = block_size.max(1);
    let img_w = img.width();
    let img_h = img.height();
    let rx = rx.min(img_w.saturating_sub(1));
    let ry = ry.min(img_h.saturating_sub(1));
    let rw = rw.min(img_w.saturating_sub(rx));
    let rh = rh.min(img_h.saturating_sub(ry));

    let mut by = 0;
    while by < rh {
        let mut bx = 0;
        while bx < rw {
            let bw = block.min(rw - bx);
            let bh = block.min(rh - by);
            let (mut sr, mut sg, mut sb, mut sa) = (0u64, 0u64, 0u64, 0u64);
            let mut count = 0u64;
            for dy in 0..bh {
                for dx in 0..bw {
                    let px = img.get_pixel(rx + bx + dx, ry + by + dy);
                    sr += px[0] as u64;
                    sg += px[1] as u64;
                    sb += px[2] as u64;
                    sa += px[3] as u64;
                    count += 1;
                }
            }
            if count > 0 {
                let avg = Rgba([
                    (sr / count) as u8,
                    (sg / count) as u8,
                    (sb / count) as u8,
                    (sa / count) as u8,
                ]);
                for dy in 0..bh {
                    for dx in 0..bw {
                        img.put_pixel(rx + bx + dx, ry + by + dy, avg);
                    }
                }
            }
            bx += block;
        }
        by += block;
    }
}

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
    privacy_regions: Option<Vec<PrivacyRegionExport>>,
) -> Result<String, String> {
    let img: ImageBuffer<Rgba<u8>, Vec<u8>> =
        ImageBuffer::from_raw(width, height, image_data)
            .ok_or_else(|| "Invalid image data dimensions".to_string())?;

    let (mut final_img, final_w, final_h) = if scale > 1 {
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

    // Process privacy regions before encoding (blur/pixelate at pixel level)
    if let Some(regions) = &privacy_regions {
        for region in regions {
            let rx = region.x.min(final_w.saturating_sub(1));
            let ry = region.y.min(final_h.saturating_sub(1));
            let rw = region.width.min(final_w.saturating_sub(rx));
            let rh = region.height.min(final_h.saturating_sub(ry));

            if rw == 0 || rh == 0 {
                continue;
            }

            match region.region_type.as_str() {
                "blur" => {
                    let sigma = region.intensity as f32 / 2.0;
                    let sub =
                        image::imageops::crop_imm(&final_img, rx, ry, rw, rh).to_image();
                    let blurred = gaussian_blur_f32(&sub, sigma);
                    image::imageops::replace(&mut final_img, &blurred, rx as i64, ry as i64);
                }
                "pixelate" => {
                    pixelate_region(
                        &mut final_img,
                        rx,
                        ry,
                        rw,
                        rh,
                        8 * region.intensity,
                    );
                }
                _ => {}
            }
        }
    }

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
