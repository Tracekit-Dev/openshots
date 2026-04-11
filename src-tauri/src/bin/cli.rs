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

        /// Pixelation block size (higher = more pixelated)
        #[arg(long, default_value = "12")]
        intensity: u32,
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

fn run_export(input: &str, output: &str, format: &str, quality: u32, scale: u32) {
    let input_path = Path::new(input);
    if !input_path.exists() {
        eprintln!("Error: Input file '{}' not found", input);
        std::process::exit(1);
    }

    let img = match image::open(input_path) {
        Ok(img) => img.to_rgba8(),
        Err(e) => {
            eprintln!("Error: Failed to open '{}': {e}", input);
            std::process::exit(1);
        }
    };

    let (final_img, _w, _h) = processing::scale_image(img, scale);

    let output_path = Path::new(output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create output directory: {e}");
            std::process::exit(1);
        }
    }

    match processing::encode_to_file(&final_img, output_path, format, quality) {
        Ok(()) => println!("Exported: {} -> {}", input, output),
        Err(e) => {
            eprintln!("Error: {e}");
            std::process::exit(1);
        }
    }
}

fn run_annotate(input: &str, output: &str, text: &str, text_x: i32, text_y: i32, font_size: f32, color: &str) {
    let input_path = Path::new(input);
    if !input_path.exists() {
        eprintln!("Error: Input file '{}' not found", input);
        std::process::exit(1);
    }

    let mut img = match image::open(input_path) {
        Ok(img) => img.to_rgba8(),
        Err(e) => {
            eprintln!("Error: Failed to open '{}': {e}", input);
            std::process::exit(1);
        }
    };

    let rgba_color = match processing::parse_hex_color(color) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("Error: Invalid color '{}': {e}", color);
            std::process::exit(1);
        }
    };

    if let Err(e) = annotations::render_text_watermark(&mut img, text, text_x, text_y, font_size, rgba_color) {
        eprintln!("Error: Failed to render text: {e}");
        std::process::exit(1);
    }

    let output_path = Path::new(output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create output directory: {e}");
            std::process::exit(1);
        }
    }

    // Detect format from output extension
    let format = output_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    match processing::encode_to_file(&img, output_path, format, 90) {
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

fn run_privacy(input: &str, output: &str, regions: &[String], intensity: u32) {
    let input_path = Path::new(input);
    if !input_path.exists() {
        eprintln!("Error: Input file '{}' not found", input);
        std::process::exit(1);
    }

    let mut img = match image::open(input_path) {
        Ok(img) => img.to_rgba8(),
        Err(e) => {
            eprintln!("Error: Failed to open '{}': {e}", input);
            std::process::exit(1);
        }
    };

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

    let output_path = Path::new(output);
    if let Some(parent) = output_path.parent() {
        if let Err(e) = std::fs::create_dir_all(parent) {
            eprintln!("Error: Failed to create output directory: {e}");
            std::process::exit(1);
        }
    }

    let format = output_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");

    match processing::encode_to_file(&img, output_path, format, 90) {
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
        } => run_annotate(&input, &output, &text, text_x, text_y, font_size, &color),

        Commands::Export {
            input,
            output,
            format,
            quality,
            scale,
        } => run_export(&input, &output, &format, quality, scale),

        Commands::Privacy {
            input,
            output,
            regions,
            intensity,
        } => run_privacy(&input, &output, &regions, intensity),

        Commands::Render {
            input,
            output,
            format,
            quality,
        } => run_render(&input, &output, &format, quality),
    }
}
