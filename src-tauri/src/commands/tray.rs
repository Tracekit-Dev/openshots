use serde::Deserialize;
use tauri::menu::{IsMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::AppHandle;

#[derive(Debug, Clone, Deserialize)]
pub struct RecentCapture {
    pub id: String,
    pub label: String,
}

#[tauri::command]
pub fn update_tray_menu(app: AppHandle, recents: Vec<RecentCapture>) -> Result<(), String> {
    let capture_area =
        MenuItem::with_id(&app, "capture-region", "Capture Area", true, None::<&str>)
            .map_err(|e| e.to_string())?;
    let capture_screen = MenuItem::with_id(
        &app,
        "capture-screen",
        "Capture Full Screen",
        true,
        None::<&str>,
    )
    .map_err(|e| e.to_string())?;
    let capture_window =
        MenuItem::with_id(&app, "capture-window", "Capture Window", true, None::<&str>)
            .map_err(|e| e.to_string())?;

    let sep1 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;

    let recent_header =
        MenuItem::with_id(&app, "recent-header", "Recent Captures", false, None::<&str>)
            .map_err(|e| e.to_string())?;

    let mut items: Vec<Box<dyn IsMenuItem<tauri::Wry>>> = vec![
        Box::new(capture_area),
        Box::new(capture_screen),
        Box::new(capture_window),
        Box::new(sep1),
        Box::new(recent_header),
    ];

    if recents.is_empty() {
        let no_recents = MenuItem::with_id(
            &app,
            "no-recents",
            "  No recent captures",
            false,
            None::<&str>,
        )
        .map_err(|e| e.to_string())?;
        items.push(Box::new(no_recents));
    } else {
        for (i, recent) in recents.iter().take(3).enumerate() {
            let item = MenuItem::with_id(
                &app,
                &format!("recent-{}", i),
                &format!("  {}", recent.label),
                true,
                None::<&str>,
            )
            .map_err(|e| e.to_string())?;
            items.push(Box::new(item));
        }
    }

    let sep2 = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let open_item = MenuItem::with_id(&app, "open", "Open...", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let prefs = MenuItem::with_id(&app, "settings", "Preferences", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", "Quit OpenShots", true, None::<&str>)
        .map_err(|e| e.to_string())?;

    items.push(Box::new(sep2));
    items.push(Box::new(open_item));
    items.push(Box::new(prefs));
    items.push(Box::new(quit));

    let refs: Vec<&dyn IsMenuItem<tauri::Wry>> = items.iter().map(|b| b.as_ref()).collect();
    let menu = Menu::with_items(&app, &refs).map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    }

    Ok(())
}
