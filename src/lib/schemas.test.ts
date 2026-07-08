import { describe, expect, it } from 'vitest';
import { categorySchema, expenseSchema, recurringSchema } from './schemas';

describe('expenseSchema', () => {
  it('accepts a valid expense', () => {
    const r = expenseSchema.safeParse({
      amount: 12.5,
      categoryId: 'cat-food',
      date: '2026-07-01',
      note: 'lunch',
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative amounts', () => {
    const r = expenseSchema.safeParse({
      amount: -1,
      categoryId: 'cat-food',
      date: '2026-07-01',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a missing categoryId', () => {
    const r = expenseSchema.safeParse({
      amount: 1,
      categoryId: '',
      date: '2026-07-01',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a badly-formatted date', () => {
    const r = expenseSchema.safeParse({
      amount: 1,
      categoryId: 'cat-food',
      date: '07/01/2026',
    });
    expect(r.success).toBe(false);
  });
});

describe('categorySchema', () => {
  it('requires a hex color', () => {
    expect(
      categorySchema.safeParse({ name: 'Food', color: 'red' }).success,
    ).toBe(false);
    expect(
      categorySchema.safeParse({ name: 'Food', color: '#ff0000' }).success,
    ).toBe(true);
  });
});

describe('recurringSchema', () => {
  it('accepts a valid recurring template', () => {
    const r = recurringSchema.safeParse({
      amount: 100,
      categoryId: 'cat-bills',
      frequency: 'monthly',
      startDate: '2026-07-01',
      note: 'rent',
      active: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects an unknown frequency', () => {
    const r = recurringSchema.safeParse({
      amount: 100,
      categoryId: 'cat-bills',
      frequency: 'yearly',
      startDate: '2026-07-01',
      active: true,
    });
    expect(r.success).toBe(false);
  });
});
