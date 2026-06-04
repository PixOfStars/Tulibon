(function () {
  var sdk = window.__PLUGIN_SDK__;
  if (!sdk) return;

  var React = sdk.lib.React;
  var ReactDOM = sdk.lib.ReactDOM;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  var lang = sdk.host.lang;
  var colors = sdk.host.theme.colors;
  var T = {
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

  function OcrApp() {
    var _i = useState(null), image = _i[0], setImage = _i[1];
    var _t = useState(''), text = _t[0], setText = _t[1];
    var _r = useState(false), running = _r[0], setRunning = _r[1];
    var _c = useState(false), copied = _c[0], setCopied = _c[1];
    var _l = useState('zh-CN'), ocrLang = _l[0], setOcrLang = _l[1];
    var _s = useState(null), support = _s[0], setSupport = _s[1];
    var fileRef = useRef(null);

    useEffect(function () {
      sdk.api.checkOcrSupport(ocrLang).then(function (s) { setSupport(s); });
    }, [ocrLang]);

    var handlePaste = function (e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          var blob = items[i].getAsFile();
          var reader = new FileReader();
          reader.onload = function (ev) { setImage(ev.target.result); };
          reader.readAsDataURL(blob);
          break;
        }
      }
    };

    var handleFile = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) { setImage(ev.target.result); };
      reader.readAsDataURL(file);
    };

    var handleRecognize = function () {
      if (!image) return;
      setRunning(true);
      setText('');
      sdk.api.runOcr(image, ocrLang).then(function (result) {
        setText(result || '');
        setRunning(false);
      }).catch(function (err) {
        setText(lang === 'zh' ? '识别失败: ' + String(err) : 'OCR failed: ' + String(err));
        setRunning(false);
      });
    };

    var handleCopy = function () {
      navigator.clipboard.writeText(text).then(function () {
        setCopied(true);
        setTimeout(function () { setCopied(false); }, 2000);
      });
    };

    var selectStyle = {
      padding: '6px 10px', borderRadius: 6, border: '1px solid ' + colors.border,
      backgroundColor: colors.grayBg, color: colors.text, fontSize: 12, outline: 'none',
    };
    var accentBtn = {
      padding: '10px 24px', borderRadius: 10, border: 'none', cursor: 'pointer',
      backgroundColor: colors.accent, color: '#000', fontSize: 13, fontWeight: 700,
    };
    var ghostBtn = {
      padding: '8px 16px', borderRadius: 8, border: '1px solid ' + colors.border,
      backgroundColor: 'transparent', color: colors.text, fontSize: 12, fontWeight: 600, cursor: 'pointer',
    };

    return React.createElement('div', {
      style: { padding: 20, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'auto' },
      onPaste: handlePaste,
      tabIndex: 0,
    },
      React.createElement('h2', { style: { fontSize: 16, fontWeight: 700, color: colors.textHeader, marginBottom: 16 } }, T.title),

      // Language selector
      React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
        React.createElement('span', { style: { fontSize: 12, color: colors.text } }, T.langLabel + ':'),
        React.createElement('select', { value: ocrLang, onChange: function (e) { setOcrLang(e.target.value); }, style: selectStyle },
          React.createElement('option', { value: 'zh-CN' }, '中文'),
          React.createElement('option', { value: 'en-US' }, 'English')
        ),
        support !== null
          ? React.createElement('span', { style: { fontSize: 10, color: support.available ? colors.success : colors.error } },
              support.available ? '✓' : '✗ ' + (support.engine || ''))
          : null
      ),

      // Image area
      image
        ? React.createElement('div', { style: { marginBottom: 14 } },
            React.createElement('img', {
              src: image, alt: 'OCR',
              style: { maxWidth: '100%', maxHeight: 200, borderRadius: 10, border: '1px solid ' + colors.border, objectFit: 'contain' }
            }),
            React.createElement('div', { style: { marginTop: 6 } },
              React.createElement('button', { onClick: function () { setImage(null); setText(''); }, style: ghostBtn }, T.clear)
            )
          )
        : React.createElement('div', {
            style: {
              padding: 40, borderRadius: 12, border: '2px dashed ' + colors.border,
              textAlign: 'center', color: colors.text, opacity: 0.5, marginBottom: 14,
              cursor: 'pointer',
            },
            onClick: function () { fileRef.current && fileRef.current.click(); }
          },
            React.createElement('div', { style: { fontSize: 14, marginBottom: 4 } }, T.dropHint),
            React.createElement('input', {
              ref: fileRef, type: 'file', accept: 'image/*',
              onChange: handleFile, style: { display: 'none' }
            }),
            React.createElement('div', { style: { fontSize: 11 } }, T.supported)
          ),

      // Recognize button
      React.createElement('div', { style: { marginBottom: 16 } },
        React.createElement('button', {
          onClick: handleRecognize,
          disabled: running || !image,
          style: Object.assign({}, accentBtn, { opacity: running || !image ? 0.5 : 1 })
        }, running ? T.recognizing : T.recognize)
      ),

      // Result
      text
        ? React.createElement('div', { style: { flex: 1 } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
              React.createElement('span', { style: { fontSize: 13, fontWeight: 600, color: colors.textHeader } }, T.result),
              React.createElement('button', { onClick: handleCopy, style: ghostBtn }, copied ? T.copied : T.copy)
            ),
            React.createElement('div', {
              style: {
                padding: 14, borderRadius: 10, backgroundColor: colors.grayBg,
                border: '1px solid ' + colors.border, fontSize: 13,
                color: colors.text, whiteSpace: 'pre-wrap', lineHeight: 1.6,
                maxHeight: 300, overflow: 'auto',
              }
            }, text)
          )
        : null
    );
  }

  sdk.ui.mount = function (container) {
    var root = ReactDOM.createRoot(container);
    root.render(React.createElement(OcrApp));
    sdk.ui._root = root;
  };
  sdk.ui.unmount = function () {
    if (sdk.ui._root) { sdk.ui._root.unmount(); delete sdk.ui._root; }
  };
})();
