import { Geometry } from './Geometry.js';

/** Missing attributes stay missing so SVG defaults and inheritance remain meaningful. */
export class Style {
  private readonly values: Readonly<Record<string, string | number>>;

  public constructor(values: Readonly<Record<string, string | number>> = {}) {
    const checked: Record<string, string | number> = {};
    for (const [name, value] of Object.entries(values)) {
      if (!Style.accepts(name)) {
        throw new Error(`unknown attribute: ${name}`);
      }
      if (name === 'stroke-width') {
        const width = Geometry.number(value, name);
        if (width < 0) {
          throw new Error('stroke-width must be nonnegative');
        }
        checked[name] = width;
      } else {
        checked[name] = String(value);
      }
    }
    this.values = Object.freeze(checked);
  }

  public static accepts(name: string): boolean {
    return name === 'fill' || name === 'stroke' || name === 'stroke-width';
  }

  public get attributes(): Readonly<Record<string, string | number>> {
    return this.values;
  }

  public set(name: string, value: string | number): Style {
    return new Style({ ...this.values, [name]: value });
  }
}
