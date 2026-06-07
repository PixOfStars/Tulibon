import { useState, useRef } from "react";

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    accentColor?: string;
}

const Tooltip = ({ content, children, accentColor = "#00C896" }: TooltipProps) => {
    const [visible, setVisible] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
    const wrapperRef = useRef<HTMLSpanElement>(null);

    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (rect) {
            // 原本是 rect.right + 8，这里稍微加大一点(12)，给左侧的尖角留出空间
            setPos({ x: rect.right + 12, y: rect.top + rect.height / 2 });
        }
        timeoutRef.current = setTimeout(() => setVisible(true), 400);
    };

    const handleMouseLeave = () => {
        clearTimeout(timeoutRef.current);
        setVisible(false);
    };

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
                    style={{
                        position: "fixed",
                        left: pos.x,
                        top: pos.y,
                        transform: "translateY(-50%)",
                        zIndex: 9999,
                        padding: "6px 10px",
                        borderRadius: 6,
                        backgroundColor: accentColor,
                        color: "#000",
                        fontSize: 11,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        pointerEvents: "none",
                        // 【关键优化 1】使用 drop-shadow 替代 box-shadow，这样阴影会沿着尖角的边缘生成
                        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.25))", 
                    }}
                >
                    {/* 【关键优化 2】左侧的尖角 */}
                    <div
                        style={{
                            position: "absolute",
                            left: -4, // 向左移出盒子外，露出一半
                            top: "50%", // 垂直居中
                            transform: "translateY(-50%) rotate(45deg)", // 旋转 45 度形成尖角
                            width: 8,
                            height: 8,
                            backgroundColor: accentColor, // 颜色与主体保持一致
                            borderRadius: 1, // 让尖角稍微圆润一点，不那么刺眼
                            zIndex: -1, // 压在文字内容的下面
                        }}
                    />
                    
                    {content}
                </div>
            )}
        </span>
    );
};

export default Tooltip;