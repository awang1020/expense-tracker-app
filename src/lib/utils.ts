import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Expense } from '../types/expense';

export const CURRENCY = 'USD';
export const LOCALE = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

const currencyFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number): string {
  return currencyFmt.format(amount);
}

export function formatDate(iso: string, pattern = 'MMM d, yyyy'): string {
  return format(parseISO(iso), pattern);
}

/** Today in YYYY-MM-DD format, in the user's local time zone. */
export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export type RangeKey = 'today' | 'week' | 'month' | 'all';

export function rangeFor(key: RangeKey, now: Date = new Date()): { start: Date; end: Date } | null {
  switch (key) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    case 'month':
      return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'all':
      return null;
  }
}

export function filterByRange(expenses: Expense[], key: RangeKey): Expense[] {
  const range = rangeFor(key);
  if (!range) return expenses;
  return expenses.filter((e) => isWithinInterval(parseISO(e.date), range));
}

export function sumAmount(expenses: Expense[]): number {
  return expenses.reduce((s, e) => s + e.amount, 0);
}

export function groupBy<T, K extends string>(items: T[], keyFn: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const k = keyFn(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * RFC 4122 v4-ish id — good enough for local records without pulling a uuid dep.
 * Uses crypto.randomUUID when available.
 */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
