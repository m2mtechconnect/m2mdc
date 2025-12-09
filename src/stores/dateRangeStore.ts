import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface DateRange {
  from: string;
  to: string;
  days: number;
}

interface DateRangeStore {
  range: DateRange;
  setRange: (days: number) => void;
  setCustomRange: (from: string, to: string) => void;
}

const calculateRange = (days: number): DateRange => {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
    days,
  };
};

export const useDateRangeStore = create<DateRangeStore>()(
  persist(
    (set) => ({
      range: calculateRange(90), // Default to 90 days
      setRange: (days: number) => set({ range: calculateRange(days) }),
      setCustomRange: (from: string, to: string) => {
        const fromDate = new Date(from);
        const toDate = new Date(to);
        const days = Math.floor((toDate.getTime() - fromDate.getTime()) / (24 * 60 * 60 * 1000));
        set({ range: { from, to, days } });
      },
    }),
    {
      name: 'm2m-date-range-storage',
    }
  )
);
