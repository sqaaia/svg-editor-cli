import type { SvgDocument } from '../model/SvgDocument.js';
import type { HistoryResult } from './HistoryResult.js';
import type { UndoableEdit } from './UndoableEdit.js';

export class CommandHistory {
  private readonly undoStack: UndoableEdit[] = [];
  private readonly redoStack: UndoableEdit[] = [];
  private blocked = true;

  public reset(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blocked = true;
  }

  public execute(document: SvgDocument, command: UndoableEdit, args: readonly string[]): HistoryResult {
    const candidate = command.apply(document, args);
    const message = command.message;
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blocked = false;
    return { document: candidate, message };
  }

  public undo(): HistoryResult {
    this.checkBarrier();
    const command = this.undoStack.at(-1);
    if (command === undefined) { throw new Error('nothing to undo'); }
    const document = command.undo();
    const message = command.undoMessage;
    this.undoStack.pop();
    this.redoStack.push(command);
    return { document, message };
  }

  public redo(): HistoryResult {
    this.checkBarrier();
    const command = this.redoStack.at(-1);
    if (command === undefined) { throw new Error('nothing to redo'); }
    const document = command.redo();
    const message = command.redoMessage;
    this.redoStack.pop();
    this.undoStack.push(command);
    return { document, message };
  }

  private checkBarrier(): void {
    if (this.blocked) { throw new Error('undo not allowed after io command'); }
  }
}
