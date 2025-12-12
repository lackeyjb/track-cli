import pc from 'picocolors';
import type { Status } from '../models/types.js';

export const STATUS_ICONS: Record<Status, string> = {
  planned: '○',
  in_progress: '●',
  done: '✓',
  blocked: '⚠',
  superseded: '✗',
};

export function colorStatus(status: Status): string {
  const icon = STATUS_ICONS[status];
  const rawStatus = status;
  switch (status) {
    case 'in_progress':
      return pc.yellow(`${icon} ${status}`);
    case 'done':
      return pc.green(`${icon} ${status}`);
    case 'blocked':
      return pc.red(`${icon} ${status}`);
    case 'planned':
      return pc.cyan(`${icon} ${status}`);
    case 'superseded':
      return pc.dim(`${icon} ${status}`);
  }
  return `${icon} ${rawStatus}`;
}

export function colorKind(kind: string): string {
  switch (kind) {
    case 'super':
      return pc.bold(pc.magenta(kind));
    case 'feature':
      return pc.blue(kind);
    case 'task':
      return pc.white(kind);
    default:
      return kind;
  }
}

export const TREE = {
  BRANCH: '├──',
  LAST: '└──',
  PIPE: '│  ',
  SPACE: '   ',
};

export function formatLabel(label: string, value: string, width = 8): string {
  return `${pc.dim(label.padEnd(width))} ${value}`;
}
