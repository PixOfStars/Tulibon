use base64::Engine;
use std::fs;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::DragDropEvent;
use tauri::{Emitter, Manager};

pub fn setup_window(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    if let Some(window) = app.get_webview_window("main") {
        let icon_img = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
            .unwrap_or_else(|_| tauri::image::Image::new(&[], 1, 1));
        let _ = window.set_icon(icon_img);

        // Windows border color
        #[cfg(target_os = "windows")]
        set_window_border_color(&window);

        // Window event handlers (close → hide, drag-drop)
        let w = window.clone();
        let app_handle = app.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = w.hide();
            }
            if let tauri::WindowEvent::DragDrop(drag_event) = event {
                if let DragDropEvent::Drop { paths, .. } = drag_event {
                    let data_urls: Vec<String> = paths
                        .iter()
                        .filter_map(|path| {
                            let bytes = fs::read(path).ok()?;
                            let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
                            let ext = path
                                .extension()
                                .and_then(|e| e.to_str())
                                .unwrap_or("png")
                                .to_lowercase();
                            let mime = match ext.as_str() {
                                "jpg" | "jpeg" => "image/jpeg",
                                "webp" => "image/webp",
                                "bmp" => "image/bmp",
                                "gif" => "image/gif",
                                _ => "image/png",
                            };
                            Some(format!("data:{};base64,{}", mime, b64))
                        })
                        .collect();
                    if !data_urls.is_empty() {
                        let _ = app_handle.emit("file-drop", &data_urls);
                    }
                }
            }
        });
    }
    Ok(())
}

pub fn setup_tray(app: &tauri::AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let show_item = MenuItemBuilder::with_id("show", "显示 / Show").build(app)?;
    let quit_item = MenuItemBuilder::with_id("quit", "退出 / Quit").build(app)?;
    let menu = MenuBuilder::new(app)
        .item(&show_item)
        .item(&quit_item)
        .build()?;

    let tray_icon = tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png"))
        .unwrap_or_else(|_| tauri::image::Image::new(&[], 1, 1));

    let tray_lock = Arc::new(AtomicBool::new(false));

    let _tray = TrayIconBuilder::new()
        .icon(tray_icon)
        .menu(&menu)
        .tooltip("Tulibon")
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(move |tray, event| {
            if let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            {
                if button == MouseButton::Left && button_state == MouseButtonState::Up {
                    if tray_lock
                        .compare_exchange(false, true, Ordering::Acquire, Ordering::Relaxed)
                        .is_err()
                    {
                        return;
                    }
                    let app = tray.app_handle();
                    if let Some(w) = app.get_webview_window("main") {
                        if w.is_visible().unwrap_or(false) {
                            let _ = w.hide();
                        } else {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    let lock = tray_lock.clone();
                    std::thread::spawn(move || {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        lock.store(false, Ordering::Release);
                    });
                }
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg(target_os = "windows")]
fn set_window_border_color(window: &tauri::WebviewWindow) {
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

// ── Tauri Commands ──

#[tauri::command]
pub fn minimize_window(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?
        .minimize()
        .map_err(|e| format!("Minimize failed: {}", e))
}

#[tauri::command]
pub fn toggle_maximize(app: tauri::AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?;
    if window.is_maximized().unwrap_or(false) {
        window.unmaximize().map_err(|e| format!("Unmaximize failed: {}", e))
    } else {
        window.maximize().map_err(|e| format!("Maximize failed: {}", e))
    }
}

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("main")
        .ok_or_else(|| "window not found".to_string())?
        .hide()
        .map_err(|e| format!("Hide failed: {}", e))
}

#[tauri::command]
pub fn pick_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let folder = app.dialog().file().blocking_pick_folder();
    Ok(folder.map(|p| p.to_string()))
}

#[tauri::command]
pub fn set_autostart(enabled: bool) -> Result<(), String> {
    let exe = std::env::current_exe().map_err(|e| format!("Failed to get exe path: {}", e))?;
    let exe_str = exe.to_string_lossy().to_string();
    let auto = auto_launch::AutoLaunchBuilder::new()
        .set_app_name("Tulibon")
        .set_app_path(&exe_str)
        .build()
        .map_err(|e| format!("Autostart setup failed: {}", e))?;
    if enabled {
        auto.enable().map_err(|e| format!("Autostart enable failed: {}", e))?;
    } else {
        auto.disable().map_err(|e| format!("Autostart disable failed: {}", e))?;
    }
    Ok(())
}
