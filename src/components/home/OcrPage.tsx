import { useState } from "react";
import type { AppTheme } from "../../styles/theme";
import {
	clipboardToDataUrl,
	base64FromFile,
	base64FromUrl,
} from "../../utils/helpers";
import { useToast } from "../common/Toast";
import { useCroppedImage } from "../../hooks/useCroppedImage";
import OcrResultView from "../result/OcrResultView";
import ImageDropZone from "./ImageDropZone";
import { getT } from "../../utils/i18n";

interface OcrPageProps {
	theme: AppTheme;
	lang: "zh" | "en";
	config: ReturnType<
		typeof import("../../hooks/usePreferences").usePreferences
	>["config"];
}

const OcrPage = ({ theme, lang, config }: OcrPageProps) => {
	const t = getT(lang);
	const colors = theme.colors;
	const toast = useToast();
	const [ocrImage, setOcrImage] = useState<string | null>(null);

	const crop = useCroppedImage({
		colors,
		lang,
		onCropConfirm: (url) => setOcrImage(url),
	});

	const loadImage = (dataUrl: string) => {
		crop.startCrop(dataUrl);
		setOcrImage(null);
		toast.show(t.imageLoaded, "success");
	};

	const handleClipboard = async () => {
		try {
			const dataUrl = await clipboardToDataUrl();
			loadImage(dataUrl);
		} catch {
			toast.show(t.clipboardError, "error");
		}
	};

	const handleFileSelect = async (files: FileList) => {
		try {
			const dataUrl = await base64FromFile(files[0]);
			loadImage(dataUrl);
		} catch {
			toast.show(t.fileReadFailed, "error");
		}
	};

	const handleUrlPaste = async (url: string) => {
		try {
			toast.show(t.downloadImage, "info");
			const dataUrl = await base64FromUrl(url);
			loadImage(dataUrl);
		} catch {
			toast.show(t.imageDownloadFailed, "error");
		}
	};

	return (
		<div
			style={{
				height: "100%",
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
			}}
		>
			<div
				className="fade-in-fast"
				style={{ padding: "12px 20px 6px", flexShrink: 0 }}
			>
				<ImageDropZone
					config={config}
					colors={colors}
					onClipboard={handleClipboard}
					onFileSelect={handleFileSelect}
					onUrlPaste={handleUrlPaste}
				/>
			</div>

			{crop.cropComponent}

			<div style={{ flex: 1, overflow: "auto", padding: "0 20px 16px" }}>
				{ocrImage && (
					<OcrResultView
						imageDataUrl={ocrImage}
						colors={colors}
						t={t}
						config={config}
					/>
				)}
			</div>
		</div>
	);
};

export default OcrPage;
