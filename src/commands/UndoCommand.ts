import type { EditorSession } from '../application/EditorSession.js';
import { Command } from './Command.js';

export class UndoCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }
  public override execute(args: readonly string[]): string {
    this.session.document;
    if (args.length !== 0) { throw new Error('usage: undo'); }
    return this.session.undo();
  }
}
