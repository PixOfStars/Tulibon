import { useState } from "react";
import {
    Copy,
    CheckCircle,
    Trash,
    FileText,
    Plus,
    X,
} from "@phosphor-icons/react";
import type { AnalysisRecord, Collection, Tag } from "../../types";
import type { AppTheme } from "../../styles/theme";
import { FIELD_LABELS } from "./ModeFieldConfigs";
import Tooltip from "../common/Tooltip";
import DesignModeView from "./DesignModeView";
import DiskImage from "../common/DiskImage";
import { exportAsTxt } from "../../utils/helpers";
import { getT } from "../../utils/i18n";

// ==========================================
// 1. 标签管理区块
// ==========================================
const TagSection = ({ record, tags, colors, lang, t, onAdd, onRemove }: any) => {
    const [showInput, setShowInput] = useState(false);
    const [val, setVal] = useState("");

    return (
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, textTransform: "uppercase" }}>
                    {t.tags}
                </span>
                <button
                    onClick={() => setShowInput(!showInput)}
                    style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", padding: 2, opacity: 0.6 }}
                >
                    <Plus size={14} weight="bold" />
                </button>
            </div>

            {showInput && (
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                    <input
                        autoFocus
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        placeholder={t.addTagPlaceholder}
                        style={{ flex: 1, padding: "6px 10px", borderRadius: 8, border: `1px solid ${colors.border}`, backgroundColor: colors.bg, color: colors.textHeader, fontSize: 12, outline: "none" }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && val.trim()) {
                                onAdd({ zh: val.trim(), en: val.trim() });
                                setVal("");
                                setShowInput(false);
                            } else if (e.key === "Escape") {
                                setShowInput(false);
                            }
                        }}
                    />
                </div>
            )}

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {record.systemTags.concat(record.userTags).map((tid: string) => {
                    const tag = tags.find((tg: Tag) => tg.id === tid);
                    if (!tag) return null;
                    const isUser = record.userTags.includes(tid);
                    
                    return (
                        <span key={tid} style={{
                            display: "inline-flex", alignItems: "center", gap: 4,
                            padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                            backgroundColor: isUser ? `${colors.accent}15` : colors.grayBg,
                            color: isUser ? colors.accent : colors.textHeader,
                            border: `1px solid ${isUser ? 'transparent' : colors.border}`,
                        }}>
                            #{lang === "zh" ? tag.name.zh : tag.name.en}
                            {isUser && (
                                <button onClick={() => onRemove(tid)} style={{ background: "none", border: "none", cursor: "pointer", color: colors.accent, padding: 0, display: "flex" }}>
                                    <X size={10} weight="bold" />
                                </button>
                            )}
                        </span>
                    );
                })}
                {record.systemTags.length === 0 && record.userTags.length === 0 && !showInput && (
                    <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>{t.noTags}</span>
                )}
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
        <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: colors.text, textTransform: "uppercase" }}>
                    {t.collection}
                </span>
                <button
                    onClick={() => setShowPicker(!showPicker)}
                    style={{ background: "none", border: "none", color: colors.text, cursor: "pointer", display: "flex", alignItems: "center", padding: 2, opacity: 0.6 }}
                >
                    <Plus size={14} weight="bold" />
                </button>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {selected.map((c: Collection) => (
                    <span key={c.id} style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                        backgroundColor: `${c.color}15`, color: c.color,
                    }}>
                        {lang === "zh" ? c.name.zh : c.name.en}
                        <button onClick={() => onToggle(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: c.color, padding: 0, display: "flex" }}>
                            <X size={10} weight="bold" />
                        </button>
                    </span>
                ))}
                {selected.length === 0 && !showPicker && (
                    <span style={{ fontSize: 11, color: colors.text, opacity: 0.5 }}>{t.noCollection}</span>
                )}
            </div>

            {showPicker && (
                <div className="fade-in-fast" style={{ marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: colors.grayBg, border: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {collections.map((c: Collection) => {
                        const isSelected = record.collectionIds.includes(c.id);
                        return (
                            <button key={c.id} onClick={() => onToggle(c.id)} style={{
                                padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
                                backgroundColor: isSelected ? `${c.color}20` : colors.bg,
                                color: isSelected ? c.color : colors.text,
                                boxShadow: isSelected ? "none" : `0 1px 2px rgba(0,0,0,0.05)`,
                                transition: "all 0.15s",
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
}

const ResultView = ({
    record, theme, lang, tags, collections,
    onToggleCollection, onDelete, onExport, onCopy,
    onAddUserTag, onRemoveUserTag, defaultExportFormat,
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
        <div className="fade-in" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* 顶部图片预览：去掉刺眼的粗边框，变得更柔和 */}
            <div style={{ borderRadius: 12, overflow: "hidden", backgroundColor: colors.grayBg, display: "flex", justifyContent: "center" }}>
                <DiskImage
                    path={record.imagePath}
                    alt={t.analyzedImage}
                    style={{ width: "100%", maxHeight: 220, objectFit: "contain", display: "block" }}
                />
            </div>

            {/* 总结部分：去掉底色，变成醒目的正文介绍 */}
            <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.textHeader, lineHeight: 1.6 }}>
                    {lang === "zh" ? record.summary.zh : record.summary.en}
                </div>
            </div>

            {/* 详细字段展示 */}
            <DesignModeView
                record={record} lang={lang} colors={colors}
                fieldLabels={fieldLabels} onCopy={(text) => {
                    onCopy(text);
                    // 局部复制就不触发全局的大按钮打勾了
                }} t={t}
            />

            {/* 元数据区域：标签与收藏夹 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "16px 0", borderTop: `1px solid ${colors.border}`, borderBottom: `1px solid ${colors.border}` }}>
                <TagSection record={record} tags={tags} colors={colors} lang={lang} t={t} onAdd={onAddUserTag} onRemove={onRemoveUserTag} />
                <CollectionSection record={record} collections={collections} colors={colors} lang={lang} t={t} onToggle={onToggleCollection} />
            </div>

            {/* 底部操作行 */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8 }}>
                <button
                    onClick={handleCopyFullReport}
                    style={{
                        display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", borderRadius: 12, border: "none",
                        backgroundColor: copied ? colors.success : colors.accent, color: "#000",
                        fontSize: 14, fontWeight: 700, cursor: "pointer", transition: "all 0.15s",
                    }}
                >
                    {copied ? <CheckCircle size={20} weight="bold" /> : <Copy size={20} weight="bold" />}
                    <span>{copied ? t.copied : t.copy}</span>
                </button>
                
                <div style={{ flex: 1 }} />
                
                <Tooltip key={colors.accent} content={t.exportTxt} accentColor={colors.accent}>
                <button
                    onClick={() => onExport(defaultExportFormat)}
                    style={iconBtnStyle(colors)}
                >
                    <FileText size={18} weight="bold" />
                </button>
                </Tooltip>
                
                <Tooltip key={colors.accent} content={t.historyClear} accentColor={colors.accent}>
                <button
                    onClick={onDelete}
                    style={iconBtnStyle(colors)}
                    onMouseEnter={(e) => (e.currentTarget.style.color = colors.error)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = colors.text)}
                >
                    <Trash size={18} weight="bold" />
                </button>
                </Tooltip>
            </div>
        </div>
    );
};

// 统一的图标按钮样式
const iconBtnStyle = (colors: Record<string, string>): React.CSSProperties => ({
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 44, height: 44, borderRadius: 12,
    border: `1px solid ${colors.border}`, backgroundColor: colors.bg,
    color: colors.text, cursor: "pointer", transition: "all 0.15s",
});

export default ResultView;