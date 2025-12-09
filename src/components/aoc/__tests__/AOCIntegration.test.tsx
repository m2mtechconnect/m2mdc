import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AOCQuickStats } from '../AOCQuickStats';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

describe('AOC Integration Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );

  describe('AOCQuickStats', () => {
    it('should display stats correctly', () => {
      const stats = {
        successRate: 95.5,
        avgDuration: 1250,
        totalRuns: 1500,
        activeStatus: 'active',
      };

      const { container } = render(<AOCQuickStats stats={stats} />, { wrapper });

      expect(container.textContent).toContain('95.5%');
      expect(container.textContent).toContain('1.3s');
      expect(container.textContent).toContain('1,500');
      expect(container.textContent).toContain('active');
    });

    it('should format milliseconds correctly', () => {
      const stats = {
        successRate: 90,
        avgDuration: 850,
        totalRuns: 100,
        activeStatus: 'paused',
      };

      const { container } = render(<AOCQuickStats stats={stats} />, { wrapper });

      expect(container.textContent).toContain('850ms');
    });

    it('should handle zero values', () => {
      const stats = {
        successRate: 0,
        avgDuration: 0,
        totalRuns: 0,
        activeStatus: 'stopped',
      };

      const { container } = render(<AOCQuickStats stats={stats} />, { wrapper });

      expect(container.textContent).toContain('0%');
      expect(container.textContent).toContain('0ms');
      expect(container.textContent).toContain('0');
    });
  });
});
