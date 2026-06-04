import { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Gear, House, Clock, MagnifyingGlass, Folders, Scan, PuzzlePiece, Info } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import { SIDEBAR_ITEM_SIZE, SIDEBAR_ICON_SIZE } from '../styles';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

const MIN_SIDEBAR_WIDTH = 140;
const MAX_SIDEBAR_WIDTH = 420;

export interface PluginNavItem {
  id: string;
  name: { zh: string; en: string };
  icon: string;
  order: number;
}

type SidebarView = 'home' | 'history' | 'search' | 'ocr' | 'collections';

interface SidebarProps {
  width: number;
  collapsed: boolean;
  activeView: SidebarView | string;
  plugins: PluginNavItem[];
  sidebarOrder: string[];
  onNavigate: (view: string) => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
  onResize: (width: number) => void;
  onReorder: (newOrder: string[]) => void;
  theme: AppTheme;
  lang: 'zh' | 'en';
}

// Only Home is built-in; all other items come from enabled plugins
const NAV_ITEMS: { id: SidebarView; icon: typeof House; i18nKey: string }[] = [
  { id: 'home', icon: House, i18nKey: 'home' },
];

// Icon name → Phosphor component resolution for plugin sidebar items
const ICON_NAME_MAP: Record<string, React.ComponentType<{ size?: number; weight?: 'bold' | 'fill' | 'regular'; color?: string }>> = {
  'House': House,
  'Clock': Clock,
  'MagnifyingGlass': MagnifyingGlass,
  'Folders': Folders,
  'Scan': Scan,
  'Gear': Gear,
  'PuzzlePiece': PuzzlePiece,
  'Info': Info,
};

const Sidebar = ({
  width, collapsed, activeView, plugins, sidebarOrder,
  onNavigate, onOpenSettings, onOpenAbout, onResize, onReorder,
  theme, lang,
}: SidebarProps) => {
  const t = lang === 'zh' ? zh : en;
  const colors = theme.colors;

  const isDragging = useRef(false);
  const sortedPlugins = useMemo(() => {
    return plugins.slice().sort((a, b) => {
      const ia = sidebarOrder.indexOf(a.id);
      const ib = sidebarOrder.indexOf(b.id);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return (a.order || 0) - (b.order || 0);
    });
  }, [plugins, sidebarOrder]);

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, e.clientX));
      onResize(newWidth);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onResize]);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
    if (e.currentTarget instanceof HTMLElement) {
      dragNodeRef.current = e.currentTarget as HTMLDivElement;
      requestAnimationFrame(() => {
        if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.4';
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (_e: React.DragEvent, idx: number) => {
    setDragOverIndex(idx);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (dragIndex === null || dragIndex === toIdx) return;
    const arr = sortedPlugins.slice();
    const moved = arr.splice(dragIndex, 1)[0];
    arr.splice(toIdx, 0, moved);
    onReorder(arr.map(p => p.id));
  };

  const handleDragEnd = () => {
    if (dragNodeRef.current) {
      dragNodeRef.current.style.opacity = '1';
      dragNodeRef.current = null;
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const navBtnStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', height: SIDEBAR_ITEM_SIZE, gap: 10,
    padding: collapsed ? '0' : '0 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    width: '100%', border: 'none', borderRadius: 10,
    backgroundColor: active ? colors.accentBg : 'transparent',
    color: active ? colors.accent : colors.text,
    cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
    transition: 'all 0.15s', position: 'relative',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    userSelect: 'none', WebkitUserSelect: 'none',
  });

  const dropLineStyle = { height: 2, borderRadius: 1, backgroundColor: colors.accent, margin: '0 8px', flexShrink: 0 };

  const activeIndicator: React.CSSProperties = {
    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
    width: 3, height: 20, borderRadius: 2, backgroundColor: colors.accent,
  };

  return (
    <div style={{
      width, flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      backgroundColor: colors.sidebarBg,
      borderRight: `1px solid ${colors.border}`,
      transition: collapsed ? 'width 0.2s ease' : 'none',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Navigation items */}
      <div style={{ flex: 1, padding: '8px 8px 4px', display: 'flex', flexDirection: 'column', gap: 2, overflow: 'auto' }}>
        {NAV_ITEMS.map(({ id, icon: Icon, i18nKey }) => {
          const active = activeView === id;
          const label = (t as Record<string, string>)[i18nKey];
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              title={collapsed ? label : undefined}
              style={navBtnStyle(active)}>
              {active && !collapsed && <div style={activeIndicator} />}
              <Icon size={SIDEBAR_ICON_SIZE} weight={active ? 'fill' : 'bold'} />
              {!collapsed && (
                <span>{label}</span>
              )}
            </button>
          );
        })}

        {/* Plugin separator — only show if there are plugins */}
        {sortedPlugins.length > 0 && (
          <div style={{
            height: 1, backgroundColor: colors.border,
            margin: '6px 8px', flexShrink: 0,
          }} />
        )}

        {/* Dynamic plugin items */}
        {sortedPlugins.map((plugin, idx) => {
          const active = activeView === `plugin:${plugin.id}`;
          const isDragging = dragIndex === idx;
          const showLine = dragOverIndex === idx && dragIndex !== idx && dragIndex !== null;
          const Icon = ICON_NAME_MAP[plugin.icon] || PuzzlePiece;
          const label = lang === 'zh' ? plugin.name.zh : plugin.name.en;
          return (
            <div key={plugin.id}>
              {showLine && (
                <div
                  style={dropLineStyle}
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => handleDragEnter(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                />
              )}
              <div
                draggable={!collapsed}
                onClick={() => onNavigate(`plugin:${plugin.id}`)}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{
                  ...navBtnStyle(active),
                  display: 'flex',
                  alignItems: 'center',
                  opacity: isDragging ? 0.4 : 1,
                  cursor: collapsed ? 'pointer' : 'grab',
                }}
                title={collapsed ? label : undefined}>
                {active && !collapsed && <div style={activeIndicator} />}
                <Icon size={SIDEBAR_ICON_SIZE} weight={active ? 'fill' : 'bold'} />
                {!collapsed && <span style={{ flex: 1 }}>{label}</span>}
              </div>
            </div>
          );
        })}

        {/* End-of-list drop zone */}
        {dragIndex !== null && (
          <div
            style={{ ...dropLineStyle, marginTop: 2, marginBottom: 2 }}
            onDragOver={handleDragOver}
            onDragEnter={() => setDragOverIndex(sortedPlugins.length)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOverIndex(null);
              if (dragIndex === null) return;
              const arr = sortedPlugins.slice();
              const moved = arr.splice(dragIndex, 1)[0];
              arr.push(moved);
              onReorder(arr.map(p => p.id));
            }}
          />
        )}
      </div>

      {/* About & Settings */}
      <div style={{ padding: '4px 8px 8px' }}>
        <button
          onClick={onOpenAbout}
          title={collapsed ? (t.aboutTab || 'About') : undefined}
          style={{ ...navBtnStyle(false), marginBottom: 2 }}>
          <Info size={SIDEBAR_ICON_SIZE} weight="bold" />
          {!collapsed && <span>{t.aboutTab || 'About'}</span>}
        </button>
        <button
          onClick={onOpenSettings}
          title={collapsed ? t.settings : undefined}
          style={navBtnStyle(false)}>
          <Gear size={SIDEBAR_ICON_SIZE} weight="bold" />
          {!collapsed && <span>{t.settings}</span>}
        </button>
      </div>

      {/* Drag handle */}
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: 5, cursor: 'col-resize',
            zIndex: 10,
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = `${colors.accent}30`; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
        />
      )}
    </div>
  );
};

export default Sidebar;
