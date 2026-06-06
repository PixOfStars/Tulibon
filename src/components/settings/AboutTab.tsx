import { useState } from 'react';
import { RocketLaunch, ChatCircleText, DownloadSimple } from '@phosphor-icons/react';
import { Divider } from './SettingsField';
import QrModal from './QrModal';
import { tauriInvoke } from '../../utils/tauri';

interface AboutTabProps {
  colors: Record<string, string>;
  t: Record<string, string>;
  updateState: 'idle' | 'checking' | 'available' | 'uptodate' | 'installing';
  updateInfo: { version: string; body: string } | null;
  onCheckUpdate: () => void;
  onInstallUpdate: () => void;
}

const VERSION = '0.30.7';

const AboutTab = ({ colors, t, updateState, updateInfo, onCheckUpdate, onInstallUpdate }: AboutTabProps) => {
  const [qrModalOpen, setQrModalOpen] = useState(false);

  const handleFeedback = async () => {
    await tauriInvoke('plugin:shell|open', { path: 'https://github.com/PixOfStars/Tulibon/issues/new' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <img src="/icon.png" alt={t.appName} style={{ width: 48, height: 48, marginBottom: 8, borderRadius: 12 }} />
        <div style={{ fontSize: 16, fontWeight: 700, color: colors.textHeader }}>{t.appName}</div>
        <div style={{ fontSize: 12, color: colors.text, marginTop: 4 }}>{t.aboutVersion} {VERSION}</div>
      </div>

      {updateState === 'available' && updateInfo && (
        <div style={{
          padding: 12, borderRadius: 8, backgroundColor: colors.accentBg,
          border: `1px solid ${colors.accent}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: colors.accent, marginBottom: 4 }}>
            {t.newVersionAvailable || 'New Version'}: {updateInfo.version}
          </div>
          {updateInfo.body && (
            <div style={{ fontSize: 11, color: colors.text, whiteSpace: 'pre-wrap', maxHeight: 80, overflow: 'auto' }}>
              {updateInfo.body}
            </div>
          )}
        </div>
      )}

      {updateState === 'available' ? (
        <button onClick={onInstallUpdate}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            cursor: 'pointer', fontSize: 13, fontWeight: 700,
            backgroundColor: colors.accent, color: '#000', transition: 'all 0.2s',
          }}>
          <DownloadSimple size={18} weight="bold" />
          {t.installUpdate || 'Install Update'}
        </button>
      ) : (
        <button onClick={onCheckUpdate}
          disabled={updateState === 'installing'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '12px 0', borderRadius: 10, border: 'none',
            cursor: updateState === 'installing' ? 'not-allowed' : 'pointer',
            fontSize: 13, fontWeight: 700,
            backgroundColor: colors.accentBg, color: colors.accent,
            transition: 'all 0.2s', opacity: updateState === 'installing' ? 0.5 : 1,
          }}>
          <RocketLaunch size={18} weight="bold" />
          {updateState === 'checking' ? t.checkingUpdate
            : updateState === 'installing' ? t.installing
              : updateState === 'uptodate' ? t.updateNotAvailable
                : t.checkUpdate}
        </button>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: 11, lineHeight: 1.7, margin: 0, textAlign: 'center', opacity: 0.72 }}>
        <span style={{ color: colors.accent, fontWeight: 700 }}>{t.aboutDisclaimerFree}</span>
        {' '}
        <span style={{ color: colors.text }}>{t.aboutDisclaimerRefund}</span>
      </p>

      {/* QR Card */}
      <button onClick={() => setQrModalOpen(true)} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        width: '100%', padding: '16px 12px 14px', borderRadius: 12,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer', backgroundColor: colors.accentBg,
        transition: 'border-color 0.15s',
      }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = colors.accent)}
        onMouseLeave={e => (e.currentTarget.style.borderColor = colors.border)}>
        <img src="/erweima.jpg" alt="QR" style={{
          width: 110, height: 110, borderRadius: 10,
          border: `1px solid ${colors.border}`,
        }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textHeader }}>
            {t.aboutOAName}
          </div>
          <div style={{ fontSize: 10, color: colors.accent, opacity: 0.75, marginTop: 3 }}>
            {t.aboutScanToFollow}
          </div>
        </div>
      </button>

      <Divider colors={colors} />

      <button onClick={handleFeedback}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 10, border: 'none',
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
          backgroundColor: 'transparent', color: colors.text, textAlign: 'left', width: '100%', transition: 'background-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = colors.accentBg)}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
        <ChatCircleText size={18} weight="bold" />
        {t.feedback || 'Report Issue / Feedback'}
      </button>

      {qrModalOpen && <QrModal colors={colors} t={t} onClose={() => setQrModalOpen(false)} />}
    </div>
  );
};

export default AboutTab;
