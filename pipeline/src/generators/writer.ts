import writeFileAtomic from 'write-file-atomic';
import { promises as fs } from 'fs';
import path from 'path';

export async function saveNote(filepath: string, content: string): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(path.dirname(filepath), { recursive: true });
  // Atomic write via temp-file-then-rename (D-09)
  await writeFileAtomic(filepath, content, { encoding: 'utf8' });
}
