import { addDays, addMonths, addWeeks, format, parseISO } from 'date-fns';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  BudgetMap,
  Category,
  CategoryInput,
  Expense,
  ExpenseInput,
  RecurrenceFrequency,
  RecurringExpense,
  RecurringInput,
  UUID,
} from '../types/expense';
import { uid } from '../lib/utils';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food', color: '#f97316', icon: '🍔' },
  { id: 'cat-transport', name: 'Transport', color: '#0ea5e9', icon: '🚌' },
  { id: 'cat-bills', name: 'Bills', color: '#a855f7', icon: '💡' },
  { id: 'cat-shopping', name: 'Shopping', color: '#ec4899', icon: '🛍️' },
  { id: 'cat-entertainment', name: 'Entertainment', color: '#22c55e', icon: '🎬' },
  { id: 'cat-other', name: 'Other', color: '#64748b', icon: '📦' },
];

function nextOccurrence(d: Date, frequency: RecurrenceFrequency): Date {
  switch (frequency) {
    case 'daily':
      return addDays(d, 1);
    case 'weekly':
      return addWeeks(d, 1);
    case 'monthly':
      return addMonths(d, 1);
  }
}

interface ExpenseState {
  expenses: Expense[];
  categories: Category[];
  recurring: RecurringExpense[];
  budgets: BudgetMap;

  syncStatus: SyncStatus;
  lastSyncedAt: string | null;

  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: UUID, patch: Partial<ExpenseInput>) => void;
  deleteExpense: (id: UUID) => void;

  addCategory: (input: CategoryInput) => Category;
  updateCategory: (id: UUID, patch: Partial<CategoryInput>) => void;
  deleteCategory: (id: UUID) => void;

  addRecurring: (input: RecurringInput) => RecurringExpense;
  updateRecurring: (id: UUID, patch: Partial<RecurringInput>) => void;
  deleteRecurring: (id: UUID) => void;
  toggleRecurring: (id: UUID) => void;

  setBudget: (categoryId: UUID, monthlyLimit: number) => void;
  clearBudget: (categoryId: UUID) => void;

  /** Generate any due Expense entries from active recurring templates up to today. Idempotent. */
  materializeRecurring: (now?: Date) => number;

  /** Wholesale replace the persisted data slices. Used by the sync engine on server hydration. */
  replaceAll: (data: {
    expenses: Expense[];
    categories: Category[];
    recurring: RecurringExpense[];
    budgets: BudgetMap;
  }) => void;

  setSyncStatus: (status: SyncStatus, lastSyncedAt?: string | null) => void;

  getCategory: (id: UUID) => Category | undefined;
  reset: () => void;
}

export type SyncStatus = 'guest' | 'idle' | 'syncing' | 'error';

export const useExpenseStore = create<ExpenseState>()(
  persist(
    (set, get) => ({
      expenses: [],
      categories: DEFAULT_CATEGORIES,
      recurring: [],
      budgets: {},

      syncStatus: 'guest',
      lastSyncedAt: null,

      addExpense: (input) => {
        const expense: Expense = {
          ...input,
          id: uid(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ expenses: [expense, ...s.expenses] }));
        return expense;
      },

      updateExpense: (id, patch) => {
        set((s) => ({
          expenses: s.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }));
      },

      deleteExpense: (id) => {
        set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
      },

      addCategory: (input) => {
        const category: Category = { ...input, id: uid() };
        set((s) => ({ categories: [...s.categories, category] }));
        return category;
      },

      updateCategory: (id, patch) => {
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }));
      },

      deleteCategory: (id) => {
        set((s) => {
          const fallback =
            s.categories.find((c) => c.id === 'cat-other') ??
            s.categories.find((c) => c.id !== id);
          const fallbackId = fallback?.id ?? 'cat-other';
          const { [id]: _dropped, ...restBudgets } = s.budgets;
          return {
            categories: s.categories.filter((c) => c.id !== id),
            expenses: s.expenses.map((e) =>
              e.categoryId === id ? { ...e, categoryId: fallbackId } : e,
            ),
            recurring: s.recurring.map((r) =>
              r.categoryId === id ? { ...r, categoryId: fallbackId } : r,
            ),
            budgets: restBudgets,
          };
        });
      },

      addRecurring: (input) => {
        const rec: RecurringExpense = { ...input, id: uid(), lastRunDate: null };
        set((s) => ({ recurring: [...s.recurring, rec] }));
        return rec;
      },

      updateRecurring: (id, patch) => {
        set((s) => ({
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },

      deleteRecurring: (id) => {
        set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) }));
      },

      toggleRecurring: (id) => {
        set((s) => ({
          recurring: s.recurring.map((r) =>
            r.id === id ? { ...r, active: !r.active } : r,
          ),
        }));
      },

      setBudget: (categoryId, monthlyLimit) => {
        set((s) => ({ budgets: { ...s.budgets, [categoryId]: monthlyLimit } }));
      },

      clearBudget: (categoryId) => {
        set((s) => {
          const { [categoryId]: _dropped, ...rest } = s.budgets;
          return { budgets: rest };
        });
      },

      materializeRecurring: (now = new Date()) => {
        const state = get();
        const todayISO = format(now, 'yyyy-MM-dd');
        const newExpenses: Expense[] = [];
        const updatedRecurring = state.recurring.map((rec) => {
          if (!rec.active) return rec;
          const startDate = parseISO(rec.startDate);
          let cursor = rec.lastRunDate
            ? nextOccurrence(parseISO(rec.lastRunDate), rec.frequency)
            : startDate;
          let lastRunDate = rec.lastRunDate;
          while (format(cursor, 'yyyy-MM-dd') <= todayISO) {
            const dateISO = format(cursor, 'yyyy-MM-dd');
            newExpenses.push({
              id: uid(),
              amount: rec.amount,
              categoryId: rec.categoryId,
              note: rec.note,
              date: dateISO,
              createdAt: new Date().toISOString(),
            });
            lastRunDate = dateISO;
            cursor = nextOccurrence(cursor, rec.frequency);
          }
          return lastRunDate === rec.lastRunDate ? rec : { ...rec, lastRunDate };
        });
        if (newExpenses.length === 0) return 0;
        set({
          expenses: [...newExpenses, ...state.expenses],
          recurring: updatedRecurring,
        });
        return newExpenses.length;
      },

      getCategory: (id) => get().categories.find((c) => c.id === id),

      replaceAll: (data) =>
        set({
          expenses: data.expenses,
          categories: data.categories.length > 0 ? data.categories : DEFAULT_CATEGORIES,
          recurring: data.recurring,
          budgets: data.budgets,
        }),

      setSyncStatus: (status, lastSyncedAt) =>
        set((s) => ({
          syncStatus: status,
          lastSyncedAt: lastSyncedAt !== undefined ? lastSyncedAt : s.lastSyncedAt,
        })),

      reset: () =>
        set({
          expenses: [],
          categories: DEFAULT_CATEGORIES,
          recurring: [],
          budgets: {},
          syncStatus: 'guest',
          lastSyncedAt: null,
        }),
    }),
    {
      name: 'expense-tracker-v1',
      version: 2,
      partialize: (state) => ({
        expenses: state.expenses,
        categories: state.categories,
        recurring: state.recurring,
        budgets: state.budgets,
      }),
    },
  ),
);
