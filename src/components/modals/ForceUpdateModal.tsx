import { DownloadSimple, RocketLaunch } from "@phosphor-icons/react";
import type { AppTheme } from "../../styles/theme";

interface ForceUpdateModalProps {
	theme: AppTheme;
	t: Record<string, string>;
	version: string;
	body: string;
	installing: boolean;
	onUpdate: () => void;
	onDismiss: () => void;
}

const ForceUpdateModal = ({
	theme,
	t,
	version,
	body,
	installing,
	onUpdate,
	onDismiss,
}: ForceUpdateModalProps) => {
	const colors = theme.colors;

	return (
		<div
			className="settings-overlay"
			style={{ zIndex: 200 }}
			onClick={onDismiss}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					backgroundColor: colors.bg,
					borderRadius: 16,
					padding: 32,
					maxWidth: 400,
					width: "90%",
					textAlign: "center",
					boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
					border: `1px solid ${colors.border}`,
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 16,
				}}
			>
				<img
					src="/icon.png"
					alt=""
					style={{ width: 48, height: 48, borderRadius: 12 }}
				/>
				<div>
					<div
						style={{
							fontSize: 18,
							fontWeight: 700,
							color: colors.textHeader,
							marginBottom: 4,
						}}
					>
						{t.newVersionTitle}
					</div>
					<div
						style={{
							fontSize: 13,
							color: colors.accent,
							fontWeight: 600,
						}}
					>
						{t.updateRequired}
					</div>
				</div>
				<div
					style={{
						width: "100%",
						padding: "12px 16px",
						borderRadius: 10,
						backgroundColor: colors.accentBg,
						border: `1px solid ${colors.accent}20`,
						textAlign: "left",
					}}
				>
					<div
						style={{
							fontSize: 12,
							fontWeight: 700,
							color: colors.accent,
							marginBottom: 4,
						}}
					>
						v{version}
					</div>
					{body && (
						<div
							style={{
								fontSize: 11,
								color: colors.text,
								whiteSpace: "pre-wrap",
								maxHeight: 120,
								overflow: "auto",
								lineHeight: 1.5,
							}}
						>
							{body}
						</div>
					)}
				</div>
				<button
					onClick={onUpdate}
					disabled={installing}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						gap: 8,
						width: "100%",
						padding: "12px 0",
						borderRadius: 10,
						border: "none",
						cursor: installing ? "not-allowed" : "pointer",
						fontSize: 14,
						fontWeight: 700,
						backgroundColor: colors.accent,
						color: "#000",
						opacity: installing ? 0.6 : 1,
						transition: "all 0.15s",
					}}
				>
					{installing ? (
						<>
							<RocketLaunch
								size={18}
								weight="bold"
								style={{ animation: "pulse 1.5s infinite" }}
							/>
							{t.installing}
						</>
					) : (
						<>
							<DownloadSimple size={18} weight="bold" />
							{t.updateNow}
						</>
					)}
				</button>
			</div>
		</div>
	);
};

export default ForceUpdateModal;
