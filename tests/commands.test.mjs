import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EditorSession } from '../dist/application/EditorSession.js';
import { Command } from '../dist/commands/Command.js';
import { CommandDispatcher } from '../dist/commands/CommandDispatcher.js';
import { InitCommand } from '../dist/commands/InitCommand.js';
import { CreateCommand } from '../dist/commands/CreateCommand.js';
import { TreeCommand } from '../dist/commands/TreeCommand.js';
import { MoveCommand } from '../dist/commands/MoveCommand.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';

function runCli(input) {
  const result = spawnSync(process.execPath, ['dist/Main.js'], {
    cwd: new URL('..', import.meta.url), input, encoding: 'utf8', timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  return result;
}

function editor() {
  const session = new EditorSession();
  return {
    session,
    init: new InitCommand(session),
    create: { execute: args => new CreateCommand(session, new ShapeFactory()).execute(args) },
    move: { execute: args => new MoveCommand(session).execute(args) },
    tree: new TreeCommand(session),
  };
}

test('init defaults, optional width, explicit dimensions, and reinitialization', () => {
  const { session, init, create, tree } = editor();
  assert.equal(init.execute([]), 'canvas 800x600 created');
  create.execute(['g', 'old']);
  assert.equal(init.execute(['400.5']), 'canvas 400.5x600 created');
  assert.equal(session.document.size, 0);
  assert.equal(tree.execute([]), 'svg (400.5x600)');
  assert.equal(init.execute(['200', '100']), 'canvas 200x100 created');
  assert.equal(init.execute([]), 'canvas 800x600 created');
});

test('failed init preserves the existing document, or leaves the session uninitialized', () => {
  const { session, init, create, tree } = editor();
  assert.throws(() => init.execute(['0']), /canvas dimensions must be positive/);
  assert.throws(() => session.document, /no document/);
  init.execute(['400', '300']);
  create.execute(['g', 'kept']);
  const document = session.document;
  const before = tree.execute([]);
  for (const args of [['-1'], ['400', 'NaN'], ['Infinity'], [''], ['0x10'], ['1', '2', '3']]) {
    assert.throws(() => init.execute(args));
    assert.equal(session.document, document);
    assert.equal(tree.execute([]), before);
  }
});

test('all document-dependent commands reject requests before initialization', () => {
  const { create, tree, move } = editor();
  const error = { message: "no document. use 'init' or 'read' first" };
  assert.throws(() => create.execute(['g', 'scene']), error);
  assert.throws(() => tree.execute([]), error);
  assert.throws(() => move.execute(['scene', '1', '2']), error);
});

const shapeCases = [
  ['rect', ['10', '20', '30', '40', '#eee'], 'x=10 y=20 w=30 h=40 fill=#eee', 'moved to (11.5,18)', 'x=11.5 y=18 w=30 h=40 fill=#eee'],
  ['circle', ['10', '20', '5', 'red'], 'cx=10 cy=20 r=5 fill=red', 'moved to (11.5,18)', 'cx=11.5 cy=18 r=5 fill=red'],
  ['ellipse', ['10', '20', '5', '6'], 'cx=10 cy=20 rx=5 ry=6', 'moved to (11.5,18)', 'cx=11.5 cy=18 rx=5 ry=6'],
  ['line', ['10', '20', '30', '40', 'black'], '(10,20) -> (30,40) stroke=black', 'moved to (11.5,18) -> (31.5,38)', '(11.5,18) -> (31.5,38) stroke=black'],
  ['text', ['10', '20', '中文 with spaces'], '(10,20) "中文 with spaces"', 'moved to (11.5,18)', '(11.5,18) "中文 with spaces"'],
  ['g', [], '', 'moved by (1.5,-2)', ''],
];

for (const [type, args, initial, moved, final] of shapeCases) {
  test(`CLI creates, describes and moves ${type}, both at root and in a group`, () => {
    const parameters = args.map(value => JSON.stringify(value)).join(' ');
    const result = runCli([
      'init', 'create g scene', `create ${type} child ${parameters} in scene`,
      'tree child', 'move child 1.5 -2', 'tree child',
      `create ${type} root ${parameters}`, 'tree root', '',
    ].join('\n'));
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, [
      'canvas 800x600 created', 'g#scene created', `${type}#child created in g#scene`,
      `${type}#child${initial ? ` ${initial}` : ''}`, `${type}#child ${moved}`,
      `${type}#child${final ? ` ${final}` : ''}`, `${type}#root created`,
      `${type}#root${initial ? ` ${initial}` : ''}`, '',
    ].join('\n'));
  });
}

test('tree renders sibling continuation, subtree roots, leaves and empty groups without mutation', () => {
  const { session, init, create, tree } = editor();
  init.execute([]);
  create.execute(['g', 'scene']);
  create.execute(['g', 'node', 'in', 'scene']);
  create.execute(['rect', 'r', '0', '1', '2', '3', 'in', 'node']);
  create.execute(['text', 't', '4', '5', 'hello', 'in', 'scene']);
  create.execute(['g', 'empty']);
  const before = session.document.children;
  assert.equal(tree.execute([]), [
    'svg (800x600)', '├── g#scene', '│   ├── g#node',
    '│   │   └── rect#r x=0 y=1 w=2 h=3', '│   └── text#t (4,5) "hello"', '└── g#empty',
  ].join('\n'));
  assert.equal(tree.execute(['node']), 'g#node\n└── rect#r x=0 y=1 w=2 h=3');
  assert.equal(tree.execute(['r']), 'rect#r x=0 y=1 w=2 h=3');
  assert.equal(tree.execute(['empty']), 'g#empty');
  assert.throws(() => tree.execute(['missing']), /no such shape: missing/);
  assert.throws(() => tree.execute(['scene', 'empty']), /usage: tree/);
  assert.equal(session.document.children, before);
});

test('create rejects duplicate IDs, missing or leaf containers, bad parameters and unknown types atomically', () => {
  const { session, init, create } = editor();
  init.execute([]);
  create.execute(['g', 'scene']);
  create.execute(['rect', 'r', '1', '2', '3', '4']);
  const before = session.document.children;
  const cases = [
    [['g', 'r'], /id already exists: r/],
    [['g', 'g', 'in', 'missing'], /no such container: missing/],
    [['g', 'g', 'in', 'r'], /not a container: r/],
    [['box', 'b'], /unknown shape type: box \(is the plugin loaded\?\)/],
    [['rect', 'bad', '0', '0', '-1', '10'], /nonnegative/],
    [['circle', 'bad', 'Infinity', '0', '1'], /finite/],
    [['text', 'bad', '0', '0'], /expected/],
    [['g', 'bad', 'in'], /expected/],
    [['g', 'bad', 'in', 'scene', 'extra'], /expected/],
    [['g', 'bad', 'in', 'scene', 'in', 'scene'], /expected/],
    [['g', ''], /id must/],
    [['g'], /usage: create/],
    [[], /usage: create/],
  ];
  for (const [args, error] of cases) {
    assert.throws(() => create.execute(args), error);
    assert.equal(session.document.children, before);
  }
  assert.equal(create.execute(['g', 'R']), 'g#R created');
});

test('in inside text and IDs, empty text, and hex colors survive CLI parsing', () => {
  const result = runCli([
    '# comments are not colors', 'init', 'create g in',
    'create text literal 0 0 "in"', 'create text nested 1 2 "in" in in',
    'create text blank 0 0 "" in in', 'create text sentence 0 0 "stay in here #123"',
    'create rect color 0 0 1 1 #ffffff in in', 'tree', '',
  ].join('\n'));
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /text#literal \(0,0\) "in"/);
  assert.match(result.stdout, /│   ├── text#nested \(1,2\) "in"/);
  assert.match(result.stdout, /text#blank \(0,0\) ""/);
  assert.match(result.stdout, /text#sentence \(0,0\) "stay in here #123"/);
  assert.match(result.stdout, /rect#color x=0 y=0 w=1 h=1 fill=#ffffff/);
});

test('failed move preserves coordinates, including overflow in a nested descendant', () => {
  const { session, init, create, move, tree } = editor();
  init.execute([]);
  create.execute(['g', 'scene']);
  create.execute(['rect', 'first', '1', '2', '3', '4', 'in', 'scene']);
  create.execute(['circle', 'last', '1.7976931348623157e308', '0', '1', 'in', 'scene']);
  const before = session.document.children;
  for (const args of [
    ['scene', '1.7976931348623157e308', '0'], ['scene', 'NaN', '0'], ['first', '1', 'Infinity'],
    ['first', '1'], ['first', '1', '2', '3'], ['First', '1', '2'],
  ]) {
    assert.throws(() => move.execute(args));
    assert.equal(session.document.children, before);
  }
  assert.equal(move.execute(['first', '-0.5', '2.5']), 'rect#first moved to (0.5,4.5)');
  assert.equal(tree.execute(['first']), 'rect#first x=0.5 y=4.5 w=3 h=4');
});

test('CLI errors are one line each and do not prevent following valid commands', () => {
  const result = runCli([
    'create g before', 'tree', 'move before 1 2', 'init 100 200',
    'create circle c1 10 20 5', 'move c1 NaN 1', 'init 0 0',
    'create text t 0 0 "unfinished', 'tree missing', 'move c1 1 2', 'tree', '',
  ].join('\n'));
  assert.equal(result.stderr, [
    ...Array(3).fill("error: no document. use 'init' or 'read' first"),
    'error: dx must be a finite number', 'error: canvas dimensions must be positive',
    'error: unterminated double quote', 'error: no such shape: missing', '',
  ].join('\n'));
  assert.equal(result.stdout, [
    'canvas 100x200 created', 'circle#c1 created', 'circle#c1 moved to (11,22)',
    'svg (100x200)', '└── circle#c1 cx=11 cy=22 r=5', '',
  ].join('\n'));
});

test('dispatcher creates a fresh command for each invocation', () => {
  class SingleUseCommand extends Command {
    used = false;
    execute() {
      assert.equal(this.used, false);
      this.used = true;
      return 'executed';
    }
  }
  const dispatcher = new CommandDispatcher();
  dispatcher.register('once', () => new SingleUseCommand());
  assert.equal(dispatcher.dispatch(['once']), 'executed');
  assert.equal(dispatcher.dispatch(['once']), 'executed');
  assert.throws(() => dispatcher.register('once', () => new SingleUseCommand()), /already registered/);
  assert.throws(() => dispatcher.dispatch([]), /missing command/);
  assert.throws(() => dispatcher.dispatch(['unknown']), /unknown command/);
});

test('tree safely escapes text newlines and quotes instead of corrupting branch layout', () => {
  const { init, create, tree } = editor();
  init.execute([]);
  create.execute(['text', 't', '0', '0', 'line 1\n"line 2"']);
  assert.equal(tree.execute(['t']), 'text#t (0,0) "line 1\\n\\"line 2\\""');
});

test('checked-in flowchart script runs end to end and moves only node2 descendants', () => {
  const input = readFileSync(new URL('../examples/milestone3.commands', import.meta.url), 'utf8');
  const result = runCli(input);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, [
    'canvas 800x600 created', 'g#flowchart created', 'g#node1 created in g#flowchart',
    'rect#start created in g#node1', 'text#start-label created in g#node1',
    'g#node2 created in g#flowchart', 'rect#process created in g#node2',
    'text#process-label created in g#node2', 'line#arrow1 created in g#flowchart',
    'g#node2 moved by (0,100)', 'svg (800x600)', '└── g#flowchart',
    '    ├── g#node1', '    │   ├── rect#start x=120 y=100 w=160 h=60 fill=#4a90d9',
    '    │   └── text#start-label (155,135) "开始"', '    ├── g#node2',
    '    │   ├── rect#process x=520 y=200 w=160 h=60 fill=#f5a623',
    '    │   └── text#process-label (545,235) "处理数据"',
    '    └── line#arrow1 (280,130) -> (520,130) stroke=black', '',
  ].join('\n'));
});

test('help distinguishes executable editing/history commands from future IO support', () => {
  const result = runCli('help\n');
  assert.equal(result.stderr, '');
  const [available, planned] = result.stdout.split('Planned for later milestones (not implemented yet):');
  for (const command of ['init', 'create', 'tree', 'move']) {
    assert.match(available, new RegExp(`^  ${command} `, 'm'));
  }
  assert.match(available, /^  undo$/m);
  assert.match(available, /^  redo$/m);
  assert.match(planned, /^  save /m);
  assert.match(available, /<x> <y> "content"/);
});
