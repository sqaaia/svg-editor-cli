import { Geometry } from './Geometry.js';
import { GeometricShape } from './GeometricShape.js';
import type { Shape } from './Shape.js';
import { Style } from './Style.js';

export class Text extends GeometricShape {
  public constructor(id: string, x: number, y: number, private readonly content: string, style = new Style()) {
    super(id, new Geometry({ x, y }, ['x'], ['y']), style);
  }
  public override get type(): string { return 'text'; }
  public override get textContent(): string { return this.content; }
  public override set(name: string, value: string | number): Shape {
    if (name === 'text') {
      const { x, y } = this.geometry.attributes;
      return new Text(this.id, x!, y!, String(value), this.style);
    }
    return super.set(name, value);
  }
  protected override copy(geometry: Geometry, style: Style): Text {
    const { x, y } = geometry.attributes;
    return new Text(this.id, x!, y!, this.content, style);
  }
}
