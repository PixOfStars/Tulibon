use std::path::PathBuf;
use tauri::Manager;

/// Return the portable data root that lives next to the executable.
///
/// Layout:
/// - {exe_dir}/data     -> app config/history/collections/images/plugin configs
/// - {exe_dir}/plugins  -> installed and bundled plugins
/// - {exe_dir}/cache    -> registry/OCR caches
pub fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .or_else(|| std::env::current_dir().ok())
        .or_else(|| app.path().app_data_dir().ok())
        .unwrap_or_else(|| PathBuf::from("."))
}

/// Previous Tauri-managed app data directory, used only for one-time migration.
pub fn legacy_app_data_dir(app: &tauri::AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok()
}


