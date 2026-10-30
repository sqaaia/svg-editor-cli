import type { SvgDocument } from '../model/SvgDocument.js';

/** Result passed from history to the session; not a mutable domain model. */
export interface HistoryResult {
  readonly document: SvgDocument;
  readonly message: string;
}
