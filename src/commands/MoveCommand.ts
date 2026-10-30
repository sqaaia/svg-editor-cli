import type { EditorSession } from '../application/EditorSession.js';
import { Geometry } from '../model/Geometry.js';
import { Command } from './Command.js';

export class MoveCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }

  public override execute(args: readonly string[]): string {
    const document = this.session.document;
    if (args.length !== 3) { throw new Error('usage: move <id> <dx> <dy>'); }
    const id = args[0]!;
    const dx = Geometry.number(args[1]!, 'dx');
    const dy = Geometry.number(args[2]!, 'dy');
    document.move(id, dx, dy);
    return document.get(id).movementSummary(dx, dy);
  }
}
