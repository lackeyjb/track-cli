#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { newCommand } from './commands/new.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';

const program = new Command();

program
  .name('track')
  .description('Minimal, AI-friendly CLI for tracking project progress across sessions')
  .version('0.1.0');

// track init [name] [-F|--force]
program
  .command('init')
  .description('Initialize a new track project in the current directory')
  .argument('[name]', 'Project name (defaults to directory name)')
  .option('-F, --force', 'Overwrite existing .track directory if present')
  .action((name: string | undefined, options: { force?: boolean }) => {
    initCommand(name, options.force);
  });

// track new "<title>" [--parent <track-id>] [--summary "..."] [--next "..."] [--file <file-path>]...
program
  .command('new')
  .description('Create a new track')
  .argument('<title>', 'Track title')
  .option('--parent <track-id>', 'Parent track ID')
  .option('--summary <summary>', 'Current state description', '')
  .option('--next <next-prompt>', 'What to do next', '')
  .option(
    '--file <file-path>',
    'Associated file path (can be specified multiple times)',
    (value, previous: string[] = []) => {
      return [...previous, value];
    }
  )
  .action(
    (
      title: string,
      options: { parent?: string; summary: string; next: string; file?: string[] }
    ) => {
      newCommand(title, options);
    }
  );

// track update <track-id> --summary "..." --next "..." [--status <status>] [--file <file-path>]...
program
  .command('update')
  .description('Update the current state of an existing track')
  .argument('<track-id>', 'Track ID to update')
  .requiredOption('--summary <summary>', 'Updated state description')
  .requiredOption('--next <next-prompt>', 'What to do next')
  .option(
    '--status <status>',
    'Track status (planned|in_progress|done|blocked|superseded)',
    'in_progress'
  )
  .option(
    '--file <file-path>',
    'Associated file path (can be specified multiple times)',
    (value, previous: string[] = []) => {
      return [...previous, value];
    }
  )
  .action(
    (
      trackId: string,
      options: { summary: string; next: string; status: string; file?: string[] }
    ) => {
      updateCommand(trackId, options);
    }
  );

// track status [--json]
program
  .command('status')
  .description('Display the current state of the project and all tracks')
  .option('--json', 'Output as JSON')
  .action((options: { json?: boolean }) => {
    statusCommand(options);
  });

program.parse();
