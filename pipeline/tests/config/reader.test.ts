import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadConfig, getOutputDir, ConfigSchema } from '../../src/config/reader';

describe('config/reader', () => {
  const TEST_DIR = path.join(os.tmpdir(), 'second-brain-config-test-' + process.pid);
  const CONFIG_FILE = path.join(TEST_DIR, 'config.json');

  beforeEach(() => {
    fs.mkdirSync(TEST_DIR, { recursive: true });
    process.env.SECOND_BRAIN_DATA_DIR = TEST_DIR;
  });

  afterEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.SECOND_BRAIN_DATA_DIR;
  });

  describe('loadConfig', () => {
    it('returns defaults when config.json does not exist', async () => {
      const config = await loadConfig();
      expect(config).toEqual({});
    });

    it('reads valid config.json with outputDir set', async () => {
      const expectedPath = '/Users/testuser/Documents/MyVault';
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ outputDir: expectedPath }));

      const config = await loadConfig();
      expect(config.outputDir).toBe(expectedPath);
    });

    it('rejects invalid JSON without falling back to another provider', async () => {
      fs.writeFileSync(CONFIG_FILE, 'not valid json {{{');

      await expect(loadConfig()).rejects.toThrow('Invalid configuration');
    });

    it('rejects a relative outputDir', async () => {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ outputDir: 'relative/path' }));

      await expect(loadConfig()).rejects.toThrow('Invalid configuration');
    });

    it('rejects outputDir traversal', async () => {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify({ outputDir: '/Users/../etc/passwd' }));

      await expect(loadConfig()).rejects.toThrow('Invalid configuration');
    });
  });

  describe('getOutputDir', () => {
    it('returns default path when config has no outputDir', () => {
      const config = {};
      const result = getOutputDir(config);
      expect(result).toBe(path.join(os.homedir(), 'Documents', 'Obsidian', 'second-brain'));
    });

    it('returns configured outputDir when set', () => {
      const customPath = '/Users/testuser/CustomVault';
      const config = { outputDir: customPath };
      const result = getOutputDir(config);
      expect(result).toBe(customPath);
    });
  });

  describe('ConfigSchema', () => {
    it('rejects relative path in outputDir', () => {
      const result = ConfigSchema.safeParse({ outputDir: 'relative/path' });
      expect(result.success).toBe(false);
    });

    it('rejects path containing .. in outputDir', () => {
      const result = ConfigSchema.safeParse({ outputDir: '/Users/../etc/passwd' });
      expect(result.success).toBe(false);
    });

    it('accepts absolute path without ..', () => {
      const result = ConfigSchema.safeParse({ outputDir: '/Users/testuser/Documents' });
      expect(result.success).toBe(true);
    });

    it('accepts empty config', () => {
      const result = ConfigSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });
});
