import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { emailCommand } from '../../src/commands/email.js';

const gws = vi.hoisted(() => vi.fn());
vi.mock('child_process', () => {
  const execFile = Object.assign(() => {}, { [Symbol.for('nodejs.util.promisify.custom')]: gws });
  return { execFile };
});

beforeEach(() => {
  process.exitCode = 0;
  gws.mockReset();
  gws.mockResolvedValue({ stdout: '{}' });
  const outputDir = path.join(process.env.SECOND_BRAIN_DATA_DIR!, 'notes');
  fs.mkdirSync(outputDir);
  fs.writeFileSync(path.join(process.env.SECOND_BRAIN_DATA_DIR!, 'config.json'), JSON.stringify({ outputDir }));
  fs.writeFileSync(path.join(outputDir, '2026-09-22.md'), '## Highlights\n\nUseful summary.\n\n## Topic Clusters\n\nResearch.\n\n## Browsing Log\n\nPrivate full log.');
});
afterEach(() => { process.exitCode = 0; vi.restoreAllMocks(); });

describe('email digest', () => {
  it('previews all highlights without invoking Gmail', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await emailCommand({ date: '2026-09-22', dry: true });
    expect(gws).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join('')).toContain('Research.');
    expect(log.mock.calls.flat().join('')).not.toContain('Private full log.');
  });
  it('uses a recipient header and separate Gmail parameters and request body', async () => {
    await emailCommand({ date: '2026-09-22', to: 'reader@example.com' });
    expect(gws).toHaveBeenCalledTimes(1);
    const args = gws.mock.calls[0][1] as string[];
    expect(JSON.parse(args[args.indexOf('--params') + 1])).toEqual({ userId: 'me' });
    const { raw } = JSON.parse(args[args.indexOf('--json') + 1]);
    const message = Buffer.from(raw, 'base64url').toString();
    expect(message).toContain('To: reader@example.com\r\n');
    expect(message).toContain('Research.');
    expect(process.exitCode).toBe(0);
  });
  it('resolves the signed-in user when no recipient is configured', async () => {
    gws.mockResolvedValueOnce({ stdout: JSON.stringify({ emailAddress: 'owner@example.com' }) });
    await emailCommand({ date: '2026-09-22' });
    expect(gws).toHaveBeenCalledTimes(2);
    expect(gws.mock.calls[0][1]).toContain('getProfile');
  });
  it('rejects invalid dates and recipient header injection before calling Gmail', async () => {
    await emailCommand({ date: '../secret', to: 'reader@example.com' });
    expect(process.exitCode).toBe(1);
    await emailCommand({ date: '2026-09-22', to: 'reader@example.com\r\nBcc: other@example.com' });
    expect(gws).not.toHaveBeenCalled();
  });
});
