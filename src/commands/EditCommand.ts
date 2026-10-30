import type { EditorSession } from '../application/EditorSession.js';
import type { UndoableEdit } from '../application/UndoableEdit.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { Command } from './Command.js';

/** A single-use command owns its before/after snapshots; redo never replays arithmetic. */
export abstract class EditCommand extends Command implements UndoableEdit {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private feedback: string | undefined;
  private reverseFeedback: string | undefined;

  public constructor(private readonly session: EditorSession) { super(); }

  public override execute(args: readonly string[]): string {
    return this.session.executeEdit(this, args);
  }

  public apply(document: SvgDocument, args: readonly string[]): SvgDocument {
    if (this.after !== undefined) { throw new Error('edit command already executed'); }
    const candidate = document.clone();
    const message = this.edit(candidate, args);
    const reverseMessage = this.describeUndo(document, args, message);
    const before = document.clone();
    const after = candidate.clone();
    // Publish command state only after every potentially failing operation succeeds.
    this.before = before;
    this.after = after;
    this.feedback = message;
    this.reverseFeedback = reverseMessage;
    return candidate;
  }

  public get message(): string {
    if (this.feedback === undefined) { throw new Error('edit command not executed'); }
    return this.feedback;
  }
  public get undoMessage(): string {
    if (this.reverseFeedback === undefined) { throw new Error('edit command not executed'); }
    return this.reverseFeedback;
  }
  public get redoMessage(): string { return this.message; }
  public undo(): SvgDocument {
    if (this.before === undefined) { throw new Error('edit command not executed'); }
    return this.before.clone();
  }
  public redo(): SvgDocument {
    if (this.after === undefined) { throw new Error('edit command not executed'); }
    return this.after.clone();
  }

  protected abstract edit(document: SvgDocument, args: readonly string[]): string;
  protected describeUndo(_before: SvgDocument, _args: readonly string[], message: string): string {
    return `undone: ${message}`;
  }
  protected requireArity(args: readonly string[], count: number, usage: string): void {
    if (args.length !== count) { throw new Error(`usage: ${usage}`); }
  }
}
