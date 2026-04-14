import { promises as fs } from 'fs';
import path from 'path';

export async function scanVaultNotes(vaultDir: string): Promise<string[]> {
  const notes: string[] = [];

  try {
    await walkDir(vaultDir, notes);
  } catch {
    // Vault dir might not exist yet
    return [];
  }

  return notes.sort();
}

async function walkDir(dir: string, notes: string[]): Promise<void> {
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    // Skip hidden dirs and node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkDir(fullPath, notes);
    } else if (entry.name.endsWith('.md')) {
      // Use filename without extension as note title
      const noteName = entry.name.replace(/\.md$/, '');
      // Skip date-formatted files (daily notes themselves)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(noteName)) {
        notes.push(noteName);
      }
    }
  }
}
