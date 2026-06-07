import { Sun, Moon, Monitor } from "@phosphor-icons/react";
import { Field } from "./SettingsField";
import type { TabProps } from "./TabProps";

const COLOR_PRESETS = [
    "#00C896",
    "#4A90D9",
    "#FF6B4A",
    "#8B5CF6",
    "#EC4899",
    "#06B6D4",
    "#F59E0B",
];

// ==========================================
// 提取通用的分段控制器组件 (DRY 原则)
// ==========================================
interface SegmentedControlProps<T> {
    options: { val: T; label: string; icon?: React.ElementType }[];
    value: T;
    onChange: (val: T) => void;
    colors: Record<string, string>;
}

const SegmentedControl = <T extends string>({ options, value, onChange, colors }: SegmentedControlProps<T>) => (
    <div
        style={{
            display: "flex",
            gap: 4,
            padding: 4,
            backgroundColor: colors.grayBg, // 统一使用灰色底座
            borderRadius: 10,
            border: `1px solid ${colors.border}`,
            width: "fit-content",
        }}
    >
        {options.map(({ val, icon: Icon, label }) => {
            const isActive = value === val;
            return (
                <button
                    key={val}
                    onClick={() => onChange(val)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "6px 16px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: isActive ? 600 : 500,
                        // 选中项变白底+阴影，未选中透明
                        backgroundColor: isActive ? colors.bg : "transparent",
                        color: isActive ? colors.textHeader : colors.text,
                        boxShadow: isActive ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.color = colors.textHeader;
                    }}
                    onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.color = colors.text;
                    }}
                >
                    {Icon && <Icon size={14} weight={isActive && val === "dark" ? "fill" : "bold"} />}
                    {label}
                </button>
            );
        })}
    </div>
);

// ==========================================
// 主标签页组件
// ==========================================
const AppearanceTab = ({ config, saveConfig, colors, t }: TabProps) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* 1. 外观模式 */}
        <Field label={t.modeLabel}>
            <SegmentedControl
                colors={colors}
                value={config.prefMode}
                onChange={(val) => saveConfig({ ...config, prefMode: val })}
                options={[
                    { val: "auto", icon: Monitor, label: t.themeAuto },
                    { val: "light", icon: Sun, label: t.modeLight },
                    { val: "dark", icon: Moon, label: t.modeDark },
                ]}
            />
        </Field>

        {/* 2. 主题色选择 */}
        <Field label={t.accentColor}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* 预设色盘 */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {COLOR_PRESETS.map((c) => {
                        const isActive = config.accentColor === c;
                        return (
                            <button
                                key={c}
                                onClick={() => saveConfig({ ...config, accentColor: c })}
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: "50%",
                                    backgroundColor: c,
                                    border: isActive ? `2px solid ${colors.bg}` : `2px solid transparent`,
                                    cursor: "pointer",
                                    padding: 0,
                                    outline: isActive ? `2px solid ${c}` : "none",
                                    outlineOffset: 1,
                                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                                    transition: "all 0.2s ease",
                                    transform: isActive ? "scale(1.1)" : "scale(1)",
                                }}
                                onMouseEnter={(e) => {
                                    if (!isActive) e.currentTarget.style.transform = "scale(1.05)";
                                }}
                                onMouseLeave={(e) => {
                                    if (!isActive) e.currentTarget.style.transform = "scale(1)";
                                }}
                            />
                        );
                    })}
                </div>

                {/* 自定义颜色输入框 */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: colors.text, opacity: 0.8 }}>
                        {t.accentColorCustom}
                    </span>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 10px",
                            borderRadius: 8,
                            backgroundColor: colors.grayBg,
                            border: `1px solid transparent`,
                            transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = colors.accent)}
                        onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                    >
                        <span
                            style={{
                                width: 14,
                                height: 14,
                                borderRadius: 4,
                                backgroundColor: config.accentColor,
                                border: `1px solid ${colors.border}`,
                            }}
                        />
                        <input
                            type="text"
                            value={config.accentColor}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (/^#[0-9a-fA-F]{0,6}$/.test(val)) {
                                    saveConfig({ ...config, accentColor: val });
                                }
                            }}
                            onBlur={(e) => {
                                const val = e.target.value;
                                if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                                    saveConfig({ ...config, accentColor: val });
                                } else {
                                    // 格式不完整时恢复默认
                                    saveConfig({ ...config, accentColor: config.accentColor || "#00C896" });
                                }
                            }}
                            placeholder="#00C896"
                            maxLength={7}
                            style={{
                                width: 60,
                                border: "none",
                                background: "none",
                                fontSize: 12,
                                fontWeight: 600,
                                color: colors.textHeader,
                                outline: "none",
                            }}
                        />
                    </div>
                </div>
            </div>
        </Field>

        {/* 3. 字体大小 */}
        <Field label={t.fontSize}>
            <SegmentedControl
                colors={colors}
                value={config.fontSize}
                onChange={(val) => saveConfig({ ...config, fontSize: val })}
                options={[
                    { val: "small", label: t.fontSizeSmall },
                    { val: "medium", label: t.fontSizeMedium },
                    { val: "large", label: t.fontSizeLarge },
                ]}
            />
        </Field>
    </div>
);

export default AppearanceTab;