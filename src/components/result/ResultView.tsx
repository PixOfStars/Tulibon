import { useState } from "react";
import { Copy, CheckCircle, Trash, FileText, Plus, X, ArrowLeft } from "@phosphor-icons/react";
import type { AnalysisRecord, Collection, Tag } from "../../types";
import type { AppTheme } from "../../styles/theme";
import { FIELD_LABELS } from "./ModeFieldConfigs";
import Tooltip from "../common/Tooltip";
import DesignModeView from "./DesignModeView";
import DiskImage from "../common/DiskImage";
import { exportAsTxt } from "../../utils/helpers";
import { getT } from "../../utils/i18n";
import { card, iconBtn, ghostBtn, sectionTitle, heading, bodyText, dividerAccent, tag } from '../../styles/components';

// ==========================================
// 通用便当盒卡片组件 (统一边框和内边距)
// ==========================================
const BentoCard = ({ children, colors, bg, className, style }: any) => (
    <div
        className={className}
        style={{
            ...card(colors, { backgroundColor: bg || colors.bg, ...style }),
        }}
    >
        {children}
    </div>
);

// ==========================================
// 1. 标签管理区块
// ==========================================
const TagSection = ({ record, tags, colors, lang, t, onAdd, onRemove }: any) => {
    const [showInput, setShowInput] = useState(false);
    const [val, setVal] = useState("");

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ ...sectionTitle(colors) }}>{t.tags}</span>
                <button onClick={() => setShowInput(!showInput)} style={{ ...ghostBtn, color: colors.text, padding: 4, borderRadius: 6, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.backgroundColor = `${colors.accent}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.color = colors.text; e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                    <Plus size={16} weight="bold" />
                </button>
            </div>
            
            {showInput && (
                <div className="fade-in-fast" style={{ display: "flex", marginBottom: 12 }}>
                    <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={t.addTagPlaceholder}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.textHeader, fontSize: 12, outline: "none" }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && val.trim()) { onAdd({ zh: val.trim(), en: val.trim() }); setVal(""); setShowInput(false); } 
                            else if (e.key === "Escape") { setShowInput(false); }
                        }}
                    />
                </div>
            )}
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {record.systemTags.concat(record.userTags).map((tid: string) => {
                    const tagItem = tags.find((tg: Tag) => tg.id === tid);
                    if (!tagItem) return null;
                    const isUser = record.userTags.includes(tid);
                    return (
                        <span key={tid} className="pop-in" style={{
                            ...tag(isUser ? `${colors.accent}15` : colors.grayBg, isUser ? colors.accent : colors.textHeader),
                            border: `1px solid ${isUser ? 'transparent' : colors.border}`,
                        }}>
                            #{lang === "zh" ? tagItem.name.zh : tagItem.name.en}
                            {isUser && <button onClick={() => onRemove(tid)} style={{ ...ghostBtn, color: colors.accent, opacity: 0.8 }}><X size={10} weight="bold" /></button>}
                        </span>
                    );
                })}
                {record.systemTags.length === 0 && record.userTags.length === 0 && !showInput && <span style={{ fontSize: 12, color: colors.text, opacity: 0.5 }}>{t.noTags}</span>}
            </div>
        </div>
    );
};

// ==========================================
// 2. 收藏夹管理区块
// ==========================================
const CollectionSection = ({ record, collections, colors, lang, t, onToggle }: any) => {
    const [showPicker, setShowPicker] = useState(false);
    const selected = collections.filter((c: Collection) => record.collectionIds.includes(c.id));

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ ...sectionTitle(colors) }}>{t.collection}</span>
                <button onClick={() => setShowPicker(!showPicker)} style={{ ...ghostBtn, color: colors.text, padding: 4, borderRadius: 6, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.color = colors.accent; e.currentTarget.style.backgroundColor = `${colors.accent}15`; }}
                    onMouseLeave={e => { e.currentTarget.style.color = colors.text; e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                    <Plus size={16} weight="bold" />
                </button>
            </div>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {selected.map((c: Collection) => (
                    <span key={c.id} className="pop-in" style={{
                        ...tag(`${c.color}15`, c.color),
                    }}>
                        {lang === "zh" ? c.name.zh : c.name.en}
                        <button onClick={() => onToggle(c.id)} style={{ ...ghostBtn, color: c.color }}><X size={10} weight="bold" /></button>
                    </span>
                ))}
                {selected.length === 0 && !showPicker && <span style={{ fontSize: 12, color: colors.text, opacity: 0.5 }}>{t.noCollection}</span>}
            </div>
            
            {showPicker && (
                <div className="fade-in-fast" style={{ marginTop: 12, padding: 12, borderRadius: 8, backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {collections.map((c: Collection) => {
                        const isSelected = record.collectionIds.includes(c.id);
                        return (
                            <button key={c.id} onClick={() => onToggle(c.id)} style={{
                                padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                                backgroundColor: isSelected ? `${c.color}20` : colors.bg, color: isSelected ? c.color : colors.text, transition: "all 0.15s",
                            }}>
                                {lang === "zh" ? c.name.zh : c.name.en} {isSelected && "✓"}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ==========================================
// 3. 主组件
// ==========================================
interface ResultViewProps {
    record: AnalysisRecord;
    theme: AppTheme;
    lang: "zh" | "en";
    tags: Tag[];
    collections: Collection[];
    onToggleCollection: (collectionId: string) => void;
    onDelete: () => void;
    onExport: (format: "txt" | "md") => void;
    onCopy: (text: string) => void;
    onAddUserTag: (name: { zh: string; en: string }) => void;
    onRemoveUserTag: (tagId: string) => void;
    defaultExportFormat: "md" | "txt";
    onBack?: () => void;
}

const ResultView = ({
    record, theme, lang, tags, collections,
    onToggleCollection, onDelete, onExport, onCopy,
    onAddUserTag, onRemoveUserTag, defaultExportFormat, onBack,
}: ResultViewProps) => {
    const [copied, setCopied] = useState(false);
    const t = getT(lang);
    const colors = theme.colors;

    const fieldLabels: Record<string, string> = {};
    for (const [k, v] of Object.entries(FIELD_LABELS)) {
        fieldLabels[k] = lang === "zh" ? v.zh : v.en;
    }

    const handleCopyFullReport = () => {
        const labels = { report: t.exportReport, summary: t.exportSectionSummary, tags: t.exportSectionTags, analysis: t.exportSectionAnalysis };
        onCopy(exportAsTxt(record, lang, labels));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* 顶部工具栏：返回 + 导出 + 删除（统一图标按钮样式） */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingBottom: 8 }}>
                {onBack && (
                    <Tooltip content={t.newAnalysis || "新建分析"} accentColor={colors.accent}>
                        <button onClick={onBack} className="btn-interactive" style={iconBtn(colors)}>
                            <ArrowLeft size={18} weight="bold" />
                        </button>
                    </Tooltip>
                )}
                <Tooltip content={t.exportTxt} accentColor={colors.accent}>
                    <button onClick={() => onExport(defaultExportFormat)} className="btn-interactive" style={iconBtn(colors)}>
                        <FileText size={18} weight="bold" />
                    </button>
                </Tooltip>
                <Tooltip content={t.historyClear} accentColor={colors.error}>
                    <button
                        onClick={onDelete}
                        className="btn-interactive"
                        style={iconBtn(colors)}
                        onMouseEnter={e => { e.currentTarget.style.color = colors.error; e.currentTarget.style.backgroundColor = `${colors.error}10`; e.currentTarget.style.borderColor = `${colors.error}40`; }}
                        onMouseLeave={e => { e.currentTarget.style.color = colors.text; e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.borderColor = colors.border; }}
                    >
                        <Trash size={18} weight="bold" />
                    </button>
                </Tooltip>
            </div>

            {/* 核心内容：单列布局 */}
            <BentoCard colors={colors} bg={`${colors.accent}10`} className="shimmer-effect" style={{ borderColor: `${colors.accent}30` }}>
                {/* 图片预览 */}
                <div style={{ width: "100%", borderRadius: 10, overflow: "hidden", backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`, marginBottom: 16, display: "flex", justifyContent: "center" }}>
                    <DiskImage path={record.imagePath} alt={t.analyzedImage} style={{ width: "100%", maxHeight: 200, objectFit: "contain", display: "block" }} />
                </div>
                
                {/* 分析结果 */}
                <h3 style={{ margin: "0 0 8px 0", ...heading(colors) }}>分析结果</h3>
                <p style={{ ...bodyText(colors), marginBottom: 0 }}>
                    {lang === "zh" ? record.summary.zh : record.summary.en}
                </p>

                {/* 粗主题色虚线分割 */}
                <div style={{ ...dividerAccent(colors) }} />

                {/* 设计详情（全部展开，无折叠，无标题） */}
                <div style={{ marginBottom: 24 }}>
                    <DesignModeView record={record} lang={lang} colors={colors} fieldLabels={fieldLabels} onCopy={(text) => onCopy(text)} t={t} forceExpand />
                </div>

                {/* 复制按钮 */}
                <button onClick={handleCopyFullReport} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", padding: "12px", borderRadius: 10, border: "none", backgroundColor: copied ? colors.success : colors.accent, color: "#000", fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}>
                    {copied ? <CheckCircle size={20} weight="bold" /> : <Copy size={20} weight="bold" />}
                    <span>{copied ? t.copied : t.copy}</span>
                </button>
            </BentoCard>

            {/* 底部元数据：并排的两个小卡片（浅灰底色） */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <BentoCard colors={colors} bg={colors.grayBg} className="card-hover" style={{ flex: 1, minWidth: "250px" }}>
                    <TagSection record={record} tags={tags} colors={colors} lang={lang} t={t} onAdd={onAddUserTag} onRemove={onRemoveUserTag} />
                </BentoCard>

                <BentoCard colors={colors} bg={colors.grayBg} className="card-hover" style={{ flex: 1, minWidth: "250px" }}>
                    <CollectionSection record={record} collections={collections} colors={colors} lang={lang} t={t} onToggle={onToggleCollection} />
                </BentoCard>
            </div>

        </div>
    );
};


export default ResultView;
