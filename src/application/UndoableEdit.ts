import type { SvgDocument } from '../model/SvgDocument.js';

/** Application-owned port; history does not import concrete command classes. */
export interface UndoableEdit {
  apply(document: SvgDocument, args: readonly string[]): SvgDocument;
  undo(): SvgDocument;
  redo(): SvgDocument;
  readonly message: string;
  readonly undoMessage: string;
  readonly redoMessage: string;
}
