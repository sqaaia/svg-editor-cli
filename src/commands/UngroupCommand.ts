import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class UngroupCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 1, 'ungroup <gid>');
    document.ungroup(args[0]!);
    return `g#${args[0]} ungrouped`;
  }
}
