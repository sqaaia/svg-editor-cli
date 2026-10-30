import type { EditorSession } from '../application/EditorSession.js';
import { Geometry } from '../model/Geometry.js';
import { Command } from './Command.js';

export class InitCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }

  public override execute(args: readonly string[]): string {
    if (args.length > 2) { throw new Error('usage: init [w] [h]'); }
    const width = args[0] === undefined ? 800 : Geometry.number(args[0], 'canvas width');
    const height = args[1] === undefined ? 600 : Geometry.number(args[1], 'canvas height');
    const document = this.session.initialize(width, height);
    return `canvas ${document.width}x${document.height} created`;
  }
}
