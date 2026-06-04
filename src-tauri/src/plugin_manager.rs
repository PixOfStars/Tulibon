// ===================================================================
// 插件管理器 — 安装/卸载/启用/禁用 插件生命周期命令
// ===================================================================

use crate::download;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Emitter;

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    crate::app_paths::app_data_dir(app)
}

fn plugins_dir(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("plugins")
}

/// Hardcoded URL to the official plugin registry (GitHub Releases).
const REGISTRY_URL: &str =
    "https://github.com/PixOfStars/AI-Vision/releases/latest/download/plugins.json";

fn registry_cache_path(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("cache").join("plugin_registry.json")
}

fn plugin_config_dir(app: &tauri::AppHandle) -> PathBuf {
    app_data_dir(app).join("data").join("plugin_configs")
}

fn plugin_config_path(app: &tauri::AppHandle, plugin_id: &str) -> PathBuf {
    plugin_config_dir(app).join(format!("{}.json", plugin_id))
}

// ── Types ──

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginManifest {
    pub id: String,
    pub name: serde_json::Value, // { zh, en }
    pub version: String,
    pub entry: String,
    pub icon: String,
    #[serde(default)]
    pub order: i32,
    #[serde(default)]
    pub permissions: Vec<String>,
    #[serde(default)]
    pub description: Option<serde_json::Value>, // { zh, en }
    #[serde(default)]
    pub routes: Option<PluginRoutes>,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct PluginRoutes {
    #[serde(default)]
    pub main: Option<String>,
    #[serde(default)]
    pub settings: Option<String>,
}

#[derive(Clone, serde::Serialize)]
pub struct PluginListEntry {
    pub manifest: PluginManifest,
    pub installed: bool,
    pub enabled: bool,
    pub path: String,
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct RegistryEntry {
    pub id: String,
    pub name: serde_json::Value, // { zh, en }
    pub version: String,
    pub description: Option<serde_json::Value>, // { zh, en }
    pub url: String,                            // direct download URL for the plugin ZIP
    pub icon: String,
    #[serde(default)]
    pub order: i32,
}

// ── Helpers ──

fn read_manifest(plugin_dir: &std::path::Path) -> Option<PluginManifest> {
    let manifest_path = plugin_dir.join("plugin.json");
    let raw = fs::read_to_string(&manifest_path).ok()?;
    serde_json::from_str::<PluginManifest>(&raw).ok()
}

fn copy_dir(src: &Path, dest: &Path) -> Result<(), String> {
    fs::create_dir_all(dest).map_err(|e| format!("创建目录失败: {}", e))?;
    for entry in fs::read_dir(src).map_err(|e| format!("读取目录失败: {}", e))? {
        let entry = entry.map_err(|e| format!("读取目录条目失败: {}", e))?;
        let src_path = entry.path();
        let dest_path = dest.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir(&src_path, &dest_path)?;
        } else if src_path.is_file() {
            fs::copy(&src_path, &dest_path).map_err(|e| format!("复制文件失败: {}", e))?;
        }
    }
    Ok(())
}

pub fn ensure_bundled_plugins(app: &tauri::AppHandle) -> Result<(), String> {
    let Some(bundled_root) = crate::app_paths::bundled_plugins_dir(app) else {
        return Ok(());
    };

    let plugins_root = plugins_dir(app);
    fs::create_dir_all(&plugins_root).map_err(|e| format!("创建插件目录失败: {}", e))?;

    for entry in fs::read_dir(&bundled_root).map_err(|e| format!("读取内置插件目录失败: {}", e))?
    {
        let entry = entry.map_err(|e| format!("读取内置插件条目失败: {}", e))?;
        let source_dir = entry.path();
        if !source_dir.is_dir() {
            continue;
        }

        let Some(source_manifest) = read_manifest(&source_dir) else {
            continue;
        };

        let dest_dir = plugins_root.join(&source_manifest.id);
        let should_copy = match read_manifest(&dest_dir) {
            Some(existing) => existing.version != source_manifest.version,
            None => true,
        };

        if should_copy {
            if dest_dir.exists() {
                fs::remove_dir_all(&dest_dir).map_err(|e| format!("更新内置插件失败: {}", e))?;
            }
            copy_dir(&source_dir, &dest_dir)?;
        }
    }

    Ok(())
}

fn get_enabled_state(app: &tauri::AppHandle, plugin_id: &str) -> bool {
    let config_dir = app_data_dir(app).join("data");
    let config_path = config_dir.join("config.json");
    if let Ok(raw) = fs::read_to_string(&config_path) {
        if let Ok(config) = serde_json::from_str::<serde_json::Value>(&raw) {
            if let Some(states) = config.get("pluginStates") {
                if let Some(state) = states.get(plugin_id) {
                    return state
                        .get("enabled")
                        .and_then(|v| v.as_bool())
                        .unwrap_or(true);
                }
            }
        }
    }
    true // default: enabled
}

fn set_enabled_state(app: &tauri::AppHandle, plugin_id: &str, enabled: bool) -> Result<(), String> {
    let config_dir = app_data_dir(app).join("data");
    let config_path = config_dir.join("config.json");
    let mut config: serde_json::Value = if config_path.exists() {
        let raw = fs::read_to_string(&config_path).map_err(|e| format!("读取配置失败: {}", e))?;
        serde_json::from_str(&raw).map_err(|e| format!("解析配置失败: {}", e))?
    } else {
        serde_json::json!({})
    };

    let states = config
        .as_object_mut()
        .ok_or("配置格式错误")?
        .entry("pluginStates")
        .or_insert_with(|| serde_json::json!({}));

    let state = states
        .as_object_mut()
        .ok_or("pluginStates 格式错误")?
        .entry(plugin_id)
        .or_insert_with(|| serde_json::json!({}));

    state["enabled"] = serde_json::Value::Bool(enabled);

    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
    }
    fs::write(
        &config_path,
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    )
    .map_err(|e| format!("保存配置失败: {}", e))?;

    Ok(())
}

// ── Commands ──

#[tauri::command]
pub fn list_plugins(app: tauri::AppHandle) -> Result<Vec<PluginListEntry>, String> {
    let plugins_root = plugins_dir(&app);
    let mut entries = Vec::new();

    if plugins_root.exists() {
        if let Ok(dir_entries) = fs::read_dir(&plugins_root) {
            for entry in dir_entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    if let Some(manifest) = read_manifest(&path) {
                        let enabled = get_enabled_state(&app, &manifest.id);
                        entries.push(PluginListEntry {
                            installed: true,
                            enabled,
                            path: path.to_string_lossy().to_string(),
                            manifest,
                        });
                    }
                }
            }
        }
    }

    // Sort by order
    entries.sort_by_key(|e| e.manifest.order);
    Ok(entries)
}

#[tauri::command]
pub async fn install_plugin(app: tauri::AppHandle, url: String) -> Result<PluginListEntry, String> {
    let plugins_root = plugins_dir(&app);
    fs::create_dir_all(&plugins_root).map_err(|e| format!("创建插件目录失败: {}", e))?;

    // Build mirror URLs
    let urls = crate::download::build_download_urls(&url);

    // Create temp dir
    let temp_dir = tempfile::tempdir().map_err(|e| format!("创建临时目录失败: {}", e))?;
    let temp_extract = temp_dir.path().join("plugin_extract");
    fs::create_dir_all(&temp_extract).map_err(|e| format!("创建临时目录失败: {}", e))?;

    // Emit progress to frontend
    let app_handle = app.clone();
    let on_progress = move |progress: download::DownloadProgress| {
        let _ = app_handle.emit("plugin-install-progress", &progress);
    };

    on_progress(download::DownloadProgress {
        engine: "plugin_install".into(),
        stage: "connecting".into(),
        bytes_downloaded: 0,
        total_bytes: 0,
        current_source: String::new(),
        message: "正在连接下载源…".into(),
    });

    // Build HTTP client — no_proxy to skip system proxy (we confirmed GitHub direct works)
    let client = reqwest::Client::builder()
        .connect_timeout(std::time::Duration::from_secs(15))
        .timeout(std::time::Duration::from_secs(120))
        .redirect(reqwest::redirect::Policy::limited(10))
        .no_proxy()
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    // Try each URL until one succeeds
    let mut errors: Vec<(String, String)> = Vec::new();
    let mut zip_bytes: Option<Vec<u8>> = None;

    for url in &urls {
        match client.get(url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    let total_size = resp.content_length().unwrap_or(0);
                    match resp.bytes().await {
                        Ok(body) => {
                            on_progress(download::DownloadProgress {
                                engine: "plugin_install".into(),
                                stage: "downloading".into(),
                                bytes_downloaded: body.len() as u64,
                                total_bytes: total_size,
                                current_source: url.clone(),
                                message: format!("下载完成 {:.1}KB", body.len() as f64 / 1024.0),
                            });
                            zip_bytes = Some(body.to_vec());
                            break;
                        }
                        Err(e) => {
                            errors.push((url.to_string(), format!("读取响应体失败: {}", e)));
                        }
                    }
                } else {
                    errors.push((url.to_string(), format!("HTTP {}", resp.status().as_u16())));
                }
            }
            Err(e) => {
                let stage = if e.is_connect() {
                    "DNS/TCP"
                } else if e.is_timeout() {
                    "超时"
                } else if e.is_request() {
                    "TLS/发送"
                } else {
                    "其他"
                };
                errors.push((url.to_string(), format!("[{}] {}", stage, e)));
            }
        }
    }

    let zip_bytes = zip_bytes.ok_or_else(|| {
        let details: Vec<String> = errors
            .iter()
            .enumerate()
            .map(|(i, (u, err))| format!("  [{}] {} → {}", i + 1, u, err))
            .collect();
        format!(
            "所有 {} 个下载源均不可用:\n{}",
            errors.len(),
            details.join("\n")
        )
    })?;

    // Save ZIP to temp file
    let tmp_zip_path = temp_dir.path().join("plugin.zip");
    fs::write(&tmp_zip_path, &zip_bytes).map_err(|e| format!("写入临时 ZIP 失败: {}", e))?;

    // Extract
    on_progress(download::DownloadProgress {
        engine: "plugin_install".into(),
        stage: "extracting".into(),
        bytes_downloaded: zip_bytes.len() as u64,
        total_bytes: zip_bytes.len() as u64,
        current_source: String::new(),
        message: "正在解压…".into(),
    });

    let zip_cursor = std::io::Cursor::new(&zip_bytes);
    let mut archive =
        zip::ZipArchive::new(zip_cursor).map_err(|e| format!("ZIP 解析失败: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("读取 ZIP 条目 {} 失败: {}", i, e))?;
        let entry_name = entry.name().to_string();
        let entry_path = temp_extract.join(&entry_name);
        if !entry_path.starts_with(&temp_extract) {
            return Err(format!("非法 ZIP 条目路径: {}", entry_name));
        }
        if entry.is_dir() {
            fs::create_dir_all(&entry_path).map_err(|e| format!("创建目录失败: {}", e))?;
        } else {
            if let Some(parent) = entry_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("创建父目录失败: {}", e))?;
            }
            let mut out =
                fs::File::create(&entry_path).map_err(|e| format!("创建文件失败: {}", e))?;
            std::io::copy(&mut entry, &mut out).map_err(|e| format!("解压文件失败: {}", e))?;
        }
    }

    // Find plugin.json in extracted content (may be nested one level)
    let manifest = read_manifest(&temp_extract)
        .or_else(|| {
            if let Ok(entries) = fs::read_dir(&temp_extract) {
                for entry in entries.flatten() {
                    if entry.path().is_dir() {
                        if let Some(m) = read_manifest(&entry.path()) {
                            return Some(m);
                        }
                    }
                }
            }
            None
        })
        .ok_or("插件包中未找到 plugin.json")?;

    let plugin_dir = plugins_root.join(&manifest.id);
    if plugin_dir.exists() {
        fs::remove_dir_all(&plugin_dir).map_err(|e| format!("删除旧插件版本失败: {}", e))?;
    }

    // Copy extracted content to plugin dir
    let source_dir = if read_manifest(&temp_extract).is_some() {
        temp_extract.clone()
    } else if let Ok(entries) = fs::read_dir(&temp_extract) {
        let mut src = temp_extract.clone();
        for entry in entries.flatten() {
            if entry.path().is_dir() && read_manifest(&entry.path()).is_some() {
                src = entry.path();
                break;
            }
        }
        src
    } else {
        temp_extract.clone()
    };

    copy_dir(&source_dir, &plugin_dir)?;

    // Default to enabled
    let _ = set_enabled_state(&app, &manifest.id, true);

    on_progress(download::DownloadProgress {
        engine: "plugin_install".into(),
        stage: "done".into(),
        bytes_downloaded: zip_bytes.len() as u64,
        total_bytes: zip_bytes.len() as u64,
        current_source: String::new(),
        message: "安装完成".into(),
    });

    Ok(PluginListEntry {
        installed: true,
        enabled: true,
        path: plugin_dir.to_string_lossy().to_string(),
        manifest,
    })
}

#[tauri::command]
pub fn uninstall_plugin(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let plugin_dir = plugins_dir(&app).join(&id);
    if plugin_dir.exists() {
        fs::remove_dir_all(&plugin_dir).map_err(|e| format!("删除插件失败: {}", e))?;
    }
    // Clean up plugin config file
    let config_path = plugin_config_path(&app, &id);
    if config_path.exists() {
        let _ = fs::remove_file(&config_path);
    }
    // Clean up state
    let _ = set_enabled_state(&app, &id, false);
    Ok(())
}

#[tauri::command]
pub fn enable_plugin(app: tauri::AppHandle, id: String) -> Result<(), String> {
    set_enabled_state(&app, &id, true)
}

#[tauri::command]
pub fn disable_plugin(app: tauri::AppHandle, id: String) -> Result<(), String> {
    set_enabled_state(&app, &id, false)
}

#[tauri::command]
pub fn get_plugin_state(app: tauri::AppHandle, id: String) -> Result<bool, String> {
    Ok(get_enabled_state(&app, &id))
}

#[tauri::command]
pub fn get_plugin(app: tauri::AppHandle, id: String) -> Result<Option<PluginListEntry>, String> {
    let plugin_dir = plugins_dir(&app).join(&id);
    if !plugin_dir.exists() {
        return Ok(None);
    }
    if let Some(manifest) = read_manifest(&plugin_dir) {
        let enabled = get_enabled_state(&app, &manifest.id);
        Ok(Some(PluginListEntry {
            installed: true,
            enabled,
            path: plugin_dir.to_string_lossy().to_string(),
            manifest,
        }))
    } else {
        Ok(None)
    }
}

// ── Registry commands ──

#[tauri::command]
pub fn get_cached_registry(app: tauri::AppHandle) -> Result<Vec<RegistryEntry>, String> {
    let path = registry_cache_path(&app);
    if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| format!("读取缓存注册表失败: {}", e))?;
        return serde_json::from_str(&raw).map_err(|e| format!("解析注册表失败: {}", e));
    }

    if let Some(path) = crate::app_paths::bundled_registry_path(&app) {
        let raw = fs::read_to_string(&path).map_err(|e| format!("读取内置注册表失败: {}", e))?;
        return serde_json::from_str(&raw).map_err(|e| format!("解析内置注册表失败: {}", e));
    }

    Ok(Vec::new())
}

#[tauri::command]
pub async fn fetch_registry(app: tauri::AppHandle) -> Result<Vec<RegistryEntry>, String> {
    let fetch_result = async {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .no_proxy()
            .build()
            .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

        let response = client
            .get(REGISTRY_URL)
            .send()
            .await
            .map_err(|e| format!("获取注册表失败: {}", e))?;

        if !response.status().is_success() {
            return Err(format!(
                "获取注册表失败: HTTP {}",
                response.status().as_u16()
            ));
        }

        let body = response
            .text()
            .await
            .map_err(|e| format!("读取注册表响应失败: {}", e))?;

        let entries: Vec<RegistryEntry> =
            serde_json::from_str(&body).map_err(|e| format!("解析注册表失败: {}", e))?;

        let cache_path = registry_cache_path(&app);
        if let Some(parent) = cache_path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建缓存目录失败: {}", e))?;
        }
        fs::write(&cache_path, &body).map_err(|e| format!("缓存注册表失败: {}", e))?;

        Ok(entries)
    }
    .await;

    match fetch_result {
        Ok(entries) => Ok(entries),
        Err(err) => {
            let fallback = get_cached_registry(app)?;
            if fallback.is_empty() {
                Err(err)
            } else {
                Ok(fallback)
            }
        }
    }
}

// ── Plugin config commands ──

#[tauri::command]
pub fn get_plugin_config(
    app: tauri::AppHandle,
    plugin_id: String,
    key: String,
) -> Result<Option<serde_json::Value>, String> {
    let path = plugin_config_path(&app, &plugin_id);
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(&path).map_err(|e| format!("读取插件配置失败: {}", e))?;
    let config: serde_json::Value =
        serde_json::from_str(&raw).map_err(|e| format!("解析插件配置失败: {}", e))?;
    Ok(config.get(&key).cloned())
}

#[tauri::command]
pub fn set_plugin_config(
    app: tauri::AppHandle,
    plugin_id: String,
    key: String,
    value: serde_json::Value,
) -> Result<(), String> {
    let path = plugin_config_path(&app, &plugin_id);
    let mut config: serde_json::Value = if path.exists() {
        let raw = fs::read_to_string(&path).map_err(|e| format!("读取插件配置失败: {}", e))?;
        serde_json::from_str(&raw).map_err(|e| format!("解析插件配置失败: {}", e))?
    } else {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("创建配置目录失败: {}", e))?;
        }
        serde_json::json!({})
    };

    if let Some(obj) = config.as_object_mut() {
        obj.insert(key, value);
    }

    fs::write(
        &path,
        serde_json::to_string_pretty(&config).unwrap_or_default(),
    )
    .map_err(|e| format!("保存插件配置失败: {}", e))?;

    Ok(())
}
