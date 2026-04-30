import { useState, useEffect, useRef, useCallback } from 'react';
import type { DebateSetup, SpeakingTurn, DebateStats } from '../types';

interface Props {
  setup: DebateSetup;
  onEnd: (turns: SpeakingTurn[], stats: DebateStats, audioUrl: string | null) => void;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
  length: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

function fmtMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export default function DebateScreen({ setup, onEnd }: Props) {
  const [debateStarted, setDebateStarted] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<1 | 2 | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [speakingMs, setSpeakingMs] = useState<[number, number]>([0, 0]);
  const [turnCount, setTurnCount] = useState<[number, number]>([0, 0]);
  const [interruptions, setInterruptions] = useState<[number, number]>([0, 0]);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [speechAvailable] = useState(() =>
    'SpeechRecognition' in window || 'webkitSpeechRecognition' in window,
  );

  const debateStartRef = useRef<number>(0);
  const speakerStartRef = useRef<number>(0);
  const activeSpeakerRef = useRef<1 | 2 | null>(null);
  const lastSpeakerRef = useRef<1 | 2 | null>(null);
  const lastSwitchMsRef = useRef<number>(0);
  const completedTurnsRef = useRef<SpeakingTurn[]>([]);
  const turnTranscriptRef = useRef<string>('');
  const speakingMsRef = useRef<[number, number]>([0, 0]);
  const turnCountRef = useRef<[number, number]>([0, 0]);
  const interruptionsRef = useRef<[number, number]>([0, 0]);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speakerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopSpeakerTimer = useCallback(() => {
    if (speakerTimerRef.current) {
      clearInterval(speakerTimerRef.current);
      speakerTimerRef.current = null;
    }
  }, []);

  const startSpeakerTimer = useCallback((pid: 1 | 2) => {
    stopSpeakerTimer();
    speakerTimerRef.current = setInterval(() => {
      const idx = pid - 1;
      speakingMsRef.current[idx] += 100;
      setSpeakingMs([speakingMsRef.current[0], speakingMsRef.current[1]]);
    }, 100);
  }, [stopSpeakerTimer]);

  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startRecognition = useCallback((pid: 1 | 2) => {
    if (!speechAvailable) return;
    stopRecognition();

    const SR: new () => SpeechRecognitionInstance =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += t + ' ';
        } else {
          interim += t;
        }
      }
      if (final) {
        turnTranscriptRef.current += final;
        setLiveTranscript(prev => prev + final);
      }
      setInterimText(interim);
    };

    rec.onend = () => {
      // Restart automatically if still active
      if (activeSpeakerRef.current === pid) {
        try { rec.start(); } catch { /* ignore */ }
      }
    };

    try {
      rec.start();
      recognitionRef.current = rec;
    } catch { /* browser may refuse */ }
  }, [speechAvailable, stopRecognition]);

  function completeTurn(pid: 1 | 2, endMs: number, isInterruption: boolean) {
    const startMs = speakerStartRef.current;
    const duration = endMs - startMs;
    if (duration > 500) {
      completedTurnsRef.current.push({
        playerId: pid,
        startMs,
        endMs,
        durationMs: duration,
        transcript: turnTranscriptRef.current.trim(),
        isInterruption,
      });
    }
    turnTranscriptRef.current = '';
    setInterimText('');
  }

  function handleSpeakerTap(pid: 1 | 2) {
    if (!debateStarted) return;
    const now = Date.now();
    const current = activeSpeakerRef.current;

    if (current === pid) {
      // Toggle off — stop speaking
      completeTurn(pid, now, false);
      stopSpeakerTimer();
      stopRecognition();
      activeSpeakerRef.current = null;
      lastSpeakerRef.current = pid;
      lastSwitchMsRef.current = now;
      setActiveSpeaker(null);
      return;
    }

    // Detect interruption: other player was speaking and switch is within 5s of their start
    let isInterruption = false;
    if (current !== null) {
      const currentTurnDuration = now - speakerStartRef.current;
      if (currentTurnDuration < 5000) isInterruption = true;
      completeTurn(current, now, false);
      stopSpeakerTimer();
      stopRecognition();
      if (isInterruption) {
        const idx = pid - 1;
        interruptionsRef.current[idx]++;
        setInterruptions([interruptionsRef.current[0], interruptionsRef.current[1]]);
      }
    }

    // Start new speaker
    activeSpeakerRef.current = pid;
    speakerStartRef.current = now;
    const idx = pid - 1;
    turnCountRef.current[idx]++;
    setTurnCount([turnCountRef.current[0], turnCountRef.current[1]]);
    lastSwitchMsRef.current = now;
    setActiveSpeaker(pid);
    startSpeakerTimer(pid);
    startRecognition(pid);
  }

  async function startDebate() {
    // Request mic
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
    } catch {
      // Mic not granted — continue without audio recording
    }

    const now = Date.now();
    debateStartRef.current = now;
    setDebateStarted(true);

    timerRef.current = setInterval(() => {
      setElapsedMs(Date.now() - debateStartRef.current);
    }, 200);
  }

  function handleEndDebate() {
    const now = Date.now();

    // Complete any active turn
    if (activeSpeakerRef.current !== null) {
      completeTurn(activeSpeakerRef.current, now, false);
    }
    stopSpeakerTimer();
    stopRecognition();

    if (timerRef.current) clearInterval(timerRef.current);

    // Stop media recorder
    let audioUrl: string | null = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioUrl = URL.createObjectURL(blob);
        const stats: DebateStats = {
          speakingMs: [speakingMsRef.current[0], speakingMsRef.current[1]],
          turnCount: [turnCountRef.current[0], turnCountRef.current[1]],
          interruptions: [interruptionsRef.current[0], interruptionsRef.current[1]],
        };
        onEnd(completedTurnsRef.current, stats, audioUrl);
      };
      mediaRecorderRef.current.stop();
    } else {
      const stats: DebateStats = {
        speakingMs: [speakingMsRef.current[0], speakingMsRef.current[1]],
        turnCount: [turnCountRef.current[0], turnCountRef.current[1]],
        interruptions: [interruptionsRef.current[0], interruptionsRef.current[1]],
      };
      onEnd(completedTurnsRef.current, stats, null);
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopSpeakerTimer();
      stopRecognition();
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, [stopSpeakerTimer, stopRecognition]);

  const timeLimitMs = setup.timeLimitMinutes * 60 * 1000;
  const timeRemaining = Math.max(0, timeLimitMs - elapsedMs);
  const timeWarning = timeRemaining < 60000 && debateStarted;
  const timeUp = timeRemaining === 0 && debateStarted;

  const p1Active = activeSpeaker === 1;
  const p2Active = activeSpeaker === 2;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none">
      {/* Header */}
      <header className="px-4 py-3 border-b border-gray-800 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 uppercase tracking-widest">Topic</p>
          <p className="text-sm font-medium text-gray-200 truncate">{setup.topic}</p>
        </div>
        {/* Timer */}
        <div className={`text-right shrink-0 ${timeWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
          <p className="text-xs text-gray-500 uppercase tracking-widest">
            {debateStarted ? (timeUp ? 'Time Up!' : 'Remaining') : 'Limit'}
          </p>
          <p className={`text-2xl font-mono font-bold tabular-nums ${timeUp ? 'text-rose-400 animate-pulse' : ''}`}>
            {fmtMs(debateStarted ? timeRemaining : timeLimitMs)}
          </p>
        </div>
      </header>

      {/* Live transcript bar */}
      {debateStarted && speechAvailable && (liveTranscript || interimText) && (
        <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 text-xs text-gray-400 line-clamp-2">
          <span className="text-gray-300">{liveTranscript.split(' ').slice(-20).join(' ')}</span>
          {interimText && <span className="text-gray-600 italic"> {interimText}</span>}
        </div>
      )}

      {/* Main — speaker buttons */}
      <div className="flex-1 flex flex-col gap-3 p-4">
        {/* Player 1 */}
        <button
          onClick={() => handleSpeakerTap(1)}
          disabled={!debateStarted}
          className={`flex-1 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-150 active:scale-95 ${
            p1Active
              ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/50'
              : debateStarted
              ? 'bg-gray-900 border-gray-700 hover:border-blue-700'
              : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
          }`}
        >
          {p1Active && (
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 bg-white rounded-full animate-bounce"
                  style={{ height: 16 + (i % 2) * 8, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
          <span className={`text-3xl font-bold ${p1Active ? 'text-white' : 'text-blue-400'}`}>
            {setup.player1Name}
          </span>
          <span className={`text-sm font-mono ${p1Active ? 'text-blue-200' : 'text-gray-500'}`}>
            {fmtMs(speakingMs[0])}
            <span className="text-gray-600 mx-2">·</span>
            {turnCount[0]} turn{turnCount[0] !== 1 ? 's' : ''}
          </span>
          {p1Active ? (
            <span className="text-blue-200 text-xs font-semibold bg-blue-800/50 px-3 py-1 rounded-full">
              TAP TO STOP
            </span>
          ) : (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${debateStarted ? 'text-blue-400 bg-blue-950' : 'text-gray-700 bg-gray-800'}`}>
              {debateStarted ? 'TAP TO SPEAK' : 'WAITING'}
            </span>
          )}
        </button>

        {/* VS divider */}
        <div className="flex items-center gap-3 px-2 shrink-0">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs font-bold tracking-widest">VS</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Player 2 */}
        <button
          onClick={() => handleSpeakerTap(2)}
          disabled={!debateStarted}
          className={`flex-1 rounded-2xl border-2 flex flex-col items-center justify-center gap-3 transition-all duration-150 active:scale-95 ${
            p2Active
              ? 'bg-rose-600 border-rose-400 shadow-lg shadow-rose-900/50'
              : debateStarted
              ? 'bg-gray-900 border-gray-700 hover:border-rose-700'
              : 'bg-gray-900 border-gray-800 opacity-50 cursor-not-allowed'
          }`}
        >
          {p2Active && (
            <span className="flex gap-1">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-1 bg-white rounded-full animate-bounce"
                  style={{ height: 16 + (i % 2) * 8, animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </span>
          )}
          <span className={`text-3xl font-bold ${p2Active ? 'text-white' : 'text-rose-400'}`}>
            {setup.player2Name}
          </span>
          <span className={`text-sm font-mono ${p2Active ? 'text-rose-200' : 'text-gray-500'}`}>
            {fmtMs(speakingMs[1])}
            <span className="text-gray-600 mx-2">·</span>
            {turnCount[1]} turn{turnCount[1] !== 1 ? 's' : ''}
          </span>
          {p2Active ? (
            <span className="text-rose-200 text-xs font-semibold bg-rose-800/50 px-3 py-1 rounded-full">
              TAP TO STOP
            </span>
          ) : (
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${debateStarted ? 'text-rose-400 bg-rose-950' : 'text-gray-700 bg-gray-800'}`}>
              {debateStarted ? 'TAP TO SPEAK' : 'WAITING'}
            </span>
          )}
        </button>
      </div>

      {/* Footer stats + actions */}
      <div className="px-4 pb-6 pt-2 space-y-3">
        {/* Interruptions */}
        {debateStarted && (interruptions[0] > 0 || interruptions[1] > 0) && (
          <div className="flex justify-center gap-6 text-xs text-gray-500">
            {interruptions[0] > 0 && (
              <span className="text-blue-500">{setup.player1Name}: {interruptions[0]} interruption{interruptions[0] !== 1 ? 's' : ''}</span>
            )}
            {interruptions[1] > 0 && (
              <span className="text-rose-500">{setup.player2Name}: {interruptions[1]} interruption{interruptions[1] !== 1 ? 's' : ''}</span>
            )}
          </div>
        )}

        {!speechAvailable && debateStarted && (
          <p className="text-center text-xs text-gray-600">
            Speech recognition unavailable — transcript will be empty
          </p>
        )}

        {!debateStarted ? (
          <button
            onClick={startDebate}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-4 rounded-xl text-lg transition"
          >
            🎙 Start Debate
          </button>
        ) : (
          <button
            onClick={handleEndDebate}
            className="w-full bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 font-semibold py-3 rounded-xl transition"
          >
            End Debate → Go to Scoring
          </button>
        )}
      </div>
    </div>
  );
}
