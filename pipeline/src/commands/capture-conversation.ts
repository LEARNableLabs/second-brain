import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { saveCaptures } from '../db/operations.js';

interface CaptureConversationOptions {
  topic: string;
  summary?: string;
}

export async function captureConversationCommand(options: CaptureConversationOptions): Promise<void> {
  if (!options.topic) {
    console.error('Usage: second-brain capture-conversation --topic "Topic" [--summary "Summary"]');
    process.exitCode = 1;
    return;
  }

  const db = getDatabase();
  try {
    migrate(db);

    const now = Date.now();
    const entry = {
      url: `claude-code://conversation/${encodeURIComponent(options.topic)}`,
      title: `[Claude Code] ${options.topic}`,
      domain: 'claude-code',
      timestamp: now,
      source: 'manual' as const,
    };

    const { inserted } = saveCaptures(db, [entry]);

    if (inserted > 0) {
      console.error(`Captured conversation: "${options.topic}"`);

      // If summary provided, save it as content too
      if (options.summary) {
        const { saveContent } = await import('../db/content-operations.js');
        const date = new Date(now).toISOString().split('T')[0];
        saveContent(db, entry.url, date, {
          title: `[Claude Code] ${options.topic}`,
          body: options.summary,
          contentType: 'general',
          wordCount: options.summary.split(/\s+/).length,
          extractedAt: now,
        });
        console.error('Summary saved for AI curation');
      }
    } else {
      console.error('Conversation already captured today');
    }
  } catch (err) {
    console.error('Capture failed:', err);
    process.exitCode = 1;
  } finally {
    closeDatabase(db);
  }
}
