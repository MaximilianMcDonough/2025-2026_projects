import { useState, useEffect } from 'react';
import type { DebateRecord, CategoryScores } from '../types';
import { totalScore, SCORE_LABELS } from '../types';
import { getAIFeedback } from '../api';

interface Props {
  record: DebateRecord;
  apiKey: string;
  onNewDebate: () => void;
}

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}m ${String(s % 60).padStart(2, '0')}s`;
}

interface ScoreBarProps {
  label: string;
  value1: number;
  value2: number;
  color1: string;
  color2: string;
}

function ScoreBar({ label, value1, value2, color1, color2 }: ScoreBarProps) {
  const pct1 = (value1 / 20) * 100;
  const pct2 = (value2 / 20) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-400 font-medium">
        <span className={color1}>{value1}/20</span>
        <span>{label}</span>
        <span className={color2}>{value2}/20</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-gray-800 rounded-l-full overflow-hidden flex justify-end">
          <div
            className="h-full bg-blue-500 rounded-l-full transition-all duration-700"
            style={{ width: `${pct1}%` }}
          />
        </div>
        <div className="flex-1 bg-gray-800 rounded-r-full overflow-hidden">
          <div
            className="h-full bg-rose-500 rounded-r-full transition-all duration-700"
            style={{ width: `${pct2}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function renderFeedback(text: string) {
  const sections = text.split(/^##\s/m).filter(Boolean);
  return sections.map((section, i) => {
    const [heading, ...rest] = section.split('\n');
    const body = rest.join('\n').trim();
    return (
      <div key={i} className="space-y-1">
        <h4 className="text-sm font-bold text-amber-400">## {heading.trim()}</h4>
        <p className="text-sm text-gray-300 leading-relaxed">{body}</p>
      </div>
    );
  });
}

export default function ResultsScreen({ record, apiKey, onNewDebate }: Props) {
  const [aiFeedback, setAiFeedback] = useState<string | null>(record.aiFeedback);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const { setup, stats, scores, audioUrl } = record;
  const [s1, s2] = scores as [CategoryScores, CategoryScores];
  const t1 = totalScore(s1);
  const t2 = totalScore(s2);
  const winner = t1 > t2 ? setup.player1Name : t2 > t1 ? setup.player2Name : null;
  const categories = Object.keys(SCORE_LABELS) as (keyof CategoryScores)[];

  useEffect(() => {
    if (aiFeedback || !apiKey || loadingFeedback) return;
    setLoadingFeedback(true);
    setFeedbackError(null);
    getAIFeedback(record, apiKey)
      .then(setAiFeedback)
      .catch(err => setFeedbackError(err?.message ?? 'Unknown error'))
      .finally(() => setLoadingFeedback(false));
  }, [apiKey]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Winner banner */}
      <div className={`py-6 px-6 text-center ${
        winner === setup.player1Name
          ? 'bg-gradient-to-b from-blue-950 to-gray-950'
          : winner === setup.player2Name
          ? 'bg-gradient-to-b from-rose-950 to-gray-950'
          : 'bg-gradient-to-b from-gray-900 to-gray-950'
      }`}>
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Result</p>
        {winner ? (
          <>
            <h1 className="text-3xl font-black mb-0.5">
              {winner} <span className="text-amber-400">wins</span>
            </h1>
            <p className="text-gray-400 text-sm">
              {t1 > t2 ? `${t1} – ${t2}` : `${t2} – ${t1}`} points
            </p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-black mb-0.5">It's a <span className="text-amber-400">Tie!</span></h1>
            <p className="text-gray-400 text-sm">{t1} – {t2} points</p>
          </>
        )}
        <p className="text-gray-600 text-xs mt-2 truncate px-4">{setup.topic}</p>
      </div>

      <div className="flex-1 px-6 py-5 space-y-6 overflow-y-auto pb-32">
        {/* Score totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-900 border border-blue-900/50 rounded-xl p-4 text-center">
            <p className="text-blue-400 text-xs font-semibold mb-1">{setup.player1Name}</p>
            <p className="text-4xl font-black text-white tabular-nums">{t1}</p>
            <p className="text-gray-600 text-xs">/100</p>
          </div>
          <div className="bg-gray-900 border border-rose-900/50 rounded-xl p-4 text-center">
            <p className="text-rose-400 text-xs font-semibold mb-1">{setup.player2Name}</p>
            <p className="text-4xl font-black text-white tabular-nums">{t2}</p>
            <p className="text-gray-600 text-xs">/100</p>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
          <div className="flex justify-between text-xs text-gray-500 font-semibold">
            <span className="text-blue-400">{setup.player1Name}</span>
            <span>Category</span>
            <span className="text-rose-400">{setup.player2Name}</span>
          </div>
          {categories.map(cat => (
            <ScoreBar
              key={cat}
              label={SCORE_LABELS[cat]}
              value1={s1[cat]}
              value2={s2[cat]}
              color1="text-blue-400"
              color2="text-rose-400"
            />
          ))}
        </div>

        {/* Debate stats */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Debate Stats</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div />
            <div className="text-gray-500">Speaking time</div>
            <div className="text-gray-500">Turns · Interruptions</div>
            <div className="text-blue-400 font-semibold text-left">{setup.player1Name}</div>
            <div className="text-gray-300 font-mono">{fmtMs(stats.speakingMs[0])}</div>
            <div className="text-gray-300">{stats.turnCount[0]} · {stats.interruptions[0]}</div>
            <div className="text-rose-400 font-semibold text-left">{setup.player2Name}</div>
            <div className="text-gray-300 font-mono">{fmtMs(stats.speakingMs[1])}</div>
            <div className="text-gray-300">{stats.turnCount[1]} · {stats.interruptions[1]}</div>
          </div>
        </div>

        {/* Audio playback */}
        {audioUrl && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Debate Recording</p>
            <audio controls src={audioUrl} className="w-full h-10" />
          </div>
        )}

        {/* AI Feedback */}
        <div className="bg-gray-900 border border-amber-900/40 rounded-xl p-4 space-y-3">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wider">AI Judge Feedback</p>

          {loadingFeedback && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <span className="animate-spin text-amber-400">⟳</span>
              Analyzing the debate...
            </div>
          )}

          {feedbackError && (
            <div className="space-y-2">
              <p className="text-rose-400 text-sm">Failed to get feedback: {feedbackError}</p>
              <button
                onClick={() => {
                  setFeedbackError(null);
                  setLoadingFeedback(true);
                  getAIFeedback(record, apiKey)
                    .then(setAiFeedback)
                    .catch(err => setFeedbackError(err?.message ?? 'Unknown error'))
                    .finally(() => setLoadingFeedback(false));
                }}
                className="text-xs text-amber-400 underline"
              >
                Retry
              </button>
            </div>
          )}

          {aiFeedback && (
            <div className="space-y-4">
              {renderFeedback(aiFeedback)}
            </div>
          )}

          {!aiFeedback && !loadingFeedback && !feedbackError && !apiKey && (
            <p className="text-gray-600 text-sm">
              Add your Anthropic API key in the setup screen to unlock AI-powered debate analysis.
            </p>
          )}
        </div>
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 px-6 py-4">
        <button
          onClick={onNewDebate}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-3.5 rounded-xl transition"
        >
          New Debate
        </button>
      </div>
    </div>
  );
}
