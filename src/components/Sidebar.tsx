import { useRef, useCallback, useEffect, useState } from 'react';
import { Gear, House, Clock, MagnifyingGlass, Folders, Scan, PuzzlePiece, DotsSixVertical } from '@phosphor-icons/react';
import type { AppTheme } from '../theme';
import { SIDEBAR_ITEM_SIZE, SIDEBAR_ICON_SIZE } from '../styles';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

const MIN_SIDEBAR_WIDTH = 140;
const HOLD_DURATION = 500;
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
};

const Sidebar = ({
  width, collapsed, activeView, plugins, sidebarOrder,
  onNavigate, onOpenSettings, onResize, onReorder,
  theme, lang,
}: SidebarProps) => {
  const t = lang === 'zh' ? zh : en;
  const colors = theme.colors;

  const isDragging = useRef(false);
  var sortedPlugins = plugins.slice().sort(function(a,b) {
    var ia=sidebarOrder.indexOf(a.id), ib=sidebarOrder.indexOf(b.id);
    if(ia!==-1&&ib!==-1)return ia-ib;
    if(ia!==-1)return -1; if(ib!==-1)return 1;
    return (a.order||0)-(b.order||0);
  });
  var _s=useState<number|null>(null),dragIndex=_s[0],setDragIndex=_s[1];
  var _s2=useState<number|null>(null),dragOverIndex=_s2[0],setDragOverIndex=_s2[1];
  var _s3=useState<number|null>(null),holdIndex=_s3[0],setHoldIndex=_s3[1];
  var holdTimer=useRef<ReturnType<typeof setTimeout>|null>(null),dragNodeRef=useRef<HTMLDivElement|null>(null);

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

  var pluginMouseDown=function(e:React.MouseEvent,idx:number){if(e.button!==0)return;holdTimer.current=setTimeout(function(){holdTimer.current=null;setHoldIndex(idx);},HOLD_DURATION);};
  var pluginMouseUp=function(_e:React.MouseEvent,_idx:number,pluginId:string){if(holdTimer.current){clearTimeout(holdTimer.current);holdTimer.current=null;onNavigate("plugin:"+pluginId);}};
  var pluginMouseLeave=function(){if(holdTimer.current){clearTimeout(holdTimer.current);holdTimer.current=null;}};
  var dragStart=function(e:React.DragEvent,idx:number){setDragIndex(idx);setHoldIndex(null);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(idx));if(e.currentTarget instanceof HTMLElement){e.currentTarget.style.opacity="0.4";dragNodeRef.current=e.currentTarget as HTMLDivElement;}};
  var dragOver=function(e:React.DragEvent,idx:number){e.preventDefault();e.dataTransfer.dropEffect="move";setDragOverIndex(idx);};
  var dragLeave=function(){setDragOverIndex(null);};
  var drop=function(e:React.DragEvent,toIdx:number){e.preventDefault();setDragOverIndex(null);if(dragIndex===null||dragIndex===toIdx)return;var arr=sortedPlugins.slice();var m=arr.splice(dragIndex,1)[0];arr.splice(toIdx,0,m);onReorder(arr.map(function(p){return p.id;}));};
  var dragEnd=function(){if(dragNodeRef.current){dragNodeRef.current.style.opacity="1";dragNodeRef.current=null;}setDragIndex(null);setDragOverIndex(null);setHoldIndex(null);};

    var navBtnStyle=function(active:boolean,isHold:boolean):React.CSSProperties{return {
    display: 'flex', alignItems: 'center', height: SIDEBAR_ITEM_SIZE, gap: 10,
    padding: collapsed ? '0' : '0 12px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    width: '100%', border: 'none', borderRadius: 10,
    backgroundColor: isHold ? colors.accentBg : (active ? colors.accentBg : 'transparent'),
    color: active ? colors.accent : colors.text,
    cursor: isHold ? 'grabbing' : 'pointer', fontSize: 13, fontWeight: active ? 700 : 500,
    transition: isHold ? 'none' : 'all 0.15s', position: 'relative',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transform: isHold ? 'scale(1.05)' : 'scale(1)', boxShadow: isHold ? '0 4px 12px ' + colors.accent + '40' : 'none', zIndex: isHold ? 1 : 'auto', userSelect: 'none', WebkitUserSelect: 'none',
  }; };

  var dropLineStyle = { height: 2, borderRadius: 1, backgroundColor: colors.accent, margin: '0 8px', flexShrink: 0 };

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
              style={navBtnStyle(active, false)}>
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
        {sortedPlugins.map(function(plugin, idx) {
          const active = activeView === `plugin:${plugin.id}`;
          var h=holdIndex===idx,d=dragIndex===idx,line=dragOverIndex===idx&&dragIndex!==idx&&dragIndex!==null,I=ICON_NAME_MAP[plugin.icon]||PuzzlePiece; var label = lang === 'zh' ? plugin.name.zh : plugin.name.en;
          return (
            <div key={plugin.id}>
              {line && <div style={dropLineStyle} />}
              <div
                draggable={h}
                onMouseDown={function(e){pluginMouseDown(e,idx)}}
                onMouseUp={function(e){pluginMouseUp(e,idx,plugin.id)}}
                onMouseLeave={pluginMouseLeave}
                onDragStart={function(e){dragStart(e,idx)}}
                onDragOver={function(e){dragOver(e,idx)}}
                onDragLeave={dragLeave}
                onDrop={function(e){drop(e,idx)}}
                onDragEnd={dragEnd}
                style={Object.assign({},navBtnStyle(active,h||d),{display:"flex",alignItems:"center",opacity:d?0.4:1})}
                title={collapsed?label:undefined}>
                {active&&!collapsed&&<div style={activeIndicator}/>}
                {!collapsed&&<div style={{flexShrink:0,display:"flex",alignItems:"center",opacity:h?1:0.3,marginRight:-4,cursor:h?"grabbing":"grab"}}><DotsSixVertical size={12} weight="bold"/></div>}
                <I size={SIDEBAR_ICON_SIZE} weight={active?"fill":"bold"}/>
                {!collapsed&&<span style={{flex:1}}>{label}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Settings */}
      <div style={{ padding: '4px 8px 8px' }}>
        <button
          onClick={onOpenSettings}
          title={collapsed ? t.settings : undefined}
          style={navBtnStyle(false, false)}>
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
