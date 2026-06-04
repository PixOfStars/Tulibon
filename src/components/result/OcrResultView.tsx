import { useState, useRef } from "react";
import { Copy, CheckCircle, Scan, Spinner } from "@phosphor-icons/react";
import type { OCREngine } from "../../types";
import {
	recognize as ocrRecognize,
	checkEngine,
	getFallbackEngine,
} from "../../api/ocrManager";

interface OcrResultViewProps {
	imageDataUrl: string;
	colors: Record<string, string>;
	t: Record<string, string>;
	engine?: OCREngine;
	engineDownloaded?: Record<OCREngine, boolean>;
	onEngineFallback?: (fallbackTo: OCREngine) => void;
}

type ButtonState = "idle" | "initializing" | "recognizing" | "done" | "error";

function OcrResultView({
	imageDataUrl,
	colors,
	t,
	engine = "windows",
	engineDownloaded = { windows: true, paddle: false, tesseract: false },
	onEngineFallback,
}: OcrResultViewProps) {
	const [text, setText] = useState("");
	const [error, setError] = useState("");
	const [copied, setCopied] = useState(false);
	const [ran, setRan] = useState(false);
	const [btnState, setBtnState] = useState<ButtonState>("idle");
	const busyRef = useRef(false);

	const handleRecognize = async () => {
		if (busyRef.current) return;
		busyRef.current = true;

		setError("");
		setBtnState("initializing");
		setRan(false);

		try {
			// 1. Check engine readiness
			const state = await checkEngine({ engine, engineDownloaded });

			if (state.status === "error") {
				// Handle download-needed error
				if (state.error?.startsWith("need_download:")) {
					throw new Error("need_download");
				}
				if (state.error?.startsWith("coming_soon:")) {
					throw new Error(
						t.ocrEngineComingSoon || "Coming Soon",
					);
				}
				// Handle fallback: Windows OCR not available
				if (state.error?.includes("不支持")) {
					const fallback = getFallbackEngine(engine, engineDownloaded);
					onEngineFallback?.(fallback);
					throw new Error(
						t.ocrEngineFallback ||
							"Windows OCR not available, switched to Tesseract",
					);
				}
				throw new Error(state.error || "Engine check failed");
			}

			// 2. Recognize
			setBtnState("recognizing");

			const result = await ocrRecognize({
				imageDataUrl,
				engine,
				engineDownloaded,
				lang: "zh-Hans",
				onProgress: (stage) => {
					if (stage === "recognizing") setBtnState("recognizing");
				},
			});

			setText(result);
			setBtnState("done");
			setRan(true);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setError(msg);
			setBtnState("error");
			setRan(true);
		} finally {
			busyRef.current = false;
		}
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const btnLabel = (): string => {
		switch (btnState) {
			case "initializing":
				return t.ocrEngineInitEngine || "Initializing engine...";
			case "recognizing":
				return t.ocrRecognizing;
			default:
				return t.ocrRecognize;
		}
	};

	const isBusy = btnState === "initializing" || btnState === "recognizing";
	const isDisabled = isBusy;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			{/* Image preview */}
			<div
				style={{
					borderRadius: 12,
					overflow: "hidden",
					border: `1px solid ${colors.border}`,
					backgroundColor: colors.grayBg,
				}}
			>
				<img
					src={imageDataUrl}
					alt="OCR input"
					style={{
						width: "100%",
						maxHeight: 200,
						objectFit: "contain",
						display: "block",
					}}
				/>
			</div>

			{/* Recognize button */}
			<button
				onClick={handleRecognize}
				disabled={isDisabled}
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					gap: 8,
					padding: "12px 24px",
					borderRadius: 12,
					border: "none",
					backgroundColor: isDisabled ? colors.border : colors.accent,
					color: isDisabled ? colors.text : "#000",
					fontSize: 14,
					fontWeight: 700,
					cursor: isDisabled ? "default" : "pointer",
					transition: "all 0.15s",
				}}
			>
				{isBusy ? (
					<Spinner
						size={20}
						weight="bold"
						style={{ animation: "spin 1s linear infinite" }}
					/>
				) : (
					<Scan size={20} weight="bold" />
				)}
				{btnLabel()}
			</button>

			{/* Error */}
			{error && (
				<div
					style={{
						padding: 12,
						borderRadius: 8,
						backgroundColor: colors.errorBg,
						color: colors.error,
						fontSize: 12,
						lineHeight: 1.5,
					}}
				>
					{error}
				</div>
			)}

			{/* Result */}
			{ran && (
				<div
					style={{
						borderRadius: 10,
						border: `1px solid ${colors.border}`,
						backgroundColor: colors.grayBg,
						overflow: "hidden",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "10px 14px",
							borderBottom: text ? `1px solid ${colors.border}` : "none",
						}}
					>
						<span
							style={{
								fontSize: 10,
								fontWeight: 700,
								color: colors.text,
								textTransform: "uppercase",
								letterSpacing: "0.5px",
							}}
						>
							{t.ocrResult}
						</span>
						{text && (
							<button
								onClick={handleCopy}
								style={{
									display: "flex",
									alignItems: "center",
									gap: 4,
									padding: "4px 10px",
									borderRadius: 6,
									border: "none",
									backgroundColor: copied ? colors.success : colors.accent,
									color: "#000",
									fontSize: 10,
									fontWeight: 700,
									cursor: "pointer",
									transition: "all 0.15s",
								}}
							>
								{copied ? (
									<CheckCircle size={14} weight="bold" />
								) : (
									<Copy size={14} weight="bold" />
								)}
								{copied ? t.copied : t.ocrCopyText}
							</button>
						)}
					</div>
					{text ? (
						<div
							style={{
								padding: 14,
								fontSize: 13,
								color: colors.textHeader,
								lineHeight: 1.7,
								whiteSpace: "pre-wrap",
							}}
						>
							{text}
						</div>
					) : (
						<div
							style={{
								padding: "20px 14px",
								textAlign: "center",
								fontSize: 12,
								color: colors.text,
								opacity: 0.5,
							}}
						>
							{t.ocrNoText}
						</div>
					)}
				</div>
			)}

			{/* Initial hint */}
			{!ran && !isBusy && (
				<div
					style={{
						textAlign: "center",
						padding: 12,
						fontSize: 11,
						color: colors.text,
						opacity: 0.45,
					}}
				>
					{t.ocrHint}
				</div>
			)}

			{/* Engine indicator */}
			<div
				style={{
					textAlign: "center",
					fontSize: 10,
					color: colors.text,
					opacity: 0.3,
				}}
			>
				{engine.toUpperCase()}
			</div>
		</div>
	);
}

export default OcrResultView;
