// ===================================================================
// plugin:// 自定义协议 — 为每个插件提供本地文件访问
// ===================================================================

use std::fs;
use std::path::PathBuf;
use tauri::http::{Response, StatusCode};

fn app_data_dir(app: &tauri::AppHandle) -> PathBuf {
    crate::app_paths::app_data_dir(app)
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
/// Example:  plugin://history/index.js  →  {exe_dir}/plugins/history/index.js (or bundled resource plugins/ as fallback)
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

    eprintln!(
        "[plugin://] plugin_id={}, file_path={}",
        plugin_id, file_path
    );

    if plugin_id.is_empty() || file_path.is_empty() {
        return error_response(StatusCode::BAD_REQUEST, "empty plugin_id or file_path");
    }

    // Try portable plugins first, then bundled resources. The old source-tree
    // fallback only works in development and is handled by app_paths in debug builds.
    let portable_plugin_dir = app_data_dir(app).join("plugins").join(plugin_id);
    let bundled_plugin_dir = crate::app_paths::bundled_plugins_dir(app).map(|p| p.join(plugin_id));

    let mut candidates = vec![portable_plugin_dir];
    if let Some(path) = bundled_plugin_dir {
        candidates.push(path);
    }

    let mut selected = None;
    for dir in candidates {
        let path = dir.join(file_path);
        if path.exists() {
            selected = Some((dir, path));
            break;
        }
    }

    let (plugin_dir, full_path) = match selected {
        Some(paths) => paths,
        None => {
            eprintln!("[plugin://] file not found in portable plugins or bundled resources");
            return error_response(StatusCode::NOT_FOUND, "file not found");
        }
    };

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
