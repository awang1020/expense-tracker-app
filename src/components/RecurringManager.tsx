import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { recurringSchema, type RecurringFormValues } from '../lib/schemas';
import { formatCurrency, formatDate, todayISO } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';
import type { RecurrenceFrequency } from '../types/expense';

const FREQUENCIES: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export default function RecurringManager() {
  const categories = useExpenseStore((s) => s.categories);
  const recurring = useExpenseStore((s) => s.recurring);
  const addRecurring = useExpenseStore((s) => s.addRecurring);
  const deleteRecurring = useExpenseStore((s) => s.deleteRecurring);
  const toggleRecurring = useExpenseStore((s) => s.toggleRecurring);
  const materializeRecurring = useExpenseStore((s) => s.materializeRecurring);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringFormValues>({
    resolver: zodResolver(recurringSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      categoryId: categories[0]?.id ?? '',
      note: '',
      frequency: 'monthly',
      startDate: todayISO(),
      active: true,
    },
  });

  const onSubmit = handleSubmit((values) => {
    addRecurring({
      amount: values.amount,
      categoryId: values.categoryId,
      note: values.note ?? '',
      frequency: values.frequency,
      startDate: values.startDate,
      active: values.active,
    });
    // Materialize immediately so an entry with startDate=today appears at once.
    materializeRecurring();
    reset({
      amount: undefined as unknown as number,
      categoryId: values.categoryId,
      note: '',
      frequency: values.frequency,
      startDate: todayISO(),
      active: true,
    });
  });

  const categoryMap = Object.fromEntries(categories.map((c) => [c.id, c] as const));

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-4">
        <div>
          <h2 className="text-base font-semibold">Add recurring expense</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            The app will auto-add matching expenses each day/week/month starting from the start date.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
          <div className="sm:col-span-1">
            <label className="label" htmlFor="rec-amount">
              Amount
            </label>
            <input
              id="rec-amount"
              type="number"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              className="input"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-rose-600">{errors.amount.message}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="rec-category">
              Category
            </label>
            <select id="rec-category" className="input" {...register('categoryId')}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ''}
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="rec-frequency">
              Frequency
            </label>
            <select id="rec-frequency" className="input" {...register('frequency')}>
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="rec-start">
              Start date
            </label>
            <input id="rec-start" type="date" className="input" {...register('startDate')} />
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="rec-note">
              Note
            </label>
            <input
              id="rec-note"
              type="text"
              placeholder="Optional"
              className="input"
              {...register('note')}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            Add recurring
          </button>
        </div>
      </form>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Your recurring expenses</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {recurring.filter((r) => r.active).length} active · {recurring.length} total
          </span>
        </div>
        {recurring.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No recurring expenses yet. Add one above (e.g., rent, subscriptions).
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {recurring.map((r) => {
              const cat = categoryMap[r.categoryId];
              return (
                <li key={r.id} className="flex items-center gap-3 py-3">
                  <span
                    className="grid h-9 w-9 flex-none place-items-center rounded-full text-base"
                    style={{ backgroundColor: (cat?.color ?? '#64748b') + '22' }}
                  >
                    {cat?.icon ?? '•'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {cat?.name ?? 'Unknown'}
                        {r.note ? ` — ${r.note}` : ''}
                      </span>
                      {!r.active && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Paused
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {r.frequency} · starts {formatDate(r.startDate, 'MMM d, yyyy')}
                      {r.lastRunDate ? ` · last run ${formatDate(r.lastRunDate, 'MMM d')}` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatCurrency(r.amount)}
                    </div>
                    <div className="mt-1 flex justify-end gap-2 text-xs">
                      <button
                        type="button"
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        onClick={() => toggleRecurring(r.id)}
                      >
                        {r.active ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        className="text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300"
                        onClick={() => {
                          if (confirm('Delete this recurring template? Past materialized expenses stay.')) {
                            deleteRecurring(r.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
