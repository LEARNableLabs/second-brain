import browser from 'webextension-polyfill';
import { getTodayCount, getLastCapture, saveStorage, loadStorage } from '../../components/storage';
import { addToBlocklist } from '../../components/blocklist';

/**
 * Format elapsed time into human-readable string
 * "just now" (<60s), "N min ago", "Nh ago", "yesterday" (24h+)
 */
export function formatTimeAgo(elapsedMs: number): string {
  const seconds = Math.floor(elapsedMs / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  return 'yesterday';
}

/**
 * Show toast notification for 3 seconds
 */
export function showToast(message: string): void {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(() => {
    toast.classList.remove('visible');
  }, 3000);
}

/**
 * Update pause UI state (toggle label, banner, stats dimming)
 */
export function updatePauseUI(isPaused: boolean): void {
  const toggleLabel = document.getElementById('toggleLabel');
  const pauseBanner = document.getElementById('pauseBanner');
  const statsSection = document.getElementById('statsSection');

  if (!toggleLabel || !pauseBanner || !statsSection) return;

  if (isPaused) {
    toggleLabel.textContent = 'Resume capture';
    pauseBanner.classList.add('visible');
    statsSection.classList.add('dimmed');
  } else {
    toggleLabel.textContent = 'Pause capture';
    pauseBanner.classList.remove('visible');
    statsSection.classList.remove('dimmed');
  }
}

/**
 * Initialize popup UI
 */
export async function initPopup(): Promise<void> {
  // Load pause state
  const storage = await loadStorage();
  const isPaused = storage.isPaused || false;

  // Set toggle state
  const pauseToggle = document.getElementById('pauseToggle') as HTMLInputElement;
  if (pauseToggle) {
    pauseToggle.checked = isPaused;
    updatePauseUI(isPaused);
  }

  // Load today's count and last capture timestamp
  const todayCount = await getTodayCount();
  const lastCapture = await getLastCapture();
  const lastTimestamp = storage.lastCaptureTimestamp;

  // Update stats or show empty state
  const statsSection = document.getElementById('statsSection');
  const emptyState = document.getElementById('emptyState');
  const todayCountEl = document.getElementById('todayCount');
  const lastCaptureEl = document.getElementById('lastCapture');

  if (todayCount === 0) {
    // Show empty state
    if (statsSection) statsSection.style.display = 'none';
    if (emptyState) emptyState.classList.add('visible');
  } else {
    // Show stats
    if (statsSection) statsSection.style.display = 'grid';
    if (emptyState) emptyState.classList.remove('visible');

    if (todayCountEl) todayCountEl.textContent = String(todayCount);

    if (lastCaptureEl && lastTimestamp > 0) {
      const elapsed = Date.now() - lastTimestamp;
      lastCaptureEl.textContent = formatTimeAgo(elapsed);
    }
  }

  // Get current tab for block button
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];

    if (currentTab && currentTab.url && (currentTab.url.startsWith('http://') || currentTab.url.startsWith('https://'))) {
      const url = new URL(currentTab.url);
      const domain = url.hostname;

      const blockButton = document.getElementById('blockButton') as HTMLButtonElement;
      if (blockButton) {
        blockButton.textContent = `Skip this domain: ${domain}`;
        blockButton.disabled = false;
        blockButton.dataset.domain = domain;
      }
    } else {
      // Non-http page (chrome://, about://, etc.) — hide skip button
      const blockButton = document.getElementById('blockButton') as HTMLButtonElement;
      if (blockButton) {
        blockButton.style.display = 'none';
      }
    }
  } catch (error) {
    // T-01-11: Disable block button if URL parsing fails
    console.error('Failed to get current tab URL:', error);
    const blockButton = document.getElementById('blockButton') as HTMLButtonElement;
    if (blockButton) {
      blockButton.textContent = 'Skip this domain';
      blockButton.disabled = true;
    }
  }

  // Attach event listeners
  attachEventListeners();
}

/**
 * Attach event listeners to interactive elements
 */
function attachEventListeners(): void {
  // Pause toggle
  const pauseToggle = document.getElementById('pauseToggle') as HTMLInputElement;
  if (pauseToggle) {
    pauseToggle.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement;
      const isPaused = target.checked;

      // Persist pause state
      await saveStorage({ isPaused });

      // Update UI
      updatePauseUI(isPaused);
    });
  }

  // Quick-block button
  const blockButton = document.getElementById('blockButton') as HTMLButtonElement;
  if (blockButton) {
    blockButton.addEventListener('click', async () => {
      const domain = blockButton.dataset.domain;
      if (!domain) return;

      try {
        await addToBlocklist(domain);
        showToast(`Skipped: ${domain}`);
      } catch (error) {
        console.error('Failed to add to blocklist:', error);
        showToast('Failed to skip site');
      }
    });
  }

  // Edit blocked sites link
  const editLink = document.getElementById('editLink');
  if (editLink) {
    editLink.addEventListener('click', (e) => {
      e.preventDefault();
      // D-10: No options page in Phase 1 - show informational toast
      showToast('Edit skiplist.json to manage skipped sites.');
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initPopup);
