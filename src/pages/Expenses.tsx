import { useMemo, useState } from 'react';
import { endOfDay, isWithinInterval, parseISO, startOfDay } from 'date-fns';
import ExpenseList from '../components/ExpenseList';
import { downloadCSV, toCSV } from '../lib/csv';
import { filterByRange, formatCurrency, sumAmount, todayISO, type RangeKey } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';

type RangeChoice = RangeKey | 'custom';

const RANGES: { key: RangeChoice; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'all', label: 'All' },
  { key: 'custom', label: 'Custom' },
];

export default function Expenses() {
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);

  const [range, setRange] = useState<RangeChoice>('month');
  const [categoryId, setCategoryId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [customFrom, setCustomFrom] = useState<string>(todayISO());
  const [customTo, setCustomTo] = useState<string>(todayISO());

  const filtered = useMemo(() => {
    let list =
      range === 'custom'
        ? expenses.filter((e) =>
            isWithinInterval(parseISO(e.date), {
              start: startOfDay(parseISO(customFrom)),
              end: endOfDay(parseISO(customTo)),
            }),
          )
        : filterByRange(expenses, range);

    if (categoryId) list = list.filter((e) => e.categoryId === categoryId);

    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => e.note.toLowerCase().includes(q));

    return [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [expenses, range, categoryId, search, customFrom, customTo]);

  const total = useMemo(() => sumAmount(filtered), [filtered]);

  const handleExport = () => {
    if (filtered.length === 0) return;
    downloadCSV(`expenses-${todayISO()}.csv`, toCSV(filtered, categories));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={[
                'rounded px-3 py-1 text-sm font-medium transition-colors',
                range === r.key
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Total:{' '}
          <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
            {formatCurrency(total)}
          </span>
          <span className="ml-2 text-xs text-slate-400 dark:text-slate-500">({filtered.length})</span>
        </div>
      </div>

      {range === 'custom' && (
        <div className="card grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="from">
              From
            </label>
            <input
              id="from"
              type="date"
              className="input"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="to">
              To
            </label>
            <input
              id="to"
              type="date"
              className="input"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="input"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ''}
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="search">
            Search notes
          </label>
          <input
            id="search"
            type="search"
            className="input"
            placeholder="e.g. coffee"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            Export CSV
          </button>
        </div>
      </div>

      <ExpenseList
        expenses={filtered}
        emptyMessage={
          range === 'all' && !categoryId && !search
            ? 'No expenses yet.'
            : 'No expenses match these filters.'
        }
      />
    </div>
  );
}

