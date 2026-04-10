'use client';

import { CardSpec } from '@/lib/types';
import { cardFontSize } from '@/lib/sizing';

const BG: Record<string, string> = {
  default: '#000000', invert: '#FFFFFF', blue: '#0055A4', red: '#EF4135',
};
const FG: Record<string, string> = {
  default: '#FFFFFF', invert: '#000000', blue: '#FFFFFF', red: '#FFFFFF',
};

interface Props {
  card: CardSpec;
  font: string;
  caseMode: 'upper' | 'lower' | 'as-written';
  trackingEm: number;
  nativeH: number;
  nativeW: number;
}

export default function Card({ card, font, caseMode, trackingEm, nativeH, nativeW }: Props) {
  const { type, text, lines, color, mixedCase, scale: scaleOverride } = card;

  const bg = BG[color] ?? '#000000';
  const fg = FG[color] ?? '#FFFFFF';

  if (type === 'black') {
    return <div style={{ width: '100%', height: '100%', background: '#000000' }} />;
  }

  // Use the longest line for the width cap calculation
  const charCount = lines
    ? Math.max(...lines.map((l) => l.length))
    : (text?.length ?? 1);

  const fontSize = cardFontSize(type, nativeH, nativeW, charCount, scaleOverride);

  const toDisplay = (s: string) => {
    if (caseMode === 'lower') return s.toLowerCase();
    if (caseMode === 'as-written' || mixedCase) return s;
    return s.toUpperCase();
  };

  const displayText  = text  ? toDisplay(text)      : undefined;
  const displayLines = lines ? lines.map(toDisplay) : undefined;

  // Fragments are always tight; everything else uses the tracking slider
  const letterSpacing = type === 'fragment' ? '0' : `${trackingEm}em`;

  const textStyle: React.CSSProperties = {
    fontFamily:    font,
    fontSize:      `${fontSize}px`,
    fontWeight:    'bold',
    color:         fg,
    letterSpacing,
    lineHeight:    (type === 'phrase' || type === 'quote') ? 1.05 : 0.92,
    textAlign:     type === 'quote' ? 'justify' : 'center',
  };

  const wrapper: React.CSSProperties = {
    width:          '100%',
    height:         '100%',
    background:     bg,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        type === 'quote' ? '10%' : '0',
    boxSizing:      'border-box',
    position:       'relative',
  };

  if (type === 'strikethrough') {
    return (
      <div style={wrapper}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <span style={textStyle}>{displayText}</span>
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <line x1="2"  y1="10" x2="98" y2="90" stroke={fg} strokeWidth="6" strokeLinecap="round" />
            <line x1="98" y1="10" x2="2"  y2="90" stroke={fg} strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div style={wrapper}>
      <div style={textStyle}>
        {displayLines
          ? displayLines.map((line, i) => (
              <div key={i} style={{ textAlign: type === 'quote' ? 'justify' : 'center' }}>
                {line}
              </div>
            ))
          : displayText}
      </div>
    </div>
  );
}
