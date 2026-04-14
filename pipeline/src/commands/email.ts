import path from 'path';
import { promises as fs } from 'fs';
import { loadConfig, getOutputDir } from '../config/reader.js';

interface EmailOptions {
  date?: string;
}

export async function emailCommand(options: EmailOptions = {}): Promise<void> {
  // Default to yesterday (morning digest of previous day)
  const date = options.date || (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  console.error(`Sending email digest for ${date}...`);

  const config = await loadConfig();
  const outputDir = getOutputDir(config);
  const notePath = path.join(outputDir, `${date}.md`);

  let content: string;
  try {
    content = await fs.readFile(notePath, 'utf-8');
  } catch {
    console.error(`No daily note found at ${notePath}`);
    return;
  }

  // Extract the Highlights section for the email body
  const highlightsMatch = content.match(/## Highlights\n([\s\S]*?)(?=\n## |$)/);
  const summary = highlightsMatch?.[1]?.trim() || 'No highlights generated yet.';

  const subject = `Second Brain: ${date} Daily Digest`;
  const body = `${subject}\n\n${summary}\n\n---\nFull note: ${notePath}`;

  // Use gws CLI to send via Gmail
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // Build RFC 2822 message
  const message = [
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset=utf-8',
    '',
    body,
  ].join('\n');

  // Base64url encode for Gmail API
  const encoded = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await execFileAsync('gws', [
      'gmail', 'users', 'messages', 'send',
      '--json', JSON.stringify({
        userId: 'me',
        requestBody: { raw: encoded },
      }),
    ]);
    console.error(`Email sent for ${date}`);
  } catch (err: any) {
    console.error(`Email failed: ${err.message}`);
    console.error('Make sure gws CLI is installed and authenticated: gws auth login');
    process.exitCode = 1;
  }
}
