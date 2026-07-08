import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { expenseSchema, type ExpenseFormValues } from '../lib/schemas';
import { todayISO } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';

interface Props {
  onSubmitted?: () => void;
}

export default function AddExpenseForm({ onSubmitted }: Props) {
  const categories = useExpenseStore((s) => s.categories);
  const addExpense = useExpenseStore((s) => s.addExpense);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      categoryId: categories[0]?.id ?? '',
      note: '',
      date: todayISO(),
    },
  });

  const onSubmit = handleSubmit((values) => {
    addExpense({
      amount: values.amount,
      categoryId: values.categoryId,
      note: values.note ?? '',
      date: values.date,
    });
    reset({
      amount: undefined as unknown as number,
      categoryId: values.categoryId,
      note: '',
      date: todayISO(),
    });
    onSubmitted?.();
  });

  return (
    <form onSubmit={onSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold">Add expense</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-1">
          <label className="label" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
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
        <div className="sm:col-span-1">
          <label className="label" htmlFor="categoryId">
            Category
          </label>
          <select id="categoryId" className="input" {...register('categoryId')}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-xs text-rose-600">{errors.categoryId.message}</p>
          )}
        </div>
        <div className="sm:col-span-1">
          <label className="label" htmlFor="date">
            Date
          </label>
          <input id="date" type="date" className="input" {...register('date')} />
          {errors.date && (
            <p className="mt-1 text-xs text-rose-600">{errors.date.message}</p>
          )}
        </div>
        <div className="sm:col-span-1">
          <label className="label" htmlFor="note">
            Note
          </label>
          <input
            id="note"
            type="text"
            placeholder="Optional"
            className="input"
            {...register('note')}
          />
          {errors.note && (
            <p className="mt-1 text-xs text-rose-600">{errors.note.message}</p>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          Add expense
        </button>
      </div>
    </form>
  );
}
