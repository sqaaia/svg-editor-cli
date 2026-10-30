import { Geometry } from './Geometry.js';
import { GeometricShape } from './GeometricShape.js';
import { Style } from './Style.js';

export class Rect extends GeometricShape {
  public constructor(id: string, x: number, y: number, width: number, height: number, style = new Style()) {
    super(id, new Geometry({ x, y, width, height }, ['x'], ['y']), style);
  }
  public override get type(): string { return 'rect'; }
  protected override copy(geometry: Geometry, style: Style): Rect {
    const { x, y, width, height } = geometry.attributes;
    return new Rect(this.id, x!, y!, width!, height!, style);
  }
}
