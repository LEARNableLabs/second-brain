#!/usr/bin/env -S node --import tsx
import { runHost } from '../src/messaging/host.ts';
runHost().catch(err => {
  console.error('[native-host] Fatal error:', err);
  process.exit(1);
});
