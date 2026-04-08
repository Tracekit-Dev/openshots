use tauri::{Emitter, Manager};

mod commands;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlatformFlags {
    pub is_wayland: bool,
}

pub fn run() {
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(PlatformFlags { is_wayland })
        .setup(move |app| {
            let handle = app.handle();
            let flags = PlatformFlags { is_wayland };
            handle.emit("platform:flags", &flags)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::capture::capture_fullscreen,
            commands::capture::capture_region,
            commands::capture::list_windows,
            commands::capture::capture_window,
            commands::capture::check_screen_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
