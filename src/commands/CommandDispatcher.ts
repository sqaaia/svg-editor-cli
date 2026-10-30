import type { Command } from './Command.js';

/** The only command-name dispatch point. It does not inspect shape types. */
export class CommandDispatcher {
  private readonly commands = new Map<string, Command>();

  public register(name: string, command: Command): void {
    if (this.commands.has(name)) {
      throw new Error(`command already registered: ${name}`);
    }
    this.commands.set(name, command);
  }

  public dispatch(tokens: readonly string[]): string {
    const name = tokens[0];
    if (name === undefined) {
      throw new Error('missing command');
    }
    const command = this.commands.get(name);
    if (command === undefined) {
      throw new Error(`unknown command: ${name}`);
    }
    return command.execute(tokens.slice(1));
  }
}
