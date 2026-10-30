import { Repl } from './cli/Repl.js';
import { CommandDispatcher } from './commands/CommandDispatcher.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { EditorSession } from './application/EditorSession.js';
import { ShapeFactory } from './model/ShapeFactory.js';
import { InitCommand } from './commands/InitCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';

/** Composition root: creates concrete objects and connects module boundaries. */
export class Main {
  public run(): void {
    const dispatcher = new CommandDispatcher();
    const session = new EditorSession();
    const shapes = new ShapeFactory();
    dispatcher.register('help', () => new HelpCommand());
    dispatcher.register('init', () => new InitCommand(session));
    dispatcher.register('create', () => new CreateCommand(session, shapes));
    dispatcher.register('tree', () => new TreeCommand(session));
    dispatcher.register('move', () => new MoveCommand(session));
    new Repl(dispatcher).run();
  }
}

new Main().run();
