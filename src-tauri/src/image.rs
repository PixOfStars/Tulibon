use arboard::Clipboard;
use base64::Engine;
use image::{ImageBuffer, ImageFormat, Rgba};
use std::fs;
use std::path::Path;

/// Save a base64 image to disk as PNG. Returns the file path.
pub fn save_image(images_dir: &Path, id: &str, base64_data: &str) -> Result<String, String> {
    fs::create_dir_all(images_dir).map_err(|e| format!("Failed to create images dir: {}", e))?;

    let data = if let Some(comma_pos) = base64_data.find(',') {
        &base64_data[comma_pos + 1..]
    } else {
        base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Base64 decode failed: {}", e))?;

    let img = image::load_from_memory(&bytes).map_err(|e| format!("Image decode failed: {}", e))?;
    let filename = format!("{}.png", id);
    let filepath = images_dir.join(&filename);

    let mut png_bytes: Vec<u8> = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut png_bytes), ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {}", e))?;
    fs::write(&filepath, &png_bytes).map_err(|e| format!("Failed to write image: {}", e))?;

    Ok(filepath.to_string_lossy().to_string())
}

/// Delete an image file if it exists and is within the images directory.
pub fn delete_image(images_dir: &Path, path: &str) -> Result<(), String> {
    let filepath = std::path::PathBuf::from(path);
    if !filepath.starts_with(images_dir) {
        return Err("Invalid image path".to_string());
    }
    if filepath.exists() {
        fs::remove_file(&filepath).map_err(|e| format!("Failed to delete image: {}", e))?;
    }
    Ok(())
}

/// Load an image file from disk and return as a base64 data URL.
pub fn load_image(path: &str) -> Result<String, String> {
    let filepath = std::path::PathBuf::from(path);
    if !filepath.exists() {
        return Err(format!("图片文件不存在: {}", filepath.display()));
    }
    let bytes = fs::read(&filepath).map_err(|e| format!("Failed to read image: {}", e))?;
    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
    let ext = path.rsplit('.').next().unwrap_or("webp");
    let mime = match ext {
        "webp" => "image/webp",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        _ => "image/png",
    };
    Ok(format!("data:{};base64,{}", mime, b64))
}

/// Read clipboard image and return as base64 PNG.
pub fn read_clipboard_image() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| format!("Clipboard access failed: {}", e))?;
    let img = clipboard.get_image().map_err(|e| format!("Clipboard get image failed: {}", e))?;
    let width = img.width as u32;
    let height = img.height as u32;
    let mut rgba: Vec<u8> = Vec::with_capacity(img.bytes.len());
    for chunk in img.bytes.chunks(4) {
        if chunk.len() != 4 {
            return Err("Invalid clipboard image data".to_string());
        }
        rgba.extend_from_slice(&[chunk[2], chunk[1], chunk[0], chunk[3]]);
    }
    let img_buf = ImageBuffer::<Rgba<u8>, _>::from_raw(width, height, rgba)
        .ok_or_else(|| "Failed to create image buffer".to_string())?;
    let mut png_bytes: Vec<u8> = Vec::new();
    img_buf
        .write_to(&mut std::io::Cursor::new(&mut png_bytes), ImageFormat::Png)
        .map_err(|e| format!("PNG encode failed: {}", e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&png_bytes))
}
