import { SvgDocument } from '../model/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { UndoableEdit } from './UndoableEdit.js';
import type { DocumentStore } from './DocumentStore.js';

/** Owns the current document and history, publishing only successfully completed operations. */
export class EditorSession {
  private current: SvgDocument | undefined;
  private readonly history = new CommandHistory();
  private path: string | undefined;
  public constructor(private readonly store?: DocumentStore) {}
  public get filePath(): string | undefined { return this.path; }

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
    this.path = undefined;
    return document;
  }

  public read(path: string): string {
    if (!this.store) { throw new Error('document storage not configured'); }
    const loaded = this.store.read(path);
    this.current = loaded.document;
    this.path = path;
    this.history.reset();
    return [...loaded.warnings, `read ${path} (${loaded.document.size} elements)`].join('\n');
  }

  public save(path = this.path): string {
    const document = this.document;
    if (path === undefined) { throw new Error("no file path. use 'save <file.svg>'"); }
    if (!this.store) { throw new Error('document storage not configured'); }
    this.store.write(path, document);
    this.path = path;
    this.history.reset();
    return `saved to ${path} (${document.size} elements)`;
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
