import { afterEach, beforeEach } from 'vitest';

interface ExpectedConsoleError {
  pattern: RegExp;
  remaining: number;
}

function safeConsoleText(value: unknown): string {
  if (value instanceof Error) return value.message;
  if (typeof value === 'string') {
    return value.replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/gi, '$1?[redacted]');
  }
  if (value === null || value === undefined) return String(value);
  return `[${typeof value}]`;
}

export class UnexpectedConsoleCollector {
  private readonly unexpected: string[] = [];
  private readonly expected: ExpectedConsoleError[] = [];
  private readonly observed: string[] = [];

  expect(pattern: RegExp, count = 1) {
    if (count < 1 || !Number.isInteger(count)) {
      throw new Error('Expected console error count must be a positive integer');
    }
    this.expected.push({ pattern, remaining: count });
  }

  record(args: unknown[]) {
    const message = args.map(safeConsoleText).join(' ');
    this.observed.push(message);
    const expectation = this.expected.find(
      ({ pattern, remaining }) => remaining > 0 && pattern.test(message),
    );
    if (expectation) {
      expectation.remaining -= 1;
      return;
    }
    this.unexpected.push(message);
  }

  messages() {
    return [...this.observed];
  }

  assertClean() {
    const unmet = this.expected.filter(({ remaining }) => remaining > 0);
    if (this.unexpected.length === 0 && unmet.length === 0) return;

    const details = [
      ...this.unexpected.map((message) => `unexpected: ${message}`),
      ...unmet.map(({ pattern, remaining }) => `missing ${remaining} x ${pattern}`),
    ];
    throw new Error(
      `AURA test observability gate rejected console.error output:\n${details.join('\n')}`,
    );
  }
}

let activeCollector: UnexpectedConsoleCollector | undefined;

export function expectConsoleError(pattern: RegExp, count = 1) {
  if (!activeCollector) throw new Error('Console expectation must be declared inside a running test');
  activeCollector.expect(pattern, count);
}

export function observedConsoleErrors() {
  if (!activeCollector) throw new Error('Console observations are only available inside a running test');
  return activeCollector.messages();
}

/** Fails each Vitest case on error-level console output unless explicitly expected. */
export function installUnexpectedConsoleGuard() {
  let original: typeof console.error;

  beforeEach(() => {
    activeCollector = new UnexpectedConsoleCollector();
    original = console.error;
    console.error = (...args: unknown[]) => activeCollector?.record(args);
  });

  afterEach(() => {
    console.error = original;
    const collector = activeCollector;
    activeCollector = undefined;
    collector?.assertClean();
  });
}
