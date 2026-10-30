import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EditorSession } from '../dist/application/EditorSession.js';
import { CommandDispatcher } from '../dist/commands/CommandDispatcher.js';
import { EditCommand } from '../dist/commands/EditCommand.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';
import { CreateCommand } from '../dist/commands/CreateCommand.js';
import { InitCommand } from '../dist/commands/InitCommand.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { DeleteCommand } from '../dist/commands/DeleteCommand.js';
import { ScaleCommand } from '../dist/commands/ScaleCommand.js';
import { SetCommand } from '../dist/commands/SetCommand.js';
import { GroupCommand } from '../dist/commands/GroupCommand.js';
import { UngroupCommand } from '../dist/commands/UngroupCommand.js';
import { AddToCommand } from '../dist/commands/AddToCommand.js';
import { FrontCommand } from '../dist/commands/FrontCommand.js';
import { BackCommand } from '../dist/commands/BackCommand.js';
import { UndoCommand } from '../dist/commands/UndoCommand.js';
import { RedoCommand } from '../dist/commands/RedoCommand.js';
import { CanvasCommand } from '../dist/commands/CanvasCommand.js';
import { ShowCommand } from '../dist/commands/ShowCommand.js';
import { TreeCommand } from '../dist/commands/TreeCommand.js';
import { HelpCommand } from '../dist/commands/HelpCommand.js';

function editor() {
  const session = new EditorSession();
  const dispatcher = new CommandDispatcher();
  const commands = {
    init: InitCommand, move: MoveCommand, delete: DeleteCommand, scale: ScaleCommand,
    set: SetCommand, group: GroupCommand, ungroup: UngroupCommand, addto: AddToCommand,
    front: FrontCommand, back: BackCommand, undo: UndoCommand, redo: RedoCommand,
    canvas: CanvasCommand, show: ShowCommand, tree: TreeCommand, help: HelpCommand,
  };
  for (const [name, Class] of Object.entries(commands)) {
    dispatcher.register(name, () => new Class(session));
  }
  dispatcher.register('create', () => new CreateCommand(session, new ShapeFactory()));
  return { session, run: (...args) => dispatcher.dispatch(args) };
}

function snapshot(session) {
  const document = session.document;
  return {
    width: document.width, height: document.height,
    nodes: [...document.walk()].map(shape => ({
      id: shape.id, type: shape.type, class: shape.constructor.name,
      parent: document.parentOf(shape.id)?.id ?? null,
      attributes: shape.attributes, text: shape.textContent,
      children: shape.children.map(child => child.id),
    })),
  };
}

function fixture() {
  const result = editor();
  const { run } = result;
  run('init');
  run('create', 'g', 'scene');
  run('create', 'rect', 'r', '10', '20', '30', '40', 'red', 'in', 'scene');
  run('create', 'circle', 'c', '50', '60', '5', 'in', 'scene');
  run('create', 'g', 'inner', 'in', 'scene');
  run('create', 'text', 't', '1', '2', '原文', 'in', 'inner');
  run('create', 'ellipse', 'e', '5', '6', '7', '8', 'in', 'inner');
  run('create', 'g', 'other');
  run('create', 'line', 'l', '0', '0', '1', '2', 'black');
  return result;
}

const editCases = [
  [['create', 'text', 'new', '3', '4', 'new text', 'in', 'inner'], doc => assert.equal(doc.parentOf('new').id, 'inner')],
  [['move', 'scene', '1.5', '-2'], doc => assert.equal(doc.get('t').attributes.x, 2.5)],
  [['scale', 'scene', '1.1'], doc => assert.equal(doc.get('r').attributes.width, 33)],
  [['set', 't', 'text', '更新内容'], doc => assert.equal(doc.get('t').textContent, '更新内容')],
  [['group', 'pair', 'c', 'r'], doc => assert.deepEqual(doc.get('pair').children.map(s => s.id), ['r', 'c'])],
  [['ungroup', 'inner'], doc => assert.deepEqual(doc.get('scene').children.map(s => s.id), ['r', 'c', 't', 'e'])],
  [['addto', 'other', 'r'], doc => assert.equal(doc.parentOf('r').id, 'other')],
  [['delete', 'inner'], doc => assert.equal(doc.find('t'), undefined)],
  [['front', 'r'], doc => assert.deepEqual(doc.get('scene').children.map(s => s.id), ['c', 'inner', 'r'])],
  [['back', 'inner'], doc => assert.deepEqual(doc.get('scene').children.map(s => s.id), ['inner', 'r', 'c'])],
];

for (const [args, verify] of editCases) {
  test(`${args[0]} is one complete undo unit and redo restores identical state`, () => {
    const { session, run } = fixture();
    const before = snapshot(session);
    const message = run(...args);
    verify(session.document);
    const after = snapshot(session);
    assert.notDeepEqual(after, before);
    for (let cycle = 0; cycle < 3; cycle++) {
      assert.equal(typeof run('undo'), 'string');
      assert.deepEqual(snapshot(session), before);
      assert.equal(run('redo'), message);
      assert.deepEqual(snapshot(session), after);
    }
  });
}

test('undo and redo follow stack order across dependent group, move and delete edits', () => {
  const { session, run } = fixture();
  const states = [snapshot(session)];
  for (const args of [['group', 'pair', 'r', 'c'], ['move', 'pair', '10', '20'], ['delete', 'pair']]) {
    run(...args);
    states.push(snapshot(session));
  }
  for (let index = 2; index >= 0; index--) {
    run('undo');
    assert.deepEqual(snapshot(session), states[index]);
  }
  for (let index = 1; index <= 3; index++) {
    run('redo');
    assert.deepEqual(snapshot(session), states[index]);
  }
  assert.throws(() => run('redo'), /nothing to redo/);
});

test('cross-parent group undo restores every original parent and sibling index', () => {
  const { session, run } = fixture();
  const before = snapshot(session);
  run('group', 'cross', 'e', 'r', 't');
  assert.equal(session.document.parentOf('cross').id, 'scene');
  assert.deepEqual(session.document.get('cross').children.map(s => s.id), ['r', 't', 'e']);
  const after = snapshot(session);
  run('undo');
  assert.deepEqual(snapshot(session), before);
  run('redo');
  assert.deepEqual(snapshot(session), after);
});

const invalidEdits = [
  ['create', 'g', 'scene'], ['create', 'g', 'new', 'in', 'missing'],
  ['delete', 'missing'], ['move', 'r', 'NaN', '1'], ['scale', 'r', '0'],
  ['set', 'r', 'width', '-1'], ['set', 'r', 'id', 'new'],
  ['group', 'bad', 'scene', 'r'], ['ungroup', 'scene'], ['addto', 'inner', 'scene'],
  ['front', 'missing'], ['back', 'missing'],
];

for (const args of invalidEdits) {
  test(`failed ${args.join(' ')} preserves both the document and existing redo`, () => {
    const { session, run } = fixture();
    run('move', 'r', '7', '8');
    const after = snapshot(session);
    run('undo');
    const before = snapshot(session);
    const document = session.document;
    assert.throws(() => run(...args));
    assert.equal(session.document, document);
    assert.deepEqual(snapshot(session), before);
    run('redo');
    assert.deepEqual(snapshot(session), after);
    run('undo');
    assert.deepEqual(snapshot(session), before);
    run('undo'); // Failure did not add a history entry: this removes the last fixture creation.
    assert.equal(session.document.find('l'), undefined);
  });
}

test('a new successful edit after undo clears the entire redo branch', () => {
  const { session, run } = fixture();
  run('move', 'r', '1', '2');
  run('scale', 'r', '2');
  run('undo');
  run('undo');
  run('set', 'r', 'fill', 'blue');
  assert.throws(() => run('redo'), /nothing to redo/);
  assert.equal(session.document.get('r').attributes.x, 10);
  run('undo');
  assert.equal(session.document.get('r').attributes.fill, 'red');
  run('redo');
  assert.equal(session.document.get('r').attributes.fill, 'blue');
});

test('even a successful zero-distance move is an edit unit and clears redo', () => {
  const { run } = fixture();
  run('set', 'r', 'fill', 'blue');
  run('undo');
  run('move', 'r', '0', '0');
  assert.throws(() => run('redo'), /nothing to redo/);
  assert.match(run('undo'), /rect#r moved back to \(10,20\)/);
});

test('tree, show, help and canvas queries neither enter history nor discard redo', () => {
  const { session, run } = fixture();
  run('move', 'r', '1', '2');
  const after = snapshot(session);
  run('undo');
  const document = session.document;
  for (const args of [['tree'], ['tree', 'inner'], ['show', 'r'], ['help'], ['canvas']]) {
    run(...args);
    assert.equal(session.document, document);
  }
  assert.throws(() => run('show', 'missing'), /no such shape/);
  assert.throws(() => run('undo', 'extra'), /usage: undo/);
  assert.throws(() => run('redo', 'extra'), /usage: redo/);
  run('redo');
  assert.deepEqual(snapshot(session), after);
  run('tree');
  run('undo');
  assert.equal(session.document.get('r').attributes.x, 10);
});

for (const args of [['init'], ['canvas', '640', '480'], ['canvas', '800', '600']]) {
  test(`${args.join(' ')} clears both stacks and locks history until a successful edit`, () => {
    const { session, run } = fixture();
    run('move', 'r', '1', '2');
    run('undo');
    run(...args);
    const baseline = snapshot(session);
    for (const history of ['undo', 'redo']) {
      assert.throws(() => run(history), { message: 'undo not allowed after io command' });
    }
    assert.throws(() => run('create', 'circle', 'invalid', '0', '0', '-1'));
    assert.throws(() => run('undo'), /undo not allowed after io command/);
    run('create', 'g', 'fresh');
    run('undo');
    assert.deepEqual(snapshot(session), baseline);
    assert.throws(() => run('undo'), /nothing to undo/);
    run('redo');
    assert.ok(session.document.find('fresh'));
    assert.throws(() => run('redo'), /nothing to redo/);
  });
}

test('invalid init and canvas updates preserve the document and redo history', () => {
  const { session, run } = fixture();
  run('move', 'r', '1', '2');
  const after = snapshot(session);
  run('undo');
  const document = session.document;
  for (const args of [['init', '0'], ['init', 'NaN'], ['canvas', '200', '-1'], ['canvas', 'Infinity'], ['canvas', '1', '2', '3']]) {
    assert.throws(() => run(...args));
    assert.equal(session.document, document);
  }
  run('redo');
  assert.deepEqual(snapshot(session), after);
});

test('canvas accepts optional height, retains shapes, and never changes shape coordinates', () => {
  const { session, run } = fixture();
  const nodes = snapshot(session).nodes;
  assert.equal(run('canvas'), 'canvas 800x600');
  assert.equal(run('canvas', '400.5'), 'canvas resized to 400.5x600');
  assert.equal(run('canvas', '300', '200'), 'canvas resized to 300x200');
  assert.deepEqual(snapshot(session).nodes, nodes);
});

test('unset attributes are truly absent again after undo, including group styles', () => {
  const { session, run } = fixture();
  run('set', 'scene', 'fill', 'blue');
  assert.equal(session.document.get('scene').attributes.fill, 'blue');
  assert.equal(session.document.get('r').attributes.fill, 'red');
  assert.equal(run('undo'), 'g#scene updated: fill=(unset)');
  assert.equal(Object.hasOwn(session.document.get('scene').attributes, 'fill'), false);
  run('redo');
  run('set', 'c', 'stroke-width', '2.5');
  assert.equal(session.document.get('c').attributes['stroke-width'], 2.5);
  run('undo');
  assert.equal(Object.hasOwn(session.document.get('c').attributes, 'stroke-width'), false);
});

test('show reports parent, geometry, styles, text and empty containers without type dispatch', () => {
  const { run } = fixture();
  assert.equal(run('show', 'r'), 'rect#r  parent=g#scene\n  x=10 y=20 width=30 height=40\n  fill=red');
  assert.equal(run('show', 'other'), 'g#other  parent=svg');
  run('set', 't', 'text', 'line 1\n"line 2"');
  assert.equal(run('show', 't'), 'text#t  parent=g#inner\n  x=1 y=2\n  text="line 1\\n\\"line 2\\""');
  run('set', 'scene', 'fill', 'rgb(1, 2, 3)');
  assert.equal(run('show', 'scene'), 'g#scene  parent=svg\n  fill="rgb(1, 2, 3)"');
});

test('all new commands validate arity and require a document without damaging history', () => {
  const { run, session } = fixture();
  run('move', 'r', '1', '2');
  run('undo');
  const before = snapshot(session);
  for (const args of [
    ['delete'], ['delete', 'r', 'c'], ['scale', 'r'], ['scale', 'r', '2', '3'],
    ['set', 'r', 'fill'], ['set', 'r', 'fill', 'blue', 'extra'], ['group', 'pair'],
    ['ungroup'], ['ungroup', 'inner', 'other'], ['addto', 'other'], ['addto', 'other', 'r', 'c'],
    ['front'], ['front', 'r', 'c'], ['back'], ['back', 'r', 'c'],
    ['show'], ['show', 'r', 'c'], ['undo', 'extra'], ['redo', 'extra'],
  ]) {
    assert.throws(() => run(...args), /usage:/);
    assert.deepEqual(snapshot(session), before);
  }
  run('redo');
  assert.equal(session.document.get('r').attributes.x, 11);
  const empty = editor();
  for (const name of ['delete', 'scale', 'set', 'group', 'ungroup', 'addto', 'front', 'back', 'show', 'canvas', 'undo', 'redo']) {
    assert.throws(() => empty.run(name), { message: "no document. use 'init' or 'read' first" });
  }
});

test('failure after a partial candidate edit still preserves document and history', () => {
  class FailingEdit extends EditCommand {
    edit(document) {
      document.move('r', 100, 200);
      document.delete('inner');
      throw new Error('simulated failure after several mutations');
    }
  }
  const { session, run } = fixture();
  run('move', 'r', '1', '2');
  const after = snapshot(session);
  run('undo');
  const document = session.document;
  const before = snapshot(session);
  assert.throws(() => new FailingEdit(session).execute([]), /simulated failure/);
  assert.equal(session.document, document);
  assert.deepEqual(snapshot(session), before);
  run('redo');
  assert.deepEqual(snapshot(session), after);
});

test('command snapshots remain isolated from callers and a recorded instance cannot be reused', () => {
  const { session, run } = fixture();
  const command = new MoveCommand(session);
  for (const operation of [() => command.undo(), () => command.redo(), () => command.message, () => command.undoMessage]) {
    assert.throws(operation, /not executed/);
  }
  const before = snapshot(session);
  command.execute(['r', '1', '2']);
  const after = snapshot(session);
  command.undo().delete('scene');
  command.redo().move('r', 999, 999);
  assert.throws(() => command.execute(['r', '3', '4']), /already executed/);
  assert.deepEqual(snapshot(session), after);
  run('undo');
  assert.deepEqual(snapshot(session), before);
  run('redo');
  assert.deepEqual(snapshot(session), after);
});

test('empty-stack errors leave the available opposite operation intact', () => {
  const { run, session } = editor();
  run('init');
  run('create', 'g', 'g');
  assert.throws(() => run('redo'), /nothing to redo/);
  run('undo');
  assert.equal(session.document.size, 0);
  assert.throws(() => run('undo'), /nothing to undo/);
  run('redo');
  assert.equal(session.document.size, 1);
});

function runCli(input) {
  const result = spawnSync(process.execPath, ['dist/Main.js'], {
    cwd: new URL('..', import.meta.url), input, encoding: 'utf8', timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  return result;
}

test('milestone 4 replay wires every edit command and preserves the final tree', () => {
  const result = runCli(readFileSync(new URL('../examples/milestone4.commands', import.meta.url), 'utf8'));
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /g#nodes moved back by \(-20,-30\)/);
  assert.match(result.stdout, /text#t updated: text="原文"/);
  assert.match(result.stdout, /g#nodes restored into g#scene/);
  assert.ok(result.stdout.endsWith([
    'text#t  parent=g#spare', '  x=21 y=32', '  text="更新内容"', 'canvas 800x600',
    'svg (800x600)', '└── g#scene', '    ├── g#spare', '    │   └── text#t (21,32) "更新内容"',
    '    ├── rect#r x=30 y=50 w=100 h=50 fill=red', '    └── circle#c cx=120 cy=130 r=20', '',
  ].join('\n')));
});

test('real CLI reports barriers and empty stacks, and continues after failed edits', () => {
  const result = runCli([
    'init', 'undo', 'redo', 'create circle c 100 100 20', 'move c 30 0', 'undo',
    'scale c 0', 'redo', 'canvas 400 300', 'undo', 'create g x', 'undo', 'undo', 'redo', 'redo', 'tree', '',
  ].join('\n'));
  assert.equal(result.stderr, [
    'error: undo not allowed after io command', 'error: undo not allowed after io command',
    'error: scale factor must be positive', 'error: undo not allowed after io command',
    'error: nothing to undo', 'error: nothing to redo', '',
  ].join('\n'));
  assert.match(result.stdout, /circle#c moved back to \(100,100\)/);
  assert.ok(result.stdout.endsWith('svg (400x300)\n├── circle#c cx=130 cy=100 r=20\n└── g#x\n'));
});
