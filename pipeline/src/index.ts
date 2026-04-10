import { Command } from 'commander';
import { exportCommand } from './commands/export.js';

const program = new Command();

program
  .name('second-brain')
  .description('Second Brain CLI - automated knowledge capture pipeline')
  .version('0.1.0');

program
  .command('export')
  .description('Export captures from browser extension to SQLite database')
  .option('--dry-run', 'Show what would be exported without writing to database')
  .action(exportCommand);

program.parse();
