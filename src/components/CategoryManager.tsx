import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { categorySchema, type CategoryFormValues } from '../lib/schemas';
import { useExpenseStore } from '../store/expenseStore';

export default function CategoryManager() {
  const categories = useExpenseStore((s) => s.categories);
  const budgets = useExpenseStore((s) => s.budgets);
  const addCategory = useExpenseStore((s) => s.addCategory);
  const deleteCategory = useExpenseStore((s) => s.deleteCategory);
  const setBudget = useExpenseStore((s) => s.setBudget);
  const clearBudget = useExpenseStore((s) => s.clearBudget);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', color: '#0ea5e9', icon: '' },
  });

  const onSubmit = handleSubmit((values) => {
    addCategory({ name: values.name, color: values.color, icon: values.icon });
    reset({ name: '', color: '#0ea5e9', icon: '' });
  });

  const onBudgetBlur = (categoryId: string, raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      clearBudget(categoryId);
      return;
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value <= 0) {
      clearBudget(categoryId);
      return;
    }
    setBudget(categoryId, value);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="card space-y-4">
        <h2 className="text-base font-semibold">Add category</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cat-name">
              Name
            </label>
            <input id="cat-name" className="input" placeholder="Groceries" {...register('name')} />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600">{errors.name.message}</p>
            )}
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="cat-color">
              Color
            </label>
            <input id="cat-color" type="color" className="input h-10 p-1" {...register('color')} />
            {errors.color && (
              <p className="mt-1 text-xs text-rose-600">{errors.color.message}</p>
            )}
          </div>
          <div className="sm:col-span-1">
            <label className="label" htmlFor="cat-icon">
              Icon (emoji)
            </label>
            <input id="cat-icon" className="input" placeholder="🥦" {...register('icon')} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            Add category
          </button>
        </div>
      </form>

      <div className="card space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Your categories</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Set a monthly budget to track spending on the dashboard.
          </span>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {categories.map((c) => {
            const budget = budgets[c.id];
            return (
              <li key={c.id} className="flex items-center gap-3 py-3">
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-full text-base"
                  style={{ backgroundColor: c.color + '22' }}
                >
                  {c.icon ?? '•'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{c.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{c.color}</div>
                </div>
                <div className="w-32">
                  <label className="sr-only" htmlFor={`budget-${c.id}`}>
                    Monthly budget for {c.name}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-2 grid place-items-center text-xs text-slate-400 dark:text-slate-500">
                      $
                    </span>
                    <input
                      id={`budget-${c.id}`}
                      key={budget ?? 'empty'}
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      placeholder="Budget"
                      defaultValue={budget ?? ''}
                      onBlur={(e) => onBudgetBlur(c.id, e.currentTarget.value)}
                      className="input pl-6"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => {
                    if (confirm(`Delete "${c.name}"? Expenses will be reassigned to Other.`)) {
                      deleteCategory(c.id);
                    }
                  }}
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
