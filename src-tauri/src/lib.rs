use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

mod commands;
pub mod processing;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct PlatformFlags {
    pub is_wayland: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct HotkeyConfig {
    pub capture_region: String,
    pub capture_fullscreen: String,
    pub capture_window: String,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            capture_region: "CommandOrControl+Shift+3".to_string(),
            capture_fullscreen: "CommandOrControl+Shift+4".to_string(),
            capture_window: "CommandOrControl+Shift+5".to_string(),
        }
    }
}

fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let capture_region =
        MenuItem::with_id(app, "capture-region", "Capture Region", true, None::<&str>)?;
    let capture_screen = MenuItem::with_id(
        app,
        "capture-screen",
        "Capture Full Screen",
        true,
        None::<&str>,
    )?;
    let capture_window_item =
        MenuItem::with_id(app, "capture-window", "Capture Window", true, None::<&str>)?;
    let sep = PredefinedMenuItem::separator(app)?;
    let settings = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit OpenShots", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &capture_region,
            &capture_screen,
            &capture_window_item,
            &sep,
            &settings,
            &quit,
        ],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "capture-region" => {
                let _ = app.emit("capture:region", ());
            }
            "capture-screen" => {
                let _ = app.emit("capture:screen", ());
            }
            "capture-window" => {
                let _ = app.emit("capture:window", ());
            }
            "settings" => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = app.emit("navigate", "/settings");
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
        })
        .build(app)?;
    Ok(())
}

fn register_shortcuts(app: &tauri::AppHandle, config: &HotkeyConfig) {
    if let Some(flags) = app.try_state::<PlatformFlags>() {
        if flags.is_wayland {
            return;
        }
    }

    let _ = app.global_shortcut().unregister_all();

    let Ok(region_sc) = config.capture_region.parse::<Shortcut>() else {
        return;
    };
    let Ok(fullscreen_sc) = config.capture_fullscreen.parse::<Shortcut>() else {
        return;
    };
    let Ok(window_sc) = config.capture_window.parse::<Shortcut>() else {
        return;
    };

    let handle = app.clone();
    let _ = app.global_shortcut().on_shortcuts(
        [region_sc, fullscreen_sc, window_sc],
        move |_app, shortcut, event| {
            if event.state() != ShortcutState::Pressed {
                return;
            }
            if shortcut == &region_sc {
                let _ = handle.emit("capture:region", ());
            } else if shortcut == &fullscreen_sc {
                let _ = handle.emit("capture:screen", ());
            } else if shortcut == &window_sc {
                let _ = handle.emit("capture:window", ());
            }
        },
    );
}

#[tauri::command]
fn update_hotkeys(app: tauri::AppHandle, config: HotkeyConfig) -> Result<(), String> {
    register_shortcuts(&app, &config);
    Ok(())
}

pub fn run() {
    let is_wayland = std::env::var("WAYLAND_DISPLAY").is_ok();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(
            tauri_plugin_window_state::Builder::default()
                .with_state_flags(tauri_plugin_window_state::StateFlags::POSITION)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .manage(PlatformFlags { is_wayland })
        .menu(|app| {
            use tauri::menu::*;
            let file_menu = SubmenuBuilder::new(app, "File")
                .item(&MenuItem::with_id(app, "file-open", "Open Project…", true, Some("CmdOrCtrl+O"))?)
                .item(&MenuItem::with_id(app, "file-save", "Save Project", true, Some("CmdOrCtrl+S"))?)
                .separator()
                .item(&MenuItem::with_id(app, "file-export", "Export…", true, Some("CmdOrCtrl+E"))?)
                .separator()
                .quit()
                .build()?;
            let edit_menu = SubmenuBuilder::new(app, "Edit")
                .undo()
                .redo()
                .separator()
                .cut()
                .copy()
                .paste()
                .select_all()
                .build()?;
            let menu = MenuBuilder::new(app)
                .item(&file_menu)
                .item(&edit_menu)
                .build()?;
            Ok(menu)
        })
        .on_menu_event(|app, event| {
            match event.id().as_ref() {
                "file-open" => { let _ = app.emit("menu:open-project", ()); }
                "file-save" => { let _ = app.emit("menu:save-project", ()); }
                "file-export" => { let _ = app.emit("menu:export", ()); }
                _ => {}
            }
        })
        .setup(move |app| {
            let handle = app.handle();
            setup_tray(handle)?;
            register_shortcuts(handle, &HotkeyConfig::default());
            handle.emit("platform:flags", PlatformFlags { is_wayland })?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::capture::capture_fullscreen,
            commands::capture::capture_all_monitors,
            commands::capture::list_windows,
            commands::capture::capture_window,
            commands::capture::check_screen_permission,
            commands::capture::read_image_file,
            commands::capture::list_system_wallpapers,
            commands::capture::convert_heic_thumbnail,
            commands::capture::convert_heic_to_data_url,
            commands::export::export_image,
            commands::export::save_text_file,
            commands::export::read_text_file,
            commands::export::save_temp_export,
            commands::share::share_file,
            commands::tray::update_tray_menu,
            commands::preview::show_capture_preview,
            commands::preview::dismiss_preview,
            update_hotkeys,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
