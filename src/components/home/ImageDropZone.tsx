import { useRef, useState, useEffect } from "react";
import { ClipboardText, Link, UploadSimple } from "@phosphor-icons/react";
import { getT } from "../../utils/i18n";
import { tauriListen } from "../../utils/tauri";

interface ImageDropZoneProps {
  config: ReturnType<typeof import("../../hooks/usePreferences").usePreferences>["config"];
  colors: Record<string, string>;
  isAnalyzing?: boolean;
  onClipboard: () => void;
  onFileSelect: (files: FileList) => void;
  onUrlPaste: (url: string) => void;
}

const URL_RE = /^https?:\/\/\S+\.(png|jpe?g|webp|gif|bmp|svg)(\?\S*)?$/i;

const ImageDropZone = ({
  config,
  colors,
  isAnalyzing,
  onClipboard,
  onFileSelect,
  onUrlPaste,
}: ImageDropZoneProps) => {
  const t = getT(config.prefLang as "zh" | "en");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Listen for Tauri native file-drop events ──
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    tauriListen("file-drop", (payload: unknown) => {
      const urls = payload as string[];
      if (!urls || urls.length === 0) return;
      const files = urls
        .map((dataUrl, i) => dataUrlToFile(dataUrl, `dropped-${i}.png`))
        .filter((f): f is File => f !== null);
      if (files.length > 0) {
        const dt = new DataTransfer();
        files.forEach((f) => dt.items.add(f));
        onFileSelect(dt.files);
      }
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [onFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!config.inputMethods.urlPaste) return;
    const text = e.clipboardData.getData("text/plain").trim();
    if (URL_RE.test(text)) {
      e.preventDefault();
      onUrlPaste(text);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* 统一的大型拖拽/点击上传面板 */}
      <div
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => config.inputMethods.filePicker && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragOver ? colors.accent : colors.border}`,
          borderRadius: 16,
          padding: '40px 20px',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          backgroundColor: isDragOver ? colors.accentBg : colors.grayBg,
          transition: "all 0.2s ease",
          minHeight: 180,
          cursor: config.inputMethods.filePicker && !isAnalyzing ? "pointer" : "default",
          opacity: isAnalyzing ? 0.6 : 1,
          pointerEvents: isAnalyzing ? "none" : "auto",
        }}
        onMouseEnter={e => {
          if (!isAnalyzing && !isDragOver) e.currentTarget.style.backgroundColor = `${colors.accent}08`;
        }}
        onMouseLeave={e => {
          if (!isAnalyzing && !isDragOver) e.currentTarget.style.backgroundColor = colors.grayBg;
        }}
      >
        <UploadSimple 
          size={42} 
          weight="light" 
          color={isDragOver ? colors.accent : colors.text} 
          style={{ opacity: isDragOver ? 1 : 0.6, transition: "all 0.2s" }} 
        />
        
        <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: colors.textHeader }}>
            {t.dragHere || "点击选择文件，或将图片拖拽至此"}
          </div>
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.8 }}>
            {config.prefLang === 'zh' ? "支持直接粘贴图片 (Ctrl+V)" : "Supports pasting images directly (Ctrl+V)"}
          </div>
        </div>

        {/* 面板内部的辅助操作按钮，阻止事件冒泡以免触发选择文件 */}
        {config.inputMethods.clipboard && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 4 }}>
            <button
              onClick={onClipboard}
              disabled={isAnalyzing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 8,
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg, color: colors.textHeader,
                fontSize: 12, fontWeight: 500, cursor: "pointer",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
            >
              <ClipboardText size={16} weight="bold" />
              <span>{t.fromClipboard}</span>
            </button>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0)
            onFileSelect(e.target.files);
        }}
      />

      {/* 链接输入框移出虚线框，作为补充输入方式，并弱化边框感 */}
      {config.inputMethods.urlPaste && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 12,
            backgroundColor: colors.grayBg,
            border: '1px solid transparent',
            transition: 'border-color 0.2s',
          }}
          onFocus={e => e.currentTarget.style.borderColor = colors.accent}
          onBlur={e => e.currentTarget.style.borderColor = 'transparent'}
        >
          <Link size={16} weight="bold" color={colors.text} style={{ opacity: 0.6 }} />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData("text/plain").trim();
              if (URL_RE.test(text)) {
                e.preventDefault();
                onUrlPaste(text);
                setUrlInput("");
              }
            }}
            placeholder={t.urlPlaceholder}
            disabled={isAnalyzing}
            style={{
              flex: 1,
              border: "none",
              background: "none",
              color: colors.textHeader,
              fontSize: 13,
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && urlInput.trim()) {
                onUrlPaste(urlInput.trim());
                setUrlInput("");
              }
            }}
          />
        </div>
      )}
    </div>
  );
};

/** Convert a data: URL to a File object */
function dataUrlToFile(dataUrl: string, filename: string): File | null {
  try {
    const arr = dataUrl.split(",");
    const mime = arr[0]?.match(/:(.*?);/)?.[1] || "image/png";
    const bstr = atob(arr[1] ?? "");
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) u8arr[i] = bstr.charCodeAt(i);
    return new File([u8arr], filename, { type: mime });
  } catch {
    return null;
  }
}

export default ImageDropZone;