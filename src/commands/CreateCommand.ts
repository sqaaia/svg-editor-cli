import type { EditorSession } from '../application/EditorSession.js';
import type { ShapeFactory } from '../model/ShapeFactory.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class CreateCommand extends EditCommand {
  public constructor(session: EditorSession, private readonly factory: ShapeFactory) { super(session); }

  protected override edit(document: SvgDocument, args: readonly string[]): string {
    const [type, id] = args;
    if (type === undefined || id === undefined) {
      throw new Error('usage: create <type> <id> [params...] [in <containerId>]');
    }
    let parameters = args.slice(2);
    let containerId: string | undefined;
    // Only a complete trailing pair is structural; text containing "in" stays text.
    if (parameters.length >= 2 && parameters.at(-2) === 'in') {
      containerId = parameters.at(-1)!;
      parameters = parameters.slice(0, -2);
    }
    const shape = this.factory.create(type, id, parameters);
    document.add(shape, containerId);
    return `${shape.type}#${shape.id} created${containerId === undefined ? '' : ` in g#${containerId}`}`;
  }
}
