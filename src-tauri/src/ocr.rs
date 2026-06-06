// ===================================================================
// Windows OCR — 通过 WinRT Windows.Media.Ocr 实现
// ===================================================================

use windows::Media::Ocr::OcrEngine;
use windows::Graphics::Imaging::{BitmapDecoder, SoftwareBitmap};
use windows::Storage::Streams::{InMemoryRandomAccessStream, DataWriter};
use windows::Globalization::Language;

/// 检测当前系统是否支持 Windows OCR
/// 通过尝试创建引擎 + 检查语言来探测
pub fn check_support(lang: &str) -> Result<OcrSupport, String> {
    // 尝试创建默认引擎（如果失败说明系统不支持 OCR）
    let default_engine = OcrEngine::TryCreateFromUserProfileLanguages();
    if default_engine.is_err() {
        return Ok(OcrSupport {
            available: false,
            lang_installed: false,
            message: "当前系统不支持 Windows OCR（需 Windows 10 或更高版本）".to_string(),
        });
    }

    // 检查指定语言是否可用
    let hstr = &windows::core::HSTRING::from(lang);
    let lang_obj = Language::CreateLanguage(hstr)
        .map_err(|e| format!("Invalid language tag '{}': {}", lang, e))?;
    let lang_ok = OcrEngine::IsLanguageSupported(&lang_obj)
        .map_err(|e| format!("Language check failed: {}", e))?;
    if !lang_ok {
        return Ok(OcrSupport {
            available: true,
            lang_installed: false,
            message: format!("系统未安装语言包 \"{}\"", lang),
        });
    }

    Ok(OcrSupport { available: true, lang_installed: true, message: String::new() })
}

#[derive(serde::Serialize)]
pub struct OcrSupport {
    pub available: bool,
    pub lang_installed: bool,
    pub message: String,
}

/// 在 Windows OCR 引擎上执行图片文字识别
pub async fn recognize(image_bytes: &[u8], lang: &str) -> Result<String, String> {
    // 1. 创建内存流
    let stream = InMemoryRandomAccessStream::new()
        .map_err(|e| format!("创建内存流失败: {}", e))?;

    // 2. 用 DataWriter 写入图片字节
    let writer = DataWriter::CreateDataWriter(&stream)
        .map_err(|e| format!("创建 DataWriter 失败: {}", e))?;
    writer.WriteBytes(image_bytes)
        .map_err(|e| format!("写入图片数据失败: {}", e))?;

    let store_op = writer.StoreAsync()
        .map_err(|e| format!("StoreAsync 失败: {}", e))?;
    let _stored: u32 = store_op.await
        .map_err(|e| format!("存储数据失败: {}", e))?;

    let flush_op = writer.FlushAsync()
        .map_err(|e| format!("FlushAsync 失败: {}", e))?;
    let _flushed: bool = flush_op.await
        .map_err(|e| format!("刷新数据失败: {}", e))?;

    stream.Seek(0)
        .map_err(|e| format!("重置流位置失败: {}", e))?;

    // 3. 创建 BitmapDecoder → SoftwareBitmap
    let decoder_op = BitmapDecoder::CreateAsync(&stream)
        .map_err(|e| format!("CreateAsync 失败: {}", e))?;
    let decoder: BitmapDecoder = decoder_op.await
        .map_err(|e| format!("创建图片解码器失败: {}", e))?;

    let sb_op = decoder.GetSoftwareBitmapAsync()
        .map_err(|e| format!("GetSoftwareBitmapAsync 失败: {}", e))?;
    let software_bitmap: SoftwareBitmap = sb_op.await
        .map_err(|e| format!("获取 SoftwareBitmap 失败: {}", e))?;

    // 4. 创建 OcrEngine（优先指定语言，失败则用系统用户配置语言）
    let mut fallback_used = false;
    let engine = if !lang.is_empty() {
        let hstr = &windows::core::HSTRING::from(lang);
        let language = Language::CreateLanguage(hstr)
            .map_err(|e| format!("无效的语言标签 '{}': {}", lang, e))?;
        let lang_supported = OcrEngine::IsLanguageSupported(&language)
            .map_err(|e| format!("语言支持检查失败: {}", e))?;
        if lang_supported {
            OcrEngine::TryCreateFromLanguage(&language)
        } else {
            fallback_used = true;
            OcrEngine::TryCreateFromUserProfileLanguages()
        }
    } else {
        OcrEngine::TryCreateFromUserProfileLanguages()
    }
    .map_err(|e| format!("创建 OCR 引擎失败: {}", e))?;

    // 5. 执行识别
    let recog_op = engine.RecognizeAsync(&software_bitmap)
        .map_err(|e| format!("RecognizeAsync 失败: {}", e))?;
    let result: windows::Media::Ocr::OcrResult = recog_op.await
        .map_err(|e| format!("OCR 识别失败: {}", e))?;

    let text = result.Text()
        .map_err(|e| format!("读取识别结果失败: {}", e))?;

    if fallback_used {
        Ok(format!(
            "[警告] 语言包 '{}' 不可用，已回退为系统默认语言。\n\n{}",
            lang, text
        ))
    } else {
        Ok(text.to_string())
    }
}
