import { describe, expect, it } from 'vitest';
import {
  boundedRetryDelay,
  describeDataError,
  isNotFoundError,
  isTerminalDataError,
  retryUnlessTerminal,
} from '../queryRetry';

describe('terminal data errors', () => {
  it('treats missing and malformed identifiers as terminal', () => {
    expect(isTerminalDataError({ status: 400 })).toBe(true);
    expect(isTerminalDataError({ status: 406 })).toBe(true);
    expect(isTerminalDataError({ code: 'PGRST116' })).toBe(true);
    expect(isTerminalDataError({ code: '22P02' })).toBe(true);
  });

  it('keeps genuinely transient failures retryable', () => {
    expect(isTerminalDataError({ status: 429 })).toBe(false);
    expect(isTerminalDataError({ status: 503 })).toBe(false);
    expect(isTerminalDataError(new Error('network'))).toBe(false);
  });

  it('stops retrying a terminal failure immediately', () => {
    expect(retryUnlessTerminal(0, { status: 406 })).toBe(false);
    expect(retryUnlessTerminal(0, { status: 503 })).toBe(true);
    expect(retryUnlessTerminal(2, { status: 503 })).toBe(false);
  });

  it('caps the backoff so no query can hang for minutes', () => {
    expect(boundedRetryDelay(0)).toBe(500);
    expect(boundedRetryDelay(9)).toBe(4000);
  });
});

describe('user-facing messages', () => {
  it('names a missing record rather than leaking backend detail', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true);
    expect(describeDataError({ code: 'PGRST116' })).toMatch(/does not exist/i);
    expect(describeDataError({ status: 403 })).toMatch(/access/i);
    expect(describeDataError({ status: 503 })).toMatch(/could not be loaded/i);
  });
});
