import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { getCaptureStats } from '../../src/db/operations.js';

const host = fileURLToPath(new URL('../../bin/native-host.js', import.meta.url));
function run(payload: Buffer) {
  const result = spawnSync(process.execPath, [host], {
    cwd: os.tmpdir(), input: payload, timeout: 10_000,
    env: { ...process.env, LOG_LEVEL: 'info' },
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
  const length = result.stdout.readUInt32LE(0);
  expect(result.stdout.length).toBe(length + 4);
  return JSON.parse(result.stdout.subarray(4).toString());
}

describe('native host executable', () => {
  it('works outside the repo with logging enabled and persists real framed input', () => {
    const body = Buffer.from(JSON.stringify({ action: 'syncCaptures', exportedAt: Date.now(), captures: { today: [{ url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: Date.now(), source: 'live' }] } }));
    const header = Buffer.alloc(4);
    header.writeUInt32LE(body.length);
    expect(run(Buffer.concat([header, body]))).toMatchObject({ success: true, inserted: 1 });
    const db = getDatabase();
    try { expect(getCaptureStats(db).total).toBe(1); } finally { closeDatabase(db); }
  });
  it('responds to truncated input instead of silently exiting', () => {
    expect(run(Buffer.from([20, 0, 0, 0, 123]))).toHaveProperty('error');
  });
});
