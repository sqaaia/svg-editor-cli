/** Common command abstraction; undoable editing commands will extend it later. */
export abstract class Command {
  public abstract execute(args: readonly string[]): string;
}
