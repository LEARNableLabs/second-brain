import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import simpleGit from 'simple-git';
import { ensureGitRepo, autoCommitNotes } from '../../src/git/auto-commit';

describe('git/auto-commit', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), 'second-brain-git-test-' + Math.random().toString(36).substring(7));
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('ensureGitRepo', () => {
    it('initializes a new git repo in a non-git directory', async () => {
      await ensureGitRepo(testDir);

      const gitDir = path.join(testDir, '.git');
      expect(fs.existsSync(gitDir)).toBe(true);
    });

    it('creates .gitignore with entries for database and temp files', async () => {
      await ensureGitRepo(testDir);

      const gitignorePath = path.join(testDir, '.gitignore');
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');

      expect(gitignoreContent).toContain('*.db');
      expect(gitignoreContent).toContain('*.db-shm');
      expect(gitignoreContent).toContain('*.db-wal');
      expect(gitignoreContent).toContain('*.tmp');
      expect(gitignoreContent).toContain('.DS_Store');
      expect(gitignoreContent).toContain('node_modules/');
    });

    it('is idempotent - calling twice on already-initialized repo does not error', async () => {
      await ensureGitRepo(testDir);
      // Second call should not throw
      await expect(ensureGitRepo(testDir)).resolves.not.toThrow();
    });

    it('commits .gitignore as initial commit', async () => {
      await ensureGitRepo(testDir);

      const git = simpleGit(testDir);
      const log = await git.log();

      expect(log.total).toBe(1);
      expect(log.latest?.message).toContain('initialize second-brain notes repository');
    });
  });

  describe('autoCommitNotes', () => {
    beforeEach(async () => {
      // Initialize git repo before each test
      await ensureGitRepo(testDir);
    });

    it('stages and commits specified .md files', async () => {
      const noteFile = path.join(testDir, '2026-04-10.md');
      fs.writeFileSync(noteFile, '# Daily Note');

      const committed = await autoCommitNotes(testDir, ['2026-04-10.md']);

      expect(committed).toBe(true);

      const git = simpleGit(testDir);
      const log = await git.log();
      // Should have 2 commits: initial .gitignore + this one
      expect(log.total).toBe(2);
    });

    it('skips commit when no files have changed', async () => {
      const noteFile = path.join(testDir, '2026-04-10.md');
      fs.writeFileSync(noteFile, '# Daily Note');
      await autoCommitNotes(testDir, ['2026-04-10.md']);

      // Try to commit again without changes
      const committed = await autoCommitNotes(testDir, ['2026-04-10.md']);

      expect(committed).toBe(false);

      const git = simpleGit(testDir);
      const log = await git.log();
      // Should still have 2 commits (no empty commit)
      expect(log.total).toBe(2);
    });

    it('commit message contains file count and timestamp', async () => {
      const noteFile1 = path.join(testDir, '2026-04-10.md');
      const noteFile2 = path.join(testDir, '2026-04-11.md');
      fs.writeFileSync(noteFile1, '# Daily Note 1');
      fs.writeFileSync(noteFile2, '# Daily Note 2');

      await autoCommitNotes(testDir, ['2026-04-10.md', '2026-04-11.md']);

      const git = simpleGit(testDir);
      const log = await git.log();
      const latestMessage = log.latest?.message || '';

      expect(latestMessage).toContain('2');
      expect(latestMessage).toContain('note');
      // Should contain timestamp in ISO format
      expect(latestMessage).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('handles multiple commits in sequence', async () => {
      // First commit
      const noteFile1 = path.join(testDir, '2026-04-10.md');
      fs.writeFileSync(noteFile1, '# Daily Note 1');
      await autoCommitNotes(testDir, ['2026-04-10.md']);

      // Second commit
      const noteFile2 = path.join(testDir, '2026-04-11.md');
      fs.writeFileSync(noteFile2, '# Daily Note 2');
      await autoCommitNotes(testDir, ['2026-04-11.md']);

      const git = simpleGit(testDir);
      const log = await git.log();
      // Should have 3 commits: initial + 2 note commits
      expect(log.total).toBe(3);
    });
  });
});
