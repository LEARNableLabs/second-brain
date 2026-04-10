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

export interface GetCapturesMessage {
  action: 'getCaptures';
  captures: Record<string, any[]>;
}

export interface PingMessage {
  action: 'ping';
}

export type NativeMessage = GetCapturesMessage | PingMessage;

export function handleMessage(msg: NativeMessage): any {
  switch (msg.action) {
    case 'getCaptures': {
      const capturesByDate = msg.captures || {};
      let totalCount = 0;
      for (const dateKey of Object.keys(capturesByDate)) {
        totalCount += capturesByDate[dateKey].length;
      }
      console.error(`[native-host] Received ${totalCount} captures across ${Object.keys(capturesByDate).length} days`);
      return { success: true, received: totalCount, captures: capturesByDate };
    }
    case 'ping':
      return { pong: true };
    default:
      console.error(`[native-host] Unknown action: ${(msg as any).action}`);
      return { error: `Unknown action: ${(msg as any).action}` };
  }
}

export async function runHost(): Promise<void> {
  try {
    const msg = await readMessage();
    console.error(`[native-host] Received message: action=${msg.action}`);
    const response = handleMessage(msg);
    writeMessage(response);
  } catch (err) {
    console.error(`[native-host] Error:`, err);
    writeMessage({ error: String(err) });
  }
}
