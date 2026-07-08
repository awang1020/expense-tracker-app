import type { Category, Expense } from '../types/expense';

function escape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCSV(expenses: Expense[], categories: Category[]): string {
  const nameById = new Map(categories.map((c) => [c.id, c.name] as const));
  const header = ['date', 'category', 'amount', 'note'].join(',');
  const rows = expenses.map((e) =>
    [
      e.date,
      nameById.get(e.categoryId) ?? 'Unknown',
      e.amount.toFixed(2),
      e.note ?? '',
    ]
      .map(escape)
      .join(','),
  );
  return [header, ...rows].join('\n');
}

export function downloadCSV(filename: string, csv: string): void {
  // Prepend BOM so Excel picks up UTF-8 for non-ASCII characters (accents, emoji).
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
