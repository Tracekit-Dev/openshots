use clap::{Parser, Subcommand};
use openshots_lib::presets;
use openshots_lib::processing::{self, CliPreset, PrivacyRegion};
use openshots_lib::{annotations, render};
use std::path::Path;

#[derive(Parser)]
#[command(name = "openshots", about = "OpenShots CLI - Screenshot beautification tool")]
#[command(version, propagate_version = true)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Apply a preset to screenshots
    Beautify {
        /// Preset name (from ~/.openshots/presets.json) or path to a preset JSON file
        #[arg(long)]
        preset: String,

        /// Glob pattern for input images (e.g. "screenshots/*.png")
        #[arg(long)]
        input: String,

        /// Output directory (created if missing)
        #[arg(long)]
        output: String,

        /// Output format: png, jpeg, or webp
        #[arg(long, default_value = "png")]
        format: String,

        /// JPEG/WebP quality (1-100)
        #[arg(long, default_value = "90")]
        quality: u32,
    },

    /// List available presets (built-in + user)
    ListPresets,

    /// Show full details of a preset
    ShowPreset {
        /// Preset name to inspect
        name: String,
    },

    /// Copy a preset to ~/.openshots/presets.json for customization
    CopyPreset {
        /// Source preset name to copy
        name: String,

        /// New name for the copied preset
        #[arg(long, alias = "as")]
        new_name: String,
    },

    /// Create a new blank preset in ~/.openshots/presets.json
    CreatePreset {
        /// Name for the new preset
        name: String,
    },

    /// Open ~/.openshots/presets.json in your $EDITOR
    EditPresets,

    /// Add text annotation/watermark to an image
    Annotate {
        /// Input image file path
        #[arg(long)]
        input: String,

        /// Output image file path
        #[arg(long)]
        output: String,

        /// Text to add
        #[arg(long)]
        text: String,

        /// X position of text
        #[arg(long, default_value = "10")]
        text_x: i32,

        /// Y position of text
        #[arg(long, default_value = "10")]
        text_y: i32,

        /// Font size in pixels
        #[arg(long, default_value = "24")]
        font_size: f32,

        /// Text color as hex (#RRGGBB)
        #[arg(long, default_value = "#ffffff")]
        color: String,

        /// Optional preset to apply (background, padding, shadow, etc.)
        #[arg(long)]
        preset: Option<String>,
    },

    /// Convert image format/quality (re-encode)
    Export {
        /// Input image file path
        #[arg(long)]
        input: String,

        /// Output image file path
        #[arg(long)]
        output: String,

        /// Output format: png, jpeg, or webp
        #[arg(long, default_value = "png")]
        format: String,

        /// JPEG/WebP quality (1-100)
        #[arg(long, default_value = "90")]
        quality: u32,

        /// Scale factor (1, 2, or 3)
        #[arg(long, default_value = "1")]
        scale: u32,

        /// Optional preset to apply (background, padding, shadow, etc.)
        #[arg(long)]
        preset: Option<String>,
    },

    /// Apply privacy blur/pixelate to image regions
    Privacy {
        /// Input image file path
        #[arg(long)]
        input: String,

        /// Output image file path
        #[arg(long)]
        output: String,

        /// Regions as "x,y,width,height" (separate multiple with ;)
        #[arg(long, value_delimiter = ';')]
        regions: Vec<String>,

        /// Pixelation block size (higher = more pixelated, default 20)
        #[arg(long, default_value = "20")]
        intensity: u32,

        /// Optional preset to apply (background, padding, shadow, etc.)
        #[arg(long)]
        preset: Option<String>,
    },

    /// Render an .openshots project file to an image
    Render {
        /// Path to the .openshots project file
        #[arg(long)]
        input: String,

        /// Output image path
        #[arg(long)]
        output: String,

        /// Output format: png, jpeg, or webp
        #[arg(long, default_value = "png")]
        format: String,

        /// JPEG/WebP quality (1-100)
        #[arg(long, default_value = "90")]
        quality: u32,
    },
}

/// Load a preset from a file path or by name (built-in + user presets).
fn load_preset(preset_arg: &str) -> Result<CliPreset, String> {
    // If it looks like a file path, load directly
    if preset_arg.contains('/') || preset_arg.contains('\\') || preset_arg.ends_with(".json") {
        let path = Path::new(preset_arg);
        let contents = std::fs::read_to_string(path)
            .map_err(|e| format!("Failed to read preset file '{}': {e}", path.display()))?;
        let preset: CliPreset = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse preset JSON: {e}"))?;
        return Ok(preset);
    }

    // Otherwise, resolve by name (built-in first, then user presets)
    presets::resolve_preset(preset_arg)
}

fn run_beautify(
    preset_arg: &str,
    input_glob: &str,
    output_dir: &str,
    format: &str,
    quality: u32,
) {
    let preset = match load_preset(preset_arg) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    };

    let entries: Vec<_> = match glob::glob(input_glob) {
        Ok(paths) => paths.collect(),
        Err(e) => {
            eprintln!("Error: Invalid glob pattern '{}': {e}", input_glob);
            std::process::exit(1);
        }
    };

    if entries.is_empty() {
        eprintln!("No files matched pattern '{}'", input_glob);
        std::process::exit(1);
    }

    // Create output directory if it doesn't exist
    let out_dir = Path::new(output_dir);
    if let Err(e) = std::fs::create_dir_all(out_dir) {
        eprintln!("Error: Failed to create output directory '{}': {e}", output_dir);
        std::process::exit(1);
    }

    let total = entries.len();
    let mut success = 0;
    let mut failed = 0;

    for (i, entry) in entries.into_iter().enumerate() {
        match entry {
            Ok(input_path) => {
                let file_name = input_path
                    .file_stem()
                    .unwrap_or_default()
                    .to_string_lossy();
                let output_path = out_dir.join(format!("{}.{}", file_name, format));

                print!("[{}/{}] Processing {}... ", i + 1, total, input_path.display());

                match processing::compose_with_preset(
                    &input_path,
                    &preset,
                    &output_path,
                    format,
                    quality,
                ) {
                    Ok(()) => {
                        println!("done -> {}", output_path.display());
                        success += 1;
                    }
                    Err(e) => {
                        println!("FAILED: {e}");
                        failed += 1;
                    }
                }
            }
            Err(e) => {
                eprintln!("[{}/{}] Warning: Could not read path: {e}", i + 1, total);
                failed += 1;
            }
        }
    }

    println!("\nComplete: {success} succeeded, {failed} failed out of {total} files.");
    if failed > 0 && success == 0 {
        std::process::exit(1);
    }
}

fn run_export(input: &str, output: &str, format: &str, quality: u32, scale: u32, preset_arg: &Option<String>) {
    let img = load_image(input);
    let (scaled_img, _w, _h) = processing::scale_image(img, scale);

    let final_img = match resolve_optional_preset(preset_arg) {
        Some(preset) => apply_preset_to_image(&scaled_img, &preset),
        None => scaled_img,
    };

    let (output_path, _) = prepare_output(output);
    match processing::encode_to_file(&final_img, &output_path, format, quality) {
        Ok(()) => println!("Exported: {} -> {}", input, output),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

/// Load an image from path, exiting on error.
fn load_image(input: &str) -> image::RgbaImage {
    let input_path = Path::new(input);
    if !input_path.exists() {
        eprintln!("Error: Input file '{}' not found", input);
        std::process::exit(1);
    }
    match image::open(input_path) {
        Ok(img) => img.to_rgba8(),
        Err(e) => {
            eprintln!("Error: Failed to open '{}': {e}", input);
            std::process::exit(1);
        }
    }
}

/// Ensure output directory exists and return the format from extension.
fn prepare_output(output: &str) -> (std::path::PathBuf, String) {
    let output_path = std::path::PathBuf::from(output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create output directory: {e}");
            std::process::exit(1);
        }
    }
    let format = output_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_string();
    (output_path, format)
}

/// Apply a preset to an image: background, padding, corner radius, shadow, inset border.
/// Returns the composed canvas.
fn apply_preset_to_image(img: &image::RgbaImage, preset: &CliPreset) -> image::RgbaImage {
    let (src_w, src_h) = img.dimensions();
    let canvas_w = preset.canvas_width;
    let canvas_h = preset.canvas_height;
    let padding = preset.padding;

    let available_w = canvas_w.saturating_sub(padding * 2);
    let available_h = canvas_h.saturating_sub(padding * 2);

    let scale_x = available_w as f64 / src_w as f64;
    let scale_y = available_h as f64 / src_h as f64;
    let scale = scale_x.min(scale_y).min(1.0);

    let img_w = (src_w as f64 * scale) as u32;
    let img_h = (src_h as f64 * scale) as u32;

    let scaled_img = if scale < 1.0 {
        image::imageops::resize(img, img_w, img_h, image::imageops::FilterType::Lanczos3)
    } else {
        img.clone()
    };

    let mut rounded_img = scaled_img;
    processing::apply_corner_radius(&mut rounded_img, preset.corner_radius);

    if preset.inset_border_enabled {
        processing::draw_inset_border(&mut rounded_img, preset.inset_border_width);
    }

    let mut canvas = image::RgbaImage::new(canvas_w, canvas_h);
    processing::fill_background(&mut canvas, &preset.background);

    let img_x = (canvas_w.saturating_sub(img_w)) / 2;
    let img_y = (canvas_h.saturating_sub(img_h)) / 2;

    if preset.shadow_enabled {
        processing::render_shadow(
            &mut canvas, img_x, img_y, img_w, img_h,
            preset.shadow_blur, preset.shadow_offset_y,
        );
    }

    image::imageops::overlay(&mut canvas, &rounded_img, img_x as i64, img_y as i64);
    canvas
}

/// Resolve an optional preset arg, exiting on error.
fn resolve_optional_preset(preset_arg: &Option<String>) -> Option<CliPreset> {
    preset_arg.as_ref().map(|name| {
        match load_preset(name) {
            Ok(p) => p,
            Err(e) => {
                eprintln!("Error: {e}");
                std::process::exit(1);
            }
        }
    })
}

fn run_annotate(input: &str, output: &str, text: &str, text_x: i32, text_y: i32, font_size: f32, color: &str, preset_arg: &Option<String>) {
    let mut img = load_image(input);

    let rgba_color = match processing::parse_hex_color(color) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error: Invalid color '{}': {e}", color);
            std::process::exit(1);
        }
    };

    // Annotate on the raw image first
    if let Err(e) = annotations::render_text_watermark(&mut img, text, text_x, text_y, font_size, rgba_color) {
        eprintln!("Error: Failed to render text: {e}");
        std::process::exit(1);
    }

    // Then apply preset if specified
    let final_img = match resolve_optional_preset(preset_arg) {
        Some(preset) => apply_preset_to_image(&img, &preset),
        None => img,
    };

    let (output_path, format) = prepare_output(output);
    match processing::encode_to_file(&final_img, &output_path, &format, 90) {
        Ok(()) => println!("Annotated: {} -> {}", input, output),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

/// Parse a region string "x,y,width,height" into a PrivacyRegion.
fn parse_region(region_str: &str, intensity: u32) -> Result<PrivacyRegion, String> {
    let parts: Vec<&str> = region_str.split(',').collect();
    if parts.len() != 4 {
        return Err(format!(
            "Invalid region format '{}': expected 'x,y,width,height'",
            region_str
        ));
    }

    let x: u32 = parts[0]
        .trim()
        .parse()
        .map_err(|_| format!("Invalid x coordinate '{}': must be a non-negative integer", parts[0].trim()))?;
    let y: u32 = parts[1]
        .trim()
        .parse()
        .map_err(|_| format!("Invalid y coordinate '{}': must be a non-negative integer", parts[1].trim()))?;
    let width: u32 = parts[2]
        .trim()
        .parse()
        .map_err(|_| format!("Invalid width '{}': must be a non-negative integer", parts[2].trim()))?;
    let height: u32 = parts[3]
        .trim()
        .parse()
        .map_err(|_| format!("Invalid height '{}': must be a non-negative integer", parts[3].trim()))?;

    Ok(PrivacyRegion {
        region_type: "pixelate".to_string(),
        x,
        y,
        width,
        height,
        intensity,
    })
}

fn run_privacy(input: &str, output: &str, regions: &[String], intensity: u32, preset_arg: &Option<String>) {
    let mut img = load_image(input);

    let mut parsed_regions: Vec<PrivacyRegion> = Vec::new();
    for region_str in regions {
        match parse_region(region_str, intensity) {
            Ok(r) => parsed_regions.push(r),
            Err(e) => {
                eprintln!("Error: {e}");
                std::process::exit(1);
            }
        }
    }

    if parsed_regions.is_empty() {
        eprintln!("Error: No valid regions specified");
        std::process::exit(1);
    }

    processing::apply_privacy_regions(&mut img, &parsed_regions, 1.0);

    let final_img = match resolve_optional_preset(preset_arg) {
        Some(preset) => apply_preset_to_image(&img, &preset),
        None => img,
    };

    let (output_path, format) = prepare_output(output);
    match processing::encode_to_file(&final_img, &output_path, &format, 90) {
        Ok(()) => println!("Privacy applied: {} -> {} ({} regions)", input, output, parsed_regions.len()),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

fn run_render(input: &str, output: &str, format: &str, quality: u32) {
    let input_path = Path::new(input);
    if !input_path.exists() {
        eprintln!("Error: Input file '{}' not found", input);
        std::process::exit(1);
    }

    let json = match std::fs::read_to_string(input_path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Error: Failed to read '{}': {e}", input);
            std::process::exit(1);
        }
    };

    let output_path = Path::new(output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create output directory: {e}");
            std::process::exit(1);
        }
    }

    match render::render_project_file(&json, output_path, format, quality) {
        Ok(()) => println!("Rendered: {} -> {}", input, output),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

/// Get the path to the user presets file.
fn user_presets_path() -> std::path::PathBuf {
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .unwrap_or_else(|_| {
            eprintln!("Error: Could not determine home directory");
            std::process::exit(1);
        });
    std::path::PathBuf::from(home)
        .join(".openshots")
        .join("presets.json")
}

/// Load user presets from disk, returning an empty vec on missing file.
fn load_user_presets_vec() -> Vec<CliPreset> {
    let path = user_presets_path();
    if !path.exists() {
        return Vec::new();
    }
    let contents = match std::fs::read_to_string(&path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };
    serde_json::from_str(&contents).unwrap_or_default()
}

/// Save user presets to disk.
fn save_user_presets(presets_vec: &[CliPreset]) {
    let path = user_presets_path();
    if let Some(parent) = path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create directory '{}': {e}", parent.display());
            std::process::exit(1);
        }
    }
    let json = serde_json::to_string_pretty(presets_vec).unwrap();
    if let Err(e) = std::fs::write(&path, &json) {
        eprintln!("Error: Failed to write '{}': {e}", path.display());
        std::process::exit(1);
    }
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Commands::Beautify {
            preset,
            input,
            output,
            format,
            quality,
        } => run_beautify(&preset, &input, &output, &format, quality),

        Commands::ListPresets => {
            let all = presets::list_all_presets();
            if all.is_empty() {
                println!("No presets available.");
            } else {
                println!("{:<20} {}", "NAME", "SOURCE");
                println!("{}", "-".repeat(35));
                for (name, is_builtin) in &all {
                    let source = if *is_builtin { "built-in" } else { "user" };
                    println!("{:<20} {}", name, source);
                }
                println!("\nTip: Use 'show-preset <name>' to see full details.");
            }
        }

        Commands::ShowPreset { name } => {
            match presets::resolve_preset(&name) {
                Ok(preset) => {
                    let json = serde_json::to_string_pretty(&preset).unwrap();
                    println!("{json}");
                }
                Err(e) => {
                    eprintln!("Error: {e}");
                    std::process::exit(1);
                }
            }
        }

        Commands::CopyPreset { name, new_name } => {
            let source = match presets::resolve_preset(&name) {
                Ok(p) => p,
                Err(e) => {
                    eprintln!("Error: {e}");
                    std::process::exit(1);
                }
            };

            let mut user = load_user_presets_vec();
            if user.iter().any(|p| p.name.eq_ignore_ascii_case(&new_name)) {
                eprintln!("Error: A user preset named '{}' already exists. Choose a different name.", new_name);
                std::process::exit(1);
            }

            let mut copy = source.clone();
            copy.name = new_name.clone();
            user.push(copy);
            save_user_presets(&user);

            let path = user_presets_path();
            println!("Copied '{}' as '{}' -> {}", name, new_name, path.display());
            println!("Edit the file to customize, then use 'show-preset {}' to verify.", new_name);
        }

        Commands::CreatePreset { name } => {
            let mut user = load_user_presets_vec();
            if user.iter().any(|p| p.name.eq_ignore_ascii_case(&name)) {
                eprintln!("Error: A user preset named '{}' already exists.", name);
                std::process::exit(1);
            }
            // Check built-ins too
            if presets::builtin_presets().iter().any(|p| p.name.eq_ignore_ascii_case(&name)) {
                eprintln!("Error: '{}' is a built-in preset name. Choose a different name.", name);
                std::process::exit(1);
            }

            let blank = CliPreset {
                name: name.clone(),
                canvas_width: 1920,
                canvas_height: 1080,
                padding: 60,
                background: processing::CliBackground {
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
                inset_border_enabled: false,
                inset_border_width: 0,
            };
            user.push(blank);
            save_user_presets(&user);

            let path = user_presets_path();
            println!("Created preset '{}' -> {}", name, path.display());
            println!("Edit the file to customize your preset.");
        }

        Commands::EditPresets => {
            let path = user_presets_path();
            if !path.exists() {
                // Create empty file so the editor has something to open
                save_user_presets(&[]);
                println!("Created empty presets file at {}", path.display());
            }

            let editor = std::env::var("EDITOR").unwrap_or_else(|_| {
                // Fallback to common editors
                if cfg!(target_os = "macos") {
                    "open".to_string()
                } else if cfg!(target_os = "windows") {
                    "notepad".to_string()
                } else {
                    "xdg-open".to_string()
                }
            });

            println!("Opening {} with '{}'...", path.display(), editor);
            match std::process::Command::new(&editor).arg(&path).status() {
                Ok(status) if status.success() => {}
                Ok(status) => {
                    eprintln!("Editor exited with status: {}", status);
                    std::process::exit(1);
                }
                Err(e) => {
                    eprintln!("Error: Failed to launch editor '{}': {e}", editor);
                    eprintln!("Set the EDITOR environment variable or edit the file manually:");
                    eprintln!("  {}", path.display());
                    std::process::exit(1);
                }
            }
        }

        Commands::Annotate {
            input,
            output,
            text,
            text_x,
            text_y,
            font_size,
            color,
            preset,
        } => run_annotate(&input, &output, &text, text_x, text_y, font_size, &color, &preset),

        Commands::Export {
            input,
            output,
            format,
            quality,
            scale,
            preset,
        } => run_export(&input, &output, &format, quality, scale, &preset),

        Commands::Privacy {
            input,
            output,
            regions,
            intensity,
            preset,
        } => run_privacy(&input, &output, &regions, intensity, &preset),

        Commands::Render {
            input,
            output,
            format,
            quality,
        } => run_render(&input, &output, &format, quality),
    }
}
