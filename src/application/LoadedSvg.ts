import type { SvgDocument } from '../model/SvgDocument.js';

export interface LoadedSvg {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}
