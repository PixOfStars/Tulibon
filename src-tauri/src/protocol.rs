// ===================================================================
// plugin:// 自定义协议 — 为每个插件提供本地文件访问
// ===================================================================

use std::fs;
use std::path::PathBuf;
use tauri::http::{Response, StatusCode};
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

type HttpRequest = tauri::http::Request<Vec<u8>>;
type HttpResponse = tauri::http::Response<Vec<u8>>;

fn error_response(status: StatusCode, msg: &str) -> HttpResponse {
    eprintln!("[plugin://] ERROR {:?}: {}", status, msg);
    Response::builder()
        .status(status)
        .body(msg.as_bytes().to_vec())
        .unwrap_or_else(|_| Response::new(Vec::new()))
}

/// Handle plugin:// requests.
/// URI format: plugin://{plugin_id}/{file_path}
/// Example:  plugin://history/index.js  →  {app_data}/plugins/history/index.js (or source plugins/ dir as fallback)
pub fn plugin_protocol(
    ctx: tauri::UriSchemeContext<'_, tauri::Wry>,
    request: HttpRequest,
) -> HttpResponse {
    let app = ctx.app_handle();
    let uri = request.uri().to_string();
    eprintln!("[plugin://] request: {}", uri);

    let path = uri.strip_prefix("plugin://").unwrap_or("");
    let mut parts = path.splitn(2, '/');
    let plugin_id = parts.next().unwrap_or("");
    let file_path = parts.next().unwrap_or("");

    eprintln!("[plugin://] plugin_id={}, file_path={}", plugin_id, file_path);

    if plugin_id.is_empty() || file_path.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "empty plugin_id or file_path");
    }

    // Try app_data plugins first
    let mut plugin_dir = app_data_dir(app).join("plugins").join(plugin_id);
    let mut full_path = plugin_dir.join(file_path);
    
    // If not found in app_data, try source plugins directory (for built-in plugins in dev)
    if !full_path.exists() {
        eprintln!("[plugin://] Not found in app_data, trying source plugins dir");
        let source_plugins = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .map(|p| p.join("plugins"))
            .map(|p| p.join(plugin_id));
        
        if let Some(source_dir) = source_plugins {
            let source_path = source_dir.join(file_path);
            if source_path.exists() {
                eprintln!("[plugin://] Found in source dir: {}", source_path.display());
                plugin_dir = source_dir;
                full_path = source_path;
            }
        }
    }
    
    eprintln!("[plugin://] plugin_dir={}", plugin_dir.display());
    eprintln!("[plugin://] full_path={}", full_path.display());

    // Prevent directory traversal — canonicalize BOTH paths before comparing
    let canonical_dir = match plugin_dir.canonicalize() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[plugin://] canonicalize plugin_dir failed: {}", e);
            return error_response(StatusCode::NOT_FOUND, "plugin dir not found");
        }
    };

    let canonical = match full_path.canonicalize() {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[plugin://] canonicalize full_path failed: {}", e);
            return error_response(StatusCode::NOT_FOUND, "file not found");
        }
    };

    eprintln!("[plugin://] canonical_dir={}", canonical_dir.display());
    eprintln!("[plugin://] canonical={}", canonical.display());

    if !canonical.starts_with(&canonical_dir) {
        eprintln!("[plugin://] FORBIDDEN: canonical doesn't start with canonical_dir");
        return error_response(StatusCode::FORBIDDEN, "dir traversal blocked");
    }

    let data = match fs::read(&canonical) {
        Ok(d) => d,
        Err(e) => {
            eprintln!("[plugin://] read failed: {}", e);
            return error_response(StatusCode::NOT_FOUND, "read failed");
        }
    };

    let mime = if file_path.ends_with(".js") {
        "application/javascript"
    } else if file_path.ends_with(".css") {
        "text/css"
    } else if file_path.ends_with(".json") {
        "application/json"
    } else if file_path.ends_with(".svg") {
        "image/svg+xml"
    } else if file_path.ends_with(".png") {
        "image/png"
    } else {
        "application/octet-stream"
    };

    eprintln!("[plugin://] OK {} bytes, mime={}", data.len(), mime);

    Response::builder()
        .status(StatusCode::OK)
        .header("Content-Type", mime)
        .header("Access-Control-Allow-Origin", "*")
        .body(data)
        .unwrap_or_else(|_| error_response(StatusCode::INTERNAL_SERVER_ERROR, "builder failed"))
}
