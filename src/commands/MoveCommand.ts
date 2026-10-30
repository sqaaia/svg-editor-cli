import { Geometry } from '../model/Geometry.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class MoveCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    if (args.length !== 3) { throw new Error('usage: move <id> <dx> <dy>'); }
    const id = args[0]!;
    const dx = Geometry.number(args[1]!, 'dx');
    const dy = Geometry.number(args[2]!, 'dy');
    document.move(id, dx, dy);
    return document.get(id).movementSummary(dx, dy);
  }

  protected override describeUndo(before: SvgDocument, args: readonly string[]): string {
    return before.get(args[0]!).movementSummary(-Number(args[1]), -Number(args[2]), true);
  }
}
