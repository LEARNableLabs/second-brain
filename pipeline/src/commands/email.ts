import path from 'path';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { loadConfig, getOutputDir } from '../config/reader.js';
import { localDate, parseDate } from '../config/date.js';

interface EmailOptions {
  date?: string;
  dry?: boolean;
  to?: string;
}

export async function emailCommand(options: EmailOptions = {}): Promise<void> {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const date = options.date ? parseDate(options.date) : localDate(yesterday);
    const config = await loadConfig();
    const notePath = path.join(getOutputDir(config), `${date}.md`);
    const content = await fs.readFile(notePath, 'utf-8');
    const summary = content.match(/^## Highlights\r?\n([\s\S]*?)(?=^## Browsing Log\s*$|(?![\s\S]))/m)?.[1]?.trim();
    if (!summary) throw new Error(`No highlights found in ${notePath}`);
    const subject = `Second Brain: ${date} Daily Digest`;
    const body = `${subject}\n\n${summary}\n\n---\nFull note: ${notePath}`;
    let recipient = options.to || config.email?.to;
    if (recipient) recipient = z.email().parse(recipient);
    if (options.dry) {
      console.log(`To: ${recipient || '(signed-in Gmail user)'}\n${body}`);
      return;
    }

    const execFileAsync = promisify(execFile);
    if (!recipient) {
      const { stdout } = await execFileAsync('gws', [
        'gmail', 'users', 'getProfile', '--params', JSON.stringify({ userId: 'me' }),
      ], { timeout: 30_000 });
      recipient = z.email().parse(JSON.parse(stdout).emailAddress);
    }
    const message = [
      `To: ${recipient}`, `Subject: ${subject}`, 'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8', '', body,
    ].join('\r\n');
    await execFileAsync('gws', [
      'gmail', 'users', 'messages', 'send',
      '--params', JSON.stringify({ userId: 'me' }),
      '--json', JSON.stringify({ raw: Buffer.from(message).toString('base64url') }),
    ], { timeout: 30_000 });
    console.error(`Email sent for ${date} to ${recipient}`);
  } catch (err) {
    console.error(`Email failed: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}
