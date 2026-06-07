import { Component } from 'react';
import type { ReactNode } from 'react';
import { WINDOW_RADIUS } from '../../styles/layoutConstants';
import zh from '../../locales/zh.json';
import en from '../../locales/en.json';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const getLang = (): 'zh' | 'en' => {
  if (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) return 'zh';
  return 'en';
};

const t = (key: string): string => {
  const dict = getLang() === 'zh' ? zh : en;
  return (dict as Record<string, string>)[key] || key;
};

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('[ErrorBoundary] Caught rendering error:', error);
    console.error('[ErrorBoundary] Component stack:', info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1A1A1D',
          color: '#EEE',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          borderRadius: WINDOW_RADIUS,
          overflow: 'hidden',
          gap: 16,
          padding: 24,
        }}>
          <div style={{ fontSize: 48, lineHeight: 1 }}>!</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{t('errorBoundaryTitle')}</div>
          <div style={{
            fontSize: 12,
            color: '#999',
            textAlign: 'center',
            maxWidth: 420,
            lineHeight: 1.6,
          }}>
            {t('errorBoundaryHint')}
          </div>
          {this.state.error && (
            <div style={{
              fontSize: 11,
              color: '#FF3B30',
              fontFamily: 'monospace',
              backgroundColor: 'rgba(255,59,48,0.08)',
              padding: '8px 12px',
              borderRadius: 8,
              maxWidth: 420,
              wordBreak: 'break-all',
            }}>
              {this.state.error.message}
            </div>
          )}
          <button
            onClick={this.handleReload}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              backgroundColor: '#00C896',
              color: '#000',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {t('errorBoundaryReload')}
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
