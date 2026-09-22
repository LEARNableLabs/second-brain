/**
 * Chrome Native Messaging protocol utilities.
 * Messages are length-prefixed JSON on stdin/stdout.
 * CRITICAL: Never use console.log() -- it corrupts stdout protocol.
 * All debug output MUST go to console.error() (stderr).
 */

import { Transform } from 'stream';
import nativeMessage from 'chrome-native-messaging';

export function createInputStream(): Transform {
  return new nativeMessage.Input();
}

export function createOutputStream(): Transform {
  return new nativeMessage.Output();
}

// Manual read/write for simpler request-response pattern
export function readMessage(): Promise<any> {
  return new Promise((resolve, reject) => {
    let buffer = Buffer.alloc(0);
    function cleanup() {
      process.stdin.removeListener('data', onData);
      process.stdin.removeListener('error', onError);
      process.stdin.removeListener('end', onEnd);
      process.stdin.pause();
    }
    function onError(error: Error) { cleanup(); reject(error); }
    function onEnd() { onError(new Error('Incomplete native message')); }

    function onData(chunk: Buffer) {
      buffer = Buffer.concat([buffer, chunk]);

      // Need at least 4 bytes for length prefix
      if (buffer.length < 4) return;

      const messageLength = buffer.readUInt32LE(0);
      if (messageLength === 0 || messageLength > 64 * 1024 * 1024) {
        onError(new Error('Invalid native message length'));
        return;
      }
      if (buffer.length < 4 + messageLength) return;

      // We have a complete message
      cleanup();

      const json = buffer.subarray(4, 4 + messageLength).toString('utf-8');
      try {
        resolve(JSON.parse(json));
      } catch (err) {
        reject(new Error(`Invalid JSON in native message: ${err}`));
      }
    }

    process.stdin.on('data', onData);
    process.stdin.on('error', onError);
    process.stdin.on('end', onEnd);
  });
}

export function writeMessage(msg: any): void {
  const json = JSON.stringify(msg);
  const buffer = Buffer.from(json, 'utf-8');
  const header = Buffer.alloc(4);
  header.writeUInt32LE(buffer.length, 0);
  process.stdout.write(header);
  process.stdout.write(buffer);
}
