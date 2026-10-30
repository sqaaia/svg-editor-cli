import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, readdirSync, statSync, chmodSync } from 'node:fs';
import { join, dirname, basename, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { SvgCodec } from '../dist/io/SvgCodec.js';
import { SvgFileStore } from '../dist/io/SvgFileStore.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const assignment = readFileSync(join(root, 'phase_cli_1.md'), 'utf8');

function blocks(text, language) {
  return [...text.matchAll(new RegExp('```' + language + '\\n([\\s\\S]+?)```', 'g'))].map(match => match[1]);
}
function replay(t, transcript, inputs = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'svg-final-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  for (const [name, content] of Object.entries(inputs)) { writeFileSync(join(directory, name), content); }
  const lines = transcript.trim().split('\n');
  const input = lines.filter(line => line.startsWith('svg> ')).map(line => line.slice(5)).join('\n') + '\n';
  const expected = lines.filter(line => line !== '' && !line.startsWith('svg> ') && !line.startsWith('$ ') && !line.startsWith('#') && !line.startsWith('svg-editor '));
  const result = spawnSync(process.execPath, [join(root, 'dist/Main.js')], { cwd: directory, input, encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  const normalize = value => value.replace(/(#[^ ]+) {2,}/gu, '$1 ').trimEnd();
  assert.equal(normalize(result.stdout), normalize(expected.filter(line => !line.startsWith('error:')).join('\n')));
  assert.equal(result.stderr.trimEnd(), expected.filter(line => line.startsWith('error:')).join('\n'));
  return directory;
}

test('assignment section 6 transcript matches output, errors and saved element count', t => {
  const section = assignment.slice(assignment.indexOf('## 6. '), assignment.indexOf('### 6.1'));
  const directory = replay(t, blocks(section, 'text')[0], { 'other.svg': blocks(section, 'xml')[0] });
  const saved = new SvgCodec().decode(readFileSync(join(directory, 'demo.svg'), 'utf8')).document;
  assert.equal(saved.size, 5);
  assert.equal(saved.get('c1').attributes.cx, 130);
  assert.equal(saved.get('title').textContent, 'My Diagram');
  assert.equal(saved.parentOf('box').id, 'markers');
});

test('assignment section 6.1 version A transcript matches output and saved structure', t => {
  const section = assignment.slice(assignment.indexOf('### 6.1'), assignment.indexOf('**版本 B'));
  // The sample omits the explicit stroke in its tree, although its create command sets it.
  const transcript = blocks(section, 'text').find(block => block.includes('svg> init'))
    .replace(/(line#arrow1 +\(280,130\) -> \(520,130\))/u, '$1 stroke=black');
  const directory = replay(t, transcript);
  const saved = new SvgCodec().decode(readFileSync(join(directory, 'flowchart.svg'), 'utf8')).document;
  assert.equal(saved.size, 8);
  assert.equal(saved.get('process').attributes.y, 100);
  assert.equal(saved.get('process-label').textContent, '处理数据 v2');
});

test('atomic save preserves an existing file permission mode', t => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-mode-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const path = join(directory, 'private.svg');
  writeFileSync(path, 'old');
  chmodSync(path, 0o600);
  new SvgFileStore().write(path, new SvgCodec().decode('<svg/>').document);
  assert.equal(statSync(path).mode & 0o777, 0o600);
  assert.equal(new SvgFileStore().read(path).document.size, 0);
});

function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sources(join(directory, entry.name)) : entry.name.endsWith('.ts') ? [join(directory, entry.name)] : []);
}

test('architecture: module boundaries, single class files and dependency graph remain consistent', () => {
  const files = sources(join(root, 'src'));
  const allowed = {
    model: new Set(['model']), application: new Set(['application', 'model']),
    commands: new Set(['commands', 'application', 'model']), cli: new Set(['cli', 'commands']),
    io: new Set(['io', 'application', 'model']),
  };
  const graph = new Map();
  for (const file of files) {
    const module = relative(join(root, 'src'), file).split('/')[0];
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const classes = source.statements.filter(ts.isClassDeclaration);
    assert.ok(classes.length <= 1, file);
    if (classes.length) { assert.equal(classes[0].name.text, basename(file, '.ts')); }
    assert.equal(source.statements.some(ts.isFunctionDeclaration), false, file);
    const dependencies = [];
    for (const node of source.statements.filter(ts.isImportDeclaration)) {
      const name = node.moduleSpecifier.text;
      if (!name.startsWith('.')) {
        assert.ok(module === 'cli' || module === 'io', `${module} must not import ${name}`);
        continue;
      }
      const target = resolve(dirname(file), name.replace(/\.js$/u, '.ts'));
      assert.ok(files.includes(target), `unresolved ${name}`);
      dependencies.push(target);
      if (module !== 'Main.ts') {
        const targetModule = relative(join(root, 'src'), target).split('/')[0];
        assert.ok(allowed[module].has(targetModule), `${module} -> ${targetModule}`);
      }
    }
    graph.set(file, dependencies);
  }
  const visiting = new Set();
  const visited = new Set();
  function visit(file) {
    assert.equal(visiting.has(file), false, `dependency cycle at ${file}`);
    if (visited.has(file)) { return; }
    visiting.add(file);
    for (const target of graph.get(file)) { visit(target); }
    visiting.delete(file);
    visited.add(file);
  }
  for (const file of files) { visit(file); }
});

test('composition root registers exactly the 19 required commands', () => {
  const source = readFileSync(join(root, 'src/Main.ts'), 'utf8');
  const registered = [...source.matchAll(/dispatcher\.register\('([^']+)'/gu)].map(match => match[1]).sort();
  assert.deepEqual(registered, ['init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group', 'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'help', 'undo', 'redo'].sort());
});
