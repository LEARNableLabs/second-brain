import fs from 'fs';
import os from 'os';
import path from 'path';

// Use temp directory for tests instead of ~/.second-brain
const TEST_DIR = path.join(os.tmpdir(), 'second-brain-test-' + process.pid);

beforeEach(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
  process.env.SECOND_BRAIN_DATA_DIR = TEST_DIR;
});

afterEach(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
  delete process.env.SECOND_BRAIN_DATA_DIR;
});
