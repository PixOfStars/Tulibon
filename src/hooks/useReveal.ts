import { useEffect, useRef, useState } from "react";

/**
 * 滚动触发渐显 Hook
 * 当元素进入可视区域时自动添加 .visible 类触发 CSS 过渡动画
 *
 * @param threshold - 触发阈值（0-1），默认 0.1 表示元素露出 10% 时触发
 * @returns [ref, isVisible] - 绑定到目标元素的 ref，以及当前是否可见
 */
export function useReveal(threshold = 0.1): [React.RefObject<HTMLDivElement | null>, boolean] {
    const ref = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        // 如果用户偏好减少动画，直接显示
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        if (mq.matches) {
            setIsVisible(true);
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.unobserve(el); // 只触发一次
                }
            },
            { threshold }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [threshold]);

    return [ref, isVisible];
}
