/** Immutable geometry value object: all coordinates are finite; sizes are nonnegative. */
export class Geometry {
  private readonly values: Readonly<Record<string, number>>;

  public constructor(
    values: Readonly<Record<string, number>>,
    private readonly horizontal: readonly string[],
    private readonly vertical: readonly string[],
  ) {
    this.horizontal = Object.freeze([...horizontal]);
    this.vertical = Object.freeze([...vertical]);
    for (const [name, value] of Object.entries(values)) {
      Geometry.number(value, name);
      if (!horizontal.includes(name) && !vertical.includes(name) && value < 0) {
        throw new Error(`${name} must be nonnegative`);
      }
    }
    this.values = Object.freeze({ ...values });
  }

  public static number(value: number | string, name: string): number {
    if (typeof value === 'string' && !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/iu.test(value.trim())) {
      throw new Error(`${name} must be a finite number`);
    }
    const number = Number(value);
    if (!Number.isFinite(number)) {
      throw new Error(`${name} must be a finite number`);
    }
    return number;
  }

  public static factor(value: number): void {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error('scale factor must be positive');
    }
  }

  public get attributes(): Readonly<Record<string, number>> {
    return this.values;
  }

  public has(name: string): boolean {
    return Object.hasOwn(this.values, name);
  }

  public set(name: string, value: number | string): Geometry {
    if (!this.has(name)) {
      throw new Error(`unknown attribute: ${name}`);
    }
    return new Geometry({ ...this.values, [name]: Geometry.number(value, name) }, this.horizontal, this.vertical);
  }

  public move(dx: number, dy: number): Geometry {
    Geometry.number(dx, 'dx');
    Geometry.number(dy, 'dy');
    const values = { ...this.values };
    for (const name of this.horizontal) {
      values[name] = this.values[name]! + dx;
    }
    for (const name of this.vertical) {
      values[name] = this.values[name]! + dy;
    }
    return new Geometry(values, this.horizontal, this.vertical);
  }

  public scale(factor: number): Geometry {
    Geometry.factor(factor);
    const values = Object.fromEntries(Object.entries(this.values).map(([name, value]) => [name, value * factor]));
    return new Geometry(values, this.horizontal, this.vertical);
  }
}
