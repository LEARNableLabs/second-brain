#!/usr/bin/env node
import { register } from 'tsx/esm/api';
register();
const { runHost } = await import('../src/messaging/host.ts');
runHost().catch(err => {
  console.error('[native-host] Fatal error:', err);
  process.exit(1);
});
