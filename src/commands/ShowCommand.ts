import type { EditorSession } from '../application/EditorSession.js';
import { Style } from '../model/Style.js';
import { Command } from './Command.js';

export class ShowCommand extends Command {
  public constructor(private readonly session: EditorSession) { super(); }
  public override execute(args: readonly string[]): string {
    const document = this.session.document;
    if (args.length !== 1) { throw new Error('usage: show <id>'); }
    const shape = document.get(args[0]!);
    const parent = document.parentOf(shape.id);
    const lines = [`${shape.type}#${shape.id}  parent=${parent === null ? 'svg' : `${parent.type}#${parent.id}`}`];
    const geometry: string[] = [];
    const styles: string[] = [];
    for (const [name, value] of Object.entries(shape.attributes)) {
      const rendered = typeof value === 'string' && /\s/u.test(value) ? JSON.stringify(value) : String(value);
      (Style.accepts(name) ? styles : geometry).push(`${name}=${rendered}`);
    }
    if (geometry.length > 0) { lines.push(`  ${geometry.join(' ')}`); }
    for (const style of styles) { lines.push(`  ${style}`); }
    if (shape.textContent !== undefined) { lines.push(`  text=${JSON.stringify(shape.textContent)}`); }
    return lines.join('\n');
  }
}
