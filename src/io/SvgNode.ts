/** XML transport node, independent of the domain model. */
export class SvgNode {
  private readonly nodes: SvgNode[] = [];
  private content = '';
  public constructor(public readonly name: string, public readonly attributes: Readonly<Record<string, string>>) {}
  public get children(): readonly SvgNode[] { return this.nodes; }
  public get text(): string { return this.content; }
  public add(child: SvgNode): void { this.nodes.push(child); }
  public append(text: string): void { this.content += text; }
  public *walk(): IterableIterator<SvgNode> {
    yield this;
    for (const child of this.nodes) { yield* child.walk(); }
  }
}
