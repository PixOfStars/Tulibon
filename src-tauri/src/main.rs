#![windows_subsystem = "windows"]

use windows::Win32::System::Registry::{
    RegOpenKeyExW, RegCloseKey, HKEY_LOCAL_MACHINE, HKEY_CURRENT_USER, KEY_READ, HKEY,
};
use windows::Win32::UI::WindowsAndMessaging::{
    MessageBoxW, MB_CANCELTRYCONTINUE, MB_ICONWARNING, MESSAGEBOX_RESULT,
};
use windows::Win32::UI::Shell::ShellExecuteW;

const WEBVIEW2_CLIENT_ID: &str = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}";
const DOWNLOAD_URL: &str = "https://go.microsoft.com/fwlink/p/?LinkId=2124703";
const MSG_TITLE: &str = "Tulibon - 缺少必要组件";
const MSG_BODY: &str = "\
本软件需要 Microsoft Edge WebView2 组件才能运行。\n\n\
点击「继续」将打开微软官方下载页面，请下载并安装，完成后重新打开本软件。\n\n\
点击「重试」重新检测安装。\n\
点击「取消」退出应用。";

fn to_pcwstr(s: &str) -> Vec<u16> {
    s.encode_utf16().chain(std::iter::once(0)).collect()
}

fn check_webview2_installed() -> bool {
    use windows::core::PCWSTR;

    let paths = [
        r"SOFTWARE\Microsoft\EdgeUpdate\Clients\",
        r"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\",
    ];

    for &base in &paths {
        let full_key: String = format!("{}{}", base, WEBVIEW2_CLIENT_ID);
        let wide = to_pcwstr(&full_key);
        let mut hkey = HKEY::default();
        let result = unsafe {
            RegOpenKeyExW(HKEY_LOCAL_MACHINE, PCWSTR::from_raw(wide.as_ptr()), Some(0u32), KEY_READ, &mut hkey)
        };
        if result.is_ok() {
            unsafe { let _ = RegCloseKey(hkey); }
            return true;
        }
    }

    let hkcu_key: String = format!(r"SOFTWARE\Microsoft\EdgeUpdate\Clients\{}", WEBVIEW2_CLIENT_ID);
    let wide = to_pcwstr(&hkcu_key);
    let mut hkey = HKEY::default();
    let result = unsafe {
        RegOpenKeyExW(HKEY_CURRENT_USER, PCWSTR::from_raw(wide.as_ptr()), Some(0u32), KEY_READ, &mut hkey)
    };
    if result.is_ok() {
        unsafe { let _ = RegCloseKey(hkey); }
        return true;
    }

    false
}

unsafe fn open_url(url: &str) {
    use windows::core::PCWSTR;
    let url_wide = to_pcwstr(url);
    let op_wide = to_pcwstr("open");
    let _ = ShellExecuteW(
        None,
        PCWSTR::from_raw(op_wide.as_ptr()),
        PCWSTR::from_raw(url_wide.as_ptr()),
        None,
        None,
        windows::Win32::UI::WindowsAndMessaging::SW_SHOWDEFAULT,
    );
}

unsafe fn show_dialog() -> MESSAGEBOX_RESULT {
    let title = to_pcwstr(MSG_TITLE);
    let body = to_pcwstr(MSG_BODY);
    MessageBoxW(
        None,
        windows::core::PCWSTR::from_raw(body.as_ptr()),
        windows::core::PCWSTR::from_raw(title.as_ptr()),
        MB_CANCELTRYCONTINUE | MB_ICONWARNING,
    )
}

fn main() {
    if std::env::consts::OS == "windows" && !check_webview2_installed() {
        loop {
            let button = unsafe { show_dialog() };
            if button == MESSAGEBOX_RESULT(4) { // IDCONTINUE = 4
                unsafe { open_url(DOWNLOAD_URL); }
                std::process::exit(0);
            } else if button == MESSAGEBOX_RESULT(10) { // IDTRYAGAIN = 10
                if check_webview2_installed() {
                    break;
                }
            } else {
                std::process::exit(0);
            }
        }
    }

    ai_vision::run()
}
