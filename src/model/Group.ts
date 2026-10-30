import { Geometry } from './Geometry.js';
import { Shape } from './Shape.js';
import { Style } from './Style.js';

export class Group extends Shape {
  private readonly members: readonly Shape[];

  public constructor(id: string, children: readonly Shape[] = [], style = new Style()) {
    super(id, style);
    this.members = Object.freeze([...children]);
    const ids = new Set([id]);
    for (const child of this.members) {
      for (const descendant of child.walk()) {
        if (ids.has(descendant.id)) {
          throw new Error(`id already exists: ${descendant.id}`);
        }
        ids.add(descendant.id);
      }
    }
  }

  public override get type(): string { return 'g'; }
  public override get isContainer(): boolean { return true; }
  public override get children(): readonly Shape[] { return this.members; }
  public override withChildren(children: readonly Shape[]): Group { return new Group(this.id, children, this.style); }
  public override move(dx: number, dy: number): Group {
    Geometry.number(dx, 'dx');
    Geometry.number(dy, 'dy');
    return this.withChildren(this.members.map(child => child.move(dx, dy)));
  }
  public override scale(factor: number): Group {
    Geometry.factor(factor);
    return this.withChildren(this.members.map(child => child.scale(factor)));
  }
  public override clone(): Group { return this.withChildren(this.members.map(child => child.clone())); }
  protected override withStyle(style: Style): Group { return new Group(this.id, this.members, style); }
}
