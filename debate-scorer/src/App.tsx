import { useState } from 'react';
import type { AppScreen, DebateSetup, DebateRecord, SpeakingTurn, DebateStats, CategoryScores } from './types';
import SetupScreen from './components/SetupScreen';
import DebateScreen from './components/DebateScreen';
import ScoringScreen from './components/ScoringScreen';
import ResultsScreen from './components/ResultsScreen';

const LS_API_KEY = 'debate_scorer_api_key';

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('setup');
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem(LS_API_KEY) ?? '');
  const [setup, setSetup] = useState<DebateSetup | null>(null);
  const [record, setRecord] = useState<DebateRecord | null>(null);

  function handleApiKeyChange(key: string) {
    setApiKey(key);
    localStorage.setItem(LS_API_KEY, key);
  }

  function handleStartDebate(s: DebateSetup) {
    setSetup(s);
    setRecord(null);
    setScreen('debate');
  }

  function handleDebateEnd(
    turns: SpeakingTurn[],
    stats: DebateStats,
    audioUrl: string | null,
  ) {
    if (!setup) return;
    const partial: DebateRecord = {
      setup,
      startedAt: turns[0]?.startMs ?? Date.now(),
      endedAt: Date.now(),
      turns,
      stats,
      scores: null,
      aiFeedback: null,
      audioUrl,
    };
    setRecord(partial);
    setScreen('scoring');
  }

  function handleScoresSubmit(scores: [CategoryScores, CategoryScores]) {
    if (!record) return;
    setRecord(r => r ? { ...r, scores } : r);
    setScreen('results');
  }

  function handleNewDebate() {
    setRecord(null);
    setSetup(null);
    setScreen('setup');
  }

  if (screen === 'setup') {
    return (
      <SetupScreen
        onStart={handleStartDebate}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
      />
    );
  }

  if (screen === 'debate' && setup) {
    return (
      <DebateScreen
        setup={setup}
        onEnd={handleDebateEnd}
      />
    );
  }

  if (screen === 'scoring' && setup && record) {
    return (
      <ScoringScreen
        setup={setup}
        stats={record.stats}
        onSubmit={handleScoresSubmit}
      />
    );
  }

  if (screen === 'results' && record && record.scores) {
    return (
      <ResultsScreen
        record={record}
        apiKey={apiKey}
        onNewDebate={handleNewDebate}
      />
    );
  }

  // Fallback — shouldn't reach here
  return null;
}
