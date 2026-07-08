import { addDays, format, subDays } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';
import { useExpenseStore } from './expenseStore';

function reset() {
  useExpenseStore.getState().reset();
}

describe('expenseStore', () => {
  beforeEach(reset);

  describe('CRUD', () => {
    it('starts empty', () => {
      const s = useExpenseStore.getState();
      expect(s.expenses).toEqual([]);
      expect(s.categories.length).toBeGreaterThan(0);
    });

    it('adds, updates, and deletes an expense', () => {
      const added = useExpenseStore.getState().addExpense({
        amount: 5,
        categoryId: 'cat-food',
        note: 'coffee',
        date: '2026-07-01',
      });
      expect(useExpenseStore.getState().expenses).toHaveLength(1);

      useExpenseStore.getState().updateExpense(added.id, { note: 'tea' });
      expect(useExpenseStore.getState().expenses[0].note).toBe('tea');

      useExpenseStore.getState().deleteExpense(added.id);
      expect(useExpenseStore.getState().expenses).toHaveLength(0);
    });

    it('reassigns expenses and recurring templates to Other when a category is deleted', () => {
      const cat = useExpenseStore.getState().addCategory({ name: 'Tmp', color: '#123456' });
      useExpenseStore.getState().addExpense({
        amount: 5,
        categoryId: cat.id,
        note: '',
        date: '2026-07-01',
      });
      useExpenseStore.getState().addRecurring({
        amount: 5,
        categoryId: cat.id,
        note: '',
        frequency: 'monthly',
        startDate: '2026-07-01',
        active: false,
      });
      useExpenseStore.getState().setBudget(cat.id, 100);

      useExpenseStore.getState().deleteCategory(cat.id);

      const s = useExpenseStore.getState();
      expect(s.categories.find((c) => c.id === cat.id)).toBeUndefined();
      expect(s.expenses[0].categoryId).toBe('cat-other');
      expect(s.recurring[0].categoryId).toBe('cat-other');
      expect(s.budgets[cat.id]).toBeUndefined();
    });
  });

  describe('budgets', () => {
    it('setBudget and clearBudget mutate the map', () => {
      useExpenseStore.getState().setBudget('cat-food', 200);
      expect(useExpenseStore.getState().budgets['cat-food']).toBe(200);
      useExpenseStore.getState().clearBudget('cat-food');
      expect(useExpenseStore.getState().budgets['cat-food']).toBeUndefined();
    });
  });

  describe('materializeRecurring', () => {
    it('is a no-op for an empty store', () => {
      expect(useExpenseStore.getState().materializeRecurring()).toBe(0);
    });

    it('creates one entry for a monthly template with startDate = today', () => {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      useExpenseStore.getState().addRecurring({
        amount: 50,
        categoryId: 'cat-bills',
        note: 'rent',
        frequency: 'monthly',
        startDate: today,
        active: true,
      });
      const count = useExpenseStore.getState().materializeRecurring(now);
      expect(count).toBe(1);
      expect(useExpenseStore.getState().expenses).toHaveLength(1);
      expect(useExpenseStore.getState().expenses[0].date).toBe(today);
    });

    it('backfills missed daily occurrences', () => {
      const now = new Date();
      const start = format(subDays(now, 3), 'yyyy-MM-dd');
      useExpenseStore.getState().addRecurring({
        amount: 1,
        categoryId: 'cat-food',
        note: '',
        frequency: 'daily',
        startDate: start,
        active: true,
      });
      const count = useExpenseStore.getState().materializeRecurring(now);
      expect(count).toBe(4); // 3 days ago, 2 days ago, yesterday, today
    });

    it('is idempotent — no duplicates on a second call', () => {
      const now = new Date();
      useExpenseStore.getState().addRecurring({
        amount: 1,
        categoryId: 'cat-food',
        note: '',
        frequency: 'daily',
        startDate: format(subDays(now, 2), 'yyyy-MM-dd'),
        active: true,
      });
      useExpenseStore.getState().materializeRecurring(now);
      const first = useExpenseStore.getState().expenses.length;
      useExpenseStore.getState().materializeRecurring(now);
      expect(useExpenseStore.getState().expenses.length).toBe(first);
    });

    it('skips inactive templates', () => {
      const now = new Date();
      useExpenseStore.getState().addRecurring({
        amount: 1,
        categoryId: 'cat-food',
        note: '',
        frequency: 'daily',
        startDate: format(subDays(now, 5), 'yyyy-MM-dd'),
        active: false,
      });
      expect(useExpenseStore.getState().materializeRecurring(now)).toBe(0);
    });

    it('does not create entries with a start date in the future', () => {
      const now = new Date();
      useExpenseStore.getState().addRecurring({
        amount: 1,
        categoryId: 'cat-food',
        note: '',
        frequency: 'daily',
        startDate: format(addDays(now, 3), 'yyyy-MM-dd'),
        active: true,
      });
      expect(useExpenseStore.getState().materializeRecurring(now)).toBe(0);
    });
  });
});
