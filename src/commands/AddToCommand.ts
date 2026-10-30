import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class AddToCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 2, 'addto <gid> <id>');
    document.addTo(args[0]!, args[1]!);
    const shape = document.get(args[1]!);
    return `${shape.type}#${shape.id} added to g#${args[0]}`;
  }
}
