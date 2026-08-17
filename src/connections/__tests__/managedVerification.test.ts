import { describe, expect, it } from 'vitest';
import { countLiveRecords, evaluateVerification } from '../managedVerification';

describe('countLiveRecords', () => {
  it('counts a bare array', () => expect(countLiveRecords([1, 2, 3])).toBe(3));
  it('sums arrays inside an envelope', () => expect(countLiveRecords({ siteEntry: [1, 2], rows: [3] })).toBe(3));
  it('returns null when no array is present', () => expect(countLiveRecords({ ok: true })).toBeNull());
  it('returns null for scalars', () => expect(countLiveRecords('x')).toBeNull());
  it('returns zero for an empty collection', () => expect(countLiveRecords({ siteEntry: [] })).toBe(0));
});

describe('evaluateVerification', () => {
  it('fails when the provider is unreachable', () => {
    expect(evaluateVerification({ reachable: false, http_status: null, record_count: null }).state).toBe('FAILED');
  });
  it('fails on a non-200 provider response', () => {
    const v = evaluateVerification({ reachable: true, http_status: 403, record_count: null });
    expect(v.state).toBe('FAILED');
    expect(v.reason_code).toBe('provider_request_failed');
  });
  it('stays partial when reachable with zero records', () => {
    const v = evaluateVerification({ reachable: true, http_status: 200, record_count: 0 });
    expect(v.state).toBe('PARTIAL');
    expect(v.reason_code).toBe('reachable_no_records');
  });
  it('stays partial when the payload cannot be counted', () => {
    expect(evaluateVerification({ reachable: true, http_status: 200, record_count: null }).state).toBe('PARTIAL');
  });
  it('verifies only when live records are returned', () => {
    const v = evaluateVerification({ reachable: true, http_status: 200, record_count: 4 });
    expect(v.state).toBe('VERIFIED');
    expect(v.reason_code).toBe('live_provider_data_returned');
  });
});
