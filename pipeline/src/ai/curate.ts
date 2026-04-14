import type { LLMProvider } from './provider.js';
import type { ContentRow } from '../db/content-operations.js';
import type { CaptureRow } from '../db/operations.js';

export interface CurationResult {
  summary: string;
  topicClusters: string[];
}

function buildPrompt(
  date: string,
  captures: CaptureRow[],
  content: ContentRow[],
  vaultNotes: string[],
  isEndOfDay: boolean
): string {
  const contentByUrl = new Map(content.map(c => [c.url, c]));

  const items = captures.map(cap => {
    const extracted = contentByUrl.get(cap.url);
    const body = extracted?.body
      ? `\n  Content: ${extracted.body.slice(0, 1500)}`
      : '';
    const type = extracted?.content_type || 'unknown';
    return `- [${type}] ${cap.title} (${cap.domain})\n  URL: ${cap.url}${body}`;
  }).join('\n\n');

  const wikilinksSection = vaultNotes.length > 0
    ? `\nExisting vault notes (use [[note name]] to link when relevant):\n${vaultNotes.map(n => `- ${n}`).join('\n')}\n`
    : '';

  const tone = isEndOfDay
    ? 'This is the END-OF-DAY final summary. Be more polished and comprehensive. Include all significant items from the full day.'
    : 'This is an INCREMENTAL hourly summary. Be concise — focus on what stands out.';

  return `You are a knowledge curation assistant. Analyze the browsing captures below and produce a structured summary for an Obsidian daily note.

Date: ${date}
${tone}

${wikilinksSection}

## Browsing Captures

${items}

## Instructions

Produce a markdown summary with these sections:

1. **Executive Summary** — 3-5 bullet points capturing the key themes and most interesting finds. Each bullet should be substantive (not just a title restatement). Use [[wikilinks]] to link to existing vault notes when topics match.

2. **Topic Clusters** — Group related items together. For each cluster:
   - Give it a descriptive heading (e.g., "Reinforcement Learning Papers" or "DevOps Tooling")
   - List the items in that cluster with brief (1-sentence) descriptions based on the actual content
   - Note how many items in the cluster

Items that don't fit a cluster go under "Other".

Output ONLY the markdown summary — no preamble, no explanation. Start with "## Highlights".`;
}

export async function curateDailyNote(
  provider: LLMProvider,
  date: string,
  captures: CaptureRow[],
  content: ContentRow[],
  vaultNotes: string[],
  isEndOfDay: boolean
): Promise<string> {
  const prompt = buildPrompt(date, captures, content, vaultNotes, isEndOfDay);
  const summary = await provider.complete(prompt);
  return summary.trim();
}
