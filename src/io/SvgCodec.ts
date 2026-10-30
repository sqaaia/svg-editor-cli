import { SaxesParser } from 'saxes';
import type { LoadedSvg } from '../application/LoadedSvg.js';
import { Geometry } from '../model/Geometry.js';
import type { Shape } from '../model/Shape.js';
import { ShapeFactory } from '../model/ShapeFactory.js';
import { SvgDocument } from '../model/SvgDocument.js';
import { SvgNode } from './SvgNode.js';

export class SvgCodec {
  public constructor(private readonly factory = new ShapeFactory()) {}

  public decode(xml: string): LoadedSvg {
    try {
      const root = this.parse(xml);
      if (root.name !== 'svg') { throw new Error('root must be <svg>'); }
      for (const name of Object.keys(root.attributes)) {
        if (!['width', 'height', 'viewBox'].includes(name)) { throw new Error(`unsupported SVG root attribute: ${name}`); }
      }
      if (root.text.trim() !== '') { throw new Error('unexpected text inside <svg>'); }
      const width = Geometry.number(root.attributes.width ?? '800', 'canvas width');
      const height = Geometry.number(root.attributes.height ?? '600', 'canvas height');
      if (root.attributes.viewBox !== undefined) {
        const viewBox = root.attributes.viewBox.trim().split(/[\s,]+/u).map(value => Geometry.number(value, 'viewBox'));
        if (viewBox.length !== 4 || viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height) {
          throw new Error('unsupported viewBox: expected 0 0 width height');
        }
      }
      const ids = new Set<string>();
      for (const node of root.walk()) {
        const id = node.attributes.id;
        if (id !== undefined) {
          if (ids.has(id)) { throw new Error(`id already exists: ${id}`); }
          ids.add(id);
        }
      }
      const warnings: string[] = [];
      const children = root.children.map(node => this.readShape(node, ids, warnings));
      return { document: new SvgDocument(width, height, children), warnings };
    } catch (error: unknown) {
      throw new Error(`invalid SVG: ${error instanceof Error ? error.message : 'parse failed'}`);
    }
  }

  public encode(document: SvgDocument): string {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`];
    for (const shape of document.children) { this.writeShape(shape, '  ', lines); }
    lines.push('</svg>', '');
    const xml = lines.join('\n');
    // Also reject characters that cannot occur in XML 1.0, including direct model input.
    this.parse(xml);
    return xml;
  }

  private parse(xml: string): SvgNode {
    const parser = new SaxesParser({ xmlns: true });
    const stack: SvgNode[] = [];
    let root: SvgNode | undefined;
    parser.on('error', error => { throw error; });
    parser.on('doctype', () => { throw new Error('DOCTYPE is unsupported'); });
    parser.on('processinginstruction', () => { throw new Error('processing instructions are unsupported'); });
    parser.on('opentag', tag => {
      if (tag.uri !== '' && tag.uri !== 'http://www.w3.org/2000/svg') { throw new Error(`unsupported namespace: ${tag.uri}`); }
      if (stack.length >= 128) { throw new Error('SVG nesting exceeds 128 levels'); }
      const attributes: Record<string, string> = Object.create(null) as Record<string, string>;
      for (const attr of Object.values(tag.attributes)) {
        if (attr.uri === 'http://www.w3.org/2000/xmlns/') { continue; }
        if (attr.uri !== '') { throw new Error(`unsupported namespaced attribute: ${attr.name}`); }
        attributes[attr.local] = attr.value;
      }
      const node = new SvgNode(tag.local, attributes);
      const parent = stack.at(-1);
      if (parent === undefined) { root = node; } else { parent.add(node); }
      stack.push(node);
    });
    parser.on('closetag', () => { stack.pop(); });
    parser.on('text', text => { stack.at(-1)?.append(text); });
    parser.on('cdata', text => { stack.at(-1)?.append(text); });
    parser.write(xml).close();
    if (root === undefined) { throw new Error('missing SVG root'); }
    return root;
  }

  private readShape(node: SvgNode, ids: Set<string>, warnings: string[]): Shape {
    let id = node.attributes.id;
    if (id === undefined) {
      let sequence = 1;
      while (ids.has(`${node.name}${sequence}`)) { sequence++; }
      id = `${node.name}${sequence}`;
      ids.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${node.name}>`);
    }
    const shape = this.factory.fromSvg(node.name, id, node.attributes, node.text);
    if (node.children.length !== 0 && !shape.isContainer) { throw new Error(`unexpected child element inside <${node.name}>`); }
    return shape.isContainer ? shape.withChildren(node.children.map(child => this.readShape(child, ids, warnings))) : shape;
  }

  private writeShape(shape: Shape, indent: string, lines: string[]): void {
    const attributes = [['id', shape.id], ...Object.entries(shape.attributes)]
      .map(([name, value]) => `${name}="${this.escape(String(value))}"`).join(' ');
    if (shape.isContainer) {
      lines.push(`${indent}<${shape.type} ${attributes}>`);
      for (const child of shape.children) { this.writeShape(child, `${indent}  `, lines); }
      lines.push(`${indent}</${shape.type}>`);
    } else if (shape.textContent !== undefined) {
      lines.push(`${indent}<${shape.type} ${attributes}>${this.escape(shape.textContent)}</${shape.type}>`);
    } else {
      lines.push(`${indent}<${shape.type} ${attributes}/>`);
    }
  }
  private escape(value: string): string {
    return value.replace(/&/gu, '&amp;').replace(/</gu, '&lt;').replace(/>/gu, '&gt;')
      .replace(/"/gu, '&quot;').replace(/\r/gu, '&#13;').replace(/\n/gu, '&#10;').replace(/\t/gu, '&#9;');
  }
}
