import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { CommandTokenizer } from '../dist/cli/CommandTokenizer.js';

test('tokenizer preserves quoted text, empty text and color parameters', () => {
  const tokenizer = new CommandTokenizer();
  assert.deepEqual(tokenizer.tokenize('create text t1 20 40 "My Diagram"'),
    ['create', 'text', 't1', '20', '40', 'My Diagram']);
  assert.deepEqual(tokenizer.tokenize('set t1 text ""'), ['set', 't1', 'text', '']);
  assert.deepEqual(tokenizer.tokenize('set r1 fill #ffffff'), ['set', 'r1', 'fill', '#ffffff']);
  assert.deepEqual(tokenizer.tokenize('  # comment'), []);
  assert.deepEqual(tokenizer.tokenize('  '), []);
  assert.throws(() => tokenizer.tokenize('set t1 text "unfinished'), /unterminated double quote/);
});

test('script input skips comments, reports errors and continues until EOF', () => {
  const result = spawnSync(process.execPath, ['dist/Main.js'], {
    cwd: new URL('..', import.meta.url),
    input: '# replay\n\nunknown\nhelp extra\nhelp\n',
    encoding: 'utf8',
    timeout: 5000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Available now:/);
  assert.match(result.stdout, /SVG file commands:/);
  assert.doesNotMatch(result.stdout, /svg> /);
  assert.equal(result.stderr, 'error: unknown command: unknown\nerror: usage: help\n');
});
