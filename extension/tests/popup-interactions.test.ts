import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { initPopup, parseSkippedDomains } from '../entrypoints/popup/main';
import { getToday } from '../components/storage';

const markup = fs.readFileSync('entrypoints/popup/index.html', 'utf8');
let state: Record<string, any>;
beforeEach(() => {
  document.body.innerHTML = markup.split('<body>')[1].split('</body>')[0];
  state = { captures: {}, blocklist: ['blocked.com'], syncError: 'Host unavailable' };
  chrome.storage.local.get = vi.fn(async () => structuredClone(state)) as any;
  chrome.storage.local.set = vi.fn(async (value) => { Object.assign(state, structuredClone(value)); }) as any;
  chrome.tabs.query = vi.fn(async () => [{ url: 'https://example.com/page', title: 'Example' }]) as any;
  chrome.runtime.sendMessage = vi.fn(async () => ({ success: true })) as any;
});

describe('popup interactions', () => {
  it('edits the real skipped-site storage and supports an empty list', async () => {
    await initPopup();
    document.getElementById('editLink')!.click();
    const input = document.getElementById('skippedDomains') as HTMLTextAreaElement;
    await vi.waitFor(() => expect(input.value).toBe('blocked.com'));
    input.value = '';
    document.getElementById('skipEditor')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(state.blocklist).toEqual([]));
    await vi.waitFor(() => expect(document.getElementById('skipEditor')!.hidden).toBe(true));
  });
  it('saves a page and updates the empty-state dashboard', async () => {
    await initPopup();
    document.getElementById('saveButton')!.click();
    await vi.waitFor(() => expect(document.getElementById('todayCount')!.textContent).toBe('1'));
    expect(state.captures[getToday()][0].source).toBe('manual');
    expect(document.getElementById('emptyState')!.classList.contains('visible')).toBe(false);
  });
  it('retries sync from the popup and shows the result', async () => {
    await initPopup();
    expect(document.getElementById('syncStatus')!.textContent).toContain('unavailable');
    document.getElementById('syncButton')!.click();
    await vi.waitFor(() => expect(document.getElementById('syncStatus')!.textContent).toBe('Synced just now'));
  });
  it('normalizes domains and rejects full URLs', () => {
    expect(parseSkippedDomains('Example.COM\nexample.com')).toEqual(['example.com']);
    expect(() => parseSkippedDomains('https://example.com/path')).toThrow();
  });
});
