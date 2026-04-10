'use client';

import { useCallback, useState } from 'react';
import Player from '@/components/Player';
import { CardSpec } from '@/lib/types';
import { exportFrame, exportVideo } from '@/lib/export';

const FONT_OPTIONS = [
  { label: 'Impact',  value: 'Impact, "Arial Black", "Helvetica Neue", Arial, sans-serif' },
  { label: 'Barlow',  value: '"Barlow Condensed", "Arial Narrow", sans-serif' },
  { label: 'Plex',    value: '"IBM Plex Mono", "Courier New", monospace' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", serif' },
];

export default function Page() {
  const [script, setScript]   = useState('');
  const [era, setEra]         = useState<'early' | 'late'>('early');
  const [ratio, setRatio]     = useState<'16:9' | '9:16'>('16:9');
  const [font, setFont]       = useState(FONT_OPTIONS[0].value);
  const [caseMode, setCaseMode] = useState<'upper' | 'lower' | 'as-written'>('upper');
  const [intensity, setIntensity] = useState(50);
  const [pacing, setPacing]   = useState(40);
  const [tracking, setTracking] = useState(60);   // 0–100 → 0–0.25em; default 60 = 0.15em
  const [cards, setCards]     = useState<CardSpec[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);

  const trackingEm = (tracking / 100) * 0.25;

  const handleGenerate = async () => {
    if (!script.trim() || generating) return;
    setGenerating(true);
    setPlaying(false);
    setError(null);

    try {
      const res = await fetch('/api/sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script, era, intensity }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { cards: newCards, error: apiError } = await res.json();
      if (apiError) throw new Error(apiError);
      setCards(newCards);
    } catch {
      setError('Generation failed — check API key');
    } finally {
      setGenerating(false);
    }
  };

  const togglePlay = () => {
    if (cards.length === 0) return;
    setPlaying((p) => !p);
  };

  const handleExport = async () => {
    if (cards.length === 0 || exporting) return;
    setExporting(true);
    await exportFrame(cards[cardIndex], cardIndex, ratio, font, caseMode, trackingEm);
    setExporting(false);
  };

  const handleExportVideo = async () => {
    if (cards.length === 0 || videoProgress !== null) return;
    setVideoProgress(0);
    setPlaying(false);
    await exportVideo(cards, pacing, ratio, font, caseMode, trackingEm, setVideoProgress);
    setVideoProgress(null);
  };

  const handleIndexChange = useCallback((i: number) => setCardIndex(i), []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="label">Godard Titler</span>
        <div className="topbar-right">
          {cards.length > 0 && (
            <span className="label" style={{ color: 'rgba(10,10,8,0.4)' }}>
              {cardIndex + 1} / {cards.length}
            </span>
          )}
          <div className="era-toggle">
            <button className={`era-btn${ratio === '16:9' ? ' era-btn--active' : ''}`} onClick={() => setRatio('16:9')}>16:9</button>
            <button className={`era-btn${ratio === '9:16' ? ' era-btn--active' : ''}`} onClick={() => setRatio('9:16')}>9:16</button>
          </div>
          <div className="era-toggle">
            <button className={`era-btn${era === 'early' ? ' era-btn--active' : ''}`} onClick={() => setEra('early')}>Early</button>
            <button className={`era-btn${era === 'late'  ? ' era-btn--active' : ''}`} onClick={() => setEra('late')}>Late</button>
          </div>
        </div>
      </header>

      <div className="main-layout">
        <div className={`player-area${ratio === '9:16' ? ' player-area--portrait' : ''}`}>
        <div className={`player-panel${ratio === '9:16' ? ' player-panel--portrait' : ''}`}>
          <Player
            cards={cards}
            pacing={pacing}
            playing={playing}
            ratio={ratio}
            font={font}
            caseMode={caseMode}
            trackingEm={trackingEm}
            index={cardIndex}
            onIndexChange={handleIndexChange}
          />
        </div>
        </div>

        <aside className="sidebar">
          <div className="sidebar-section">
            <span className="label sidebar-section-header">Script</span>
            <textarea
              className="script-input"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              placeholder="Paste script or text..."
            />
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <span className="label sidebar-section-header">Typeface</span>
            <div className="font-picker">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.label}
                  className={`font-btn${font === f.value ? ' font-btn--active' : ''}`}
                  style={{ fontFamily: f.value }}
                  onClick={() => setFont(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <span className="label sidebar-section-header" style={{ marginTop: 4 }}>Case</span>
            <div className="era-toggle">
              <button className={`era-btn${caseMode === 'upper'      ? ' era-btn--active' : ''}`} onClick={() => setCaseMode('upper')}>Upper</button>
              <button className={`era-btn${caseMode === 'lower'      ? ' era-btn--active' : ''}`} onClick={() => setCaseMode('lower')}>Lower</button>
              <button className={`era-btn${caseMode === 'as-written' ? ' era-btn--active' : ''}`} onClick={() => setCaseMode('as-written')}>Raw</button>
            </div>
          </div>

          <hr className="sidebar-divider" />

          <div className="sidebar-section">
            <div className="slider-row">
              <div className="slider-header">
                <span className="label">Intensity</span>
                <span className="label accent-value">{intensity}</span>
              </div>
              <input type="range" min={0} max={100} value={intensity} onChange={(e) => setIntensity(Number(e.target.value))} className="slider" />
              <div className="slider-labels">
                <span className="label">Minimal</span>
                <span className="label">Maximal</span>
              </div>
            </div>

            <div className="slider-row">
              <div className="slider-header">
                <span className="label">Pacing</span>
                <span className="label accent-value">{pacing}</span>
              </div>
              <input type="range" min={0} max={100} value={pacing} onChange={(e) => setPacing(Number(e.target.value))} className="slider" />
              <div className="slider-labels">
                <span className="label">Fast</span>
                <span className="label">Slow</span>
              </div>
            </div>

            <div className="slider-row">
              <div className="slider-header">
                <span className="label">Tracking</span>
                <span className="label accent-value">{(trackingEm).toFixed(2)}em</span>
              </div>
              <input type="range" min={0} max={100} value={tracking} onChange={(e) => setTracking(Number(e.target.value))} className="slider" />
              <div className="slider-labels">
                <span className="label">Tight</span>
                <span className="label">Wide</span>
              </div>
            </div>
          </div>

          <div className="sidebar-footer">
            {error && <p className="error-msg">{error}</p>}

            <button className="btn" onClick={handleGenerate} disabled={generating || !script.trim()}>
              {generating ? 'Generating…' : 'Generate'}
            </button>

            <button className={`btn btn--outline${playing ? ' btn--active' : ''}`} onClick={togglePlay} disabled={cards.length === 0}>
              {playing ? 'Stop' : 'Play'}
            </button>

            <button className="btn btn--outline" onClick={handleExport} disabled={cards.length === 0 || exporting || videoProgress !== null}>
              {exporting ? 'Exporting…' : 'Export Frame'}
            </button>

            <button className="btn btn--outline" onClick={handleExportVideo} disabled={cards.length === 0 || videoProgress !== null || exporting}>
              {videoProgress !== null
                ? `Recording… ${videoProgress}%`
                : 'Export Video'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
