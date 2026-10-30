import type { Shape } from './Shape.js';
import { Style } from './Style.js';

/** Schema and constructor live together at the single factory registration point. */
export class ShapeDefinition {
  public constructor(
    private readonly geometry: readonly string[],
    private readonly acceptsText: boolean,
    private readonly build: (id: string, args: readonly string[]) => Shape,
  ) {}
  public create(id: string, args: readonly string[]): Shape { return this.build(id, args); }
  public fromSvg(id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    for (const name of Object.keys(attributes)) {
      if (name !== 'id' && !this.geometry.includes(name) && !Style.accepts(name)) {
        throw new Error(`unsupported SVG attribute: ${name}`);
      }
    }
    if (!this.acceptsText && text.trim() !== '') { throw new Error('unexpected text inside shape'); }
    const args = this.geometry.map(name => attributes[name] ?? '0');
    if (this.acceptsText) { args.push(text); }
    let shape = this.build(id, args);
    for (const [name, value] of Object.entries(attributes)) {
      if (Style.accepts(name)) { shape = shape.set(name, value); }
    }
    return shape;
  }
}
