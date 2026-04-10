// Shared font-size calculation used by both Card.tsx (renderer) and export.ts (canvas)

const SIZE_RATIOS: Record<string, number> = {
  fragment:      0.65,
  word:          0.45,
  phrase:        0.22,
  quote:         0.026,
  number:        0.50,
  strikethrough: 0.30,
};

// Conservative avg character width as fraction of font-size (fits Impact, Barlow, Plex, Georgia)
const CHAR_WIDTH_RATIO = 0.58;
const WIDTH_BUDGET     = 0.88;

export function cardFontSize(
  type: string,
  nativeH: number,
  nativeW: number,
  charCount: number,
  scaleOverride?: number
): number {
  const heightBased = Math.round(nativeH * (SIZE_RATIOS[type] ?? 0.22));

  let base: number;
  if (type === 'quote' || type === 'black') {
    base = heightBased;
  } else {
    const widthBased = Math.round(
      (nativeW * WIDTH_BUDGET) / (Math.max(1, charCount) * CHAR_WIDTH_RATIO)
    );
    base = Math.min(heightBased, widthBased);
  }

  return scaleOverride ? Math.round(base * scaleOverride) : base;
}
