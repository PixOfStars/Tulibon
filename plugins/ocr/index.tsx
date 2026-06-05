declare const __PLUGIN_SDK__: any;
const sdk = (window as any).__PLUGIN_SDK__;
if (!sdk) throw new Error('Plugin SDK not available');

const React = sdk.lib.React; const ReactDOM = sdk.lib.ReactDOM; const PluginDropdown = sdk.lib.PluginDropdown;
const { useState, useEffect, useRef, createElement: h } = R;
const lang: 'zh' | 'en' = sdk.host.lang;
const colors: Record<string, string> = sdk.host.theme.colors;

const T = {
  title: lang === 'zh' ? '文字识别' : 'OCR',
  dropHint: lang === 'zh' ? '粘贴图片或拖拽到此处进行识别' : 'Paste or drop an image here for OCR',
  recognize: lang === 'zh' ? '开始识别' : 'Recognize',
  recognizing: lang === 'zh' ? '识别中…' : 'Recognizing…',
  result: lang === 'zh' ? '识别结果' : 'Result',
  copy: lang === 'zh' ? '复制' : 'Copy',
  copied: lang === 'zh' ? '已复制!' : 'Copied!',
  langLabel: lang === 'zh' ? '识别语言' : 'Language',
  noImage: lang === 'zh' ? '请先粘贴或拖入图片' : 'Paste or drop an image first',
  supported: lang === 'zh' ? '支持中文、英文等语言' : 'Supports Chinese, English, etc.',
  clear: lang === 'zh' ? '清除' : 'Clear',
};

const LANG_OPTIONS = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
];

function OcrApp() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ocrLang, setOcrLang] = useState('zh-CN');
  const [support, setSupport] = useState<{ available: boolean; engine?: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    sdk.api.checkOcrSupport(ocrLang).then((s: any) => setSupport(s));
  }, [ocrLang]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target?.result as string);
        reader.readAsDataURL(blob);
        break;
      }
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRecognize = () => {
    if (!image) return;
    setRunning(true);
    setText('');
    sdk.api.runOcr(image, ocrLang).then((result: string) => {
      setText(result || '');
      setRunning(false);
    }).catch((err: any) => {
      setText((lang === 'zh' ? '识别失败: ' : 'OCR failed: ') + String(err));
      setRunning(false);
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const accentBtn: React.CSSProperties = {
    padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
    backgroundColor: colors.accent, color: '#000', fontSize: 13, fontWeight: 700,
  };
  const ghostBtn: React.CSSProperties = {
    padding: '8px 16px', borderRadius: 8, border: '1px solid ' + colors.border,
    backgroundColor: 'transparent', color: colors.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' }}
      onPaste={handlePaste} tabIndex={0}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 }}>{T.title}</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: colors.text }}>{T.langLabel}:</span>
        <div style={{ minWidth: 160 }}>
          <PluginDropdown options={LANG_OPTIONS} value={ocrLang} onChange={setOcrLang} colors={colors} />
        </div>
        {support !== null && (
          <span style={{ fontSize: 10, color: support.available ? colors.success : colors.error }}>
            {support.available ? '✓' : '✗ ' + (support.engine || '')}
          </span>
        )}
      </div>

      {image ? (
        <div style={{ marginBottom: 14 }}>
          <img src={image} alt='OCR' style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid ' + colors.border, objectFit: 'contain' }} />
          <div style={{ marginTop: 6 }}>
            <button onClick={() => { setImage(null); setText(''); }} style={ghostBtn}>{T.clear}</button>
          </div>
        </div>
      ) : (
        <div style={{ padding: 40, borderRadius: 12, border: '2px dashed ' + colors.border, textAlign: 'center', color: colors.text, opacity: 0.5, marginBottom: 14, cursor: 'pointer' }}
          onClick={() => fileRef.current?.click()}>
          <div style={{ fontSize: 14, marginBottom: 4 }}>{T.dropHint}</div>
          <input ref={fileRef} type='file' accept='image/*' onChange={handleFile} style={{ display: 'none' }} />
          <div style={{ fontSize: 11 }}>{T.supported}</div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <button onClick={handleRecognize} disabled={running || !image}
          style={{ ...accentBtn, opacity: running || !image ? 0.5 : 1 }}>
          {running ? T.recognizing : T.recognize}
        </button>
      </div>

      {text && (
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.textHeader }}>{T.result}</span>
            <button onClick={handleCopy} style={ghostBtn}>{copied ? T.copied : T.copy}</button>
          </div>
          <div style={{ padding: 14, borderRadius: 10, backgroundColor: colors.grayBg, border: '1px solid ' + colors.border, fontSize: 13, color: colors.text, whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 300, overflow: 'auto' }}>
            {text}
          </div>
        </div>
      )}
    </div>
  );
}

sdk.ui.mount = (container: HTMLElement) => {
  const root = (ReactDOM as any).createRoot(container);
  root.render(<OcrApp />);
  (sdk as any).ui._root = root;
};
sdk.ui.unmount = () => {
  if ((sdk as any).ui._root) { (sdk as any).ui._root.unmount(); delete (sdk as any).ui._root; }
};
