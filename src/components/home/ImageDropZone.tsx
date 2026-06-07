import { useRef, useState, useEffect } from "react";
import { ClipboardText, Link, CloudArrowUp, Image as ImageIcon, ArrowLineLeft } from "@phosphor-icons/react";
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
  const [isHovered, setIsHovered] = useState(false);

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

  // 生成漂亮的键盘按键样式
  const renderKbd = (text: string) => (
    <kbd style={{
      padding: "2px 6px",
      borderRadius: 4,
      backgroundColor: colors.bg,
      border: `1px solid ${colors.border}`,
      boxShadow: "0 1px 1px rgba(0,0,0,0.05), inset 0 -1px 0 rgba(0,0,0,0.05)",
      fontFamily: "inherit",
      fontSize: 10,
      fontWeight: 700,
      color: colors.text,
      margin: "0 2px"
    }}>
      {text}
    </kbd>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ==========================================
          1. 核心拖拽区 (Hero Drop Zone)
          ========================================== */}
      <div
        onPaste={handlePaste}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => config.inputMethods.filePicker && fileInputRef.current?.click()}
        onMouseEnter={() => !isAnalyzing && setIsHovered(true)}
        onMouseLeave={() => !isAnalyzing && setIsHovered(false)}
        style={{
          position: "relative",
          border: `2px dashed ${isDragOver ? colors.accent : (isHovered ? `${colors.accent}80` : colors.border)}`,
          borderRadius: 20, // 更大的圆角
          padding: '40px 20px',
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          backgroundColor: isDragOver ? `${colors.accent}10` : (isHovered ? `${colors.accent}05` : colors.grayBg),
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          minHeight: 220, // 增加高度，显得更舒展
          cursor: config.inputMethods.filePicker && !isAnalyzing ? "pointer" : "default",
          opacity: isAnalyzing ? 0.6 : 1,
          pointerEvents: isAnalyzing ? "none" : "auto",
        }}
      >
        {/* 悬浮质感的图标圆盘 */}
        <div style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          backgroundColor: colors.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isDragOver 
            ? `0 0 0 6px ${colors.accent}20, 0 8px 24px ${colors.accent}40` 
            : (isHovered ? `0 8px 24px rgba(0,0,0,0.08)` : `0 4px 12px rgba(0,0,0,0.04)`),
          border: `1px solid ${colors.border}`,
          transform: isHovered || isDragOver ? "translateY(-4px)" : "translateY(0)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          color: isDragOver || isHovered ? colors.accent : colors.text,
        }}>
          {isDragOver ? (
            <ImageIcon size={32} weight="fill" />
          ) : (
            <CloudArrowUp size={32} weight="duotone" />
          )}
        </div>
        
        {/* 引导文案 */}
        <div style={{ textAlign: "center", display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.textHeader }}>
            {t.dragHere || "点击选择图片，或拖拽到这里"}
          </div>
          <div style={{ fontSize: 12, color: colors.text, opacity: 0.7, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {config.prefLang === 'zh' ? (
              <span>支持直接复制并 {renderKbd("Ctrl")} {renderKbd("V")} 粘贴</span>
            ) : (
              <span>Paste directly using {renderKbd("Ctrl")} {renderKbd("V")}</span>
            )}
          </div>
        </div>

        {/* 内部操作：剪贴板快捷按钮 (胶囊样式) */}
        {config.inputMethods.clipboard && (
          <div onClick={(e) => e.stopPropagation()} style={{ marginTop: 8 }}>
            <button
              onClick={onClipboard}
              disabled={isAnalyzing}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 16px", borderRadius: 100, // 满圆角胶囊
                border: `1px solid ${colors.border}`,
                backgroundColor: colors.bg, 
                color: colors.textHeader,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = colors.accent;
                e.currentTarget.style.color = colors.accent;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = colors.border;
                e.currentTarget.style.color = colors.textHeader;
              }}
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

      {/* ==========================================
          2. 链接输入区 (精致的搜索框样式)
          ========================================== */}
      {config.inputMethods.urlPaste && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 12px 8px 16px",
            borderRadius: 14,
            backgroundColor: colors.grayBg,
            border: `1px solid ${colors.border}`,
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
            transition: 'all 0.2s',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = colors.accent;
            e.currentTarget.style.backgroundColor = colors.bg;
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.accent}15`;
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.backgroundColor = colors.grayBg;
            e.currentTarget.style.boxShadow = "inset 0 2px 4px rgba(0,0,0,0.02)";
          }}
        >
          <Link size={18} weight="bold" color={colors.text} style={{ opacity: 0.5 }} />
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
          
          {/* 输入内容后，平滑滑出“回车”提示 */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: urlInput.trim() ? 1 : 0,
            transform: urlInput.trim() ? "translateX(0)" : "translateX(10px)",
            transition: "all 0.2s ease",
            pointerEvents: "none" // 不阻挡点击
          }}>
            <span style={{ fontSize: 11, color: colors.accent, fontWeight: 600 }}>Enter</span>
            <div style={{ 
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 24, height: 24, borderRadius: 6, 
              backgroundColor: colors.accent, color: "#000" 
            }}>
              <ArrowLineLeft size={14} weight="bold" />
            </div>
          </div>
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