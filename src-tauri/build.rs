use std::path::PathBuf;

fn main() {
    tauri_build::build();

    // Copy WebView2Loader.dll alongside the executable (GNU toolchain requirement)
    let manifest_dir = PathBuf::from(std::env::var("CARGO_MANIFEST_DIR").unwrap());
    let dll_src = manifest_dir.join("WebView2Loader.dll");
    if dll_src.exists() {
        let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
        let profile_dir = out_dir
            .parent().and_then(|p| p.parent()).and_then(|p| p.parent())
            .expect("failed to resolve target profile dir");
        let _ = std::fs::copy(&dll_src, profile_dir.join("WebView2Loader.dll"));
    }

    // Custom VersionInfo for Windows (GNU toolchain via windres)
    let target = std::env::var("TARGET").unwrap();
    if target.contains("windows") && target.contains("gnu") {
        let version = env!("CARGO_PKG_VERSION");
        let comma_ver = version.replace('.', ",");

        let icon_path = manifest_dir.join("icons").join("icon.ico");
        let icon_abs = icon_path.to_string_lossy().replace('\\', "\\\\");

        let rc_content = format!(
            r#"#pragma code_page(65001)
1 VERSIONINFO
FILEVERSION {comma_ver},0
PRODUCTVERSION {comma_ver},0
FILEOS 0x40004
FILETYPE 0x1
FILESUBTYPE 0x0
FILEFLAGSMASK 0x3f
FILEFLAGS 0x0
{{
BLOCK "StringFileInfo"
{{
BLOCK "080904b0"
{{
VALUE "CompanyName", "PixOfStars"
VALUE "FileDescription", "AI Vision - AI 图片分析工具"
VALUE "FileVersion", "{version}"
VALUE "InternalName", "AI-Vision"
VALUE "LegalCopyright", "Copyright © 2026 PixOfStars. All rights reserved."
VALUE "OriginalFilename", "AI-Vision.exe"
VALUE "ProductName", "AI Vision"
VALUE "ProductVersion", "{version}"
}}
}}
BLOCK "VarFileInfo"
{{
VALUE "Translation", 0x809, 1200
}}
}}

32512 ICON "{icon_abs}"

1 24
{{
" <assembly xmlns=""urn:schemas-microsoft-com:asm.v1"" manifestVersion=""1.0""> "
" <dependency> "
" <dependentAssembly> "
" <assemblyIdentity "
" type=""win32"" "
" name=""Microsoft.Windows.Common-Controls"" "
" version=""6.0.0.0"" "
" processorArchitecture=""*"" "
" publicKeyToken=""6595b64144ccf1df"" "
" language=""*"" "
" /> "
" </dependentAssembly> "
" </dependency> "
" </assembly> "
}}
"#,
            comma_ver = comma_ver,
            version = version,
            icon_abs = icon_abs,
        );

        let out_dir = PathBuf::from(std::env::var("OUT_DIR").unwrap());
        let rc_path = out_dir.join("resource.rc");
        let res_path = out_dir.join("libresource.a");

        std::fs::write(&rc_path, rc_content).expect("failed to write resource.rc");

        // Compile with windres: .rc -> COFF .o
        let status = std::process::Command::new("windres")
            .args([rc_path.to_str().unwrap(), "-O", "coff", "-o", res_path.to_str().unwrap()])
            .status()
            .expect("failed to run windres");

        if !status.success() {
            panic!("windres failed with status: {:?}", status.code());
        }

        println!("cargo:rerun-if-changed=build.rs");
    }
}
