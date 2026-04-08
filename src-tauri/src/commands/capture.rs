use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use uuid::Uuid;
use xcap::{Monitor, Window};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CaptureRegionArgs {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

/// Write an xcap image buffer to a temp PNG file and return the path.
fn save_to_temp(img: &xcap::image::RgbaImage, app: &AppHandle) -> Result<String, String> {
    let temp_dir = app
        .path()
        .temp_dir()
        .map_err(|e| format!("Failed to get temp dir: {e}"))?;
    let filename = format!("screenshot-{}.png", Uuid::new_v4());
    let path: PathBuf = temp_dir.join(filename);

    let file =
        std::fs::File::create(&path).map_err(|e| format!("Failed to create temp file: {e}"))?;
    let writer = std::io::BufWriter::new(file);

    image::codecs::png::PngEncoder::new(writer)
        .write_image(
            img.as_raw(),
            img.width(),
            img.height(),
            image::ExtendedColorType::Rgba8,
        )
        .map_err(|e| format!("Failed to encode PNG: {e}"))?;

    path.to_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "Invalid temp path encoding".to_string())
}

/// Find the primary monitor, falling back to the first available.
fn get_primary_monitor() -> Result<Monitor, String> {
    let monitors = Monitor::all().map_err(|e| format!("Failed to list monitors: {e}"))?;
    for m in &monitors {
        if m.is_primary().unwrap_or(false) {
            return Ok(m.clone());
        }
    }
    monitors
        .into_iter()
        .next()
        .ok_or_else(|| "No monitor found".to_string())
}

/// Capture the primary monitor. Returns absolute path to a temp PNG file.
#[tauri::command]
pub async fn capture_fullscreen(app: AppHandle) -> Result<String, String> {
    let monitor = get_primary_monitor()?;
    let img = monitor
        .capture_image()
        .map_err(|e| format!("Failed to capture screen: {e}"))?;
    save_to_temp(&img, &app)
}

/// Capture a specific region (physical pixel coordinates).
/// Returns absolute path to a temp PNG file.
#[tauri::command]
pub async fn capture_region(app: AppHandle, args: CaptureRegionArgs) -> Result<String, String> {
    if args.width == 0 || args.height == 0 {
        return Err("Region width and height must be greater than zero".to_string());
    }

    let monitor = get_primary_monitor()?;
    let full = monitor
        .capture_image()
        .map_err(|e| format!("Failed to capture screen: {e}"))?;

    let x = args.x.max(0) as u32;
    let y = args.y.max(0) as u32;
    let w = args.width.min(full.width().saturating_sub(x));
    let h = args.height.min(full.height().saturating_sub(y));

    let cropped = image::imageops::crop_imm(&full, x, y, w, h).to_image();
    save_to_temp(&cropped, &app)
}

/// Return metadata for all capturable windows.
#[tauri::command]
pub async fn list_windows() -> Result<Vec<WindowInfo>, String> {
    let windows = Window::all().map_err(|e| format!("Failed to list windows: {e}"))?;

    let mut result = Vec::new();
    for w in windows {
        let title = w.title().unwrap_or_default();
        if title.is_empty() {
            continue;
        }
        result.push(WindowInfo {
            id: w.id().unwrap_or(0),
            title,
            app_name: w.app_name().unwrap_or_default(),
        });
    }
    Ok(result)
}

/// Capture a specific window by ID. Returns path to temp PNG file.
#[tauri::command]
pub async fn capture_window(app: AppHandle, window_id: u32) -> Result<String, String> {
    let windows = Window::all().map_err(|e| format!("Failed to list windows: {e}"))?;
    let window = windows
        .into_iter()
        .find(|w| w.id().unwrap_or(0) == window_id)
        .ok_or_else(|| format!("Window with ID {window_id} not found"))?;

    let img = window
        .capture_image()
        .map_err(|e| format!("Failed to capture window: {e}"))?;

    save_to_temp(&img, &app)
}

/// Check Screen Recording permission (macOS only, always true on other platforms).
#[tauri::command]
pub async fn check_screen_permission() -> Result<bool, String> {
    #[cfg(target_os = "macos")]
    {
        match Monitor::all() {
            Ok(monitors) => {
                if let Some(m) = monitors.into_iter().next() {
                    match m.capture_image() {
                        Ok(_) => Ok(true),
                        Err(_) => Ok(false),
                    }
                } else {
                    Ok(false)
                }
            }
            Err(_) => Ok(false),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Ok(true)
    }
}
