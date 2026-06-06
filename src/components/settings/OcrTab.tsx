import { TextT } from "@phosphor-icons/react";
import { Field, Divider } from "./SettingsField";
import type { TabProps } from "./TabProps";

const OcrTab = ({ colors, t }: TabProps) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<Field label={t.ocrEngineTitle || "OCR Engine"}>
				<div
					style={{
						fontSize: 12,
						color: colors.text,
						opacity: 0.6,
						lineHeight: 1.5,
					}}
				>
					{t.ocrEngineDesc}
				</div>
			</Field>

			{/* Windows OCR — the only engine */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					padding: "12px 14px",
					borderRadius: 10,
					backgroundColor: `${colors.accent}10`,
					border: `1.5px solid ${colors.accent}`,
				}}
			>
				<TextT
					size={22}
					weight="bold"
					color={colors.accent}
					style={{ flexShrink: 0 }}
				/>
				<div style={{ flex: 1 }}>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							flexWrap: "wrap",
						}}
					>
						<span
							style={{
								fontSize: 13,
								fontWeight: 600,
								color: colors.textHeader,
							}}
						>
							{t.ocrEngineWindows || "Windows OCR"}
						</span>
						<span
							style={{
								fontSize: 9,
								fontWeight: 700,
								padding: "2px 6px",
								borderRadius: 4,
								backgroundColor: colors.accent,
								color: "#000",
							}}
						>
							{t.ocrEngineRecommended || "Recommended"}
						</span>
						<span
							style={{
								fontSize: 9,
								fontWeight: 600,
								padding: "2px 6px",
								borderRadius: 4,
								backgroundColor: `${colors.success}20`,
								color: colors.success,
							}}
						>
							{t.ocrEngineInstalled || "Installed"}
						</span>
					</div>
					<div
						style={{
							fontSize: 11,
							color: colors.text,
							opacity: 0.5,
							marginTop: 2,
						}}
					>
						{t.ocrEngineWindowsHint || "Built-in, fast & free"}
					</div>
				</div>
			</div>

			<Divider colors={colors} />
		</div>
	);
};

export default OcrTab;
