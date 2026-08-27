import { describe, expect, it } from 'vitest';
import { profileDisplayName } from '@/pages/account/AccessControl';

describe('Access Control identity rendering', () => {
  it('uses a trimmed full name when present', () => {
    expect(profileDisplayName({
      user_id: 'user-1',
      email: 'owner@example.com',
      full_name: '  AURA Owner  ',
      avatar_initials: 'AO',
    })).toBe('AURA Owner');
  });

  it('falls back to the verified email identity for blank names', () => {
    expect(profileDisplayName({
      user_id: 'user-1',
      email: 'edouard@m2mtechconnect.com',
      full_name: '',
      avatar_initials: 'E',
    })).toBe('edouard');
  });

  it('does not label a known profile as an unknown user', () => {
    expect(profileDisplayName({
      user_id: 'user-1',
      email: '',
      full_name: null,
      avatar_initials: 'E',
    })).toBe('E');
  });
});
