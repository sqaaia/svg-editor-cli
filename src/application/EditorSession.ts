import { SvgDocument } from '../model/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { UndoableEdit } from './UndoableEdit.js';

/** Owns the current document and history, publishing only successfully completed operations. */
export class EditorSession {
  private current: SvgDocument | undefined;
  private readonly history = new CommandHistory();

  public get document(): SvgDocument {
    if (this.current === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.current;
  }

  public initialize(width = 800, height = 600): SvgDocument {
    const document = new SvgDocument(width, height);
    this.history.reset();
    this.current = document;
    return document;
  }

  public resize(width: number, height: number): SvgDocument {
    const document = this.document.clone();
    document.resize(width, height);
    this.history.reset();
    this.current = document;
    return document;
  }

  public executeEdit(command: UndoableEdit, args: readonly string[]): string {
    const result = this.history.execute(this.document, command, args);
    this.current = result.document;
    return result.message;
  }

  public undo(): string {
    this.document; // No-document errors precede history errors.
    const result = this.history.undo();
    this.current = result.document;
    return result.message;
  }

  public redo(): string {
    this.document;
    const result = this.history.redo();
    this.current = result.document;
    return result.message;
  }
}
