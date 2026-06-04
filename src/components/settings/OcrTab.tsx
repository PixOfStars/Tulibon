import { useState, useCallback } from "react";
import { TextT, Download, CheckCircle, Circle } from "@phosphor-icons/react";
import { Field, Divider } from "./SettingsField";
import { inputStyle } from "./SettingsField";
import type { TabProps } from "./TabProps";
import type { OCREngine } from "../../types";
import {
	OCR_ENGINES,
	ocrEngineNeedsDownload,
	DEFAULT_OCR_ENGINE,
} from "../../types";
import { tauriInvoke, tauriListen } from "../../utils/tauri";

const ENGINE_ICONS: Record<OCREngine, typeof TextT> = {
	windows: TextT,
	paddle: TextT,
	tesseract: TextT,
};

const OcrTab = ({ config, saveConfig, colors, t }: TabProps) => {
	const selected = config.ocrEngine || DEFAULT_OCR_ENGINE;
	const downloaded = config.ocrEngineDownloaded || {
		windows: true,
		paddle: false,
		tesseract: false,
	};
	const [downloading, setDownloading] = useState<OCREngine | null>(null);
	const [downloadProgress, setDownloadProgress] = useState(0);
	const [downloadStage, setDownloadStage] = useState("");
	const [customUrl, setCustomUrl] = useState(config.ocrCustomDownloadUrl || "");

	const handleSelect = (engine: OCREngine) => {
		saveConfig({ ...config, ocrEngine: engine });
	};

	const handleCustomUrlChange = (url: string) => {
		setCustomUrl(url);
		saveConfig({ ...config, ocrCustomDownloadUrl: url });
	};

	const handleDownload = useCallback(
		async (engine: OCREngine) => {
			setDownloading(engine);
			setDownloadProgress(0);
			setDownloadStage("connecting");

			// Build download URLs
			const urls: string[] = [];
			if (customUrl.trim()) {
				urls.push(customUrl.trim());
			} else {
				// Use GitHub Releases URL pattern
				const baseUrl = `https://github.com/PixOfStars/Tulibon/releases/download/`;
				const modelPaths: Record<string, string> = {
					paddle: "paddleocr-models/paddleocr-models.zip",
					tesseract: "tesseract-lang/tesseract-lang.zip",
				};
				const path = modelPaths[engine];
				if (path) {
					const mirrors = [
						baseUrl,
						`https://ghproxy.com/https://github.com/PixOfStars/Tulibon/releases/download/`,
					];
					for (const m of mirrors) {
						urls.push(`${m}${path}`);
					}
				}
			}

			try {
				// Listen for progress events via Tauri v2 API
				const unlisten = await tauriListen("ocr-download-progress", (payload: any) => {
					if (payload.engine === engine) {
						setDownloadStage(payload.stage);
						if (payload.totalBytes > 0) {
							setDownloadProgress(
								Math.round((payload.bytesDownloaded / payload.totalBytes) * 100),
							);
						}
					}
				});

				await tauriInvoke("download_ocr_model", { engine, urls });

				unlisten();
				setDownloading(null);
				setDownloadProgress(100);
				setDownloadStage("done");

				// Update config
				saveConfig({
					...config,
					ocrEngineDownloaded: { ...downloaded, [engine]: true },
				});
			} catch (e) {
				setDownloading(null);
				setDownloadStage("error");
				console.error("Download failed:", e);
			}
		},
		[customUrl, config, downloaded, saveConfig],
	);

	const stageLabel = (stage: string): string => {
		if (stage === "connecting")
			return t.ocrEngineDownloading || "Connecting...";
		if (stage === "downloading") return t.ocrEngineDownloading;
		if (stage === "extracting") return t.ocrEngineExtracting;
		if (stage === "done") return t.ocrEngineDownloadDone;
		if (stage === "error") return t.ocrEngineDownloadFailed;
		return "";
	};

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

			{/* Engine selection cards */}
			{OCR_ENGINES.map((engine) => {
				const Icon = ENGINE_ICONS[engine];
				const isSelected = selected === engine;
				const isDownloaded = downloaded[engine] || false;
				const needsDl = ocrEngineNeedsDownload(engine);
				const isDl = downloading === engine;
					const isComingSoon = engine === "paddle";

				const nameKey =
					`ocrEngine${engine.charAt(0).toUpperCase() + engine.slice(1)}` as keyof typeof t;
				const hintKey = `${nameKey}Hint` as keyof typeof t;

				return (
					<div
						key={engine}
						onClick={() => !isComingSoon && handleSelect(engine)}
						onKeyDown={(e) => {
							if (!isComingSoon && (e.key === "Enter" || e.key === " ")) handleSelect(engine);
						}}
						role="radio"
						aria-checked={isComingSoon ? false : isSelected}
						tabIndex={0}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 10,
							padding: "12px 14px",
							borderRadius: 10,
							cursor: isComingSoon ? "default" : "pointer",
							backgroundColor: isSelected
								? `${colors.accent}10`
								: colors.grayBg,
							border: `1.5px solid ${isSelected ? colors.accent : "transparent"}`,
							transition: "all 0.15s",
						}}
					>
						<div style={{ flexShrink: 0 }}>
							{isSelected ? (
								<CheckCircle size={20} weight="fill" color={colors.accent} />
							) : (
								<Circle
									size={20}
									weight="regular"
									color={colors.text}
									style={{ opacity: 0.3 }}
								/>
							)}
						</div>
						<Icon
							size={22}
							weight="bold"
							color={isSelected ? colors.accent : colors.text}
							style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.5 }}
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
										color: isSelected ? colors.textHeader : colors.text,
									}}
								>
									{t[nameKey]}
								</span>
								{engine === DEFAULT_OCR_ENGINE && (
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
										{t.ocrEngineRecommended}
									</span>
								)}
								{isComingSoon && (
									<span style={{fontSize:9,fontWeight:600,padding:"2px 6px",borderRadius:4,backgroundColor:`${colors.grayBg}`,color:colors.text,opacity:0.5}}>
										{t.ocrEngineComingSoon}
									</span>
								)}
								{!isComingSoon && !needsDl && isDownloaded && (
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
										{t.ocrEngineInstalled}
									</span>
								)}
								{!isComingSoon && needsDl && isDownloaded && (
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
										{t.ocrEngineInstalled}
									</span>
								)}
								{!isComingSoon && needsDl && !isDownloaded && (
									<span
										style={{
											fontSize: 9,
											fontWeight: 600,
											padding: "2px 6px",
											borderRadius: 4,
											backgroundColor: `${colors.grayBg}`,
											color: colors.text,
											opacity: 0.5,
										}}
									>
										{t.ocrEngineNotInstalled}
									</span>
								)}
							</div>
							<div
								style={{
									fontSize: 11,
									color: colors.text,
									opacity: 0.5,
									marginTop: 2,
								}}
							>
								{t[hintKey]}
							</div>
						</div>

						{/* Download button for not-installed engines */}
						{!isComingSoon && needsDl && !isDownloaded && isSelected && (
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									handleDownload(engine);
								}}
								disabled={!!isDl}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 4,
									padding: "6px 12px",
									borderRadius: 6,
									border: "none",
									cursor: isDl ? "default" : "pointer",
									backgroundColor: isDl ? colors.border : colors.accent,
									color: isDl ? colors.text : "#000",
									fontSize: 11,
									fontWeight: 700,
									whiteSpace: "nowrap",
									flexShrink: 0,
								}}
							>
								<Download size={14} weight="bold" />
								{isDl ? stageLabel(downloadStage) : t.ocrEngineDownload}
							</button>
						)}
					</div>
				);
			})}

			{/* Download progress bar */}
			{downloading && (
				<div style={{ padding: "8px 0" }}>
					<div
						style={{
							height: 4,
							borderRadius: 2,
							backgroundColor: colors.border,
							overflow: "hidden",
						}}
					>
						<div
							style={{
								height: "100%",
								borderRadius: 2,
								backgroundColor:
									downloadProgress < 100 ? colors.accent : colors.success,
								width: `${Math.max(2, downloadProgress)}%`,
								transition: "width 0.3s ease",
							}}
						/>
					</div>
					<div
						style={{
							fontSize: 11,
							color: colors.text,
							opacity: 0.5,
							marginTop: 4,
							textAlign: "center",
						}}
					>
						{stageLabel(downloadStage)}{" "}
						{downloadProgress > 0 && `(${downloadProgress}%)`}
					</div>
				</div>
			)}

			<Divider colors={colors} />

			{/* Custom download URL */}
			<Field label={t.ocrEngineCustomUrl}>
				<input
					type="text"
					value={customUrl}
					onChange={(e) => handleCustomUrlChange(e.target.value)}
					placeholder={t.ocrEngineCustomUrlHint}
					style={{ ...inputStyle(colors) } as React.CSSProperties}
				/>
			</Field>
		</div>
	);
};

export default OcrTab;
