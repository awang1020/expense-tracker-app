export type UUID = string;

export interface Category {
  id: UUID;
  name: string;
  color: string;
  icon?: string;
}

export interface Expense {
  id: UUID;
  amount: number;
  categoryId: UUID;
  note: string;
  /** ISO date string, e.g. "2026-07-07" */
  date: string;
  /** ISO datetime when the record was created */
  createdAt: string;
}

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';

export interface RecurringExpense {
  id: UUID;
  amount: number;
  categoryId: UUID;
  note: string;
  frequency: RecurrenceFrequency;
  /** First occurrence date, YYYY-MM-DD. */
  startDate: string;
  /** Date already materialized as an Expense, YYYY-MM-DD. `null` = never. */
  lastRunDate: string | null;
  active: boolean;
}

/** Monthly spending limit per category. Keyed by categoryId. */
export type BudgetMap = Record<UUID, number>;

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt'>;
export type CategoryInput = Omit<Category, 'id'>;
export type RecurringInput = Omit<RecurringExpense, 'id' | 'lastRunDate'>;
