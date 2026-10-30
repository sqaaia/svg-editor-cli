import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class SetCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 3, 'set <id> <attr> <value>');
    document.set(args[0]!, args[1]!, args[2]!);
    return this.describe(document, args);
  }
  protected override describeUndo(before: SvgDocument, args: readonly string[]): string {
    return this.describe(before, args);
  }
  private describe(document: SvgDocument, args: readonly string[]): string {
    const shape = document.get(args[0]!);
    const attribute = args[1]!;
    const value = attribute === 'text' ? shape.textContent : shape.attributes[attribute];
    return `${shape.type}#${shape.id} updated: ${attribute}=${value === undefined ? '(unset)' : JSON.stringify(value)}`;
  }
}
