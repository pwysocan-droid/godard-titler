'use client';

import { useEffect, useRef, useState } from 'react';
import { CardSpec } from '@/lib/types';
import Card from './Card';

const NATIVE_W = 1920;
const NATIVE_H = 1080;

function pacingToMs(pacing: number): number {
  return Math.round(80 * Math.pow(3000 / 80, pacing / 100));
}

interface Props {
  cards: CardSpec[];
  pacing: number;
  playing: boolean;
  ratio: '16:9' | '9:16';
  font: string;
  caseMode: 'upper' | 'lower' | 'as-written';
  trackingEm: number;
  jitter: number; // 0–100
  index: number;
  onIndexChange: (i: number) => void;
}

export default function Player({
  cards, pacing, playing, ratio,
  font, caseMode, trackingEm, jitter,
  index, onIndexChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [shake, setShake] = useState({ x: 0, y: 0, r: 0 });

  const nativeW = ratio === '9:16' ? 1080 : NATIVE_W;
  const nativeH = ratio === '9:16' ? 1920 : NATIVE_H;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setScale(Math.min(width / nativeW, height / nativeH));
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [nativeW, nativeH]);

  // New random shake offset on every card cut
  useEffect(() => {
    if (jitter === 0) { setShake({ x: 0, y: 0, r: 0 }); return; }
    const mag = jitter * 0.25;        // max ±25 native px at 100
    const rot = jitter * 0.007;       // max ±0.7 deg at 100
    setShake({
      x: (Math.random() - 0.5) * 2 * mag,
      y: (Math.random() - 0.5) * 2 * mag,
      r: (Math.random() - 0.5) * 2 * rot,
    });
  }, [index, jitter]);

  // Reset index when cards change
  useEffect(() => {
    onIndexChange(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards]);

  // Advance cards when playing
  useEffect(() => {
    if (!playing || cards.length === 0) return;
    const card = cards[index];
    const baseMs = pacingToMs(pacing);
    const holdMs = card.holdMs ?? (card.type === 'black' ? Math.round(baseMs * 1.5) : baseMs);
    const timer = setTimeout(() => {
      onIndexChange((index + 1) % cards.length);
    }, holdMs);
    return () => clearTimeout(timer);
  }, [playing, index, cards, pacing, onIndexChange]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: '#000000', position: 'relative', overflow: 'hidden' }}
    >
      {cards.length > 0 && (
        <div
          style={{
            position: 'absolute',
            width: nativeW,
            height: nativeH,
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${shake.x}px, ${shake.y}px) rotate(${shake.r}deg) scale(${scale})`,
            transformOrigin: 'center center',
            // Thin outline makes the frame boundary visible in 9:16 letterbox
            boxShadow: '0 0 0 1px rgba(255,255,255,0.18)',
          }}
        >
          <Card card={cards[index]} font={font} caseMode={caseMode} trackingEm={trackingEm} nativeH={nativeH} nativeW={nativeW} />
        </div>
      )}
    </div>
  );
}
