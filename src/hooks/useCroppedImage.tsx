import { useState, useCallback } from "react";
import { useCropHandlers } from "../components/home/useCropHandlers";
import CropPanel from "../components/home/CropPanel";
import type { CropRect } from "../types";

interface UseCroppedImageOptions {
	colors: Record<string, string>;
	lang: "zh" | "en";
	/** 确认裁剪后的回调，参数为原始图片 URL 和裁剪选区 */
	onCropConfirm?: (imageUrl: string, cropRect: CropRect | null) => void;
}

interface UseCroppedImageResult {
	/** 裁剪模式是否激活 */
	isCropping: boolean;
	/** 进入裁剪模式 */
	startCrop: (imageUrl: string) => void;
	/** 取消裁剪 */
	cancelCrop: () => void;
	/** 确认裁剪，返回裁剪后的图片 URL */
	confirmCrop: () => string | null;
	/** 裁剪后的图片 data URL（确认后有效） */
	croppedDataUrl: string | null;
	/** 裁剪 UI 组件（直接渲染到 DOM 中） */
	cropComponent: React.ReactNode;
	/** 当前裁剪选区 */
	cropRect: CropRect | null;
	/** 重置选区 */
	resetCrop: () => void;
}

export function useCroppedImage({
	colors,
	lang,
	onCropConfirm,
}: UseCroppedImageOptions): UseCroppedImageResult {
	const [cropImage, setCropImage] = useState<string | null>(null);
	const [croppedDataUrl, setCroppedDataUrl] = useState<string | null>(null);
	const {
		cropRect,
		setCropRect,
		handleCropMouseDown,
		handleCropMouseMove,
		handleCropMouseUp,
	} = useCropHandlers();

	const startCrop = useCallback(
		(imageUrl: string) => {
			setCropImage(imageUrl);
			setCroppedDataUrl(null);
			setCropRect(null);
		},
		[setCropRect],
	);

	const cancelCrop = useCallback(() => {
		setCropImage(null);
		setCropRect(null);
		setCroppedDataUrl(null);
	}, [setCropRect]);

	const resetCrop = useCallback(() => {
		setCropRect(null);
	}, [setCropRect]);

	const confirmCrop = useCallback((): string | null => {
		if (!cropImage) return null;
		setCroppedDataUrl(cropImage);
		setCropImage(null);
		setCropRect(null);
		onCropConfirm?.(cropImage, cropRect);
		return cropImage;
	}, [cropImage, cropRect, setCropRect, onCropConfirm]);

	const cropComponent = cropImage ? (
		<CropPanel
			cropImage={cropImage}
			cropRect={cropRect}
			themeColors={colors}
			lang={lang}
			onMouseDown={handleCropMouseDown}
			onMouseMove={handleCropMouseMove}
			onMouseUp={handleCropMouseUp}
			onCropReset={resetCrop}
			onCropConfirm={confirmCrop}
			onCancel={cancelCrop}
		/>
	) : null;

	return {
		isCropping: !!cropImage,
		startCrop,
		cancelCrop,
		confirmCrop,
		croppedDataUrl,
		cropComponent,
		cropRect,
		resetCrop,
	};
}
