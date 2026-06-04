mod ocr;
mod download;
mod protocol;
mod plugin_manager;

use tauri::{Manager, Emitter};
use plugin_manager::{list_plugins, install_plugin, uninstall_plugin, enable_plugin, disable_plugin, get_plugin_state, get_plugin, fetch_registry, get_cached_registry, get_plugin_config, set_plugin_config};
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::DragDropEvent;
use std::fs;
use std::path::PathBuf;
use base64::Engine;
use arboard::Clipboard;
use image::{ImageBuffer, Rgba, ImageFormat};

// ── DPAPI helpers ──

use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData,
    CRYPT_INTEGER_BLOB as CRYPTOAPI_BLOB,
};

const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

fn dpapi_encrypt(plaintext: &[u8]) -> Result<Vec<u8>, String> {
    if plaintext.is_empty() {
        return Ok(Vec::new());
    }
    unsafe {
        let input = CRYPTOAPI_BLOB {
            cbData: plaintext.len() as u32,
            pbData: plaintext.as_ptr() as *mut u8,
        };
        let mut output = std::mem::zeroed::<CRYPTOAPI_BLOB>();
        CryptProtectData(
            &input,
            windows::core::PCWSTR::null(),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|e| format!("CryptProtectData failed: {}", e))?;
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(output.pbData as *mut std::ffi::c_void)));
        Ok(bytes)
    }
}

fn dpapi_decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    if ciphertext.is_empty() {
        return Ok(Vec::new());
    }
    unsafe {
        let input = CRYPTOAPI_BLOB {
            cbData: ciphertext.len() as u32,
            pbData: ciphertext.as_ptr() as *mut u8,
        };
        let mut output = std::mem::zeroed::<CRYPTOAPI_BLOB>();
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|e| format!("CryptUnprotectData failed: {}", e))?;
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(output.pbData as *mut std::ffi::c_void)));
        Ok(bytes)
    }
}

/// Encrypt all API keys in config JSON. Returns the modified JSON string.
fn encrypt_config_keys(raw: &str) -> Result<String, String> {
    let mut parsed: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    if let Some(providers) = parsed.get_mut("providers").and_then(|v| v.as_array_mut()) {
        for provider in providers.iter_mut() {
            if let Some(key) = provider.get_mut("apiKey").and_then(|v| v.as_str()) {
                if !key.is_empty() && !looks_encrypted(key) {
                    let plain = key.as_bytes();
                    let enc = dpapi_encrypt(plain)?;
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&enc);
                    provider["apiKey"] = serde_json::Value::String(b64);
                }
            }
        }
    }
    serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
}

/// Decrypt all API keys in config JSON. Returns the modified JSON string.
fn decrypt_config_keys(raw: &str) -> Result<String, String> {
    let mut parsed: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    if let Some(providers) = parsed.get_mut("providers").and_then(|v| v.as_array_mut()) {
        for provider in providers.iter_mut() {
            if let Some(key) = provider.get_mut("apiKey").and_then(|v| v.as_str()) {
                if looks_encrypted(key) {
                    let decoded = base64::engine::general_purpose::STANDARD
                        .decode(key.as_bytes())
                        .map_err(|e| e.to_string())?;
                    let plain = dpapi_decrypt(&decoded)?;
                    // Safe to unwrap — DPAPI decrypts to valid UTF-8 API keys
                    provider["apiKey"] = serde_json::Value::String(
                        String::from_utf8(plain).map_err(|e| e.to_string())?
                    );
                }
            }
        }
    }
    serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
}

/// Heuristic: DPAPI-encrypted base64 strings are longer than typical API keys
fn looks_encrypted(key: &str) -> bool {
    key.len() > 120 && key.chars().all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '/' || c == '=')
}

// ── Path helpers ──

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."))
}

fn get_data_dir(app: &tauri::AppHandle) -> PathBuf {
    let config_path = app_data_dir(app).join("data").join("config.json");
    if let Ok(raw) = fs::read_to_string(&config_path) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(dir) = parsed.get("dataDir").and_then(|v| v.as_str()) {
                if !dir.is_empty() {
                    let custom = PathBuf::from(dir);
                    if custom.exists() || fs::create_dir_all(&custom).is_ok() {
                        return custom;
                    }
                }
            }
        }
    }
    app_data_dir(app)
}

fn get_config_path(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("data").join("config.json")
}

fn get_history_path(app: &tauri::AppHandle) -> PathBuf {
    get_data_dir(app).join("data").join("history.json")
}

fn get_collections_path(app: &tauri::AppHandle) -> PathBuf {
    get_data_dir(app).join("data").join("collections.json")
}

fn get_tags_path(app: &tauri::AppHandle) -> PathBuf {
    get_data_dir(app).join("data").join("tags.json")
}

fn get_images_dir(app: &tauri::AppHandle) -> PathBuf {
    get_data_dir(app).join("data").join("images")
}

// ── Commands ──

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: String) -> Result<(), String> {
    let path = get_config_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    // Encrypt API keys before persisting
    let encrypted = encrypt_config_keys(&config)?;
    fs::write(&path, &encrypted).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_config_path(&app);
    if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        // Decrypt API keys before returning to frontend
        decrypt_config_keys(&raw)
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
fn save_history(app: tauri::AppHandle, records: String) -> Result<(), String> {
    let path = get_history_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &records).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_history(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_history_path(&app);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string())
    }
}

#[tauri::command]
fn save_image(app: tauri::AppHandle, id: String, base64_data: String) -> Result<String, String> {
    let images_dir = get_images_dir(&app);
    fs::create_dir_all(&images_dir).map_err(|e| e.to_string())?;

    let data = if let Some(comma_pos) = base64_data.find(',') {
        &base64_data[comma_pos + 1..]
    } else {
        &base64_data
    };

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| e.to_string())?;

    // Decode to image, then save as lossless PNG (preserves quality for AI analysis)
    let img = image::load_from_memory(&bytes).map_err(|e| e.to_string())?;
    let filename = format!("{}.png", id);
    let filepath = images_dir.join(&filename);

    let mut png_bytes: Vec<u8> = Vec::new();
    img.write_to(&mut std::io::Cursor::new(&mut png_bytes), ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    fs::write(&filepath, &png_bytes).map_err(|e| e.to_string())?;

    Ok(filepath.to_string_lossy().to_string())
}

#[tauri::command]
fn delete_image(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let filepath = PathBuf::from(&path);
    let images_dir = get_images_dir(&app);
    if !filepath.starts_with(&images_dir) {
        return Err("Invalid image path".to_string());
    }
    if filepath.exists() {
        fs::remove_file(&filepath).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn load_image(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let filepath = PathBuf::from(&path);
    let images_dir = get_images_dir(&app);
    if !filepath.starts_with(&images_dir) {
        return Err("Invalid image path".to_string());
    }
    if filepath.exists() {
        let bytes = fs::read(&filepath).map_err(|e| e.to_string())?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        let ext = path.rsplit('.').next().unwrap_or("webp");
        let mime = match ext {
            "webp" => "image/webp",
            "png" => "image/png",
            "jpg" | "jpeg" => "image/jpeg",
            _ => "image/png",
        };
        Ok(format!("data:{};base64,{}", mime, b64))
    } else {
        Err("Image file not found".to_string())
    }
}

#[tauri::command]
fn save_collections(app: tauri::AppHandle, collections: String) -> Result<(), String> {
    let path = get_collections_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &collections).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_collections(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_collections_path(&app);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string())
    }
}

#[tauri::command]
fn save_tags(app: tauri::AppHandle, tags: String) -> Result<(), String> {
    let path = get_tags_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(&path, &tags).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_tags(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_tags_path(&app);
    if path.exists() {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("[]".to_string())
    }
}

#[tauri::command]
fn read_clipboard_image() -> Result<String, String> {
    let mut clipboard = Clipboard::new().map_err(|e| e.to_string())?;
    let img = clipboard.get_image().map_err(|e| e.to_string())?;
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
    img_buf.write_to(&mut std::io::Cursor::new(&mut png_bytes), image::ImageFormat::Png)
        .map_err(|e| e.to_string())?;
    Ok(base64::engine::general_purpose::STANDARD.encode(&png_bytes))
}

#[tauri::command]
fn migrate_data(app: tauri::AppHandle, new_dir: String) -> Result<(), String> {
    let old_dir = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("."));
    let new_dir = PathBuf::from(&new_dir);

    // Validate: must be absolute, must differ from current data dir
    if !new_dir.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    if new_dir == old_dir {
        return Err("New location is the same as current".to_string());
    }

    fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;

    let old_history = old_dir.join("history.json");
    let new_history = new_dir.join("history.json");
    if old_history.exists() && !new_history.exists() {
        let _ = fs::copy(&old_history, &new_history);
    }

    let old_images = old_dir.join("images");
    let new_images = new_dir.join("images");
    if old_images.exists() {
        fs::create_dir_all(&new_images).map_err(|e| e.to_string())?;
        if let Ok(entries) = fs::read_dir(&old_images) {
            for entry in entries.flatten() {
                let dest = new_images.join(entry.file_name());
                let _ = fs::copy(entry.path(), dest);
            }
        }
    }

    // Migrate JSON data files
    for filename in &["collections.json", "tags.json", "config.json"] {
        let src = old_dir.join(filename);
        let dst = new_dir.join(filename);
        if src.exists() && !dst.exists() {
            let _ = fs::copy(&src, &dst);
        }
    }

    Ok(())
}

#[tauri::command]
fn minimize_window(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?
        .minimize()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_maximize(app: tauri::AppHandle) -> Result<(), String> {
    let window = app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?;
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| e.to_string())
    } else {
        window.maximize().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?
        .hide()
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
fn pick_font_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let file = app.dialog()
        .file()
        .add_filter("Fonts", &["ttf", "otf"])
        .blocking_pick_file();
    Ok(file.map(|p| p.to_string()))
}

#[tauri::command]
fn set_autostart(enabled: bool) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| e.to_string())?;
    let exe_str = exe.to_string_lossy().to_string();
    let auto = auto_launch::AutoLaunchBuilder::new()
        .set_app_name("AI Vision")
        .set_app_path(&exe_str)
        .build()
        .map_err(|e| e.to_string())?;
    if enabled {
        auto.enable().map_err(|e| e.to_string())?;
    } else {
        auto.disable().map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ── OCR & Download commands ──

#[tauri::command]
async fn run_windows_ocr(_app: tauri::AppHandle, image_base64: String, lang: String) -> Result<String, String> {
    // 1. Decode base64
    let data = if let Some(comma_pos) = image_base64.find(',') {
        &image_base64[comma_pos + 1..]
    } else {
        &image_base64
    };
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;

    // 2. Run Windows OCR
    let text = ocr::recognize(&bytes, &lang).await?;
    Ok(text)
}

#[tauri::command]
async fn check_windows_ocr(app: tauri::AppHandle, lang: String) -> Result<ocr::OcrSupport, String> {
    // Get system language info first
    let _ = app; // 保留 app 参数以保持 Tauri 兼容
    ocr::check_support(&lang)
}

#[tauri::command]
async fn download_ocr_model(app: tauri::AppHandle, engine: String, urls: Vec<String>) -> Result<(), String> {
    let cache_dir = app_data_dir(&app).join("cache").join("ocr_models").join(&engine);
    download::write_log(&app_data_dir(&app), &format!("Starting download for {}", engine));

    let app_handle = app.clone();
    let on_progress = move |progress: download::DownloadProgress| {
        let _ = app_handle.emit("ocr-download-progress", &progress);
    };

    download::download_and_extract(
        &engine,
        &urls,
        &cache_dir,
        None, // cancel flag (future use)
        on_progress,
    ).await.map_err(|e| {
        download::write_log(&app_data_dir(&app), &format!("Download failed: {}", e));
        e
    })?;

    download::write_log(&app_data_dir(&app), &format!("Download complete for {}", engine));
    Ok(())
}

#[tauri::command]
async fn check_ocr_model_downloaded(app: tauri::AppHandle, engine: String) -> Result<bool, String> {
    let cache_dir = app_data_dir(&app).join("cache").join("ocr_models").join(&engine);
    // Check if the cache directory contains files (model is downloaded)
    if !cache_dir.exists() {
        return Ok(false);
    }
    let entries = fs::read_dir(&cache_dir).map_err(|e| e.to_string())?;
    let file_count = entries.filter_map(|e| e.ok()).count();
    Ok(file_count > 0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .register_uri_scheme_protocol("plugin", protocol::plugin_protocol)
        .invoke_handler(tauri::generate_handler![
            save_config,
            load_config,
            save_history,
            load_history,
            save_collections,
            load_collections,
            save_tags,
            load_tags,
            save_image,
            load_image,
            delete_image,
            read_clipboard_image,
            migrate_data,
            set_autostart,
            minimize_window,
            toggle_maximize,
            hide_window,
            pick_folder,
            pick_font_file,
            run_windows_ocr,
            check_windows_ocr,
            download_ocr_model,
            list_plugins,
            install_plugin,
            uninstall_plugin,
            enable_plugin,
            disable_plugin,
            get_plugin_state,
            get_plugin,
            fetch_registry,
            get_cached_registry,
            get_plugin_config,
            set_plugin_config,
            check_ocr_model_downloaded,
        ])
        .setup(|app| {
            let base = app_data_dir(app.handle());
            let data_subdir = base.join("data");
            let _ = fs::create_dir_all(&data_subdir);
            let _ = fs::create_dir_all(get_data_dir(app.handle()));

            // Auto-migrate old JSON data files from root to data/ subdirectory
            let old_config = base.join("config.json");
            let new_config = data_subdir.join("config.json");
            if old_config.exists() && !new_config.exists() {
                let _ = fs::rename(&old_config, &new_config);
            }

            let data_dir = get_data_dir(app.handle());
            let old_hist = data_dir.join("history.json");
            let new_hist = data_dir.join("data").join("history.json");
            if old_hist.exists() && !new_hist.exists() {
                let _ = fs::rename(&old_hist, &new_hist);
            }
            let old_coll = data_dir.join("collections.json");
            let new_coll = data_dir.join("data").join("collections.json");
            if old_coll.exists() && !new_coll.exists() {
                let _ = fs::rename(&old_coll, &new_coll);
            }
            let old_tags = data_dir.join("tags.json");
            let new_tags = data_dir.join("data").join("tags.json");
            if old_tags.exists() && !new_tags.exists() {
                let _ = fs::rename(&old_tags, &new_tags);
            }
            let old_img = data_dir.join("images");
            let new_img = data_dir.join("data").join("images");
            if old_img.exists() && !new_img.exists() {
                let _ = fs::rename(&old_img, &new_img);
            }

            if let Some(window) = app.get_webview_window("main") {
                let icon_img = tauri::image::Image::from_bytes(
                    include_bytes!("../icons/32x32.png")
                ).unwrap_or_else(|_| tauri::image::Image::new(&[], 1, 1));
                let _ = window.set_icon(icon_img);

                #[cfg(target_os = "windows")]
                {
                    extern "system" {
                        fn DwmSetWindowAttribute(
                            hwnd: *mut std::ffi::c_void,
                            dwattribute: u32,
                            pvattribute: *const std::ffi::c_void,
                            cbattribute: u32,
                        ) -> i32;
                    }
                    if let Ok(hwnd) = window.hwnd() {
                        const DWMWA_BORDER_COLOR: u32 = 34;
                        let color: u32 = 0x000F0F0F;
                        unsafe {
                            DwmSetWindowAttribute(
                                hwnd.0,
                                DWMWA_BORDER_COLOR,
                                &color as *const _ as *const std::ffi::c_void,
                                std::mem::size_of::<u32>() as u32,
                            );
                        }
                    }
                }

                let w = window.clone();
                let app_handle = app.handle().clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = w.hide();
                    }
                    if let tauri::WindowEvent::DragDrop(drag_event) = event {
                        if let DragDropEvent::Drop { paths, .. } = drag_event {
                            let mut data_urls: Vec<String> = Vec::new();
                            for path in paths {
                                if let Ok(bytes) = fs::read(path) {
                                    let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                                    let ext = path.extension()
                                        .and_then(|e| e.to_str())
                                        .unwrap_or("png")
                                        .to_lowercase();
                                    let mime = if ext == "jpg" || ext == "jpeg" { "image/jpeg" }
                                        else if ext == "webp" { "image/webp" }
                                        else if ext == "bmp" { "image/bmp" }
                                        else if ext == "gif" { "image/gif" }
                                        else { "image/png" };
                                    data_urls.push(format!("data:{};base64,{}", mime, b64));
                                }
                            }
                            if !data_urls.is_empty() {
                                let _ = app_handle.emit("file-drop", &data_urls);
                            }
                        }
                    }
                });
            }

            // Tray menu
            let show_item = MenuItemBuilder::with_id("show", "显示 / Show").build(app)?;
            let quit_item = MenuItemBuilder::with_id("quit", "退出 / Quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&quit_item)
                .build()?;

            let tray_icon = tauri::image::Image::from_bytes(
                include_bytes!("../icons/32x32.png")
            ).unwrap_or_else(|_| tauri::image::Image::new(&[], 1, 1));

            let _tray = TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .tooltip("BUNBUN AI Vision")
                .on_menu_event(|app, event| {
                    match event.id().as_ref() {
                        "show" => {
                            if let Some(w) = app.get_webview_window("main") {
                                let _ = w.show();
                                let _ = w.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button, button_state, .. } = event {
                        if button == MouseButton::Left && button_state == MouseButtonState::Up {
                            let app = tray.app_handle();
                            if let Some(w) = app.get_webview_window("main") {
                                if w.is_visible().unwrap_or(false) {
                                    let _ = w.hide();
                                } else {
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
