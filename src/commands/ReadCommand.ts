import type { EditorSession } from '../application/EditorSession.js';
import { Command } from './Command.js';

export class ReadCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }
  public override execute(args: readonly string[]): string {
    if (args.length !== 1) { throw new Error('usage: read <file.svg>'); }
    return this.session.read(args[0]!);
  }
}
