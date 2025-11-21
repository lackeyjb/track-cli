export interface CommandArg {
  name: string;
  required: boolean;
  description: string;
}

export interface CommandFlag {
  name: string;
  alias?: string;
  description?: string;
  type?: string;
  required?: boolean;
  defaultValue?: unknown;
  collect?: boolean;
  cliFlag: string;
}

export interface CommandMetadata {
  name: string;
  summary: string;
  flags: CommandFlag[];
  args: CommandArg[];
  usage: string;
  example: string;
}

export const commandMetadata: CommandMetadata[] = [
  {
    name: 'init',
    summary: 'Initialize a new track project in the current directory',
    flags: [
      {
        name: 'force',
        alias: 'F',
        description: 'Overwrite existing .track directory if present',
        type: 'boolean',
        required: false,
        defaultValue: false,
        cliFlag: '-F, --force',
      },
    ],
    args: [
      { name: 'name', required: false, description: 'Project name (defaults to directory name)' },
    ],
    usage: 'track init [name] [-F|--force]',
    example: 'track init "My Project"',
  },
  {
    name: 'new',
    summary: 'Create a new track',
    flags: [
      {
        name: 'parent',
        description: 'Parent track ID',
        type: 'string',
        required: false,
        cliFlag: '--parent <track-id>',
      },
      {
        name: 'summary',
        description: 'Current state description',
        type: 'string',
        required: false,
        defaultValue: '',
        cliFlag: '--summary <summary>',
      },
      {
        name: 'next',
        description: 'What to do next',
        type: 'string',
        required: false,
        defaultValue: '',
        cliFlag: '--next <next-prompt>',
      },
      {
        name: 'file',
        description: 'Associated file path (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--file <file-path>',
      },
    ],
    args: [{ name: 'title', required: true, description: 'Track title' }],
    usage:
      'track new "<title>" [--parent <track-id>] [--summary "..."] [--next "..."] [--file <path>]...',
    example: 'track new "Add login screen" --parent ROOT123 --summary "UI stub" --next "Hook API"',
  },
  {
    name: 'update',
    summary: 'Update the current state of an existing track',
    flags: [
      {
        name: 'summary',
        description: 'Updated state description',
        type: 'string',
        required: true,
        cliFlag: '--summary <summary>',
      },
      {
        name: 'next',
        description: 'What to do next',
        type: 'string',
        required: true,
        cliFlag: '--next <next-prompt>',
      },
      {
        name: 'status',
        description: 'Track status (planned|in_progress|done|blocked|superseded)',
        type: 'string',
        required: false,
        defaultValue: 'in_progress',
        cliFlag: '--status <status>',
      },
      {
        name: 'file',
        description: 'Associated file path (repeatable)',
        type: 'string[]',
        required: false,
        collect: true,
        cliFlag: '--file <file-path>',
      },
    ],
    args: [{ name: 'track-id', required: true, description: 'Track ID to update' }],
    usage:
      'track update <track-id> --summary "..." --next "..." [--status <status>] [--file <file-path>]...',
    example: 'track update ABC123 --summary "API wired" --next "Write tests" --status in_progress',
  },
  {
    name: 'status',
    summary: 'Display the current state of the project and all tracks',
    flags: [
      {
        name: 'json',
        description: 'Output as JSON',
        type: 'boolean',
        required: false,
        cliFlag: '--json',
      },
    ],
    args: [],
    usage: 'track status [--json]',
    example: 'track status --json',
  },
];
