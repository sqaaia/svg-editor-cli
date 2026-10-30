import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class FrontCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 1, 'front <id>');
    document.front(args[0]!);
    const shape = document.get(args[0]!);
    return `${shape.type}#${shape.id} moved to front`;
  }
}
