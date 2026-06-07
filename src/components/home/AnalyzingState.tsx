import { Sparkle } from "@phosphor-icons/react";

const LoadingState = ({ colors, t }: { colors: Record<string, string>; t: Record<string, string> }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100%",
            padding: "80px 20px",
            gap: 36, // 拉大间距，增加呼吸感
        }}
    >
        {/* 1. 核心动画区：环境光 + 扩散光环 + 悬浮图标 */}
        <div
            style={{
                position: "relative",
                width: 140, // 扩大动画影响范围
                height: 140,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            {/* AI 呼吸环境光 (底部的弥散发光) */}
            <div
                style={{
                    position: "absolute",
                    width: 120,
                    height: 120,
                    borderRadius: "50%",
                    backgroundColor: colors.accent,
                    filter: "blur(40px)",
                    opacity: 0.15,
                    animation: "ambientPulse 3s ease-in-out infinite alternate",
                }}
            />

            {/* 扩散光环 (扩大尺寸，改用更柔和的阻尼动画) */}
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `2px solid ${colors.accent}`,
                    animation: "expandRing 2.5s cubic-bezier(0.2, 0, 0.2, 1) infinite",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `2px solid ${colors.accent}`,
                    animation: "expandRing 2.5s cubic-bezier(0.2, 0, 0.2, 1) 0.8s infinite",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `2px solid ${colors.accent}`,
                    animation: "expandRing 2.5s cubic-bezier(0.2, 0, 0.2, 1) 1.6s infinite",
                }}
            />

            {/* 中心主体：悬浮的大图标 */}
            <div
                style={{
                    width: 72, // 从 52 放大到 72
                    height: 72,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${colors.bg}, ${colors.grayBg})`,
                    border: `1px solid ${colors.border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 8px 32px ${colors.accent}40, inset 0 2px 4px rgba(255,255,255,0.1)`,
                    zIndex: 1,
                    animation: "floatIcon 3s ease-in-out infinite", // 加入上下悬浮感
                }}
            >
                <Sparkle
                    size={36} // 图标随之放大
                    weight="fill"
                    color={colors.accent}
                    style={{ animation: "pulse 2s ease-in-out infinite" }}
                />
            </div>
        </div>

        {/* 2. 文本区：优雅的排版 */}
        <div style={{ textAlign: "center", animation: "floatIcon 3s ease-in-out infinite", animationDelay: "0.2s" }}>
            <div
                style={{
                    fontSize: 20, // 字体放大
                    fontWeight: 700,
                    color: colors.textHeader,
                    display: "inline-flex",
                    gap: 3, // 拉开字间距
                    letterSpacing: "1px", // 增加高级感
                    marginBottom: 12,
                }}
            >
                {Array.from(t.loading as string).map((char, i) => (
                    <span
                        key={i}
                        style={{
                            display: "inline-block",
                            animation: "bounceLetter 1.2s ease-in-out infinite",
                            animationDelay: `${i * 0.08}s`,
                        }}
                    >
                        {char}
                    </span>
                ))}
            </div>
            <div
                style={{
                    fontSize: 13,
                    color: colors.text,
                    opacity: 0.6,
                    letterSpacing: "0.5px",
                }}
            >
                {t.loadingHint}
            </div>
        </div>

        {/* 3. 进度条：拉宽并加上发光拖尾 */}
        <div
            style={{
                width: 260, // 进度条拉长，显得更大气
                height: 4, // 稍微加粗一点
                borderRadius: 4,
                backgroundColor: colors.grayBg,
                border: `1px solid ${colors.border}`,
                overflow: "hidden",
                position: "relative",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "40%",
                    borderRadius: 4,
                    background: `linear-gradient(90deg, transparent, ${colors.accent}, transparent)`,
                    boxShadow: `0 0 12px ${colors.accent}`, // 增加发光拖尾
                    animation: "loadingGlowBar 2s ease-in-out infinite",
                }}
            />
        </div>

        {/* 注入现代高级动画 keyframes */}
        <style>{`
            @keyframes expandRing {
                0%   { transform: scale(1); opacity: 0.8; border-width: 3px; }
                100% { transform: scale(2.2); opacity: 0; border-width: 1px; }
            }
            @keyframes ambientPulse {
                0%   { transform: scale(0.8); opacity: 0.1; }
                100% { transform: scale(1.2); opacity: 0.3; }
            }
            @keyframes floatIcon {
                0%, 100% { transform: translateY(0); }
                50%      { transform: translateY(-8px); }
            }
            @keyframes loadingGlowBar {
                0%   { left: -40%; }
                100% { left: 100%; }
            }
            @keyframes bounceLetter {
                0%, 100% { transform: translateY(0); }
                30%      { transform: translateY(-6px); }
                60%      { transform: translateY(0); }
            }
        `}</style>
    </div>
);

export default LoadingState;