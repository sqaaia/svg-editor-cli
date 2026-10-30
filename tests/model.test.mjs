import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Rect } from '../dist/model/Rect.js';
import { Circle } from '../dist/model/Circle.js';
import { Ellipse } from '../dist/model/Ellipse.js';
import { Line } from '../dist/model/Line.js';
import { Text } from '../dist/model/Text.js';
import { Group } from '../dist/model/Group.js';
import { Style } from '../dist/model/Style.js';
import { ShapeFactory } from '../dist/model/ShapeFactory.js';
import { SvgDocument } from '../dist/model/SvgDocument.js';

const geometryCases = [
  [new Rect('r', 1, -2, 3, 4), { x: 3, y: 1, width: 3, height: 4 }, { x: 0.5, y: -1, width: 1.5, height: 2 }],
  [new Circle('c', 1, -2, 3), { cx: 3, cy: 1, r: 3 }, { cx: 0.5, cy: -1, r: 1.5 }],
  [new Ellipse('e', 1, -2, 3, 4), { cx: 3, cy: 1, rx: 3, ry: 4 }, { cx: 0.5, cy: -1, rx: 1.5, ry: 2 }],
  [new Line('l', 1, -2, 3, 4), { x1: 3, y1: 1, x2: 5, y2: 7 }, { x1: 0.5, y1: -1, x2: 1.5, y2: 2 }],
  [new Text('t', 1, -2, '开始 <&>'), { x: 3, y: 1 }, { x: 0.5, y: -1 }],
];

for (const [shape, moved, scaled] of geometryCases) {
  test(`${shape.type}: move changes coordinates; scale changes coordinates and sizes`, () => {
    const before = shape.attributes;
    assert.deepEqual(shape.move(2, 3).attributes, moved);
    assert.deepEqual(shape.scale(0.5).attributes, scaled);
    assert.deepEqual(shape.attributes, before);
    assert.equal(shape.move(2, 3).constructor, shape.constructor);
    assert.equal(shape.scale(0.5).textContent, shape.textContent);
  });

  test(`${shape.type}: geometry whitelist and common style are validated`, () => {
    for (const attribute of Object.keys(shape.attributes)) {
      assert.equal(shape.set(attribute, '2.5').attributes[attribute], 2.5);
    }
    const styled = shape.set('fill', '#fff').set('stroke', 'red').set('stroke-width', '1.5');
    assert.equal(styled.attributes.fill, '#fff');
    assert.equal(styled.attributes.stroke, 'red');
    assert.equal(styled.scale(2).attributes['stroke-width'], 1.5);
    for (const name of ['id', 'transform', 'font-size', 'bogus', '__proto__']) {
      assert.throws(() => shape.set(name, 10), { message: `unknown attribute: ${name}` });
    }
    assert.throws(() => shape.set('stroke-width', -1), /nonnegative/);
    assert.throws(() => shape.withChildren([]), /not a container/);
  });
}

test('text content is separate from attributes; empty and Unicode content are preserved', () => {
  const text = new Text('t', 0, 0, '开始 <&>');
  assert.equal(text.set('text', '').textContent, '');
  assert.equal(text.clone().textContent, '开始 <&>');
  assert.equal(Object.hasOwn(text.attributes, 'text'), false);
  assert.throws(() => new Rect('r', 0, 0, 1, 1).set('text', 'no'), /unknown attribute: text/);
});

test('all six built-in types are created by the factory with optional styles', () => {
  const factory = new ShapeFactory();
  const cases = [
    ['rect', ['1', '2', '3', '4'], Rect],
    ['circle', ['1', '2', '3'], Circle],
    ['ellipse', ['1', '2', '3', '4'], Ellipse],
    ['line', ['1', '2', '3', '4'], Line],
    ['text', ['1', '2', '中文 with spaces'], Text],
    ['g', [], Group],
  ];
  for (const [type, args, Class] of cases) {
    const shape = factory.create(type, type, args);
    assert.ok(shape instanceof Class);
    assert.equal(shape.type, type);
    assert.equal(Object.hasOwn(shape.attributes, 'fill'), false);
    assert.equal(Object.hasOwn(shape.attributes, 'stroke'), false);
    assert.throws(() => factory.create(type, type, [...args, 'extra', 'extra']), /expected/);
  }
  assert.equal(factory.create('rect', 'r', ['0', '0', '1', '1', 'red']).attributes.fill, 'red');
  assert.equal(factory.create('circle', 'c', ['0', '0', '1', 'blue']).attributes.fill, 'blue');
  assert.equal(factory.create('ellipse', 'e', ['0', '0', '1', '2', 'green']).attributes.fill, 'green');
  assert.equal(factory.create('line', 'l', ['0', '0', '1', '1', 'black']).attributes.stroke, 'black');
  for (const type of ['box', 'hexagon', 'Rect']) {
    assert.throws(() => factory.create(type, 'id'), { message: `unknown shape type: ${type} (is the plugin loaded?)` });
  }
  assert.throws(() => factory.create('rect', 'r', []), /expected/);
});

test('invalid numbers, sizes, IDs and scale factors are rejected, including empty groups', () => {
  const rect = new Rect('r', -1, 0.5, 0, 1);
  for (const value of [NaN, Infinity, -Infinity]) {
    assert.throws(() => new Circle('c', value, 0, 1), /finite/);
    assert.throws(() => rect.move(value, 0), /finite/);
    assert.throws(() => new Group('g').move(0, value), /finite/);
  }
  for (const factor of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => rect.scale(factor), /scale factor must be positive/);
    assert.throws(() => new Group('g').scale(factor), /scale factor must be positive/);
  }
  for (const value of ['', ' ', 'NaN', 'Infinity', '1px', '0x10']) {
    assert.throws(() => rect.set('x', value), /finite/);
  }
  for (const id of ['', 'a b', 'a\nb']) {
    assert.throws(() => new Group(id), /id must/);
  }
  assert.throws(() => new Rect('r', 0, 0, -1, 1), /width must be nonnegative/);
  assert.throws(() => new Circle('c', 0, 0, -1), /r must be nonnegative/);
  assert.throws(() => new Ellipse('e', 0, 0, 1, -1), /ry must be nonnegative/);
  assert.throws(() => rect.set('height', -1), /height must be nonnegative/);
  assert.throws(() => new Style({ transform: 'translate(1,2)' }), /unknown attribute/);
});

test('nested groups apply geometric operations polymorphically and keep local styles', () => {
  const group = new Group('outer', [new Rect('r', 1, 2, 3, 4), new Group('inner', [
    new Text('t', 10, 20, 'Hello', new Style({ fill: 'red' })), new Line('l', 0, 1, 2, 3),
  ])]);
  const moved = group.move(5, 6);
  assert.deepEqual(moved.children[0].attributes, { x: 6, y: 8, width: 3, height: 4 });
  assert.deepEqual(moved.children[1].children[1].attributes, { x1: 5, y1: 7, x2: 7, y2: 9 });
  assert.equal(group.scale(2).children[1].children[0].attributes.y, 40);
  const colored = group.set('fill', 'blue');
  assert.equal(colored.attributes.fill, 'blue');
  assert.equal(colored.children[0].attributes.fill, undefined);
  assert.equal(colored.children[1].children[0].attributes.fill, 'red');
  assert.throws(() => group.set('x', 10), /unknown attribute: x/);
});

test('attributes and child collections cannot be mutated through exposed references', () => {
  const values = { fill: 'red' };
  const children = [new Rect('r', 0, 0, 1, 1, new Style(values))];
  const group = new Group('g', children);
  const document = new SvgDocument(800, 600, [group]);
  children.length = 0;
  values.fill = 'blue';
  assert.equal(group.children.length, 1);
  assert.equal(document.get('r').attributes.fill, 'red');
  assert.throws(() => group.children.push(new Group('x')), TypeError);
  assert.throws(() => document.children.splice(0, 1), TypeError);
  assert.throws(() => { document.get('r').attributes.x = 99; }, TypeError);
});

test('document defaults, dimensions, lookup and parent relationships', () => {
  const document = new SvgDocument();
  assert.equal(document.width, 800);
  assert.equal(document.height, 600);
  document.add(new Group('scene'));
  document.add(new Circle('c', 0, 0, 1), 'scene');
  assert.equal(document.size, 2);
  assert.equal(document.parentOf('c').id, 'scene');
  assert.equal(document.parentOf('scene'), null);
  assert.equal(document.find('missing'), undefined);
  assert.throws(() => document.get('missing'), /no such shape: missing/);
  assert.throws(() => document.parentOf('missing'), /no such shape/);
  document.resize(400.5, 300);
  for (const dimensions of [[0, 100], [100, -1], [200, Infinity]]) {
    assert.throws(() => document.resize(...dimensions));
    assert.equal(document.width, 400.5);
    assert.equal(document.height, 300);
  }
});

test('IDs are globally unique and case-sensitive; invalid insertions leave the tree intact', () => {
  const document = new SvgDocument();
  document.add(new Group('scene', [new Group('a')]));
  document.add(new Group('A'));
  const before = document.children;
  for (const operation of [
    () => document.add(new Group('a')),
    () => document.add(new Group('new', [new Group('a')])),
    () => document.add(new Circle('a', 0, 0, 1), 'scene'),
    () => document.add(new Group('new'), 'missing'),
  ]) {
    assert.throws(operation);
    assert.equal(document.children, before);
  }
  assert.throws(() => new Group('x', [new Group('x')]), /id already exists: x/);
  assert.throws(() => new Group('g', [new Group('x'), new Group('x')]), /id already exists: x/);
  document.add(new Rect('r', 0, 0, 1, 1));
  assert.throws(() => document.add(new Group('new'), 'r'), /not a container: r/);
});

test('group preserves original sibling order and inserts at the first selected position', () => {
  const document = new SvgDocument(800, 600, [new Group('scene', [
    new Group('a'), new Group('b'), new Group('c'), new Group('d'),
  ])]);
  document.group('selection', ['d', 'b']);
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['a', 'selection', 'c']);
  assert.deepEqual(document.get('selection').children.map(shape => shape.id), ['b', 'd']);
  assert.equal(document.parentOf('d').id, 'selection');
});

test('cross-parent grouping uses the closest common parent and original preorder', () => {
  const document = new SvgDocument(800, 600, [new Group('scene', [
    new Group('left', [new Circle('a', 1, 2, 3), new Group('keep')]),
    new Group('right', [new Text('b', 10, 20, 'B')]),
  ])]);
  document.group('selection', ['b', 'a']);
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['selection', 'left', 'right']);
  assert.deepEqual(document.get('selection').children.map(shape => shape.id), ['a', 'b']);
  assert.deepEqual(document.get('left').children.map(shape => shape.id), ['keep']);
  assert.equal(document.get('right').children.length, 0);
  assert.deepEqual(document.get('a').attributes, { cx: 1, cy: 2, r: 3 });
});

test('group works at document root, including selection across top-level branches', () => {
  const document = new SvgDocument(800, 600, [new Group('first', [new Group('a')]), new Group('second', [new Group('b')])]);
  document.group('joined', ['b', 'a']);
  assert.deepEqual(document.children.map(shape => shape.id), ['joined', 'first', 'second']);
  assert.equal(document.parentOf('joined'), null);
  document.group('all', ['second', 'joined']);
  assert.deepEqual(document.children.map(shape => shape.id), ['all', 'first']);
  assert.deepEqual(document.get('all').children.map(shape => shape.id), ['joined', 'second']);
});

test('invalid group requests fail atomically, including ancestor plus descendant', () => {
  const document = new SvgDocument(800, 600, [new Group('g', [new Group('nested', [new Group('a')])])]);
  const before = document.children;
  const cases = [
    ['new', ['a', 'g'], /cannot group a container into its own descendant: g/],
    ['new', ['nested', 'a'], /cannot group a container into its own descendant: nested/],
    ['g', ['a'], /id already exists: g/],
    ['new', ['a', 'a'], /duplicate ids/],
    ['new', [], /at least one/],
    ['new', ['a', 'missing'], /no such shape: missing/],
    ['', ['a'], /id must/],
  ];
  for (const [id, selected, error] of cases) {
    assert.throws(() => document.group(id, selected), error);
    assert.equal(document.children, before);
  }
});

test('ungroup lifts children into the original position; top-level ungroup is forbidden', () => {
  const document = new SvgDocument(800, 600, [new Group('scene', [
    new Group('before'), new Group('nested', [new Group('a'), new Group('b')]), new Group('after'),
  ])]);
  document.ungroup('nested');
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['before', 'a', 'b', 'after']);
  assert.equal(document.find('nested'), undefined);
  assert.equal(document.parentOf('a').id, 'scene');
  const before = document.children;
  assert.throws(() => document.ungroup('scene'), /cannot ungroup top-level container: scene/);
  assert.equal(document.children, before);
  document.ungroup('a'); // Empty nested group is removed.
  assert.equal(document.find('a'), undefined);
});

test('addTo reparents at the end, reorders an existing child, and prevents cycles', () => {
  const document = new SvgDocument(800, 600, [new Group('outer', [new Group('inner'), new Group('tail')]), new Circle('c', 1, 2, 3)]);
  document.addTo('outer', 'c');
  assert.equal(document.parentOf('c').id, 'outer');
  document.addTo('outer', 'inner');
  assert.deepEqual(document.get('outer').children.map(shape => shape.id), ['tail', 'c', 'inner']);
  const before = document.children;
  for (const operation of [
    () => document.addTo('outer', 'outer'),
    () => document.addTo('inner', 'outer'),
    () => document.addTo('c', 'tail'),
    () => document.addTo('missing', 'tail'),
    () => document.addTo('outer', 'missing'),
  ]) {
    assert.throws(operation);
    assert.equal(document.children, before);
  }
});

test('front/back operate only among siblings using SVG painter order', () => {
  const document = new SvgDocument(800, 600, [new Group('scene', [new Group('a'), new Group('b'), new Group('c')]), new Group('other')]);
  document.front('a');
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['b', 'c', 'a']);
  document.back('a');
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['a', 'b', 'c']);
  document.front('scene');
  assert.deepEqual(document.children.map(shape => shape.id), ['other', 'scene']);
  document.back('scene');
  assert.deepEqual(document.children.map(shape => shape.id), ['scene', 'other']);
});

test('delete removes whole subtrees and permits later reuse of every removed ID', () => {
  const document = new SvgDocument(800, 600, [new Group('scene', [new Group('node', [new Group('child')]), new Group('keep')])]);
  document.delete('node');
  assert.equal(document.find('child'), undefined);
  assert.equal(document.find('node'), undefined);
  assert.equal(document.size, 2);
  document.add(new Group('child'));
  document.delete('scene');
  assert.deepEqual(document.children.map(shape => shape.id), ['child']);
  assert.throws(() => document.delete('missing'), /no such shape/);
});

test('overflow in a later descendant never partially edits earlier descendants', () => {
  const document = new SvgDocument(800, 600, [new Group('g', [
    new Rect('safe', 1, 2, 3, 4), new Circle('huge', Number.MAX_VALUE, 0, 1),
  ])]);
  const before = document.children;
  assert.throws(() => document.scale('g', 2), /finite/);
  assert.equal(document.children, before);
  assert.throws(() => document.move('g', Number.MAX_VALUE, 0), /finite/);
  assert.equal(document.children, before);
  assert.throws(() => document.set('safe', 'height', -1), /nonnegative/);
  assert.equal(document.children, before);
  document.set('safe', 'x', '2.5');
  assert.equal(document.get('safe').attributes.x, 2.5);
  assert.equal(before[0].children[0].attributes.x, 1);
});

test('clone preserves concrete types, geometry, content, styles and order independently', () => {
  const document = new SvgDocument(400, 300, [new Group('g', geometryCases.map(([shape]) => shape.set('stroke', 'red')), new Style({ fill: 'blue' }))]);
  const copy = document.clone();
  assert.equal(copy.width, 400);
  assert.equal(copy.height, 300);
  assert.equal(copy.size, document.size);
  for (const original of document.walk()) {
    const cloned = copy.get(original.id);
    assert.notEqual(cloned, original);
    assert.equal(cloned.constructor, original.constructor);
    assert.deepEqual(cloned.attributes, original.attributes);
    assert.equal(cloned.textContent, original.textContent);
    assert.deepEqual(cloned.children.map(shape => shape.id), original.children.map(shape => shape.id));
  }
  copy.move('g', 10, 20);
  copy.delete('r');
  assert.equal(document.get('r').attributes.x, 1);
  document.set('t', 'text', 'changed');
  assert.equal(copy.get('t').textContent, '开始 <&>');
});

test('assignment flowchart scenario: group movement moves text and rect together', () => {
  const document = new SvgDocument();
  document.add(new Group('flowchart'));
  document.add(new Group('node1'), 'flowchart');
  document.add(new Rect('start', 120, 100, 160, 60, new Style({ fill: '#4a90d9' })), 'node1');
  document.add(new Text('start-label', 155, 135, '开始'), 'node1');
  document.add(new Group('node2'), 'flowchart');
  document.add(new Rect('process', 520, 100, 160, 60, new Style({ fill: '#f5a623' })), 'node2');
  document.add(new Text('process-label', 545, 135, '处理数据'), 'node2');
  document.add(new Line('arrow1', 280, 130, 520, 130, new Style({ stroke: 'black' })), 'flowchart');
  assert.equal(document.size, 8);
  document.move('node2', 0, 100);
  assert.equal(document.get('process').attributes.y, 200);
  assert.equal(document.get('process-label').attributes.y, 235);
  assert.equal(document.get('arrow1').attributes.y2, 130);
  assert.equal(document.get('start').attributes.y, 100);
  document.set('process-label', 'text', '处理数据 v2');
  assert.equal(document.get('process-label').textContent, '处理数据 v2');
});
