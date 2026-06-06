// ===================================================================
// Config encryption helpers — DPAPI + JSON field-level encrypt/decrypt
// ===================================================================

use base64::Engine;
use windows::Win32::Security::Cryptography::{
    CryptProtectData, CryptUnprotectData, CRYPT_INTEGER_BLOB as CRYPTOAPI_BLOB,
};

const CRYPTPROTECT_UI_FORBIDDEN: u32 = 0x1;

/// Magic prefix to unambiguously mark DPAPI-encrypted Base64 values.
pub const DPAPI_MAGIC: &str = "DPAPI:";

pub fn dpapi_encrypt(plaintext: &[u8]) -> Result<Vec<u8>, String> {
    if plaintext.is_empty() {
        return Ok(Vec::new());
    }
    unsafe {
        // CRYPTOAPI_BLOB.pbData is typed as *mut u8 in the windows crate, but
        // CryptProtectData treats the input blob as read-only. We cast through
        // *const u8 first to document the intent, then to *mut u8 for ABI compat.
        let input = CRYPTOAPI_BLOB {
            cbData: plaintext.len() as u32,
            pbData: plaintext.as_ptr() as *const u8 as *mut u8,
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
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData as *mut std::ffi::c_void,
        )));
        Ok(bytes)
    }
}

pub fn dpapi_decrypt(ciphertext: &[u8]) -> Result<Vec<u8>, String> {
    if ciphertext.is_empty() {
        return Ok(Vec::new());
    }
    unsafe {
        // Same cast chain as dpapi_encrypt: CryptUnprotectData also treats input as read-only.
        let input = CRYPTOAPI_BLOB {
            cbData: ciphertext.len() as u32,
            pbData: ciphertext.as_ptr() as *const u8 as *mut u8,
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
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData as *mut std::ffi::c_void,
        )));
        Ok(bytes)
    }
}

/// Encrypt all API keys in config JSON. Returns the modified JSON string.
pub fn encrypt_config_keys(raw: &str) -> Result<String, String> {
    let mut parsed: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    if let Some(providers) = parsed.get_mut("providers").and_then(|v| v.as_array_mut()) {
        for provider in providers.iter_mut() {
            if let Some(key) = provider.get_mut("apiKey").and_then(|v| v.as_str()) {
                if !key.is_empty() && !key.starts_with(DPAPI_MAGIC) {
                    let plain = key.as_bytes();
                    let enc = dpapi_encrypt(plain)?;
                    let b64 = base64::engine::general_purpose::STANDARD.encode(&enc);
                    provider["apiKey"] =
                        serde_json::Value::String(format!("{}{}", DPAPI_MAGIC, b64));
                }
            }
        }
    }
    serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
}

/// Decrypt all API keys in config JSON. Returns the modified JSON string.
pub fn decrypt_config_keys(raw: &str) -> Result<String, String> {
    let mut parsed: serde_json::Value = serde_json::from_str(raw).map_err(|e| e.to_string())?;
    if let Some(providers) = parsed.get_mut("providers").and_then(|v| v.as_array_mut()) {
        for provider in providers.iter_mut() {
            if let Some(key) = provider.get_mut("apiKey").and_then(|v| v.as_str()) {
                if let Some(encoded) = key.strip_prefix(DPAPI_MAGIC) {
                    // &str implements AsRef<[u8]>, so passing encoded directly is idiomatic
                    let decoded = base64::engine::general_purpose::STANDARD
                        .decode(encoded)
                        .map_err(|e| e.to_string())?;
                    let plain = dpapi_decrypt(&decoded)?;
                    provider["apiKey"] = serde_json::Value::String(
                        String::from_utf8(plain).map_err(|e| e.to_string())?,
                    );
                }
            }
        }
    }
    serde_json::to_string_pretty(&parsed).map_err(|e| e.to_string())
}