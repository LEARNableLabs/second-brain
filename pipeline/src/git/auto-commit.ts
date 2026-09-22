import simpleGit from 'simple-git';
import path from 'path';
import { promises as fs } from 'fs';

export async function ensureGitRepo(outputDir: string): Promise<void> {
  await fs.mkdir(outputDir, { recursive: true });
  const git = simpleGit(outputDir);

  // Check if already a repo (idempotent, per D-10)
  const isRepo = await git.checkIsRepo();
  if (isRepo) {
    return;
  }

  // Initialize git repo
  await git.init();
  if (!(await git.getConfig('user.name')).value) await git.addConfig('user.name', 'Second Brain');
  if (!(await git.getConfig('user.email')).value) await git.addConfig('user.email', 'second-brain@localhost');

  // Write .gitignore (per D-12)
  const gitignoreContent = `*.db
*.db-shm
*.db-wal
*.tmp
.DS_Store
node_modules/
`;
  const gitignorePath = path.join(outputDir, '.gitignore');
  await fs.appendFile(gitignorePath, '\n' + gitignoreContent, 'utf8');

  // Stage and commit .gitignore
  await git.add('.gitignore');
  await git.commit('chore: initialize second-brain notes repository');
}

export async function autoCommitNotes(outputDir: string, files: string[]): Promise<boolean> {
  if (files.length === 0) return false;
  const git = simpleGit(outputDir);

  // Stage files
  await git.add(files);

  // Check if there are any staged changes
  const changed = (await git.diff(['--cached', '--name-only', '--', ...files])).trim();
  if (!changed) {
    // No changes to commit (per D-11 discretion: avoid empty commits)
    return false;
  }

  // Build commit message with file count and timestamp (per D-11 discretion)
  const timestamp = new Date().toISOString();
  const message = `update: ${changed.split('\n').length} daily note(s) (${timestamp})`;

  // Commit
  await git.commit(message, files, { '--only': null });

  return true;
}
