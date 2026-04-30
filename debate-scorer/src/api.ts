import Anthropic from '@anthropic-ai/sdk';
import type { DebateRecord, CategoryScores } from './types';
import { totalScore, FORMAT_LABELS } from './types';

function formatMs(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}m ${sec}s`;
}

function buildPrompt(record: DebateRecord): string {
  const { setup, stats, turns, scores } = record;
  const p1 = setup.player1Name;
  const p2 = setup.player2Name;
  const [s1, s2] = scores as [CategoryScores, CategoryScores];

  const transcript = turns
    .filter(t => t.transcript.trim())
    .map(t => `[${t.playerId === 1 ? p1 : p2}]: ${t.transcript.trim()}`)
    .join('\n');

  const debateDuration = formatMs(record.endedAt - record.startedAt);

  return `You are an expert debate judge providing post-debate feedback. Analyze the following debate and give constructive, specific feedback.

DEBATE TOPIC: "${setup.topic}"
FORMAT: ${FORMAT_LABELS[setup.format]}
DURATION: ${debateDuration}

DEBATERS:
- ${p1} (Player 1)
- ${p2} (Player 2)

STATISTICS:
- ${p1} speaking time: ${formatMs(stats.speakingMs[0])} (${stats.turnCount[0]} turns)
- ${p2} speaking time: ${formatMs(stats.speakingMs[1])} (${stats.turnCount[1]} turns)
- Interruptions by ${p1}: ${stats.interruptions[0]}
- Interruptions by ${p2}: ${stats.interruptions[1]}

${transcript ? `DEBATE TRANSCRIPT:\n${transcript}\n` : '(No transcript available — speech recognition was not active)\n'}

SCORES (judged manually, each category out of 20):
${p1} — Total: ${totalScore(s1)}/100
  Logic: ${s1.logic}/20
  Evidence: ${s1.evidence}/20
  Rebuttal: ${s1.rebuttal}/20
  Clarity: ${s1.clarity}/20
  Civility: ${s1.civility}/20

${p2} — Total: ${totalScore(s2)}/100
  Logic: ${s2.logic}/20
  Evidence: ${s2.evidence}/20
  Rebuttal: ${s2.rebuttal}/20
  Clarity: ${s2.clarity}/20
  Civility: ${s2.civility}/20

Please provide a structured analysis with these exact sections (use the headers as written):

## Summary
A 2–3 sentence overview of how the debate played out.

## ${p1}'s Strongest Argument
Identify their best moment or most compelling point.

## ${p1}'s Area for Improvement
One specific, actionable suggestion.

## ${p2}'s Strongest Argument
Identify their best moment or most compelling point.

## ${p2}'s Area for Improvement
One specific, actionable suggestion.

## Overall Assessment
2–3 sentences on who made the stronger case overall and why, referencing the scores and debate content.`;
}

export async function getAIFeedback(
  record: DebateRecord,
  apiKey: string,
): Promise<string> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{ role: 'user', content: buildPrompt(record) }],
  });

  const block = message.content[0];
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude');
  return block.text;
}
