import { useEffect, useRef } from 'react';
import type { Frame } from '@pixopen/core';

type Props = {
  frame: Frame | null;
  pixels?: number[] | null;
  scale?: number;
  className?: string;
};

export function PixelPreview({ frame, pixels, scale = 4, className = 'preview-canvas' }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const data = pixels ?? frame?.pixels;
    if (!data) return;
    const image = ctx.createImageData(64, 64);
    for (let i = 0; i < data.length; i++) image.data[i] = data[i];
    ctx.putImageData(image, 0, 0);
  }, [frame, pixels]);

  return (
    <div className="preview-wrap">
      <canvas ref={ref} width={64} height={64} className={className} style={{ width: 64 * scale, height: 64 * scale }} />
    </div>
  );
}
