import type { EditorSession } from '../application/EditorSession.js';
import { Geometry } from '../model/Geometry.js';
import { Command } from './Command.js';

export class CanvasCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }
  public override execute(args: readonly string[]): string {
    const document = this.session.document;
    if (args.length === 0) { return `canvas ${document.width}x${document.height}`; }
    if (args.length > 2) { throw new Error('usage: canvas [w] [h]'); }
    const width = Geometry.number(args[0]!, 'canvas width');
    const height = args[1] === undefined ? document.height : Geometry.number(args[1], 'canvas height');
    const resized = this.session.resize(width, height);
    return `canvas resized to ${resized.width}x${resized.height}`;
  }
}
