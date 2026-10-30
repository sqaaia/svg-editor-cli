import { Geometry } from './Geometry.js';
import { Group } from './Group.js';
import type { Shape } from './Shape.js';

/** Owns the tree. Immutable candidate subtrees are validated before a single assignment. */
export class SvgDocument {
  private roots: readonly Shape[] = Object.freeze([]);
  private canvasWidth = 800;
  private canvasHeight = 600;

  public constructor(width = 800, height = 600, children: readonly Shape[] = []) {
    this.resize(width, height);
    this.commit(children);
  }

  public get width(): number { return this.canvasWidth; }
  public get height(): number { return this.canvasHeight; }
  public get children(): readonly Shape[] { return this.roots; }
  public get size(): number { return [...this.walk()].length; }

  public *walk(): IterableIterator<Shape> {
    for (const root of this.roots) { yield* root.walk(); }
  }
  public find(id: string): Shape | undefined { return this.findIn(this.roots, id); }
  public get(id: string): Shape {
    const shape = this.find(id);
    if (!shape) { throw new Error(`no such shape: ${id}`); }
    return shape;
  }
  public parentOf(id: string): Shape | null {
    this.get(id);
    for (const shape of this.walk()) {
      if (shape.children.some(child => child.id === id)) { return shape; }
    }
    return null;
  }
  public resize(width: number, height: number): void {
    Geometry.number(width, 'canvas width');
    Geometry.number(height, 'canvas height');
    if (width <= 0 || height <= 0) { throw new Error('canvas dimensions must be positive'); }
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public add(shape: Shape, containerId?: string): void {
    if (containerId === undefined) {
      this.commit([...this.roots, shape]);
    } else {
      const container = this.container(containerId);
      this.commit(this.replace(this.roots, containerId, [container.withChildren([...container.children, shape])]));
    }
  }
  public move(id: string, dx: number, dy: number): void { this.update(id, shape => shape.move(dx, dy)); }
  public scale(id: string, factor: number): void { this.update(id, shape => shape.scale(factor)); }
  public set(id: string, attribute: string, value: string | number): void { this.update(id, shape => shape.set(attribute, value)); }
  public delete(id: string): void {
    this.get(id);
    this.commit(this.replace(this.roots, id, []));
  }

  public addTo(containerId: string, id: string): void {
    this.container(containerId);
    const shape = this.get(id);
    if ([...shape.walk()].some(node => node.id === containerId)) {
      throw new Error(`cannot move a container into itself or its descendant: ${id}`);
    }
    const detached = this.replace(this.roots, id, []);
    const container = this.findIn(detached, containerId)!;
    this.commit(this.replace(detached, containerId, [container.withChildren([...container.children, shape])]));
  }

  /** Preserve original preorder, not argument order; insert at the first selected branch. */
  public group(newId: string, ids: readonly string[]): void {
    new Group(newId); // Validate even before selecting nodes.
    if (this.find(newId)) { throw new Error(`id already exists: ${newId}`); }
    if (ids.length === 0) { throw new Error('group requires at least one shape'); }
    const selected = new Set(ids);
    if (selected.size !== ids.length) { throw new Error('group contains duplicate ids'); }
    for (const id of ids) {
      const shape = this.get(id);
      if ([...shape.walk()].some(node => node.id !== id && selected.has(node.id))) {
        throw new Error(`cannot group a container into its own descendant: ${id}`);
      }
    }
    const ordered = [...this.walk()].filter(shape => selected.has(shape.id));
    const paths = ids.map(id => this.ancestors(id));
    const commonPath = paths[0]!.filter(id => paths.every(path => path.includes(id)));
    const parentId = commonPath.at(-1);
    const siblings = parentId === undefined ? this.roots : this.get(parentId).children;
    const index = siblings.findIndex(shape => [...shape.walk()].some(node => selected.has(node.id)));
    let candidate = this.roots;
    for (const id of ids) { candidate = this.replace(candidate, id, []); }
    const remaining = parentId === undefined ? candidate : this.findIn(candidate, parentId)!.children;
    const children = [...remaining];
    children.splice(index, 0, new Group(newId, ordered));
    this.commit(parentId === undefined ? children : this.replace(candidate, parentId, [this.findIn(candidate, parentId)!.withChildren(children)]));
  }

  public ungroup(id: string): void {
    const group = this.container(id);
    if (this.parentOf(id) === null) { throw new Error(`cannot ungroup top-level container: ${id}`); }
    this.commit(this.replace(this.roots, id, group.children));
  }

  /** SVG paints later siblings on top. */
  public front(id: string): void { this.reorder(id, true); }
  public back(id: string): void { this.reorder(id, false); }
  public clone(): SvgDocument { return new SvgDocument(this.width, this.height, this.roots.map(shape => shape.clone())); }

  private container(id: string): Shape {
    const shape = this.find(id);
    if (!shape) { throw new Error(`no such container: ${id}`); }
    if (!shape.isContainer) { throw new Error(`not a container: ${id}`); }
    return shape;
  }
  private ancestors(id: string): string[] {
    const ancestors: string[] = [];
    let parent = this.parentOf(id);
    while (parent !== null) {
      ancestors.unshift(parent.id);
      parent = this.parentOf(parent.id);
    }
    return ancestors;
  }
  private reorder(id: string, toFront: boolean): void {
    const shape = this.get(id);
    const parent = this.parentOf(id);
    const siblings = (parent?.children ?? this.roots).filter(child => child.id !== id);
    if (toFront) { siblings.push(shape); } else { siblings.unshift(shape); }
    this.commit(parent === null ? siblings : this.replace(this.roots, parent.id, [parent.withChildren(siblings)]));
  }
  private update(id: string, edit: (shape: Shape) => Shape): void {
    const updated = edit(this.get(id));
    this.commit(this.replace(this.roots, id, [updated]));
  }
  private findIn(roots: readonly Shape[], id: string): Shape | undefined {
    for (const root of roots) {
      for (const shape of root.walk()) {
        if (shape.id === id) { return shape; }
      }
    }
    return undefined;
  }
  private replace(roots: readonly Shape[], id: string, replacement: readonly Shape[]): readonly Shape[] {
    return roots.flatMap(shape => shape.id === id
      ? [...replacement]
      : [shape.isContainer ? shape.withChildren(this.replace(shape.children, id, replacement)) : shape]);
  }
  private commit(roots: readonly Shape[]): void {
    const ids = new Set<string>();
    for (const root of roots) {
      for (const shape of root.walk()) {
        if (ids.has(shape.id)) { throw new Error(`id already exists: ${shape.id}`); }
        ids.add(shape.id);
      }
    }
    this.roots = Object.freeze([...roots]);
  }
}
