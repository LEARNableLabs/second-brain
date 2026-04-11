import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { saveNote } from '../../src/generators/writer';

describe('generators/writer', () => {
  const TEST_DIR = path.join(os.tmpdir(), 'second-brain-writer-test-' + process.pid);

  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  });

  describe('saveNote', () => {
    it('writes file content that matches what was passed in', async () => {
      const filepath = path.join(TEST_DIR, 'test.md');
      const content = '# Test Note\n\nThis is test content.';

      await saveNote(filepath, content);

      const written = fs.readFileSync(filepath, 'utf8');
      expect(written).toBe(content);
    });

    it('creates parent directories if they do not exist', async () => {
      const filepath = path.join(TEST_DIR, 'nested', 'deep', 'note.md');
      const content = '# Nested Note';

      await saveNote(filepath, content);

      expect(fs.existsSync(filepath)).toBe(true);
      const written = fs.readFileSync(filepath, 'utf8');
      expect(written).toBe(content);
    });
  });
});
