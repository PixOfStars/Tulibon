import { X, QrCode } from '@phosphor-icons/react';

interface QrModalProps {
  colors: Record<string, string>;
  t: Record<string, string>;
  onClose: () => void;
}

const QrModal = ({ colors, t, onClose }: QrModalProps) => (
  <div className="settings-overlay" style={{ zIndex: 210 }} onClick={onClose}>
    <div onClick={e => e.stopPropagation()} style={{
      backgroundColor: colors.bg,
      borderRadius: 16,
      padding: 28,
      maxWidth: 340,
      width: '90%',
      textAlign: 'center',
      boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
      border: `1px solid ${colors.border}`,
      position: 'relative',
    }}>
      {/* Close button */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 8, right: 8,
        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', borderRadius: 8, backgroundColor: 'transparent', color: colors.text,
        cursor: 'pointer',
      }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
        <X size={18} weight="bold" />
      </button>

      <QrCode size={28} weight="bold" color={colors.accent} style={{ marginBottom: 12 }} />

      <div style={{ fontSize: 14, fontWeight: 700, color: colors.textHeader, marginBottom: 16 }}>
        {t.aboutOAName}
      </div>

      <img src="/erweima.jpg" alt="QR Code" style={{
        width: 260, height: 260, borderRadius: 12,
        border: `1px solid ${colors.border}`,
        display: 'block', margin: '0 auto 16px',
      }} />

      <div style={{ fontSize: 12, color: colors.text, opacity: 0.7 }}>
        {t.aboutScanToFollow}
      </div>
    </div>
  </div>
);

export default QrModal;
