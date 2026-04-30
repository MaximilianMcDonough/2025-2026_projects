import { useState } from 'react';
import type { DebateSetup, DebateFormat } from '../types';
import { FORMAT_LABELS } from '../types';

interface Props {
  onStart: (setup: DebateSetup) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

const FORMATS: DebateFormat[] = ['open', 'oxford', 'structured', 'lincoln-douglas'];
const TIME_OPTIONS = [5, 10, 15, 20, 30, 45, 60];

export default function SetupScreen({ onStart, apiKey, onApiKeyChange }: Props) {
  const [topic, setTopic] = useState('');
  const [format, setFormat] = useState<DebateFormat>('open');
  const [timeLimit, setTimeLimit] = useState(15);
  const [player1Name, setPlayer1Name] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!topic.trim()) e.topic = 'Debate topic is required';
    if (!player1Name.trim()) e.player1Name = 'Player 1 name is required';
    if (!player2Name.trim()) e.player2Name = 'Player 2 name is required';
    if (player1Name.trim() && player2Name.trim() && player1Name.trim() === player2Name.trim()) {
      e.player2Name = 'Players must have different names';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleStart() {
    if (!validate()) return;
    onStart({
      topic: topic.trim(),
      format,
      timeLimitMinutes: timeLimit,
      player1Name: player1Name.trim(),
      player2Name: player2Name.trim(),
    });
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="px-6 py-5 border-b border-gray-800">
        <h1 className="text-2xl font-bold tracking-tight">
          <span className="text-blue-400">⚖</span> Debate Scorer
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">Set up your debate and let the scoring begin</p>
      </header>

      <main className="flex-1 px-6 py-6 space-y-6 max-w-lg mx-auto w-full">
        {/* Topic */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">
            Debate Topic <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={2}
            placeholder="e.g. Social media does more harm than good"
            value={topic}
            onChange={e => setTopic(e.target.value)}
            className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-white placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
              errors.topic ? 'border-rose-500' : 'border-gray-700'
            }`}
          />
          {errors.topic && <p className="text-rose-400 text-xs mt-1">{errors.topic}</p>}
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">
            Debate Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            {FORMATS.map(f => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`py-2.5 px-3 rounded-lg text-sm font-medium border transition ${
                  format === f
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>

        {/* Time Limit */}
        <div>
          <label className="block text-sm font-semibold text-gray-300 mb-1.5">
            Time Limit
          </label>
          <div className="flex flex-wrap gap-2">
            {TIME_OPTIONS.map(t => (
              <button
                key={t}
                onClick={() => setTimeLimit(t)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  timeLimit === t
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                {t}m
              </button>
            ))}
          </div>
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-blue-400 mb-1.5">
              Player 1 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Name"
              value={player1Name}
              onChange={e => setPlayer1Name(e.target.value)}
              className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.player1Name ? 'border-rose-500' : 'border-gray-700'
              }`}
            />
            {errors.player1Name && <p className="text-rose-400 text-xs mt-1">{errors.player1Name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-rose-400 mb-1.5">
              Player 2 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Name"
              value={player2Name}
              onChange={e => setPlayer2Name(e.target.value)}
              className={`w-full bg-gray-900 border rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-rose-500 transition ${
                errors.player2Name ? 'border-rose-500' : 'border-gray-700'
              }`}
            />
            {errors.player2Name && <p className="text-rose-400 text-xs mt-1">{errors.player2Name}</p>}
          </div>
        </div>

        {/* API Key (optional) */}
        <div className="border border-gray-800 rounded-lg p-4 bg-gray-900/50">
          <button
            onClick={() => setShowApiKey(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-300 w-full text-left"
          >
            <span className="text-amber-400">✦</span>
            AI Feedback (optional)
            <span className="ml-auto text-gray-500 text-xs">{showApiKey ? '▲ hide' : '▼ show'}</span>
          </button>
          {showApiKey && (
            <div className="mt-3">
              <p className="text-gray-500 text-xs mb-2">
                Add your Anthropic API key to get AI-powered debate analysis after the debate. Your key is stored locally only.
              </p>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={e => onApiKeyChange(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm transition"
              />
              {apiKey && (
                <p className="text-emerald-400 text-xs mt-1.5">✓ API key set — AI feedback will be available</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={handleStart}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg transition"
        >
          Start Debate →
        </button>
      </main>
    </div>
  );
}
