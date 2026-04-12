use crate::processing::{CliBackground, CliPreset};
use std::path::PathBuf;

/// Return the 7 built-in presets that ship with OpenShots.
pub fn builtin_presets() -> Vec<CliPreset> {
    vec![
        CliPreset {
            name: "clean-dark".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 80,
            background: CliBackground {
                bg_type: "solid".to_string(),
                color: Some("#1a1a2e".to_string()),
                gradient_start: None,
                gradient_end: None,
                gradient_angle: None,
            },
            corner_radius: 12,
            shadow_enabled: true,
            shadow_blur: 30,
            shadow_offset_y: 10,
            inset_border_enabled: true,
            inset_border_width: 1,
        },
        CliPreset {
            name: "clean-light".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 80,
            background: CliBackground {
                bg_type: "solid".to_string(),
                color: Some("#f5f5f7".to_string()),
                gradient_start: None,
                gradient_end: None,
                gradient_angle: None,
            },
            corner_radius: 12,
            shadow_enabled: true,
            shadow_blur: 30,
            shadow_offset_y: 10,
            inset_border_enabled: true,
            inset_border_width: 1,
        },
        CliPreset {
            name: "vibrant-purple".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 60,
            background: CliBackground {
                bg_type: "gradient".to_string(),
                color: None,
                gradient_start: Some("#667eea".to_string()),
                gradient_end: Some("#764ba2".to_string()),
                gradient_angle: Some(135.0),
            },
            corner_radius: 16,
            shadow_enabled: true,
            shadow_blur: 40,
            shadow_offset_y: 12,
            inset_border_enabled: false,
            inset_border_width: 0,
        },
        CliPreset {
            name: "vibrant-sunset".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 60,
            background: CliBackground {
                bg_type: "gradient".to_string(),
                color: None,
                gradient_start: Some("#f093fb".to_string()),
                gradient_end: Some("#f5576c".to_string()),
                gradient_angle: Some(135.0),
            },
            corner_radius: 16,
            shadow_enabled: true,
            shadow_blur: 40,
            shadow_offset_y: 12,
            inset_border_enabled: false,
            inset_border_width: 0,
        },
        CliPreset {
            name: "subtle-gray".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 60,
            background: CliBackground {
                bg_type: "solid".to_string(),
                color: Some("#e5e5e5".to_string()),
                gradient_start: None,
                gradient_end: None,
                gradient_angle: None,
            },
            corner_radius: 8,
            shadow_enabled: true,
            shadow_blur: 20,
            shadow_offset_y: 8,
            inset_border_enabled: true,
            inset_border_width: 1,
        },
        CliPreset {
            name: "ocean".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 60,
            background: CliBackground {
                bg_type: "gradient".to_string(),
                color: None,
                gradient_start: Some("#2193b0".to_string()),
                gradient_end: Some("#6dd5ed".to_string()),
                gradient_angle: Some(180.0),
            },
            corner_radius: 12,
            shadow_enabled: true,
            shadow_blur: 30,
            shadow_offset_y: 10,
            inset_border_enabled: false,
            inset_border_width: 0,
        },
        CliPreset {
            name: "none".to_string(),
            canvas_width: 1920,
            canvas_height: 1080,
            padding: 0,
            background: CliBackground {
                bg_type: "solid".to_string(),
                color: Some("#ffffff".to_string()),
                gradient_start: None,
                gradient_end: None,
                gradient_angle: None,
            },
            corner_radius: 0,
            shadow_enabled: false,
            shadow_blur: 0,
            shadow_offset_y: 0,
            inset_border_enabled: false,
            inset_border_width: 0,
        },
    ]
}

/// Resolve a preset by name: check built-ins first, then user presets from disk.
pub fn resolve_preset(name: &str) -> Result<CliPreset, String> {
    // Check built-in presets (case-insensitive)
    if let Some(preset) = builtin_presets()
        .into_iter()
        .find(|p| p.name.eq_ignore_ascii_case(name))
    {
        return Ok(preset);
    }

    // Fall back to user presets from ~/.openshots/presets.json
    let user_presets = load_user_presets();
    user_presets
        .into_iter()
        .find(|p| p.name.eq_ignore_ascii_case(name))
        .ok_or_else(|| {
            format!(
                "Preset '{}' not found. Use 'list-presets' to see available presets.",
                name
            )
        })
}

/// List all presets (built-in + user). Returns Vec of (name, is_builtin).
pub fn list_all_presets() -> Vec<(String, bool)> {
    let mut result: Vec<(String, bool)> = builtin_presets()
        .into_iter()
        .map(|p| (p.name, true))
        .collect();

    for p in load_user_presets() {
        // Only add user presets that don't shadow a built-in name
        if !result.iter().any(|(n, _)| n.eq_ignore_ascii_case(&p.name)) {
            result.push((p.name, false));
        }
    }

    result
}

/// Load user presets from ~/.openshots/presets.json (returns empty vec on any error).
fn load_user_presets() -> Vec<CliPreset> {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_default();
    if home.is_empty() {
        return Vec::new();
    }

    let presets_path = PathBuf::from(home).join(".openshots").join("presets.json");
    if !presets_path.exists() {
        return Vec::new();
    }

    let contents = match std::fs::read_to_string(&presets_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    serde_json::from_str::<Vec<CliPreset>>(&contents).unwrap_or_default()
}
