export type AppScreen = 'setup' | 'debate' | 'scoring' | 'results';

export type DebateFormat = 'open' | 'oxford' | 'structured' | 'lincoln-douglas';

export interface DebateSetup {
  topic: string;
  format: DebateFormat;
  timeLimitMinutes: number;
  player1Name: string;
  player2Name: string;
}

export interface SpeakingTurn {
  playerId: 1 | 2;
  startMs: number;
  endMs: number;
  durationMs: number;
  transcript: string;
  isInterruption: boolean;
}

export interface DebateStats {
  speakingMs: [number, number];
  turnCount: [number, number];
  interruptions: [number, number];
}

export interface CategoryScores {
  logic: number;      // 0–20
  evidence: number;   // 0–20
  rebuttal: number;   // 0–20
  clarity: number;    // 0–20
  civility: number;   // 0–20
}

export function totalScore(s: CategoryScores): number {
  return s.logic + s.evidence + s.rebuttal + s.clarity + s.civility;
}

export interface DebateRecord {
  setup: DebateSetup;
  startedAt: number;
  endedAt: number;
  turns: SpeakingTurn[];
  stats: DebateStats;
  scores: [CategoryScores, CategoryScores] | null;
  aiFeedback: string | null;
  audioUrl: string | null;
}

export const FORMAT_LABELS: Record<DebateFormat, string> = {
  open: 'Open Discussion',
  oxford: 'Oxford Style',
  structured: 'Structured Rounds',
  'lincoln-douglas': 'Lincoln-Douglas',
};

export const SCORE_LABELS: Record<keyof CategoryScores, string> = {
  logic: 'Logic',
  evidence: 'Evidence',
  rebuttal: 'Rebuttal',
  clarity: 'Clarity',
  civility: 'Civility',
};

export const SCORE_DESCRIPTIONS: Record<keyof CategoryScores, string> = {
  logic: 'Did the argument make sense and follow logically?',
  evidence: 'Were claims supported with facts or examples?',
  rebuttal: 'Did they effectively respond to the other side?',
  clarity: 'Were they easy to understand and well-organized?',
  civility: 'Did they stay respectful and avoid interruptions?',
};
