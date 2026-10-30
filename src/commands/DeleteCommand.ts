import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class DeleteCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 1, 'delete <id>');
    const shape = document.get(args[0]!);
    document.delete(shape.id);
    return `${shape.type}#${shape.id} deleted`;
  }
  protected override describeUndo(before: SvgDocument, args: readonly string[]): string {
    const shape = before.get(args[0]!);
    const parent = before.parentOf(shape.id);
    return `${shape.type}#${shape.id} restored into ${parent === null ? 'svg' : `${parent.type}#${parent.id}`}`;
  }
}
