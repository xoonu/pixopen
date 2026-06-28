/** 0 = toward left/top edge, 1 = toward right/bottom edge, 0.5 = centered. */
export type VideoSquareCropFocus = {
  focusX: number;
  focusY: number;
};

export function clampVideoCropFocus(focusX: number, focusY: number): VideoSquareCropFocus {
  return {
    focusX: Math.min(1, Math.max(0, focusX)),
    focusY: Math.min(1, Math.max(0, focusY)),
  };
}

/** Dimensions after scaling video to cover a square of `size` (aspect ratio preserved). */
export function coverScaleDimensions(
  videoWidth: number,
  videoHeight: number,
  size: number,
): { width: number; height: number } {
  if (videoWidth <= 0 || videoHeight <= 0) return { width: size, height: size };
  const scale = Math.max(size / videoWidth, size / videoHeight);
  return { width: videoWidth * scale, height: videoHeight * scale };
}

export function cropPanRange(scaledWidth: number, scaledHeight: number, size: number): {
  maxX: number;
  maxY: number;
} {
  return {
    maxX: Math.max(0, scaledWidth - size),
    maxY: Math.max(0, scaledHeight - size),
  };
}

export function cropOffsetPixels(
  scaledWidth: number,
  scaledHeight: number,
  size: number,
  focus: VideoSquareCropFocus,
): { x: number; y: number } {
  const { maxX, maxY } = cropPanRange(scaledWidth, scaledHeight, size);
  const { focusX, focusY } = clampVideoCropFocus(focus.focusX, focus.focusY);
  return { x: maxX * focusX, y: maxY * focusY };
}

/** ffmpeg video filter: cover-fit to square, then crop with adjustable focus. */
export function buildSquareCoverCropFilter(
  size: number,
  focus: VideoSquareCropFocus,
  fps: number,
): string {
  const { focusX, focusY } = clampVideoCropFocus(focus.focusX, focus.focusY);
  const cropX = `(iw-${size})*${focusX}`;
  const cropY = `(ih-${size})*${focusY}`;
  return [
    `fps=${fps}`,
    `scale=${size}:${size}:force_original_aspect_ratio=increase:flags=neighbor`,
    `crop=${size}:${size}:${cropX}:${cropY}`,
  ].join(',');
}

export function canPanVideoCrop(videoWidth: number, videoHeight: number): boolean {
  if (videoWidth <= 0 || videoHeight <= 0) return false;
  return Math.abs(videoWidth - videoHeight) > 0.5;
}
