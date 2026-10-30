import { Geometry } from './Geometry.js';
import { GeometricShape } from './GeometricShape.js';
import { Style } from './Style.js';

export class Circle extends GeometricShape {
  public constructor(id: string, cx: number, cy: number, r: number, style = new Style()) {
    super(id, new Geometry({ cx, cy, r }, ['cx'], ['cy']), style);
  }
  public override get type(): string { return 'circle'; }
  protected override get geometryDescription(): string {
    const { cx, cy, r } = this.geometry.attributes;
    return `cx=${cx} cy=${cy} r=${r}`;
  }
  protected override get positionDescription(): string {
    const { cx, cy } = this.geometry.attributes;
    return `(${cx},${cy})`;
  }
  protected override copy(geometry: Geometry, style: Style): Circle {
    const { cx, cy, r } = geometry.attributes;
    return new Circle(this.id, cx!, cy!, r!, style);
  }
}
