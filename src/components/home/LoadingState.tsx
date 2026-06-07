import { Sparkle } from "@phosphor-icons/react";

const LoadingState = ({ colors, t }: { colors: Record<string, string>; t: Record<string, string> }) => (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 20px",
            gap: 28,
        }}
    >
        {/* 脉冲光环 + 大图标 */}
        <div
            style={{
                position: "relative",
                width: 80,
                height: 80,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `3px solid ${colors.accent}40`,
                    animation: "pulseRing 2s ease-out infinite",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `3px solid ${colors.accent}25`,
                    animation: "pulseRing 2s ease-out 0.5s infinite",
                }}
            />
            <div
                style={{
                    position: "absolute",
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    border: `3px solid ${colors.accent}15`,
                    animation: "pulseRing 2s ease-out 1s infinite",
                }}
            />
            <div
                style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent}dd)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 24px ${colors.accent}60`,
                    zIndex: 1,
                }}
            >
                <Sparkle
                    size={28}
                    weight="fill"
                    color="#000"
                    style={{ animation: "pulse 1.2s ease-in-out infinite" }}
                />
            </div>
        </div>

        {/* 标题文字 */}
        <div style={{ textAlign: "center" }}>
            <div
                style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.textHeader,
                    display: "inline-flex",
                    gap: 2,
                    marginBottom: 8,
                }}
            >
                {Array.from(t.loading as string).map((char, i) => (
                    <span
                        key={i}
                        style={{
                            display: "inline-block",
                            animation: "bounceLetter 0.8s ease-in-out infinite",
                            animationDelay: `${i * 0.08}s`,
                        }}
                    >
                        {char}
                    </span>
                ))}
            </div>
            <div
                style={{
                    fontSize: 12,
                    color: colors.text,
                    opacity: 0.5,
                }}
            >
                {t.loadingHint}
            </div>
        </div>

        {/* 进度条 */}
        <div
            style={{
                width: 200,
                height: 3,
                borderRadius: 3,
                backgroundColor: colors.border,
                overflow: "hidden",
            }}
        >
            <div
                style={{
                    height: "100%",
                    borderRadius: 3,
                    backgroundColor: colors.accent,
                    animation: "loadingBar 2s ease-in-out infinite",
                }}
            />
        </div>

        {/* 注入动画 keyframes */}
        <style>{`
            @keyframes pulseRing {
                0%   { transform: scale(0.6); opacity: 0.9; }
                100% { transform: scale(1.6); opacity: 0; }
            }
            @keyframes loadingBar {
                0%   { width: 0%; margin-left: 0; }
                50%  { width: 60%; margin-left: 20%; }
                100% { width: 0%; margin-left: 100%; }
            }
        `}</style>
    </div>
);

export default LoadingState;
