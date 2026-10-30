import type { SvgDocument } from '../model/SvgDocument.js';
import type { LoadedSvg } from './LoadedSvg.js';

export interface DocumentStore {
  read(path: string): LoadedSvg;
  write(path: string, document: SvgDocument): void;
}
