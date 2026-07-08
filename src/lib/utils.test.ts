import { format, subDays } from 'date-fns';
import { describe, expect, it } from 'vitest';
import type { Expense } from '../types/expense';
import { filterByRange, formatCurrency, sumAmount, todayISO, uid } from './utils';

function makeExpense(dateISO: string, amount = 10): Expense {
  return {
    id: uid(),
    amount,
    categoryId: 'cat-food',
    note: '',
    date: dateISO,
    createdAt: new Date().toISOString(),
  };
}

describe('formatCurrency', () => {
  it('renders whole numbers with two decimals and a currency symbol', () => {
    const s = formatCurrency(12);
    expect(s).toMatch(/12\.00/);
    expect(s).toMatch(/\$|USD/);
  });

  it('renders negative numbers', () => {
    expect(formatCurrency(-4.5)).toMatch(/4\.50/);
  });
});

describe('sumAmount', () => {
  it('returns 0 for an empty list', () => {
    expect(sumAmount([])).toBe(0);
  });

  it('sums amounts across expenses', () => {
    expect(sumAmount([makeExpense('2026-07-01', 3), makeExpense('2026-07-02', 4.5)])).toBe(7.5);
  });
});

describe('filterByRange', () => {
  const today = todayISO();
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const longAgo = format(subDays(new Date(), 200), 'yyyy-MM-dd');
  const set = [
    makeExpense(today, 1),
    makeExpense(yesterday, 2),
    makeExpense(longAgo, 3),
  ];

  it('returns everything for "all"', () => {
    expect(filterByRange(set, 'all')).toHaveLength(3);
  });

  it('returns only today for "today"', () => {
    const r = filterByRange(set, 'today');
    expect(r).toHaveLength(1);
    expect(r[0].date).toBe(today);
  });

  it('excludes long-ago entries for "month"', () => {
    const r = filterByRange(set, 'month');
    expect(r.every((e) => e.date !== longAgo)).toBe(true);
  });
});

describe('uid', () => {
  it('generates distinct ids', () => {
    const a = uid();
    const b = uid();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(10);
  });
});
