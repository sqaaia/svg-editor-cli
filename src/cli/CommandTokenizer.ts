/** Parses quoted arguments without interpreting colors such as #ffffff as comments. */
export class CommandTokenizer {
  public tokenize(line: string): readonly string[] {
    if (line.trimStart().startsWith('#')) {
      return [];
    }

    const tokens: string[] = [];
    let token = '';
    let quoted = false;
    let started = false;

    for (const character of line) {
      if (character === '"') {
        quoted = !quoted;
        started = true;
      } else if (/\s/u.test(character) && !quoted) {
        if (started) {
          tokens.push(token);
          token = '';
          started = false;
        }
      } else {
        token += character;
        started = true;
      }
    }

    if (quoted) {
      throw new Error('unterminated double quote');
    }
    if (started) {
      tokens.push(token);
    }
    return tokens;
  }
}
