import { Command } from './Command.js';

export class HelpCommand extends Command {
  public override execute(args: readonly string[]): string {
    if (args.length !== 0) {
      throw new Error('usage: help');
    }

    return [
      'SVG editor — milestone 1 scaffold',
      'Available now:',
      '  help                                      Show this command list',
      '',
      'Planned for later milestones (not implemented yet):',
      '  init [w] [h]',
      '  read <file.svg>',
      '  save [file.svg]',
      '  canvas [w] [h]',
      '  create <type> <id> [params...] [in <containerId>]',
      '    types: rect / circle / ellipse / line / text / g',
      '  delete <id>',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      '  tree [id]',
      '  show <id>',
      '  undo',
      '  redo',
      '',
      'Lines beginning with # are comments. Use double quotes for spaces.',
      'End input with Ctrl-D (EOF).',
    ].join('\n');
  }
}
