import { useRef, useCallback, useEffect } from "react";
import { Gear, House, Clock, Folders, Info } from "@phosphor-icons/react";
import type { AppTheme } from "../theme";
import { SIDEBAR_ITEM_SIZE, SIDEBAR_ICON_SIZE } from "../styles";
import { getT } from "../utils/i18n";

const MIN_SIDEBAR_WIDTH = 140;
const MAX_SIDEBAR_WIDTH = 420;

type SidebarView = "home" | "history" | "collections";

interface SidebarProps {
	width: number;
	collapsed: boolean;
	activeView: SidebarView | string;
	onNavigate: (view: string) => void;
	onOpenSettings: () => void;
	onOpenAbout: () => void;
	onResize: (width: number) => void;
	theme: AppTheme;
	lang: "zh" | "en";
}

const NAV_ITEMS: { id: SidebarView; icon: typeof House; i18nKey: string }[] = [
	{ id: "home", icon: House, i18nKey: "home" },
	{ id: "history", icon: Clock, i18nKey: "history" },
	{ id: "collections", icon: Folders, i18nKey: "collections" },
];

const Sidebar = ({
	width,
	collapsed,
	activeView,
	onNavigate,
	onOpenSettings,
	onOpenAbout,
	onResize,
	theme,
	lang,
}: SidebarProps) => {
	const t = getT(lang);
	const colors = theme.colors;

	const isDragging = useRef(false);

	const handleResizeStart = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		isDragging.current = true;
		document.body.style.cursor = "col-resize";
		document.body.style.userSelect = "none";
	}, []);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (!isDragging.current) return;
			const newWidth = Math.min(
				MAX_SIDEBAR_WIDTH,
				Math.max(MIN_SIDEBAR_WIDTH, e.clientX),
			);
			onResize(newWidth);
		};
		const handleMouseUp = () => {
			if (isDragging.current) {
				isDragging.current = false;
				document.body.style.cursor = "";
				document.body.style.userSelect = "";
			}
		};
		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [onResize]);

	const navBtnStyle = (active: boolean): React.CSSProperties => ({
		display: "flex",
		alignItems: "center",
		height: SIDEBAR_ITEM_SIZE,
		gap: 10,
		padding: collapsed ? "0" : "0 12px",
		justifyContent: collapsed ? "center" : "flex-start",
		width: "100%",
		border: "none",
		borderRadius: 10,
		backgroundColor: active ? colors.accentBg : "transparent",
		color: active ? colors.accent : colors.text,
		cursor: "pointer",
		fontSize: 13,
		fontWeight: active ? 700 : 500,
		transition: "all 0.15s",
		position: "relative",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		userSelect: "none",
		WebkitUserSelect: "none",
	});

	const activeIndicator: React.CSSProperties = {
		position: "absolute",
		left: 0,
		top: "50%",
		transform: "translateY(-50%)",
		width: 3,
		height: 20,
		borderRadius: 2,
		backgroundColor: colors.accent,
	};

	return (
		<div
			style={{
				width,
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				backgroundColor: colors.sidebarBg,
				borderRight: `1px solid ${colors.border}`,
				transition: collapsed ? "width 0.2s ease" : "none",
				overflow: "hidden",
				position: "relative",
			}}
		>
			{/* Navigation items */}
			<div
				style={{
					flex: 1,
					padding: "8px 8px 4px",
					display: "flex",
					flexDirection: "column",
					gap: 2,
					overflow: "auto",
				}}
			>
				{NAV_ITEMS.map(({ id, icon: Icon, i18nKey }) => {
					const active = activeView === id;
					const label = (t as Record<string, string>)[i18nKey];
					return (
						<button
							key={id}
							onClick={() => onNavigate(id)}
							title={collapsed ? label : undefined}
							style={navBtnStyle(active)}
						>
							{active && !collapsed && <div style={activeIndicator} />}
							<Icon
								size={SIDEBAR_ICON_SIZE}
								weight={active ? "fill" : "bold"}
							/>
							{!collapsed && <span>{label}</span>}
						</button>
					);
				})}
			</div>

			{/* About & Settings */}
			<div style={{ padding: "4px 8px 8px" }}>
				<button
					onClick={onOpenAbout}
					title={collapsed ? t.aboutTab || "About" : undefined}
					style={{ ...navBtnStyle(false), marginBottom: 2 }}
				>
					<Info size={SIDEBAR_ICON_SIZE} weight="bold" />
					{!collapsed && <span>{t.aboutTab || "About"}</span>}
				</button>
				<button
					onClick={onOpenSettings}
					title={collapsed ? t.settings : undefined}
					style={navBtnStyle(false)}
				>
					<Gear size={SIDEBAR_ICON_SIZE} weight="bold" />
					{!collapsed && <span>{t.settings}</span>}
				</button>
			</div>

			{/* Resize handle */}
			{!collapsed && (
				<div
					onMouseDown={handleResizeStart}
					style={{
						position: "absolute",
						right: 0,
						top: 0,
						bottom: 0,
						width: 5,
						cursor: "col-resize",
						zIndex: 10,
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = `${colors.accent}30`;
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "transparent";
					}}
				/>
			)}
		</div>
	);
};

export default Sidebar;
