import { Geometry } from '../model/Geometry.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { EditCommand } from './EditCommand.js';

export class ScaleCommand extends EditCommand {
  protected override edit(document: SvgDocument, args: readonly string[]): string {
    this.requireArity(args, 2, 'scale <id> <factor>');
    const factor = Geometry.number(args[1]!, 'scale factor');
    document.scale(args[0]!, factor);
    const shape = document.get(args[0]!);
    return `${shape.type}#${shape.id} scaled by ${factor}`;
  }
}
