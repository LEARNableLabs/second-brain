import { Command } from 'commander';
import { exportCommand } from './commands/export.js';
import { generateCommand } from './commands/generate.js';
import { fetchCommand } from './commands/fetch.js';
import { curateCommand } from './commands/curate.js';

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

program
  .command('generate')
  .description('Generate daily notes from captured browsing data')
  .option('--date <YYYY-MM-DD>', 'Generate note for specific date (defaults to today)')
  .option('--dry', 'Preview generated markdown without writing files')
  .action(generateCommand);

program
  .command('fetch')
  .description('Fetch full page content for captured URLs')
  .option('--date <YYYY-MM-DD>', 'Fetch content for specific date (defaults to today)')
  .option('--dry', 'Show what would be fetched without fetching')
  .action(fetchCommand);

program
  .command('curate')
  .description('Generate AI-curated summary for daily note')
  .option('--date <YYYY-MM-DD>', 'Curate for specific date (defaults to today)')
  .option('--dry', 'Preview curated note without writing files')
  .option('--eod', 'End-of-day mode: polished summary + clean up ephemeral content')
  .action(curateCommand);

program.parse();
