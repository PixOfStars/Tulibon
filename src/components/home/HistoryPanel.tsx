import { Heart, Tray, Copy } from "@phosphor-icons/react";
import type { AnalysisRecord, Collection, Tag } from "../../types";
import { formatDate } from "../../utils/helpers";
import DiskImage from "../common/DiskImage";
import { getT } from "../../utils/i18n";
import Tooltip from "../common/Tooltip";

interface HistoryPanelProps {
    records: AnalysisRecord[];
    tags: Tag[];
    collections: Collection[];
    themeColors: Record<string, string>;
    lang: "zh" | "en";
    isCollectionView: boolean;
    onSelectRecord: (record: AnalysisRecord) => void;
}

const MODE_LABEL: Record<string, { zh: string; en: string }> = {
    design: { zh: "设计分析", en: "Design Analysis" },
    ocr: { zh: "文字识别", en: "Text Recognition" },
};

const HistoryPanel = ({
    records,
    tags,
    themeColors: colors,
    lang,
    isCollectionView,
    onSelectRecord,
}: HistoryPanelProps) => {
    const t = getT(lang);

    // 没有记录时，直接复用下方优化过的 EmptyState 组件
    if (records.length === 0) {
        return <EmptyState colors={colors} isCollectionView={isCollectionView} t={t} />;
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {records.map((record) => {
                const recordTags = record.systemTags
                    .map((tid) => tags.find((tg) => tg.id === tid))
                    .filter(Boolean) as Tag[];
                const isFav = record.collectionIds.includes("__favorites");
                const modeLabel = MODE_LABEL[record.analysisMode] || MODE_LABEL.design;

                return (
                    <div
                        key={record.id}
                        onClick={() => onSelectRecord(record)}
                        style={{
                            display: "flex",
                            gap: 14,
                            padding: 14,
                            borderRadius: 12,
                            backgroundColor: colors.grayBg,
                            cursor: "pointer",
                            border: `1px solid ${colors.border}`,
                            transition: "all 0.2s ease",
                            position: "relative",
                        }}
                        className="fade-in"
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentBg;
                            e.currentTarget.style.borderColor = colors.accent;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.grayBg;
                            e.currentTarget.style.borderColor = colors.border;
                        }}
                    >
                        {/* 左侧：图片 */}
                        <DiskImage
                            path={record.imagePath}
                            alt=""
                            style={{
                                width: 72,
                                height: 72,
                                borderRadius: 8,
                                objectFit: "cover",
                                flexShrink: 0,
                                border: `1px solid ${colors.border}50`, // 给图片加一点非常淡的边框增加质感
                            }}
                        />

                        {/* 右侧：信息区 */}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                            {/* 标题 / 摘要 (预留右侧 32px 空间给复制按钮，防止重叠) */}
                            <div
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: colors.textHeader,
                                    marginBottom: 6,
                                    lineHeight: 1.5,
                                    whiteSpace: "pre-wrap",
                                    paddingRight: 32, 
                                }}
                            >
                                {lang === "zh" ? record.summary.zh : record.summary.en}
                            </div>

                            {/* 标签区 */}
                            {recordTags.length > 0 && (
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                                    {recordTags.slice(0, 4).map((tag) => (
                                        <span
                                            key={tag.id}
                                            style={{
                                                fontSize: 11,
                                                padding: "2px 8px",
                                                backgroundColor: `${colors.text}10`, // 更柔和的底色
                                                borderRadius: 6,
                                                color: colors.textHeader,
                                            }}
                                        >
                                            #{lang === "zh" ? tag.name.zh : tag.name.en}
                                        </span>
                                    ))}
                                    {recordTags.length > 4 && (
                                        <span style={{ fontSize: 11, color: colors.text, padding: "2px 4px" }}>
                                            +{recordTags.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* 底部：日期、来源、模式标签 (使用 marginTop: "auto" 让它自动靠底) */}
                            <div
                                style={{
                                    marginTop: "auto",
                                    fontSize: 11,
                                    color: colors.text,
                                    display: "flex",
                                    gap: 8,
                                    alignItems: "center",
                                    opacity: 0.7,
                                }}
                            >
                                <span>{formatDate(record.createdAt, lang)}</span>
                                <span>•</span>
                                <span>
                                    {record.source === "clipboard"
                                        ? t.sourceClipboard
                                        : record.source === "file"
                                            ? "File"
                                            : t.sourceUrl}
                                </span>
                                <span>•</span>
                                <span style={{ fontWeight: 500 }}>
                                    {lang === "zh" ? modeLabel.zh : modeLabel.en}
                                </span>
                                {isFav && (
                                    <Heart size={12} weight="fill" color={colors.error} style={{ marginLeft: "auto" }} />
                                )}
                            </div>
                        </div>

                        {/* 绝对定位的复制按钮 */}
                        <Tooltip key={colors.accent} content={t.copy} accentColor={colors.accent}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(
                                    lang === "zh" ? record.summary.zh : record.summary.en,
                                );
                            }}
                            style={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                width: 28,
                                height: 28,
                                borderRadius: 6,
                                border: "none",
                                background: "none",
                                color: colors.text,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0.4,
                                transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.opacity = "1";
                                e.currentTarget.style.backgroundColor = colors.bg;
                                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)";
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.opacity = "0.4";
                                e.currentTarget.style.backgroundColor = "transparent";
                                e.currentTarget.style.boxShadow = "none";
                            }}
                        >
                            <Copy size={14} weight="bold" />
                        </button>
                        </Tooltip>
                    </div>
                );
            })}
        </div>
    );
};

// 空状态组件
const EmptyState = ({
    colors,
    isCollectionView,
    t,
}: {
    colors: Record<string, string>;
    isCollectionView: boolean;
    t: Record<string, string>;
}) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "80px 20px",
            color: colors.text,
            opacity: 0.6,
        }}
    >
        <Tray size={48} weight="light" color={colors.border} style={{ marginBottom: 16 }} />
        <p style={{ fontSize: 13, fontWeight: 500 }}>
            {isCollectionView ? t.noRecords : t.noHistory}
        </p>
    </div>
);

export { EmptyState };
export default HistoryPanel;