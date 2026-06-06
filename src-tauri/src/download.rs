// ===================================================================
// OCR 模型文件按需下载 + 镜像源预检 + ZIP 解压
// ===================================================================

use std::fs;
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::io::{AsyncWriteExt, AsyncReadExt};
use tokio_stream::StreamExt;
use tokio_util::io::StreamReader;

/// 下载进度信息
#[derive(Clone, serde::Serialize)]
pub struct DownloadProgress {
    pub engine: String,
    pub stage: String,       // "connecting" | "downloading" | "extracting" | "done" | "error"
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub current_source: String,
    pub message: String,
}

/// 镜像源 HEAD 预检缓存
struct MirrorCache {
    results: Vec<(String, u64, Instant)>, // (prefix, latency_ms, cached_at)
}

impl MirrorCache {
    fn new() -> Self { Self { results: Vec::new() } }
    fn get(&self) -> Option<&[(String, u64, Instant)]> {
        if self.results.is_empty() { return None; }
        // 检查缓存是否过期（5 分钟）
        let now = Instant::now();
        if now.duration_since(self.results[0].2) > Duration::from_secs(300) {
            return None;
        }
        Some(&self.results)
    }
    fn set(&mut self, results: Vec<(String, u64)>) {
        let now = Instant::now();
        self.results = results.into_iter().map(|(p, l)| (p, l, now)).collect();
    }
}

static MIRROR_CACHE: std::sync::Mutex<Option<MirrorCache>> = std::sync::Mutex::new(None);

/// HEAD 预检：并行测试各镜像的可用性和延迟
pub async fn precheck_mirrors(urls: &[String]) -> Vec<(String, u64)> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_default();

    let mut handles = Vec::new();
    for url in urls {
        let client = client.clone();
        let u = url.clone();
        handles.push(tokio::spawn(async move {
            let start = Instant::now();
            match client.head(&u).send().await {
                Ok(resp) if resp.status().is_success() => {
                    Some((u, start.elapsed().as_millis() as u64))
                }
                _ => None,
            }
        }));
    }

    let mut results = Vec::new();
    for h in handles {
        if let Ok(Some(r)) = h.await {
            results.push(r);
        }
    }
    results.sort_by_key(|(_, ms)| *ms);
    results
}

/// 获取最快可用镜像（优先使用缓存）
async fn fastest_mirror(urls: &[String]) -> Option<String> {
    // 检查/初始化缓存
    {
        let mut guard = MIRROR_CACHE.lock().unwrap_or_else(|e| e.into_inner());
        if guard.is_none() {
            *guard = Some(MirrorCache::new());
        }
        if let Some(ref cache) = *guard {
            if let Some(results) = cache.get() {
                if !results.is_empty() {
                    return Some(results[0].0.clone());
                }
            }
        }
    }

    let results = precheck_mirrors(urls).await;

    // 写入缓存
    {
        let mut guard = MIRROR_CACHE.lock().unwrap_or_else(|e| e.into_inner());
        if let Some(ref mut cache) = *guard {
            cache.set(results.clone());
        }
    }

    results.first().map(|(url, _)| url.clone())
}

/// 下载模型文件并解压到目标目录
/// `on_progress`: 进度回调闭包，用于 Tauri 事件发射
pub async fn download_and_extract(
    engine: &str,
    urls: &[String],
    dest_dir: &Path,
    cancel_flag: Option<Arc<AtomicBool>>,
    on_progress: impl Fn(DownloadProgress),
) -> Result<(), String> {
    let engine_owned = engine.to_string();

    // 1. 选最快的镜像源，预检失败则直接用原始 URL
    let mirror = fastest_mirror(urls).await
        .unwrap_or_else(|| urls.first().cloned().unwrap_or_default());

    on_progress(DownloadProgress {
        engine: engine_owned.clone(),
        stage: "connecting".into(),
        bytes_downloaded: 0,
        total_bytes: 0,
        current_source: mirror.clone(),
        message: "正在连接下载源…".into(),
    });

    // 2. 下载到临时文件（遍历 URL 直到成功）
    let tmp_dir = tempfile::tempdir().map_err(|e| format!("创建临时目录失败: {}", e))?;
    let tmp_zip = tmp_dir.path().join("model.zip");

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| format!("创建 HTTP 客户端失败: {}", e))?;

    // Try each URL until one succeeds — collect ALL errors for diagnostics
    let mut errors: Vec<(String, String)> = Vec::new();
    let mut response = None;
    for url in urls {
        match client.get(url).send().await {
            Ok(resp) if resp.status().is_success() => {
                response = Some(resp);
                break;
            }
            Ok(resp) => {
                errors.push((url.to_string(), format!("HTTP {}", resp.status())));
            }
            Err(e) => {
                errors.push((url.to_string(), format!("{}", e)));
            }
        }
    }
    let response = response.ok_or_else(|| {
        let details: Vec<String> = errors
            .iter()
            .enumerate()
            .map(|(i, (url, err))| format!("  [{}] {} → {}", i + 1, url, err))
            .collect();
        format!(
            "[{}] 所有 {} 个下载源均不可用:\n{}",
            engine,
            errors.len(),
            details.join("\n")
        )
    })?;

    let total_size = response.content_length().unwrap_or(0);
    let mut downloaded: u64 = 0;
    let mut file = tokio::fs::File::create(&tmp_zip).await
        .map_err(|e| format!("创建临时文件失败: {}", e))?;

    let stream = response.bytes_stream();
    // 流式写入
    let mut reader = StreamReader::new(
        stream.map(|chunk| {
            chunk.map_err(std::io::Error::other)
        })
    );
    let mut buf = [0u8; 8192];
    loop {
        // 检查取消标志
        if let Some(ref cancel) = cancel_flag {
            if cancel.load(Ordering::Relaxed) {
                return Err("下载已取消".into());
            }
        }
        let n = reader.read(&mut buf).await
            .map_err(|e| format!("读取下载流失败: {}", e))?;
        if n == 0 { break; }
        file.write_all(&buf[..n]).await
            .map_err(|e| format!("写入临时文件失败: {}", e))?;
        downloaded += n as u64;

        on_progress(DownloadProgress {
            engine: engine_owned.clone(),
            stage: "downloading".into(),
            bytes_downloaded: downloaded,
            total_bytes: total_size,
            current_source: mirror.clone(),
            message: format!("下载中 {:.1}MB / {:.1}MB", downloaded as f64 / 1_048_576.0, total_size as f64 / 1_048_576.0),
        });
    }
    file.flush().await.map_err(|e| format!("刷新文件失败: {}", e))?;
    drop(file);

    // 3. 解压
    on_progress(DownloadProgress {
        engine: engine_owned.clone(),
        stage: "extracting".into(),
        bytes_downloaded: downloaded,
        total_bytes: total_size,
        current_source: mirror,
        message: "正在解压模型文件…".into(),
    });

    // 读取 ZIP 并解压
    let zip_bytes = tokio::fs::read(&tmp_zip).await
        .map_err(|e| format!("读取临时 ZIP 文件失败: {}", e))?;
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(&zip_bytes))
        .map_err(|e| format!("ZIP 解析失败: {}", e))?;

    // 确保目标目录存在
    fs::create_dir_all(dest_dir).map_err(|e| format!("创建目标目录失败: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i)
            .map_err(|e| format!("读取 ZIP 条目失败: {}", e))?;
        let entry_name = entry.name().to_string();
        // 路径安全检查
        let entry_path = dest_dir.join(&entry_name);
        if !entry_path.starts_with(dest_dir) {
            return Err(format!("非法 ZIP 条目路径: {}", entry_name));
        }
        if entry.is_dir() {
            fs::create_dir_all(&entry_path).map_err(|e| format!("创建目录失败 {}: {}", entry_name, e))?;
        } else {
            if let Some(parent) = entry_path.parent() {
                fs::create_dir_all(parent).map_err(|e| format!("创建父目录失败: {}", e))?;
            }
            let mut out = fs::File::create(&entry_path)
                .map_err(|e| format!("创建文件失败 {}: {}", entry_name, e))?;
            std::io::copy(&mut entry, &mut out)
                .map_err(|e| format!("解压文件失败 {}: {}", entry_name, e))?;
        }
    }

    on_progress(DownloadProgress {
        engine: engine_owned,
        stage: "done".into(),
        bytes_downloaded: downloaded,
        total_bytes: total_size,
        current_source: String::new(),
        message: "模型下载完成".into(),
    });

    // 清理临时目录（自动在 drop 时清理）
    drop(archive);
    let _ = fs::remove_file(&tmp_zip);

    Ok(())
}

/// 写入 OCR 日志
pub fn write_log(data_dir: &Path, message: &str) {
    let log_dir = data_dir.join("logs");
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join("ocr_errors.log");
    let timestamp = chrono::Local::now().format("%Y-%m-%d %H:%M:%S%.3f");
    if let Ok(mut file) = fs::OpenOptions::new().create(true).append(true).open(&log_path) {
        use std::io::Write;
        let _ = writeln!(file, "[{}] {}", timestamp, message);
    }
}
