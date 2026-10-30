import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class GroupCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    if (args.length < 2) { throw new Error('usage: group <newGid> <id1> <id2>...'); }
    const id = args[0]!;
    document.group(id, args.slice(1));
    return `g#${id} created with ${document.get(id).children.length} children`;
  }
}
