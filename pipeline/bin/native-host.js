#!/usr/bin/env node
import { runHost } from '../src/messaging/host.js';
runHost().catch(err => {
  console.error('[native-host] Fatal error:', err);
  process.exit(1);
});
