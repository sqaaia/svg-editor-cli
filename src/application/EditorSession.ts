import { SvgDocument } from '../model/SvgDocument.js';

/** Shared application state. A failed initialization preserves the current document. */
export class EditorSession {
  private current: SvgDocument | undefined;

  public get document(): SvgDocument {
    if (this.current === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.current;
  }

  public initialize(width = 800, height = 600): SvgDocument {
    const document = new SvgDocument(width, height);
    this.current = document;
    return document;
  }
}
