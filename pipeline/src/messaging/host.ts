/**
 * Native Messaging Host - handles messages from the browser extension.
 *
 * Supported actions:
 * - getCaptures: Extension sends all captures; host returns success confirmation
 * - ping: Health check; host returns { pong: true }
 *
 * CRITICAL: All logging to stderr via console.error(). Never console.log().
 */

import { readMessage, writeMessage } from './protocol.js';
import { createModuleLogger } from '@second-brain/shared/logger';
import { ExportResponseSchema } from '@second-brain/shared/schemas';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { saveCaptures } from '../db/operations.js';

const logger = createModuleLogger('messaging:host');

export interface GetCapturesMessage {
  action: 'getCaptures';
  captures: Record<string, any[]>;
}

export interface PingMessage {
  action: 'ping';
}

export type NativeMessage = GetCapturesMessage | PingMessage | { action: 'syncCaptures'; captures: Record<string, unknown[]>; exportedAt: number };

export function handleMessage(msg: NativeMessage): any {
  if (!msg || typeof msg !== 'object') return { error: 'Invalid message' };
  logger.info({ action: msg.action }, 'handling message');
  switch (msg.action) {
    case 'syncCaptures': {
      const parsed = ExportResponseSchema.safeParse(msg);
      if (!parsed.success) return { error: 'Invalid captures payload' };
      const entries = Object.values(parsed.data.captures).flat();
      const db = getDatabase();
      try {
        migrate(db);
        const result = saveCaptures(db, entries);
        // Acknowledge only after the transaction commits. Keep responses small.
        return { success: true, received: entries.length, ...result };
      } finally {
        closeDatabase(db);
      }
    }
    case 'getCaptures': {
      const capturesByDate = msg.captures || {};
      let totalCount = 0;
      for (const dateKey of Object.keys(capturesByDate)) {
        totalCount += capturesByDate[dateKey].length;
      }
      logger.info({ totalCount, days: Object.keys(capturesByDate).length }, 'received captures');
      return { success: true, received: totalCount, captures: capturesByDate };
    }
    case 'ping':
      logger.debug('ping received');
      return { pong: true };
    default:
      logger.warn({ action: (msg as any).action }, 'unknown action');
      return { error: `Unknown action: ${(msg as any).action}` };
  }
}

export async function runHost(): Promise<void> {
  logger.info('native messaging host starting');
  try {
    const msg = await readMessage();
    logger.info({ action: msg?.action }, 'received message');
    const response = handleMessage(msg);
    writeMessage(response);
    logger.info('response sent');
  } catch (err) {
    logger.error({ err }, 'native host error');
    writeMessage({ error: String(err) });
  }
}
