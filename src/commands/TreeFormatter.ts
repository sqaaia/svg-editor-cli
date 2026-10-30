import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';

/** Pure text presentation: branch layout only, never shape-type dispatch or terminal IO. */
export class TreeFormatter {
  public format(document: SvgDocument, id?: string): string {
    const root = id === undefined ? undefined : document.get(id);
    const lines = [root === undefined ? `svg (${document.width}x${document.height})` : root.summary()];
    this.append(lines, root?.children ?? document.children, '');
    return lines.join('\n');
  }

  private append(lines: string[], children: readonly Shape[], prefix: string): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└──' : '├──'} ${child.summary()}`);
      this.append(lines, child.children, `${prefix}${last ? '    ' : '│   '}`);
    });
  }
}
