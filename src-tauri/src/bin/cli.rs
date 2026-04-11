use clap::{Parser, Subcommand};
use openshots_lib::processing::{self, CliPreset};
use std::path::{Path, PathBuf};

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

    /// Add annotations to an image
    Annotate,

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
}

/// Load a preset from a file path or by name from ~/.openshots/presets.json.
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

    // Otherwise, look up by name in ~/.openshots/presets.json
    let home = std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map_err(|_| "Could not determine home directory".to_string())?;
    let presets_path = PathBuf::from(home).join(".openshots").join("presets.json");

    if !presets_path.exists() {
        return Err(format!(
            "Preset '{}' not found. No presets file at {}. Use a path to a JSON file instead.",
            preset_arg,
            presets_path.display()
        ));
    }

    let contents = std::fs::read_to_string(&presets_path)
        .map_err(|e| format!("Failed to read {}: {e}", presets_path.display()))?;
    let presets: Vec<CliPreset> = serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse presets.json: {e}"))?;

    presets
        .into_iter()
        .find(|p| p.name.eq_ignore_ascii_case(preset_arg))
        .ok_or_else(|| {
            format!(
                "Preset '{}' not found in {}",
                preset_arg,
                presets_path.display()
            )
        })
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

        Commands::Annotate => {
            println!(
                "Annotation via CLI is planned for a future release. \
                 Use the OpenShots GUI for annotation workflows."
            );
        }

        Commands::Export {
            input,
            output,
            format,
            quality,
            scale,
        } => run_export(&input, &output, &format, quality, scale),
    }
}
