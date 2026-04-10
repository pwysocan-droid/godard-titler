import { CardSpec } from './types';
import { cardFontSize } from './sizing';

const BG: Record<string, string> = {
  default: '#000000', invert: '#FFFFFF', blue: '#0055A4', red: '#EF4135',
};
const FG: Record<string, string> = {
  default: '#FFFFFF', invert: '#000000', blue: '#FFFFFF', red: '#FFFFFF',
};

function applyCase(
  s: string,
  caseMode: 'upper' | 'lower' | 'as-written',
  perCardMixed?: boolean
): string {
  if (caseMode === 'lower') return s.toLowerCase();
  if (caseMode === 'as-written' || perCardMixed) return s;
  return s.toUpperCase();
}

function drawWrapped(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineH: number,
  maxY: number
) {
  const words = text.split(' ');
  let line = '';
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      if (cy + lineH < maxY) ctx.fillText(line, x, cy);
      line = word;
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (cy + lineH < maxY) ctx.fillText(line, x, cy);
}

function drawCardToCanvas(
  canvas: HTMLCanvasElement,
  card: CardSpec,
  font: string,
  caseMode: 'upper' | 'lower' | 'as-written',
  trackingEm: number
) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = BG[card.color] ?? '#000000';
  ctx.fillRect(0, 0, W, H);

  if (card.type === 'black') return;

  const fg = FG[card.color] ?? '#FFFFFF';

  const charCount = card.lines
    ? Math.max(...card.lines.map((l) => l.length))
    : (card.text?.length ?? 1);
  const fontSize = cardFontSize(card.type, H, W, charCount, card.scale);
  const letterSpacingPx = card.type === 'fragment' ? 0 : trackingEm * fontSize;

  ctx.fillStyle = fg;
  ctx.font = `bold ${fontSize}px ${font}`;
  ctx.textBaseline = 'middle';
  (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing =
    `${letterSpacingPx}px`;

  if (card.type === 'quote') {
    ctx.textAlign = 'left';
    ctx.font = `bold ${fontSize}px ${font}`;
    const text = applyCase(
      card.text ?? (card.lines ?? []).join(' '),
      caseMode,
      card.mixedCase
    );
    const padX = Math.round(W * 0.1);
    const padY = Math.round(H * 0.1);
    drawWrapped(ctx, text, padX, padY, W - padX * 2, fontSize * 1.4, H - padY);
    return;
  }

  ctx.textAlign = 'center';

  if (card.lines) {
    const lines = card.lines.map((l) => applyCase(l, caseMode, card.mixedCase));
    const lineH = fontSize * 1.05;
    const totalH = lines.length * lineH;
    const startY = (H - totalH) / 2 + fontSize / 2;
    lines.forEach((line, i) => ctx.fillText(line, W / 2, startY + i * lineH));
  } else {
    const text = applyCase(card.text ?? '', caseMode, card.mixedCase);
    ctx.fillText(text, W / 2, H / 2);

    if (card.type === 'strikethrough') {
      const metrics = ctx.measureText(text);
      const tw = metrics.width;
      const th = fontSize * 0.85;
      const tx = W / 2 - tw / 2;
      const ty = H / 2 - th / 2;
      ctx.strokeStyle = fg;
      ctx.lineWidth = Math.max(8, fontSize * 0.055);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty);       ctx.lineTo(tx + tw, ty + th); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx + tw, ty);  ctx.lineTo(tx, ty + th);      ctx.stroke();
    }
  }
}

function pacingToMs(pacing: number): number {
  return Math.round(80 * Math.pow(3000 / 80, pacing / 100));
}

export async function exportVideo(
  cards: CardSpec[],
  pacing: number,
  ratio: '16:9' | '9:16',
  font: string,
  caseMode: 'upper' | 'lower' | 'as-written',
  trackingEm: number,
  onProgress: (pct: number) => void
): Promise<void> {
  await document.fonts.ready;

  const W = ratio === '9:16' ? 1080 : 1920;
  const H = ratio === '9:16' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;

  // Prefer MP4/H.264 (plays as .mov in QuickTime), fall back to WebM
  const mimeType = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';

  const isMp4 = mimeType.startsWith('video/mp4');

  const stream   = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  // Draw first frame before starting so the stream has content immediately
  const baseMs = pacingToMs(pacing);
  drawCardToCanvas(canvas, cards[0], font, caseMode, trackingEm);

  const blob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.start();

    (async () => {
      for (let i = 0; i < cards.length; i++) {
        drawCardToCanvas(canvas, cards[i], font, caseMode, trackingEm);
        onProgress(Math.round((i / cards.length) * 100));
        const holdMs =
          cards[i].holdMs ??
          (cards[i].type === 'black' ? Math.round(baseMs * 1.5) : baseMs);
        await new Promise((r) => setTimeout(r, holdMs));
      }
      recorder.stop();
    })();
  });

  onProgress(100);

  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = isMp4 ? 'godard-sequence.mov' : 'godard-sequence.webm';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportFrame(
  card: CardSpec,
  frameIndex: number,
  ratio: '16:9' | '9:16',
  font: string,
  caseMode: 'upper' | 'lower' | 'as-written',
  trackingEm: number
): Promise<void> {
  await document.fonts.ready;

  const W = ratio === '9:16' ? 1080 : 1920;
  const H = ratio === '9:16' ? 1920 : 1080;

  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = H;
  drawCardToCanvas(canvas, card, font, caseMode, trackingEm);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(); return; }
      const url = URL.createObjectURL(blob);
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `godard-${String(frameIndex + 1).padStart(3, '0')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve();
    }, 'image/png');
  });
}
