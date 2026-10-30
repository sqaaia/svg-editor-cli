import { Command } from './Command.js';

export class HelpCommand extends Command {
  public override execute(args: readonly string[]): string {
    if (args.length !== 0) {
      throw new Error('usage: help');
    }

    return [
      'SVG editor — milestone 5 (SVG read/save available)',
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
      'SVG file commands:',
      '  read <file.svg>',
      '  save [file.svg]',
      '  External SVG supports six built-in types and their attribute whitelist.',
      '',
      'Lines beginning with # are comments. Use double quotes for spaces.',
      'End input with Ctrl-D (EOF).',
    ].join('\n');
  }
}
