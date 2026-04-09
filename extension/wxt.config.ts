import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'Second Brain Capture',
    version: '1.0.0',
    description: 'Passively captures browsing activity for your Obsidian vault',
    permissions: ['tabs', 'history', 'webNavigation', 'storage'],
    host_permissions: [],
    action: {
      default_popup: 'popup/index.html',
      default_icon: {
        '16': 'icon-16.png',
        '48': 'icon-48.png',
        '128': 'icon-128.png',
      },
    },
  },
});
