import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'Second Brain Capture',
    version: '1.0.0',
    description: 'Passively captures browsing activity for your Obsidian vault',
    permissions: ['tabs', 'history', 'webNavigation', 'storage', 'nativeMessaging', 'contextMenus'],
    host_permissions: [],
    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        '16': 'icon-16.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png',
      },
    },
    commands: {
      'save-current-page': {
        suggested_key: {
          default: 'Ctrl+Shift+S',
          mac: 'Command+Shift+S',
        },
        description: 'Save current page to Second Brain',
      },
    },
  },
});
