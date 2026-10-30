import type { EditorSession } from '../application/EditorSession.js';
import { Command } from './Command.js';

export class SaveCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }
  public override execute(args: readonly string[]): string {
    this.session.document;
    if (args.length > 1) { throw new Error('usage: save [file.svg]'); }
    return this.session.save(args[0]);
  }
}
