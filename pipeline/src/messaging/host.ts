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

const logger = createModuleLogger('messaging:host');

export interface GetCapturesMessage {
  action: 'getCaptures';
  captures: Record<string, any[]>;
}

export interface PingMessage {
  action: 'ping';
}

export type NativeMessage = GetCapturesMessage | PingMessage;

export function handleMessage(msg: NativeMessage): any {
  logger.info({ action: msg.action }, 'handling message');
  switch (msg.action) {
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
    logger.info({ action: msg.action }, 'received message');
    const response = handleMessage(msg);
    writeMessage(response);
    logger.info('response sent');
  } catch (err) {
    logger.error({ err }, 'native host error');
    writeMessage({ error: String(err) });
  }
}
