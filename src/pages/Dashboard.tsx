import { useMemo } from 'react';
import AddExpenseForm from '../components/AddExpenseForm';
import ExpenseList from '../components/ExpenseList';
import { filterByRange, formatCurrency, sumAmount } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';

export default function Dashboard() {
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);
  const budgets = useExpenseStore((s) => s.budgets);

  const stats = useMemo(
    () => ({
      today: sumAmount(filterByRange(expenses, 'today')),
      week: sumAmount(filterByRange(expenses, 'week')),
      month: sumAmount(filterByRange(expenses, 'month')),
    }),
    [expenses],
  );

  const recent = useMemo(
    () =>
      [...expenses]
        .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
        .slice(0, 10),
    [expenses],
  );

  const budgetRows = useMemo(() => {
    const monthly = filterByRange(expenses, 'month');
    const spentByCat = new Map<string, number>();
    for (const e of monthly) {
      spentByCat.set(e.categoryId, (spentByCat.get(e.categoryId) ?? 0) + e.amount);
    }
    return categories
      .filter((c) => (budgets[c.id] ?? 0) > 0)
      .map((c) => {
        const limit = budgets[c.id];
        const spent = spentByCat.get(c.id) ?? 0;
        const pct = limit > 0 ? Math.min(spent / limit, 1.5) : 0;
        return { category: c, spent, limit, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [expenses, categories, budgets]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Today" value={stats.today} tone="teal" />
        <StatCard label="This week" value={stats.week} tone="sky" />
        <StatCard label="This month" value={stats.month} tone="violet" />
      </section>

      {budgetRows.length > 0 && (
        <section className="card space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Budgets — this month
            </h2>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {budgetRows.filter((r) => r.spent > r.limit).length} over budget
            </span>
          </div>
          <ul className="space-y-3">
            {budgetRows.map((row) => (
              <BudgetRow key={row.category.id} {...row} />
            ))}
          </ul>
        </section>
      )}

      <AddExpenseForm />

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Recent</h2>
        <ExpenseList expenses={recent} emptyMessage="No expenses yet — add your first one above." />
      </section>
    </div>
  );
}

const toneMap: Record<string, string> = {
  teal: 'from-teal-500 to-teal-600',
  sky: 'from-sky-500 to-sky-600',
  violet: 'from-violet-500 to-violet-600',
};

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof toneMap;
}) {
  return (
    <div className={`rounded-lg bg-gradient-to-br ${toneMap[tone]} p-4 text-white shadow-sm`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{formatCurrency(value)}</div>
    </div>
  );
}

type BudgetRowProps = {
  category: { id: string; name: string; color: string; icon?: string };
  spent: number;
  limit: number;
  pct: number;
};

function BudgetRow({ category, spent, limit, pct }: BudgetRowProps) {
  const ratio = spent / limit;
  const isOver = ratio > 1;
  const barColor =
    ratio > 1 ? 'bg-rose-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-teal-500';
  const remaining = limit - spent;
  return (
    <li>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-xs"
            style={{ backgroundColor: category.color + '22' }}
          >
            {category.icon ?? '•'}
          </span>
          <span className="font-medium text-slate-900 dark:text-slate-100">{category.name}</span>
        </div>
        <div className="tabular-nums text-slate-600 dark:text-slate-400">
          <span
            className={
              isOver
                ? 'font-semibold text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-slate-100'
            }
          >
            {formatCurrency(spent)}
          </span>
          <span className="text-slate-400 dark:text-slate-500"> / {formatCurrency(limit)}</span>
        </div>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full transition-all ${barColor}`}
          style={{ width: `${Math.min(pct * 100, 100)}%` }}
        />
      </div>
      <div className="mt-1 flex justify-between text-xs">
        <span
          className={
            isOver
              ? 'font-medium text-rose-600 dark:text-rose-400'
              : 'text-slate-500 dark:text-slate-400'
          }
        >
          {isOver
            ? `Over by ${formatCurrency(spent - limit)}`
            : `${formatCurrency(remaining)} left`}
        </span>
        <span className="text-slate-400 dark:text-slate-500">{Math.round(ratio * 100)}%</span>
      </div>
    </li>
  );
}
