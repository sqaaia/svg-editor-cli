import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Geometry } from './Geometry.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Style } from './Style.js';
import { Text } from './Text.js';
import { ShapeDefinition } from './ShapeDefinition.js';

/** The sole shape-name dispatch point. Parent/container handling belongs to the document. */
export class ShapeFactory {
  private readonly builders = new Map<string, ShapeDefinition>([
    ['rect', new ShapeDefinition(['x', 'y', 'width', 'height'], false, (id, args) => {
      this.arity(args, 4, 5);
      return new Rect(id, this.number(args, 0), this.number(args, 1), this.number(args, 2), this.number(args, 3), this.style('fill', args[4]));
    })],
    ['circle', new ShapeDefinition(['cx', 'cy', 'r'], false, (id, args) => {
      this.arity(args, 3, 4);
      return new Circle(id, this.number(args, 0), this.number(args, 1), this.number(args, 2), this.style('fill', args[3]));
    })],
    ['ellipse', new ShapeDefinition(['cx', 'cy', 'rx', 'ry'], false, (id, args) => {
      this.arity(args, 4, 5);
      return new Ellipse(id, this.number(args, 0), this.number(args, 1), this.number(args, 2), this.number(args, 3), this.style('fill', args[4]));
    })],
    ['line', new ShapeDefinition(['x1', 'y1', 'x2', 'y2'], false, (id, args) => {
      this.arity(args, 4, 5);
      return new Line(id, this.number(args, 0), this.number(args, 1), this.number(args, 2), this.number(args, 3), this.style('stroke', args[4]));
    })],
    ['text', new ShapeDefinition(['x', 'y'], true, (id, args) => {
      this.arity(args, 3, 3);
      return new Text(id, this.number(args, 0), this.number(args, 1), args[2]!);
    })],
    ['g', new ShapeDefinition([], false, (id, args) => {
      this.arity(args, 0, 0);
      return new Group(id);
    })],
  ]);

  public create(type: string, id: string, args: readonly string[] = []): Shape {
    const build = this.builders.get(type);
    if (!build) {
      throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return build.create(id, args);
  }

  public fromSvg(type: string, id: string, attributes: Readonly<Record<string, string>>, text: string): Shape {
    const definition = this.builders.get(type);
    if (!definition) { throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`); }
    return definition.fromSvg(id, attributes, text);
  }

  private arity(args: readonly string[], minimum: number, maximum: number): void {
    if (args.length < minimum || args.length > maximum) {
      throw new Error(`expected ${minimum === maximum ? minimum : `${minimum}-${maximum}`} shape parameters, got ${args.length}`);
    }
  }
  private number(args: readonly string[], index: number): number {
    return Geometry.number(args[index]!, `parameter ${index + 1}`);
  }
  private style(attribute: string, value: string | undefined): Style {
    return new Style(value === undefined ? {} : { [attribute]: value });
  }
}
