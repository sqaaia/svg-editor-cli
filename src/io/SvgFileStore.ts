import { readFileSync, writeFileSync, renameSync, rmSync, existsSync, accessSync, statSync, chmodSync, constants } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, basename, join } from 'node:path';
import type { DocumentStore } from '../application/DocumentStore.js';
import type { LoadedSvg } from '../application/LoadedSvg.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SvgCodec } from './SvgCodec.js';

export class SvgFileStore implements DocumentStore {
  public constructor(private readonly codec = new SvgCodec()) {}
  public read(path: string): LoadedSvg {
    let xml: string;
    try { xml = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)); }
    catch { throw new Error(`cannot read file: ${path}`); }
    return this.codec.decode(xml);
  }
  public write(path: string, document: SvgDocument): void {
    const xml = this.codec.encode(document);
    const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
    try {
      let mode: number | undefined;
      if (existsSync(path)) {
        accessSync(path, constants.W_OK);
        mode = statSync(path).mode & 0o777;
      }
      writeFileSync(temporary, xml, { flag: 'wx', ...(mode === undefined ? {} : { mode }) });
      if (mode !== undefined) { chmodSync(temporary, mode); }
      renameSync(temporary, path);
    } catch {
      try { rmSync(temporary, { force: true }); } catch { /* Keep the original write failure. */ }
      throw new Error(`cannot write file: ${path}`);
    }
  }
}
