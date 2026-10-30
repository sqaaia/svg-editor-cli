import { createInterface } from 'node:readline';
import type { CommandDispatcher } from '../commands/CommandDispatcher.js';
import { CommandTokenizer } from './CommandTokenizer.js';

/** Terminal adapter. Commands return output; only this boundary prints it. */
export class Repl {
  private readonly tokenizer = new CommandTokenizer();

  public constructor(private readonly dispatcher: CommandDispatcher) {}

  public run(): void {
    const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
    const input = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: interactive,
    });

    if (interactive) {
      process.stdout.write("svg-editor 0.1 — type 'help' for commands\n");
      input.setPrompt('svg> ');
      input.prompt();
    }

    input.on('line', (line: string) => {
      try {
        const tokens = this.tokenizer.tokenize(line);
        if (tokens.length > 0) {
          process.stdout.write(`${this.dispatcher.dispatch(tokens)}\n`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'unexpected error';
        process.stderr.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`);
      }

      if (interactive) {
        input.prompt();
      }
    });
  }
}
