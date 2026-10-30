import { Command } from './Command.js';

export class HelpCommand extends Command {
  public override execute(args: readonly string[]): string {
    if (args.length !== 0) {
      throw new Error('usage: help');
    }

    return [
      'SVG editor — milestone 4 (editing and undo/redo available)',
      'Available now:',
      '  help                                      Show this command list',
      '  init [w] [h]',
      '  create <type> <id> [params...] [in <containerId>]',
      '    rect:    <x> <y> <w> <h> [fill]',
      '    circle:  <cx> <cy> <r> [fill]',
      '    ellipse: <cx> <cy> <rx> <ry> [fill]',
      '    line:    <x1> <y1> <x2> <y2> [stroke]',
      '    text:    <x> <y> "content"',
      '    g:       (no geometry parameters)',
      '  tree [id]',
      '  move <id> <dx> <dy>',
      '  canvas [w] [h]',
      '  delete <id>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      '  show <id>',
      '  undo',
      '  redo',
      '',
      'Planned for later milestones (not implemented yet):',
      '  read <file.svg>',
      '  save [file.svg]',
      '',
      'Lines beginning with # are comments. Use double quotes for spaces.',
      'End input with Ctrl-D (EOF).',
    ].join('\n');
  }
}
