mod app_paths;
mod config_crypto;
mod data;
mod error;
mod image;
mod ocr;
mod window;

use config_crypto::{decrypt_config_keys, encrypt_config_keys};
use std::fs;
use std::path::PathBuf;
use tauri::Emitter;
use tauri_plugin_store::StoreExt;

// ── Path helpers ──

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app_paths::app_data_dir(app)
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

fn get_images_dir(app: &tauri::AppHandle) -> PathBuf {
    get_data_dir(app).join("data").join("images")
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

fn copy_dir_recursive(src: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dest_path)?;
        } else if src_path.is_file() {
            fs::copy(&src_path, &dest_path).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

fn move_path_if_missing(src: &PathBuf, dest: &PathBuf) -> Result<(), String> {
    if !src.exists() || dest.exists() {
        return Ok(());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::rename(src, dest).or_else(|_| {
        if src.is_dir() {
            copy_dir_recursive(src, dest)?;
            fs::remove_dir_all(src).map_err(|e| e.to_string())?;
        } else {
            fs::copy(src, dest).map_err(|e| e.to_string())?;
            fs::remove_file(src).map_err(|e| e.to_string())?;
        }
        Ok::<(), String>(())
    })
}

fn migrate_legacy_app_data(app: &tauri::AppHandle) -> Result<(), String> {
    let base = app_data_dir(app);
    let Some(legacy) = app_paths::legacy_app_data_dir(app) else {
        return Ok(());
    };
    if legacy == base || !legacy.exists() {
        return Ok(());
    }
    move_path_if_missing(&legacy.join("data"), &base.join("data"))?;
    move_path_if_missing(&legacy.join("cache"), &base.join("cache"))?;
    move_path_if_missing(&legacy.join("config.json"), &base.join("data").join("config.json"))?;
    move_path_if_missing(&legacy.join("history.json"), &base.join("data").join("history.json"))?;
    move_path_if_missing(&legacy.join("collections.json"), &base.join("data").join("collections.json"))?;
    move_path_if_missing(&legacy.join("tags.json"), &base.join("data").join("tags.json"))?;
    move_path_if_missing(&legacy.join("images"), &base.join("data").join("images"))?;
    Ok(())
}

// ── Commands (data) ──

#[tauri::command]
fn load_history(app: tauri::AppHandle) -> Result<String, String> {
    data::load_records(&get_history_path(&app))
}

#[tauri::command]
fn save_history(app: tauri::AppHandle, records: String) -> Result<(), String> {
    data::save_records(&get_history_path(&app), &records)
}

#[tauri::command]
fn delete_record_by_id(app: tauri::AppHandle, record_id: String) -> Result<(), String> {
    let paths = data::delete_record(&get_history_path(&app), &record_id)?;
    for path in paths {
        let _ = image::delete_image(&get_images_dir(&app), &path);
    }
    Ok(())
}

#[tauri::command]
fn load_collections(app: tauri::AppHandle) -> Result<String, String> {
    data::load_collections(&get_collections_path(&app))
}

#[tauri::command]
fn save_collections(app: tauri::AppHandle, collections: String) -> Result<(), String> {
    data::save_collections(&get_collections_path(&app), &collections)
}

#[tauri::command]
fn load_tags(app: tauri::AppHandle) -> Result<String, String> {
    data::load_tags(&get_tags_path(&app))
}

#[tauri::command]
fn save_tags(app: tauri::AppHandle, tags: String) -> Result<(), String> {
    data::save_tags(&get_tags_path(&app), &tags)
}

// ── Commands (config) ──

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: String) -> Result<(), String> {
    let path = get_config_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    if !path.exists() {
        fs::write(&path, "{}").map_err(|e| e.to_string())?;
    }
    let encrypted = encrypt_config_keys(&config)?;
    let store = app.store(path).map_err(|e| e.to_string())?;
    for k in store.keys().clone() {
        if k != "config" {
            store.delete(&k);
        }
    }
    store.set("config", serde_json::Value::String(encrypted));
    store.save().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> Result<String, String> {
    let path = get_config_path(&app);
    if !path.exists() {
        return Ok("{}".to_string());
    }
    let store = app.store(path.clone()).map_err(|e| e.to_string())?;
    if let Some(value) = store.get("config") {
        if let Some(s) = value.as_str() {
            return decrypt_config_keys(s);
        }
    }
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let decrypted = decrypt_config_keys(&raw)?;
    let encrypted = encrypt_config_keys(&decrypted)?;
    for k in store.keys().clone() {
        store.delete(&k);
    }
    store.set("config", serde_json::Value::String(encrypted));
    let _ = store.save();
    Ok(decrypted)
}

// ── Commands (image) ──

#[tauri::command]
fn save_image(app: tauri::AppHandle, id: String, base64_data: String) -> Result<String, String> {
    let images_dir = get_images_dir(&app);
    image::save_image(&images_dir, &id, &base64_data)
}

#[tauri::command]
fn delete_image(app: tauri::AppHandle, path: String) -> Result<(), String> {
    let images_dir = get_images_dir(&app);
    image::delete_image(&images_dir, &path)
}

#[tauri::command]
fn load_image(app: tauri::AppHandle, path: String) -> Result<String, String> {
    let images_dir = get_images_dir(&app);
    let filepath = std::path::PathBuf::from(&path);
    if !filepath.starts_with(&images_dir) {
        return Err(format!("图片路径不在允许范围内: {} (必须在 {} 目录下)", filepath.display(), images_dir.display()));
    }
    image::load_image(&path)
}

#[tauri::command]
fn read_clipboard_image() -> Result<String, String> {
    image::read_clipboard_image()
}



// ── Command (migration) ──

#[tauri::command]
fn migrate_data(app: tauri::AppHandle, new_dir: String) -> Result<(), String> {
    let old_dir = app_data_dir(&app);
    let new_dir = PathBuf::from(&new_dir);
    if !new_dir.is_absolute() {
        return Err("Path must be absolute".to_string());
    }
    if new_dir == old_dir {
        return Err("New location is the same as current".to_string());
    }
    fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;

    let data_dir = get_data_dir(&app);
    for filename in &["config.json", "tulibon.db"] {
        let src = data_dir.join("data").join(filename);
        let dst = new_dir.join(filename);
        if src.exists() && !dst.exists() {
            let _ = fs::copy(&src, &dst);
        }
    }
    let old_images = data_dir.join("data").join("images");
    let new_images = new_dir.join("images");
    if old_images.exists() {
        fs::create_dir_all(&new_images).map_err(|e| e.to_string())?;
        if let Ok(entries) = fs::read_dir(&old_images) {
            for entry in entries.flatten() {
                let _ = fs::copy(entry.path(), new_images.join(entry.file_name()));
            }
        }
    }
    Ok(())
}

// ── OCR commands ──

#[tauri::command]
async fn run_windows_ocr(_app: tauri::AppHandle, image_base64: String, lang: String) -> Result<String, String> {
    let data = if let Some(comma_pos) = image_base64.find(',') {
        &image_base64[comma_pos + 1..]
    } else {
        &image_base64
    };
    let bytes = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, data)
        .map_err(|e| format!("Base64 解码失败: {}", e))?;
    ocr::recognize(&bytes, &lang).await
}

#[tauri::command]
async fn check_windows_ocr(app: tauri::AppHandle, lang: String) -> Result<ocr::OcrSupport, String> {
    let _ = app;
    ocr::check_support(&lang)
}

// ── App entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_config, load_config,
            save_history, load_history, delete_record_by_id,
            save_collections, load_collections,
            save_tags, load_tags,
            save_image, load_image, delete_image, read_clipboard_image,
            migrate_data, window::set_autostart,
            window::minimize_window, window::toggle_maximize, window::hide_window, window::pick_folder,
            run_windows_ocr, check_windows_ocr,
        ])
        .setup(|app| {
            let base = app_data_dir(app.handle());
            let _ = fs::create_dir_all(&base);
            let _ = migrate_legacy_app_data(app.handle());

            let data_subdir = base.join("data");
            let _ = fs::create_dir_all(&data_subdir);
            let _ = fs::create_dir_all(base.join("cache"));

            // Migrate old config.json location
            let old_config = base.join("config.json");
            let new_config = data_subdir.join("config.json");
            if old_config.exists() && !new_config.exists() {
                let _ = fs::rename(&old_config, &new_config);
            }

            // Ensure data directory exists
            let _ = fs::create_dir_all(get_data_dir(app.handle()));

            let data_dir = get_data_dir(app.handle());
            // Migrate old JSON files to data/ subdirectory
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



            // Window & tray setup
            let _ = window::setup_window(app.handle());
            let _ = window::setup_tray(app.handle());

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
