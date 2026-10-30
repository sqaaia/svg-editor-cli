import { Style } from './Style.js';

/** Immutable, behavior-rich component. Editing methods return replacement objects. */
export abstract class Shape {
  public constructor(private readonly identifier: string, protected readonly style = new Style()) {
    if (identifier.length === 0 || /\s/u.test(identifier)) {
      throw new Error('id must be nonempty and contain no whitespace');
    }
  }

  public get id(): string { return this.identifier; }
  public abstract get type(): string;
  public get isContainer(): boolean { return false; }
  public get children(): readonly Shape[] { return Object.freeze([]); }
  public get textContent(): string | undefined { return undefined; }
  public get attributes(): Readonly<Record<string, number | string>> { return this.style.attributes; }

  public abstract move(dx: number, dy: number): Shape;
  public abstract scale(factor: number): Shape;
  public abstract clone(): Shape;
  protected abstract withStyle(style: Style): Shape;

  public set(name: string, value: string | number): Shape {
    if (!Style.accepts(name)) {
      throw new Error(`unknown attribute: ${name}`);
    }
    return this.withStyle(this.style.set(name, value));
  }

  public withChildren(_children: readonly Shape[]): Shape {
    throw new Error(`not a container: ${this.id}`);
  }

  public *walk(): IterableIterator<Shape> {
    yield this;
    for (const child of this.children) {
      yield* child.walk();
    }
  }
}
