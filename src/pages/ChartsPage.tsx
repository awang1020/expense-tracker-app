import { useMemo } from 'react';
import {
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { filterByRange, formatCurrency, sumAmount } from '../lib/utils';
import { useExpenseStore } from '../store/expenseStore';

export default function ChartsPage() {
  const expenses = useExpenseStore((s) => s.expenses);
  const categories = useExpenseStore((s) => s.categories);

  const dailySeries = useMemo(() => {
    const now = new Date();
    const days = eachDayOfInterval({ start: subDays(startOfDay(now), 29), end: startOfDay(now) });
    const totals = new Map(days.map((d) => [format(d, 'yyyy-MM-dd'), 0]));
    for (const e of expenses) {
      if (totals.has(e.date)) totals.set(e.date, (totals.get(e.date) ?? 0) + e.amount);
    }
    return Array.from(totals, ([date, amount]) => ({
      date,
      label: format(parseISO(date), 'MMM d'),
      amount,
    }));
  }, [expenses]);

  const categorySeries = useMemo(() => {
    const monthly = filterByRange(expenses, 'month');
    const byCat = new Map<string, number>();
    for (const e of monthly) {
      byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + e.amount);
    }
    return categories
      .map((c) => ({ id: c.id, name: c.name, color: c.color, value: byCat.get(c.id) ?? 0 }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [expenses, categories]);

  const monthlySeries = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 5),
      end: startOfMonth(now),
    });
    return months.map((m) => {
      const range = { start: startOfMonth(m), end: endOfMonth(m) };
      const total = expenses
        .filter((e) => isWithinInterval(parseISO(e.date), range))
        .reduce((s, e) => s + e.amount, 0);
      return { month: format(m, 'MMM yy'), amount: total };
    });
  }, [expenses]);

  const monthlyTotal = useMemo(() => sumAmount(filterByRange(expenses, 'month')), [expenses]);
  const hasData = expenses.length > 0;

  if (!hasData) {
    return (
      <div className="card text-center text-sm text-slate-500 dark:text-slate-400">
        Add some expenses to see charts here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="card">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">Daily spending — last 30 days</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dailySeries.length} days
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} width={60} tickFormatter={(v) => formatCurrency(Number(v))} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                labelClassName="text-xs"
                contentStyle={{ fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#0d9488"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="card">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">By category — this month</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{formatCurrency(monthlyTotal)}</span>
          </div>
          {categorySeries.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm text-slate-500 dark:text-slate-400">
              No spending this month yet.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categorySeries}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {categorySeries.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={24}
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-base font-semibold">Monthly totals — last 6 months</h2>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  width={60}
                  tickFormatter={(v) => formatCurrency(Number(v))}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </div>
  );
}
