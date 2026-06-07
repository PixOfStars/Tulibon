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
        // 加大卡片之间的整体间距
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {records.map((record, index) => {
                const recordTags = record.systemTags
                    .map((tid) => tags.find((tg) => tg.id === tid))
                    .filter(Boolean) as Tag[];
                const isFav = record.collectionIds.includes("__favorites");
                const modeLabel = MODE_LABEL[record.analysisMode] || MODE_LABEL.design;

                return (
                    <div
                        key={record.id}
                        onClick={() => onSelectRecord(record)}
                        className="card-hover slide-up"
                        style={{
                            display: "flex",
                            gap: 20, // 拉开左侧图片和右侧文字的距离
                            padding: 20, // 加大卡片整体内边距，让内容呼吸
                            borderRadius: 16, // 更现代的大圆角
                            backgroundColor: colors.grayBg,
                            cursor: "pointer",
                            border: `1px solid ${colors.border}`,
                            transition: "all 0.2s ease",
                            position: "relative",
                            animationDelay: `${index * 60}ms`, // 交错入场延迟
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentBg;
                            e.currentTarget.style.borderColor = colors.accent;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.grayBg;
                            e.currentTarget.style.borderColor = colors.border;
                        }}
                    >
                        {/* 左侧：图片 (尺寸加大) */}
                        <DiskImage
                            path={record.imagePath}
                            alt=""
                            style={{
                                width: 84, // 从 72 放大到 84
                                height: 84,
                                borderRadius: 12, // 图片也采用更大圆角
                                objectFit: "cover",
                                flexShrink: 0,
                                border: `1px solid ${colors.border}50`, 
                            }}
                        />

                        {/* 右侧：信息区 */}
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                            {/* 标题 / 摘要 */}
                            <div
                                style={{
                                    fontSize: 14, // 字号调大一号
                                    fontWeight: 600,
                                    color: colors.textHeader,
                                    marginBottom: 10, // 增加与标签的距离
                                    lineHeight: 1.6, // 加大行高，不拥挤
                                    whiteSpace: "pre-wrap",
                                    paddingRight: 40, // 预留更多右侧空间给复制按钮
                                }}
                            >
                                {lang === "zh" ? record.summary.zh : record.summary.en}
                            </div>

                            {/* 标签区 (胶囊化) */}
                            {recordTags.length > 0 && (
                                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                                    {recordTags.slice(0, 4).map((tag) => (
                                        <span
                                            key={tag.id}
                                            style={{
                                                fontSize: 11,
                                                padding: "4px 10px", // 增加上下左右边距，变成饱满胶囊
                                                backgroundColor: `${colors.text}10`,
                                                borderRadius: 8,
                                                color: colors.textHeader,
                                            }}
                                        >
                                            #{lang === "zh" ? tag.name.zh : tag.name.en}
                                        </span>
                                    ))}
                                    {recordTags.length > 4 && (
                                        <span style={{ fontSize: 11, color: colors.text, padding: "4px" }}>
                                            +{recordTags.length - 4}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* 底部：日期、来源、模式标签 */}
                            <div
                                style={{
                                    marginTop: "auto",
                                    paddingTop: 8, // 增加上边距，将其压到最底部并与上方内容区隔开
                                    fontSize: 12, // 字号变大
                                    color: colors.text,
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "center",
                                    opacity: 0.7,
                                }}
                            >
                                <span>{formatDate(record.createdAt, lang)}</span>
                                <span style={{ opacity: 0.5 }}>•</span>
                                <span>
                                    {record.source === "clipboard"
                                        ? t.sourceClipboard
                                        : record.source === "file"
                                            ? "File"
                                            : t.sourceUrl}
                                </span>
                                <span style={{ opacity: 0.5 }}>•</span>
                                <span style={{ fontWeight: 500 }}>
                                    {lang === "zh" ? modeLabel.zh : modeLabel.en}
                                </span>
                                {isFav && (
                                    <Heart size={14} weight="fill" color={colors.error} style={{ marginLeft: "auto" }} />
                                )}
                            </div>
                        </div>

                        {/* 绝对定位的复制按钮 */}
                        <Tooltip key={colors.accent} content={t.copy || "复制"} accentColor={colors.accent}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(
                                        lang === "zh" ? record.summary.zh : record.summary.en,
                                    );
                                }}
                                style={{
                                    position: "absolute",
                                    top: 12, // 距离边缘更远一点
                                    right: 12,
                                    width: 32, // 按钮稍微加大
                                    height: 32,
                                    borderRadius: 8,
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
                                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = "0.4";
                                    e.currentTarget.style.backgroundColor = "transparent";
                                    e.currentTarget.style.boxShadow = "none";
                                }}
                            >
                                <Copy size={16} weight="bold" />
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
            padding: "100px 20px", // 空状态也加大了内边距
            color: colors.text,
            opacity: 0.6,
        }}
    >
        <Tray size={56} weight="light" color={colors.border} style={{ marginBottom: 20 }} />
        <p style={{ fontSize: 14, fontWeight: 500 }}>
            {isCollectionView ? t.noRecords : t.noHistory}
        </p>
    </div>
);

export { EmptyState };
export default HistoryPanel;