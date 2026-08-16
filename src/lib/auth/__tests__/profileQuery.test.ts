/**
 * Guarded profile reads (finding PW-P2-02): no request may carry an empty id.
 */
import { describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }),
  },
}));

const { fetchProfileFields, isValidUserId } = await import('../profileQuery');

describe('profile query guard', () => {
  it.each(['', ' ', 'undefined', 'null', null, undefined])(
    'never queries for invalid id %p',
    async (bad) => {
      maybeSingle.mockClear();
      const result = await fetchProfileFields(bad as string | null, 'is_approved');
      expect(result).toEqual({ status: 'unauthenticated' });
      expect(maybeSingle).not.toHaveBeenCalled();
    },
  );

  it('queries for a real user id', async () => {
    maybeSingle.mockClear();
    maybeSingle.mockResolvedValue({ data: { is_approved: true }, error: null });
    const id = '11111111-2222-4333-8444-555555555555';
    expect(isValidUserId(id)).toBe(true);
    await expect(fetchProfileFields(id, 'is_approved')).resolves.toEqual({
      status: 'success',
      data: { is_approved: true },
    });
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it('reports errors instead of fabricating a profile', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const result = await fetchProfileFields('11111111-2222-4333-8444-555555555555', 'is_approved');
    expect(result).toEqual({ status: 'error', message: 'boom' });
  });
});
