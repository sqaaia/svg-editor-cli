import { Geometry } from './Geometry.js';
import { Shape } from './Shape.js';
import { Style } from './Style.js';

/** Shares geometry mechanics, while each concrete class defines its own attributes. */
export abstract class GeometricShape extends Shape {
  public constructor(id: string, protected readonly geometry: Geometry, style = new Style()) {
    super(id, style);
  }

  public override get attributes(): Readonly<Record<string, number | string>> {
    return Object.freeze({ ...this.geometry.attributes, ...this.style.attributes });
  }

  protected abstract copy(geometry: Geometry, style: Style): GeometricShape;
  protected abstract get positionDescription(): string;

  public override movementSummary(_dx: number, _dy: number): string {
    return `${this.type}#${this.id} moved to ${this.positionDescription}`;
  }

  public override move(dx: number, dy: number): GeometricShape {
    return this.copy(this.geometry.move(dx, dy), this.style);
  }

  public override scale(factor: number): GeometricShape {
    return this.copy(this.geometry.scale(factor), this.style);
  }

  public override set(name: string, value: string | number): Shape {
    return this.geometry.has(name)
      ? this.copy(this.geometry.set(name, value), this.style)
      : super.set(name, value);
  }

  public override clone(): GeometricShape { return this.copy(this.geometry, this.style); }
  protected override withStyle(style: Style): GeometricShape { return this.copy(this.geometry, style); }
}
