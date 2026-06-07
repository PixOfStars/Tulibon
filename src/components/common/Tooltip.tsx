import { useState, useRef, useEffect } from "react";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    accentColor?: string;
}

const Tooltip = ({ content, children, accentColor = "#00C896" }: TooltipProps) => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState<{ x: number; y: number; side: "left" | "right" }>({ x: 0, y: 0, side: "right" });
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const wrapperRef = useRef<HTMLSpanElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const calcPos = () => {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const vw = window.innerWidth;
        // 预估 tooltip 宽度（内容长度 × 字符宽度 + padding）
        const estimatedW = content.length * 12 + 20;
        const gap = 12;
        // 右侧空间不足时翻转到左侧
        if (rect.right + gap + estimatedW > vw - 8) {
            setPos({ x: rect.left - gap, y: rect.top + rect.height / 2, side: "left" });
        } else {
            setPos({ x: rect.right + gap, y: rect.top + rect.height / 2, side: "right" });
        }
    };

    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        calcPos();
        timeoutRef.current = setTimeout(() => setVisible(true), 400);
    };

    const handleMouseLeave = () => {
        clearTimeout(timeoutRef.current);
        setVisible(false);
    };

    // 显示后用实际宽度修正位置
    useEffect(() => {
        if (!visible || !tooltipRef.current) return;
        const tw = tooltipRef.current.offsetWidth;
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        const vw = window.innerWidth;
        const gap = 12;
        if (pos.side === "right" && rect.right + gap + tw > vw - 8) {
            setPos({ x: rect.left - gap, y: rect.top + rect.height / 2, side: "left" });
        }
    }, [visible]);

    return (
        <span
            ref={wrapperRef}
            style={{ display: "inline-flex" }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {children}
            {visible && content && (
                <div
                    ref={tooltipRef}
                    style={{
                        position: "fixed",
                        left: pos.x,
                        top: pos.y,
                        transform: pos.side === "right" ? "translateY(-50%)" : "translate(-100%, -50%)",
                        zIndex: 9999,
                        padding: "6px 10px",
                        borderRadius: 6,
                        backgroundColor: accentColor,
                        color: "#000",
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))",
                    }}
                >
                    {/* 尖角：右侧显示时在左侧，左侧显示时在右侧 */}
                    <div
                        style={{
                            position: "absolute",
                            [pos.side === "right" ? "left" : "right"]: -4,
                            top: "50%",
                            transform: "translateY(-50%) rotate(45deg)",
                            width: 8,
                            height: 8,
                            backgroundColor: accentColor,
                            borderRadius: 1,
                            zIndex: -1,
                        }}
                    />
                    {content}
                </div>
            )}
        </span>
    );
};

export default Tooltip;
