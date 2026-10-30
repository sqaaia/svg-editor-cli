import type { EditorSession } from '../application/EditorSession.js';
import { Command } from './Command.js';
import { TreeFormatter } from './TreeFormatter.js';

export class TreeCommand extends Command {
  public constructor(private readonly session: EditorSession, private readonly formatter = new TreeFormatter()) { super(); }

  public override execute(args: readonly string[]): string {
    const document = this.session.document;
    if (args.length > 1) { throw new Error('usage: tree [id]'); }
    return this.formatter.format(document, args[0]);
  }
}
