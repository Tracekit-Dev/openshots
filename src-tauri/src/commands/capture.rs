use base64::Engine;
use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use xcap::{Monitor, Window};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WindowInfo {
    pub id: u32,
    pub title: String,
    pub app_name: String,
}

/// Encode an image buffer as a JPEG data URL.
/// JPEG is much smaller than PNG for screenshots (~3-5MB vs ~15-20MB for retina).
fn encode_data_url(img: &xcap::image::RgbaImage) -> Result<String, String> {
    let rgb = image::DynamicImage::ImageRgba8(img.clone()).to_rgb8();
    let mut buf = Vec::new();
    let cursor = std::io::Cursor::new(&mut buf);
    image::codecs::jpeg::JpegEncoder::new_with_quality(cursor, 90)
        .write_image(
            rgb.as_raw(),
            rgb.width(),
            rgb.height(),
            image::ExtendedColorType::Rgb8,
        )
        .map_err(|e| format!("Failed to encode JPEG: {e}"))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/jpeg;base64,{b64}"))
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

/// Hide the main window, wait for it to disappear.
fn hide_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.hide();
    }
    std::thread::sleep(std::time::Duration::from_millis(500));
}

/// Show the main window and bring it to focus.
fn show_main_window(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
}

/// Capture the primary monitor. Hides the app window first.
/// Returns a data URL (data:image/png;base64,...).
#[tauri::command]
pub async fn capture_fullscreen(app: AppHandle) -> Result<String, String> {
    hide_main_window(&app);
    let result = (|| {
        let monitor = get_primary_monitor()?;
        let img = monitor
            .capture_image()
            .map_err(|e| format!("Failed to capture screen: {e}"))?;
        encode_data_url(&img)
    })();
    show_main_window(&app);
    result
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

/// Capture a specific window by ID. Returns a data URL.
#[tauri::command]
pub async fn capture_window(_app: AppHandle, window_id: u32) -> Result<String, String> {
    let windows = Window::all().map_err(|e| format!("Failed to list windows: {e}"))?;
    let window = windows
        .into_iter()
        .find(|w| w.id().unwrap_or(0) == window_id)
        .ok_or_else(|| format!("Window with ID {window_id} not found"))?;

    let img = window
        .capture_image()
        .map_err(|e| format!("Failed to capture window: {e}"))?;

    encode_data_url(&img)
}

/// Read a local image file and return it as a data URL.
/// Used by the upload flow to bypass the asset protocol.
#[tauri::command]
pub async fn read_image_file(path: String) -> Result<String, String> {
    let bytes = std::fs::read(&path).map_err(|e| format!("Failed to read {path}: {e}"))?;

    let ext = path.rsplit('.').next().unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        _ => "image/png",
    };

    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{b64}"))
}

/// List macOS system wallpaper thumbnails. Returns (name, path) pairs.
#[tauri::command]
pub async fn list_system_wallpapers() -> Result<Vec<(String, String)>, String> {
    let thumb_dir = std::path::Path::new("/System/Library/Desktop Pictures/.thumbnails");
    if !thumb_dir.exists() {
        return Ok(Vec::new());
    }

    let mut wallpapers = Vec::new();
    let entries = std::fs::read_dir(thumb_dir).map_err(|e| e.to_string())?;
    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |ext| ext == "heic") {
            let name = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            wallpapers.push((name, path.to_string_lossy().to_string()));
        }
    }
    wallpapers.sort_by(|a, b| a.0.cmp(&b.0));
    Ok(wallpapers)
}

/// Convert a HEIC file to a small JPEG thumbnail data URL.
#[tauri::command]
pub async fn convert_heic_thumbnail(path: String) -> Result<String, String> {
    let tmp = std::env::temp_dir().join(format!("wp-thumb-{}.jpg", uuid::Uuid::new_v4()));
    let output = std::process::Command::new("sips")
        .args([
            "-s", "format", "jpeg",
            "-s", "formatOptions", "60",
            "-Z", "160",
            &path, "--out",
        ])
        .arg(tmp.as_os_str())
        .output()
        .map_err(|e| format!("Failed to run sips: {e}"))?;

    if !output.status.success() {
        return Err(format!("sips failed: {}", String::from_utf8_lossy(&output.stderr)));
    }

    let bytes = std::fs::read(&tmp).map_err(|e| format!("Failed to read thumbnail: {e}"))?;
    let _ = std::fs::remove_file(&tmp);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/jpeg;base64,{b64}"))
}

/// Convert a HEIC file to full-size JPEG data URL using macOS sips.
#[tauri::command]
pub async fn convert_heic_to_data_url(path: String) -> Result<String, String> {
    let tmp = std::env::temp_dir().join(format!("wallpaper-{}.jpg", uuid::Uuid::new_v4()));
    let output = std::process::Command::new("sips")
        .args(["-s", "format", "jpeg", "-s", "formatOptions", "80", &path, "--out"])
        .arg(tmp.as_os_str())
        .output()
        .map_err(|e| format!("Failed to run sips: {e}"))?;

    if !output.status.success() {
        return Err(format!(
            "sips failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let bytes = std::fs::read(&tmp).map_err(|e| format!("Failed to read converted file: {e}"))?;
    let _ = std::fs::remove_file(&tmp);
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:image/jpeg;base64,{b64}"))
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
