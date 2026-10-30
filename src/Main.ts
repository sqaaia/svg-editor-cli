import { Repl } from './cli/Repl.js';
import { CommandDispatcher } from './commands/CommandDispatcher.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { EditorSession } from './application/EditorSession.js';
import { ShapeFactory } from './model/ShapeFactory.js';
import { InitCommand } from './commands/InitCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';

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
    dispatcher.register('delete', () => new DeleteCommand(session));
    dispatcher.register('scale', () => new ScaleCommand(session));
    dispatcher.register('set', () => new SetCommand(session));
    dispatcher.register('group', () => new GroupCommand(session));
    dispatcher.register('ungroup', () => new UngroupCommand(session));
    dispatcher.register('addto', () => new AddToCommand(session));
    dispatcher.register('front', () => new FrontCommand(session));
    dispatcher.register('back', () => new BackCommand(session));
    dispatcher.register('undo', () => new UndoCommand(session));
    dispatcher.register('redo', () => new RedoCommand(session));
    dispatcher.register('canvas', () => new CanvasCommand(session));
    dispatcher.register('show', () => new ShowCommand(session));
    new Repl(dispatcher).run();
  }
}

new Main().run();
