import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncCaptures } from '../components/native-sync';
import { handleGetCaptures } from '../entrypoints/background';
import { loadStorage } from '../components/storage';

let state: Record<string, any>;
const send = vi.fn();
beforeEach(() => {
  state = { captures: { '2026-01-01': [{ url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: 1, source: 'live' }] } };
  chrome.storage.local.get = vi.fn(async () => structuredClone(state)) as any;
  chrome.storage.local.set = vi.fn(async (values) => { Object.assign(state, structuredClone(values)); }) as any;
  chrome.runtime.sendNativeMessage = send;
  send.mockReset();
});

describe('native sync', () => {
  it('sends actual captures and records a successful acknowledgement', async () => {
    const captures = structuredClone(state.captures);
    send.mockResolvedValue({ success: true, received: 1 });
    await syncCaptures();
    expect(send).toHaveBeenCalledWith('com.second_brain.export_host', expect.objectContaining({ action: 'syncCaptures', captures }));
    expect(state.captures).toEqual({}); // Old data is pruned only after confirmation.
    expect(state.lastExportTimestamp).toBeGreaterThan(0);
    expect(state.syncError).toBe('');
  });

  it('retains captures and retries when the host is unavailable', async () => {
    const captures = structuredClone(state.captures);
    send.mockRejectedValueOnce(new Error('Host unavailable'));
    await syncCaptures();
    expect(state.captures).toEqual(captures);
    expect(state.lastExportTimestamp).toBeUndefined();
    expect(state.syncError).toContain('Host unavailable');
    send.mockResolvedValue({ success: true, received: 1 });
    await syncCaptures();
    expect(state.syncError).toBe('');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('rejects partial acknowledgements', async () => {
    send.mockResolvedValue({ success: true, received: 0 });
    await syncCaptures();
    expect(state.lastExportTimestamp).toBeUndefined();
    expect(state.captures['2026-01-01']).toHaveLength(1);
  });

  it('does not prune a capture changed during sync', async () => {
    send.mockImplementation(async () => {
      state.captures['2026-01-01'][0].source = 'manual';
      return { success: true, received: 1 };
    });
    await syncCaptures();
    expect(state.captures['2026-01-01'][0].source).toBe('manual');
  });

  it('reading captures does not prune old, unexported data', async () => {
    const snapshot = structuredClone(state);
    const result = await handleGetCaptures();
    expect(result.captures).toEqual(snapshot.captures);
    expect(state).toEqual(snapshot);
    expect((await loadStorage()).lastExportTimestamp).toBeUndefined();
  });
});
