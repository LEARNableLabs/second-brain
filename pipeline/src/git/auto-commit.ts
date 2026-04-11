import simpleGit from 'simple-git';
import path from 'path';
import { promises as fs } from 'fs';

export async function ensureGitRepo(outputDir: string): Promise<void> {
  const git = simpleGit(outputDir);

  // Check if already a repo (idempotent, per D-10)
  const isRepo = await git.checkIsRepo();
  if (isRepo) {
    return;
  }

  // Initialize git repo
  await git.init();

  // Write .gitignore (per D-12)
  const gitignoreContent = `*.db
*.db-shm
*.db-wal
*.tmp
.DS_Store
node_modules/
`;
  const gitignorePath = path.join(outputDir, '.gitignore');
  await fs.writeFile(gitignorePath, gitignoreContent, 'utf8');

  // Stage and commit .gitignore
  await git.add('.gitignore');
  await git.commit('chore: initialize second-brain notes repository');
}

export async function autoCommitNotes(outputDir: string, files: string[]): Promise<boolean> {
  const git = simpleGit(outputDir);

  // Stage files
  await git.add(files);

  // Check if there are any staged changes
  const status = await git.status();
  if (status.staged.length === 0) {
    // No changes to commit (per D-11 discretion: avoid empty commits)
    return false;
  }

  // Build commit message with file count and timestamp (per D-11 discretion)
  const timestamp = new Date().toISOString();
  const message = `update: ${status.staged.length} daily note(s) (${timestamp})`;

  // Commit
  await git.commit(message);

  return true;
}
