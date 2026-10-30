import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class BackCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 1, 'back <id>');
    document.back(args[0]!);
    const shape = document.get(args[0]!);
    return `${shape.type}#${shape.id} moved to back`;
  }
}
