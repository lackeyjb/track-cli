#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { newCommand } from './commands/new.js';
import { updateCommand } from './commands/update.js';
import { statusCommand } from './commands/status.js';
import { mcpStartCommand } from './commands/mcp.js';
import { commandMetadata, CommandFlag } from './commands/metadata.js';

const program = new Command();

program
  .name('track')
  .description('Minimal, AI-friendly CLI for tracking project progress across sessions')
  .version('0.1.0');

commandMetadata.forEach((meta) => {
  const cmd = program.command(meta.name).description(meta.summary).usage(meta.usage);

  meta.args.forEach((arg) => {
    const token = arg.required ? `<${arg.name}>` : `[${arg.name}]`;
    cmd.argument(token, arg.description);
  });

  meta.flags.forEach((flag: CommandFlag) => {
    const optionMethod = flag.required ? 'requiredOption' : 'option';
    const description = flag.description ?? '';
    if (flag.collect) {
      const defaultList = Array.isArray(flag.defaultValue) ? flag.defaultValue : [];
      cmd[optionMethod as 'requiredOption'](
        flag.cliFlag,
        description,
        (value: string, previous: string[] = []) => [...previous, value],
        defaultList
      );
    } else {
      cmd[optionMethod as 'requiredOption'](
        flag.cliFlag,
        description,
        flag.defaultValue as string | undefined
      );
    }
  });

  switch (meta.name) {
    case 'init':
      cmd.action((name: string | undefined, options: { force?: boolean }) => {
        initCommand(name, options.force);
      });
      break;
    case 'new':
      cmd.action(
        (
          title: string,
          options: { parent?: string; summary: string; next: string; file?: string[] }
        ) => {
          newCommand(title, options);
        }
      );
      break;
    case 'update':
      cmd.action(
        (
          trackId: string,
          options: { summary: string; next: string; status: string; file?: string[] }
        ) => {
          updateCommand(trackId, options);
        }
      );
      break;
    case 'status':
      cmd.action((options: { json?: boolean }) => {
        statusCommand(options);
      });
      break;
    case 'mcp':
      cmd.action((action: string, options: { port?: number; host?: string }) => {
        if (action === 'start') {
          mcpStartCommand(options);
        } else {
          console.error(`Error: Unknown mcp action: ${action}`);
          console.error('Available actions: start');
          process.exit(1);
        }
      });
      break;
    default:
      // Commander requires an action; fallback no-op to avoid undefined behavior.
      cmd.action(() => {});
  }
});

const registeredNames = new Set(program.commands.map((c) => c.name()));
commandMetadata.forEach((meta) => {
  if (!registeredNames.has(meta.name)) {
    throw new Error(`Command metadata "${meta.name}" missing handler registration`);
  }
});

program.parse();
