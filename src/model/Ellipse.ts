import { Geometry } from './Geometry.js';
import { GeometricShape } from './GeometricShape.js';
import { Style } from './Style.js';

export class Ellipse extends GeometricShape {
  public constructor(id: string, cx: number, cy: number, rx: number, ry: number, style = new Style()) {
    super(id, new Geometry({ cx, cy, rx, ry }, ['cx'], ['cy']), style);
  }
  public override get type(): string { return 'ellipse'; }
  protected override copy(geometry: Geometry, style: Style): Ellipse {
    const { cx, cy, rx, ry } = geometry.attributes;
    return new Ellipse(this.id, cx!, cy!, rx!, ry!, style);
  }
}
