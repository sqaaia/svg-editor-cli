/** Common command abstraction; EditCommand adds transactional execution and snapshots. */
export abstract class Command {
  public abstract execute(args: readonly string[]): string;
}
