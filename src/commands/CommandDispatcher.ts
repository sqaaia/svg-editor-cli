import type { Command } from './Command.js';

/** The only command-name dispatch point. It does not inspect shape types. */
export class CommandDispatcher {
  private readonly commands = new Map<string, () => Command>();

  public register(name: string, create: () => Command): void {
    if (this.commands.has(name)) {
      throw new Error(`command already registered: ${name}`);
    }
    this.commands.set(name, create);
  }

  public dispatch(tokens: readonly string[]): string {
    const name = tokens[0];
    if (name === undefined) {
      throw new Error('missing command');
    }
    const create = this.commands.get(name);
    if (create === undefined) {
      throw new Error(`unknown command: ${name}`);
    }
    // Each invocation owns its command instance and any per-edit history snapshots.
    return create().execute(tokens.slice(1));
  }
}
