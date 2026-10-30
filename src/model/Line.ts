import { Geometry } from './Geometry.js';
import { GeometricShape } from './GeometricShape.js';
import { Style } from './Style.js';

export class Line extends GeometricShape {
  public constructor(id: string, x1: number, y1: number, x2: number, y2: number, style = new Style()) {
    super(id, new Geometry({ x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2']), style);
  }
  public override get type(): string { return 'line'; }
  protected override copy(geometry: Geometry, style: Style): Line {
    const { x1, y1, x2, y2 } = geometry.attributes;
    return new Line(this.id, x1!, y1!, x2!, y2!, style);
  }
}
