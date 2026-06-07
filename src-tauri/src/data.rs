use std::fs;
use std::path::Path;

/// Load records from JSON file. Returns "[]" if file doesn't exist.
pub fn load_records(path: &Path) -> Result<String, String> {
    if path.exists() {
        fs::read_to_string(path).map_err(|e| format!("Failed to read records: {}", e))
    } else {
        Ok("[]".to_string())
    }
}

/// Save records to JSON file. Creates parent directory if needed.
pub fn save_records(path: &Path, records_json: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    fs::write(path, records_json).map_err(|e| format!("Failed to save records: {}", e))
}

/// Delete a record from the JSON file and return image paths to clean up.
pub fn delete_record(path: &Path, record_id: &str) -> Result<Vec<String>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let mut records: Vec<serde_json::Value> = serde_json::from_str(&raw).map_err(|e| e.to_string())?;

    // Collect image paths for cleanup
    let paths: Vec<String> = records
        .iter()
        .filter(|r| r.get("id").and_then(|v| v.as_str()) == Some(record_id))
        .filter_map(|r| {
            r.get("imagePath")
                .and_then(|v| v.as_str())
                .filter(|p| !p.is_empty() && !p.starts_with("data:"))
                .map(|p| p.to_string())
        })
        .collect();

    records.retain(|r| r.get("id").and_then(|v| v.as_str()) != Some(record_id));

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(path, serde_json::to_string_pretty(&records).unwrap_or_default())
        .map_err(|e| e.to_string())?;

    Ok(paths)
}

/// Load collections from JSON file. Returns "[]" if file doesn't exist.
pub fn load_collections(path: &Path) -> Result<String, String> {
    if path.exists() {
        fs::read_to_string(path).map_err(|e| format!("Failed to read collections: {}", e))
    } else {
        Ok("[]".to_string())
    }
}

/// Save collections to JSON file.
pub fn save_collections(path: &Path, collections_json: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    fs::write(path, collections_json).map_err(|e| format!("Failed to save collections: {}", e))
}

/// Load tags from JSON file. Returns "[]" if file doesn't exist.
pub fn load_tags(path: &Path) -> Result<String, String> {
    if path.exists() {
        fs::read_to_string(path).map_err(|e| format!("Failed to read tags: {}", e))
    } else {
        Ok("[]".to_string())
    }
}

/// Save tags to JSON file.
pub fn save_tags(path: &Path, tags_json: &str) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create data dir: {}", e))?;
    }
    fs::write(path, tags_json).map_err(|e| format!("Failed to save tags: {}", e))
}
