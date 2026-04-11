use std::path::Path;
use std::process::Command;

/// Trigger the OS-native share sheet / file reveal for a given file path.
///
/// - macOS: Opens Finder and selects the file (share via right-click or toolbar).
///   Uses `open -R` which safely reveals the file without shell interpolation.
/// - Windows: Opens Explorer and selects the file.
/// - Linux: Opens the file manager at the parent directory via xdg-open.
#[tauri::command]
pub async fn share_file(file_path: String) -> Result<(), String> {
    let path = Path::new(&file_path);

    if !path.exists() {
        return Err(format!("File not found: {file_path}"));
    }

    // Canonicalize to prevent path traversal (T-08-04 mitigation)
    let canonical = path
        .canonicalize()
        .map_err(|e| format!("Invalid file path: {e}"))?;

    #[cfg(target_os = "macos")]
    {
        // `open -R` reveals the file in Finder with it selected.
        // The user can then use Finder's share button or right-click > Share.
        // This avoids osascript shell interpolation risks (T-08-05 mitigation).
        Command::new("open")
            .arg("-R")
            .arg(&canonical)
            .output()
            .map_err(|e| format!("Failed to reveal file in Finder: {e}"))?;
        return Ok(());
    }

    #[cfg(target_os = "windows")]
    {
        // Opens Explorer with the file selected
        Command::new("explorer")
            .arg("/select,")
            .arg(&canonical)
            .output()
            .map_err(|e| format!("Failed to reveal file in Explorer: {e}"))?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        // Linux has no universal share sheet; open the parent directory
        let parent = canonical.parent().unwrap_or(&canonical);
        Command::new("xdg-open")
            .arg(parent)
            .output()
            .map_err(|e| format!("Failed to open file location: {e}"))?;
        return Ok(());
    }

    #[allow(unreachable_code)]
    Err("Unsupported platform".to_string())
}
