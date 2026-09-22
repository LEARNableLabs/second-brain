import browser from 'webextension-polyfill';
import { loadStorage, saveStorage } from './storage';
import { withCaptureLock } from './capture-lock';

let pending: Promise<void> | undefined;
let requested = false;

/** Retryable, serialized sync. Browser storage remains the durable retry buffer. */
export function syncCaptures(): Promise<void> {
  requested = true;
  if (pending) return pending;
  pending = (async () => {
    while (requested) {
      requested = false;
      try {
        const { captures } = await loadStorage();
        if (Object.values(captures).every(entries => entries.length === 0)) {
          const pong = await browser.runtime.sendNativeMessage('com.second_brain.export_host', { action: 'ping' }) as { pong?: boolean };
          if (!pong?.pong) throw new Error('The local app is unavailable');
        }
        for (const [date, entries] of Object.entries(captures)) {
          for (let i = 0; i < entries.length; i += 100) {
            const batch = entries.slice(i, i + 100);
            const response = await browser.runtime.sendNativeMessage('com.second_brain.export_host', {
              action: 'syncCaptures', captures: { [date]: batch }, exportedAt: Date.now(),
            }) as { success?: boolean; received?: number; error?: string } | undefined;
            if (!response?.success || response.received !== batch.length) {
              throw new Error(response?.error || 'The local app did not confirm the save');
            }
          }
        }
        await withCaptureLock(async () => {
          const current = await loadStorage();
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 7);
          cutoff.setHours(0, 0, 0, 0);
          let pruned = false;
          for (const [date, entries] of Object.entries(captures)) {
            // Delete only unchanged snapshots that the host has durably saved.
            if (new Date(`${date}T00:00:00`).getTime() < cutoff.getTime()
              && JSON.stringify(current.captures[date]) === JSON.stringify(entries)) {
              delete current.captures[date];
              pruned = true;
            }
          }
          await saveStorage({ ...(pruned ? { captures: current.captures } : {}), lastExportTimestamp: Date.now(), syncError: '' });
        });
      } catch (error) {
        await saveStorage({ syncError: String(error) });
        requested = false;
      }
    }
  })().finally(() => { pending = undefined; });
  return pending;
}
