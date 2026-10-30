import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { SvgCodec } from '../dist/io/SvgCodec.js';
import { SvgFileStore } from '../dist/io/SvgFileStore.js';
import { EditorSession } from '../dist/application/EditorSession.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';
import { CreateCommand } from '../dist/commands/CreateCommand.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { ReadCommand } from '../dist/commands/ReadCommand.js';
import { SaveCommand } from '../dist/commands/SaveCommand.js';
import { TreeFormatter } from '../dist/commands/TreeFormatter.js';

const codec = new SvgCodec();
const source = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <g id="scene" fill="blue" stroke-width="1.5">
    <rect id="r" x="1.5" y="-2" width="30" height="40" fill="red"/>
    <circle id="c" cx="10" cy="20" r="5"/>
    <ellipse id="e" cx="1" cy="2" rx="3" ry="4"/>
    <line id="l" x1="1" y1="2" x2="3" y2="4" stroke="black"/>
    <g id="nested"><text id="t" x="5" y="6">中文 &amp; &lt;&quot;标题&quot;&gt;&#13;&#10;&#9;</text></g>
  </g>
</svg>`;

function snapshot(document) {
  return { width: document.width, height: document.height, nodes: [...document.walk()].map(shape => ({
    class: shape.constructor.name, id: shape.id, attributes: shape.attributes,
    text: shape.textContent, children: shape.children.map(child => child.id),
  })) };
}

test('all six types round-trip with geometry, nesting, order, missing styles and text escaping', () => {
  const original = codec.decode(source).document;
  assert.equal(original.size, 7);
  const xml = codec.encode(original);
  assert.match(xml, /viewBox="0 0 400 300"/);
  assert.match(xml, /&amp; &lt;&quot;标题&quot;&gt;&#13;&#10;&#9;/);
  assert.deepEqual(snapshot(codec.decode(xml).document), snapshot(original));
  assert.equal(Object.hasOwn(original.get('c').attributes, 'fill'), false);
});

test('missing IDs avoid explicit IDs anywhere in the file and warn in preorder', () => {
  const loaded = codec.decode('<svg><rect/><g><rect/><circle/></g><rect id="rect1"/><g id="g1"/></svg>');
  assert.deepEqual([...loaded.document.walk()].map(shape => shape.id), ['rect2', 'g2', 'rect3', 'circle1', 'rect1', 'g1']);
  assert.deepEqual(loaded.warnings, [
    'warning: assigned id rect2 to unnamed <rect>', 'warning: assigned id g2 to unnamed <g>',
    'warning: assigned id rect3 to unnamed <rect>', 'warning: assigned id circle1 to unnamed <circle>',
  ]);
});

test('namespace prefixes, comments, CDATA, zero defaults and empty text are supported', () => {
  const document = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg"><!--ok--><s:text id="t"><![CDATA[A < B & C]]></s:text><s:rect id="r"/><s:text id="empty"/></s:svg>').document;
  assert.equal(document.get('t').textContent, 'A < B & C');
  assert.deepEqual(document.get('r').attributes, { x: 0, y: 0, width: 0, height: 0 });
  assert.equal(document.get('empty').textContent, '');
  assert.equal(document.width, 800);
});

const invalid = [
  ['', /missing|root/i], ['<svg><g></svg>', /close|unexpected/i],
  ['<svg/><svg/>', /root/i], ['<html/>', /root must/],
  ['<!DOCTYPE svg [<!ENTITY x "value">]><svg/>', /DOCTYPE/],
  ['<?xml-stylesheet href="x"?><svg/>', /processing instructions/],
  ['<svg xmlns="urn:other"/>', /namespace/],
  ['<svg><path id="p"/></svg>', /unknown shape type/],
  ['<svg><rect id="r" transform="translate(1 2)"/></svg>', /unsupported SVG attribute: transform/],
  ['<svg><text id="t" font-size="16">hi</text></svg>', /font-size/],
  ['<svg><g id="g" style="fill:red"/></svg>', /style/],
  ['<svg width="10px"/>', /finite/], ['<svg width="0"/>', /positive/],
  ['<svg viewBox="1 0 800 600"/>', /viewBox/], ['<svg id="root"/>', /root attribute/],
  ['<svg><rect id="r" width="-1"/></svg>', /nonnegative/],
  ['<svg><g id="a"><rect id="a"/></g></svg>', /id already exists/],
  ['<svg><g id=""/></svg>', /id must/], ['<svg><g id="bad id"/></svg>', /id must/],
  ['<svg><text id="t"><g/></text></svg>', /unexpected child/],
  ['<svg><rect id="r">content</rect></svg>', /unexpected text/],
  ['<svg>stray text</svg>', /unexpected text/], ['<svg><text>&unknown;</text></svg>', /entity/],
  ['<svg width="1" width="2"/>', /duplicate/],
  ['<svg><text>\u0001</text></svg>', /character/i],
];
for (const [xml, error] of invalid) {
  test(`invalid or unsupported SVG is rejected: ${xml.slice(0, 65)}`, () => assert.throws(() => codec.decode(xml), error));
}

test('nested input beyond the documented depth limit is rejected', () => {
  assert.throws(() => codec.decode('<svg>' + '<g>'.repeat(128) + '</g>'.repeat(128) + '</svg>'), /128 levels/);
});

function files(t) {
  const directory = mkdtempSync(join(tmpdir(), 'svg-editor-io-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function create(session, ...args) { return new CreateCommand(session, new ShapeFactory()).execute(args); }

test('save, read and default save path update after successful save-as; init clears it', t => {
  const dir = files(t);
  const first = join(dir, 'first.svg');
  const second = join(dir, 'second.svg');
  const session = new EditorSession(new SvgFileStore());
  assert.throws(() => session.save(first), /no document/);
  session.initialize();
  assert.throws(() => session.save(), /no file path/);
  create(session, 'text', 't', '1', '2', 'first');
  assert.equal(session.save(first), `saved to ${first} (1 elements)`);
  assert.equal(session.filePath, first);
  assert.throws(() => session.undo(), /undo not allowed after io command/);
  create(session, 'g', 'g');
  session.save(second);
  create(session, 'g', 'later');
  session.save();
  assert.equal(codec.decode(readFileSync(first, 'utf8')).document.size, 1);
  assert.equal(codec.decode(readFileSync(second, 'utf8')).document.size, 3);
  session.read(first);
  assert.equal(session.document.size, 1);
  assert.equal(session.filePath, first);
  assert.throws(() => session.redo(), /undo not allowed after io command/);
  session.resize(300, 200);
  assert.equal(session.filePath, first);
  session.initialize();
  assert.equal(session.filePath, undefined);
});

test('failed read/save preserve current document, path, both history stacks and existing files', t => {
  const dir = files(t);
  const path = join(dir, 'kept.svg');
  const bad = join(dir, 'bad.svg');
  writeFileSync(bad, '<svg><rect/><path/></svg>');
  const session = new EditorSession(new SvgFileStore());
  session.initialize();
  create(session, 'circle', 'c', '10', '20', '5');
  session.save(path);
  const originalFile = readFileSync(path, 'utf8');
  new MoveCommand(session).execute(['c', '1', '2']);
  session.undo();
  const document = session.document;
  for (const operation of [
    () => session.read(join(dir, 'missing.svg')), () => session.read(bad),
    () => session.save(join(dir, 'missing', 'x.svg')), () => session.save(dir),
  ]) {
    assert.throws(operation);
    assert.equal(session.document, document);
    assert.equal(session.filePath, path);
  }
  session.redo();
  assert.equal(session.document.get('c').attributes.cx, 11);
  session.undo();
  assert.equal(session.document.get('c').attributes.cx, 10);
  assert.throws(() => session.undo(), /nothing to undo/);
  assert.equal(readFileSync(path, 'utf8'), originalFile);
  assert.equal(readdirSync(dir).some(name => name.endsWith('.tmp')), false);
});

test('encoding failure cannot overwrite an existing file or reset redo', t => {
  const dir = files(t);
  const path = join(dir, 'kept.svg');
  writeFileSync(path, 'original');
  const session = new EditorSession(new SvgFileStore());
  session.initialize();
  create(session, 'text', 't', '0', '0', 'invalid\u0001');
  create(session, 'g', 'g');
  session.undo();
  assert.throws(() => session.save(path));
  assert.equal(readFileSync(path, 'utf8'), 'original');
  session.redo();
  assert.ok(session.document.find('g'));
});

test('invalid UTF-8 is rejected instead of silently replacing input bytes', t => {
  const dir = files(t);
  const path = join(dir, 'invalid.svg');
  writeFileSync(path, Buffer.from([0x3c, 0x73, 0x76, 0x67, 0x3e, 0xff]));
  assert.throws(() => new SvgFileStore().read(path), { message: `cannot read file: ${path}` });
});

test('a read-only target is rejected without replacing its contents', t => {
  const dir = files(t);
  const path = join(dir, 'readonly.svg');
  writeFileSync(path, 'original');
  chmodSync(path, 0o444);
  try {
    assert.throws(() => new SvgFileStore().write(path, codec.decode('<svg/>').document), { message: `cannot write file: ${path}` });
    assert.equal(readFileSync(path, 'utf8'), 'original');
  } finally { chmodSync(path, 0o644); }
});

test('read warnings are only returned after a complete successful load; commands validate arity', t => {
  const dir = files(t);
  const path = join(dir, 'input.svg');
  writeFileSync(path, '<svg><rect/></svg>');
  const session = new EditorSession(new SvgFileStore());
  assert.equal(new ReadCommand(session).execute([path]), `warning: assigned id rect1 to unnamed <rect>\nread ${path} (1 elements)`);
  const before = session.document;
  assert.throws(() => new ReadCommand(session).execute([]), /usage: read/);
  assert.throws(() => new ReadCommand(session).execute([path, path]), /usage: read/);
  assert.throws(() => new SaveCommand(session).execute([path, path]), /usage: save/);
  assert.equal(session.document, before);
  create(session, 'g', 'edit');
  session.undo();
  session.read(path);
  assert.throws(() => session.undo(), /undo not allowed after io command/);
  create(session, 'g', 'fresh');
  session.undo();
  assert.throws(() => session.undo(), /nothing to undo/);
});

test('real CLI reads unnamed external SVG, edits, saves, reads back, and enforces IO barriers', t => {
  const dir = files(t);
  const input = join(dir, 'external file.svg');
  const output = join(dir, 'saved file.svg');
  writeFileSync(input, '<svg width="400" height="300"><g id="scene"><rect x="10" y="20" width="30" height="40"/><text id="t" x="1" y="2">A &amp; B</text></g></svg>');
  const result = spawnSync(process.execPath, ['dist/Main.js'], {
    cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 5000,
    input: [`read "${input}"`, 'move scene 5 6', `save "${output}"`, 'undo', 'redo',
      'move rect1 1 1', 'undo', 'save', `read "${output}"`, 'tree', 'read missing.svg', 'tree', ''].join('\n'),
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.equal(result.stderr, 'error: undo not allowed after io command\nerror: undo not allowed after io command\nerror: cannot read file: missing.svg\n');
  assert.match(result.stdout, /warning: assigned id rect1/);
  const expected = 'svg (400x300)\n└── g#scene\n    ├── rect#rect1 x=15 y=26 w=30 h=40\n    └── text#t (6,8) "A & B"';
  assert.equal(result.stdout.split(expected).length, 3);
  assert.equal(new TreeFormatter().format(codec.decode(readFileSync(output, 'utf8')).document), expected);
});
