import { useState } from 'react';
import type { DebateSetup, DebateStats, CategoryScores } from '../types';
import { SCORE_LABELS, SCORE_DESCRIPTIONS } from '../types';

interface Props {
  setup: DebateSetup;
  stats: DebateStats;
  onSubmit: (scores: [CategoryScores, CategoryScores]) => void;
}

const CATEGORIES = ['logic', 'evidence', 'rebuttal', 'clarity', 'civility'] as const;

function defaultScores(): CategoryScores {
  return { logic: 10, evidence: 10, rebuttal: 10, clarity: 10, civility: 10 };
}

function total(s: CategoryScores) {
  return s.logic + s.evidence + s.rebuttal + s.clarity + s.civility;
}

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

interface SliderRowProps {
  label: string;
  description: string;
  value: number;
  color: 'blue' | 'rose';
  onChange: (v: number) => void;
}

function SliderRow({ label, description, value, color, onChange }: SliderRowProps) {
  const trackColor = color === 'blue' ? '#3b82f6' : '#f43f5e';
  const pct = (value / 20) * 100;

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-sm font-semibold text-gray-200">{label}</span>
        <span className={`text-lg font-bold tabular-nums ${color === 'blue' ? 'text-blue-400' : 'text-rose-400'}`}>
          {value}<span className="text-gray-600 text-sm">/20</span>
        </span>
      </div>
      <p className="text-xs text-gray-600 leading-snug">{description}</p>
      <input
        type="range"
        min={0}
        max={20}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${trackColor} ${pct}%, #374151 ${pct}%)`,
        }}
      />
      <div className="flex justify-between text-xs text-gray-700">
        <span>0</span>
        <span>10</span>
        <span>20</span>
      </div>
    </div>
  );
}

export default function ScoringScreen({ setup, stats, onSubmit }: Props) {
  const [scores1, setScores1] = useState<CategoryScores>(defaultScores);
  const [scores2, setScores2] = useState<CategoryScores>(defaultScores);
  const [activeTab, setActiveTab] = useState<1 | 2>(1);

  function setScore1(cat: keyof CategoryScores, v: number) {
    setScores1(s => ({ ...s, [cat]: v }));
  }

  function setScore2(cat: keyof CategoryScores, v: number) {
    setScores2(s => ({ ...s, [cat]: v }));
  }

  const t1 = total(scores1);
  const t2 = total(scores2);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-4 border-b border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Scoring</p>
        <h2 className="text-lg font-bold text-gray-100 truncate">{setup.topic}</h2>
      </header>

      {/* Debate stats recap */}
      <div className="px-6 py-3 bg-gray-900 border-b border-gray-800 flex gap-6 text-xs overflow-x-auto">
        <div>
          <span className="text-blue-400 font-semibold">{setup.player1Name}</span>
          <span className="text-gray-500"> · {fmtMs(stats.speakingMs[0])} · {stats.turnCount[0]} turns</span>
        </div>
        <div>
          <span className="text-rose-400 font-semibold">{setup.player2Name}</span>
          <span className="text-gray-500"> · {fmtMs(stats.speakingMs[1])} · {stats.turnCount[1]} turns</span>
        </div>
      </div>

      {/* Running totals */}
      <div className="px-6 py-3 flex gap-4 border-b border-gray-800">
        <div className={`flex-1 text-center py-2 rounded-lg ${activeTab === 1 ? 'bg-blue-950 border border-blue-700' : 'bg-gray-900'}`}>
          <p className="text-blue-400 text-xs font-semibold">{setup.player1Name}</p>
          <p className="text-2xl font-bold tabular-nums text-white">{t1}<span className="text-gray-600 text-sm">/100</span></p>
        </div>
        <div className="flex items-center text-gray-600 font-bold text-sm">VS</div>
        <div className={`flex-1 text-center py-2 rounded-lg ${activeTab === 2 ? 'bg-rose-950 border border-rose-700' : 'bg-gray-900'}`}>
          <p className="text-rose-400 text-xs font-semibold">{setup.player2Name}</p>
          <p className="text-2xl font-bold tabular-nums text-white">{t2}<span className="text-gray-600 text-sm">/100</span></p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => setActiveTab(1)}
          className={`flex-1 py-3 text-sm font-semibold transition ${
            activeTab === 1
              ? 'text-blue-400 border-b-2 border-blue-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {setup.player1Name}
        </button>
        <button
          onClick={() => setActiveTab(2)}
          className={`flex-1 py-3 text-sm font-semibold transition ${
            activeTab === 2
              ? 'text-rose-400 border-b-2 border-rose-500'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {setup.player2Name}
        </button>
      </div>

      {/* Score sliders */}
      <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto">
        {activeTab === 1
          ? CATEGORIES.map(cat => (
              <SliderRow
                key={cat}
                label={SCORE_LABELS[cat]}
                description={SCORE_DESCRIPTIONS[cat]}
                value={scores1[cat]}
                color="blue"
                onChange={v => setScore1(cat, v)}
              />
            ))
          : CATEGORIES.map(cat => (
              <SliderRow
                key={cat}
                label={SCORE_LABELS[cat]}
                description={SCORE_DESCRIPTIONS[cat]}
                value={scores2[cat]}
                color="rose"
                onChange={v => setScore2(cat, v)}
              />
            ))}
      </div>

      {/* Submit */}
      <div className="px-6 pb-8 pt-4 border-t border-gray-800 space-y-2">
        {activeTab === 1 && (
          <button
            onClick={() => setActiveTab(2)}
            className="w-full bg-rose-700 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl transition"
          >
            Score {setup.player2Name} →
          </button>
        )}
        {activeTab === 2 && (
          <button
            onClick={() => onSubmit([scores1, scores2])}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition"
          >
            See Results →
          </button>
        )}
        <button
          onClick={() => setActiveTab(activeTab === 1 ? 2 : 1)}
          className="w-full text-gray-600 text-sm py-1 hover:text-gray-400 transition"
        >
          ← Back to {activeTab === 1 ? setup.player2Name : setup.player1Name}
        </button>
      </div>
    </div>
  );
}
