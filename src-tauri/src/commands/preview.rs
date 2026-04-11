use tauri::{AppHandle, Emitter, Manager};

/// Show the floating capture preview window with the given image data URL.
/// Creates the window if it doesn't exist, or re-uses the existing one.
#[tauri::command]
pub async fn show_capture_preview(app: AppHandle, image_data_url: String) -> Result<(), String> {
    let label = "preview";

    // If the window already exists, just emit the event and show it
    if let Some(win) = app.get_webview_window(label) {
        let _ = app.emit_to(label, "preview:show", &image_data_url);
        let _ = win.show();
        return Ok(());
    }

    // Calculate bottom-right position based on primary monitor
    let (pos_x, pos_y) = match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let size = monitor.size();
            let scale = monitor.scale_factor();
            let logical_w = size.width as f64 / scale;
            let logical_h = size.height as f64 / scale;
            (logical_w as i32 - 240, logical_h as i32 - 200)
        }
        _ => (1200, 800), // Fallback position
    };

    // Create the preview window dynamically
    let _win = tauri::WebviewWindowBuilder::new(
        &app,
        label,
        tauri::WebviewUrl::App("index-preview.html".into()),
    )
    .title("OpenShots Preview")
    .inner_size(220.0, 170.0)
    .position(pos_x as f64, pos_y as f64)
    .decorations(false)
    .always_on_top(true)
    .resizable(false)
    .skip_taskbar(true)
    .focused(false)
    .build()
    .map_err(|e| format!("Failed to create preview window: {}", e))?;

    // Emit the image data after a short delay to let the window initialize
    let app_clone = app.clone();
    let data = image_data_url.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(500));
        let _ = app_clone.emit_to("preview", "preview:show", &data);
    });

    Ok(())
}

/// Dismiss (close) the preview window. Silently succeeds if window doesn't exist.
#[tauri::command]
pub async fn dismiss_preview(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window("preview") {
        win.close().map_err(|e| format!("Failed to close preview: {}", e))?;
    }
    Ok(())
}
