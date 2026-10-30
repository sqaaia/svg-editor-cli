import { Repl } from './cli/Repl.js';
import { CommandDispatcher } from './commands/CommandDispatcher.js';
import { HelpCommand } from './commands/HelpCommand.js';

/** Composition root: creates concrete objects and connects module boundaries. */
export class Main {
  public run(): void {
    const dispatcher = new CommandDispatcher();
    dispatcher.register('help', new HelpCommand());
    new Repl(dispatcher).run();
  }
}

new Main().run();
