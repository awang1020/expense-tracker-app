import { useMemo, useState } from 'react';
import type { Expense } from '../types/expense';
import { formatCurrency, formatDate } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';

interface Props {
  expenses: Expense[];
  emptyMessage?: string;
}

export default function ExpenseList({ expenses, emptyMessage = 'No expenses yet.' }: Props) {
  const categories = useExpenseStore((s) => s.categories);
  const deleteExpense = useExpenseStore((s) => s.deleteExpense);
  const updateExpense = useExpenseStore((s) => s.updateExpense);
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories],
  );

  if (expenses.length === 0) {
    return (
      <div className="card text-center text-sm text-slate-500 dark:text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {expenses.map((e) => {
        const cat = categoryMap[e.categoryId];
        const isEditing = editingId === e.id;
        return (
          <li key={e.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className="grid h-9 w-9 flex-none place-items-center rounded-full text-base"
              style={{ backgroundColor: (cat?.color ?? '#64748b') + '22' }}
              title={cat?.name}
            >
              {cat?.icon ?? '•'}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {cat?.name ?? 'Unknown'}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {formatDate(e.date)}
                </span>
              </div>
              {isEditing ? (
                <input
                  autoFocus
                  defaultValue={e.note}
                  onBlur={(ev) => {
                    updateExpense(e.id, { note: ev.currentTarget.value });
                    setEditingId(null);
                  }}
                  onKeyDown={(ev) => {
                    if (ev.key === 'Enter') ev.currentTarget.blur();
                    if (ev.key === 'Escape') setEditingId(null);
                  }}
                  className="input mt-1 py-1 text-xs"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingId(e.id)}
                  className="mt-0.5 block truncate text-left text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                >
                  {e.note || 'Add note…'}
                </button>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(e.amount)}
              </div>
              <button
                type="button"
                onClick={() => deleteExpense(e.id)}
                className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
              >
                Delete
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
