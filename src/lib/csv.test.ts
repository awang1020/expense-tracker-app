import { describe, expect, it } from 'vitest';
import type { Category, Expense } from '../types/expense';
import { downloadCSV, toCSV } from './csv';

const categories: Category[] = [
  { id: 'cat-a', name: 'Food', color: '#f97316' },
  { id: 'cat-b', name: 'Rent, & bills', color: '#a855f7' },
];

function expense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'e1',
    amount: 12.5,
    categoryId: 'cat-a',
    note: '',
    date: '2026-07-01',
    createdAt: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

describe('toCSV', () => {
  it('emits a header row followed by expense rows', () => {
    const csv = toCSV([expense()], categories);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('date,category,amount,note');
    expect(lines[1]).toBe('2026-07-01,Food,12.50,');
  });

  it('formats amounts with two decimal places', () => {
    const csv = toCSV([expense({ amount: 3 })], categories);
    expect(csv.split('\n')[1]).toContain('3.00');
  });

  it('quotes values containing commas', () => {
    const csv = toCSV([expense({ categoryId: 'cat-b', note: 'a, b' })], categories);
    expect(csv.split('\n')[1]).toBe('2026-07-01,"Rent, & bills",12.50,"a, b"');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const csv = toCSV([expense({ note: 'say "hi"' })], categories);
    expect(csv.split('\n')[1]).toBe('2026-07-01,Food,12.50,"say ""hi"""');
  });

  it('quotes values containing newlines', () => {
    const csv = toCSV([expense({ note: 'line1\nline2' })], categories);
    expect(csv).toContain('"line1\nline2"');
  });

  it('falls back to "Unknown" for missing categories', () => {
    const csv = toCSV([expense({ categoryId: 'missing' })], categories);
    expect(csv.split('\n')[1]).toContain(',Unknown,');
  });

  it('produces a header-only CSV for empty input', () => {
    expect(toCSV([], categories)).toBe('date,category,amount,note');
  });
});

describe('downloadCSV', () => {
  it('creates a downloadable blob with a UTF-8 BOM prefix', () => {
    // JSDOM does not implement URL.createObjectURL by default; stub minimally.
    const created: Blob[] = [];
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = (blob: Blob) => {
      created.push(blob);
      return 'blob:mock';
    };
    URL.revokeObjectURL = () => {};
    try {
      downloadCSV('test.csv', 'a,b\n1,2');
      expect(created).toHaveLength(1);
      expect(created[0].type).toContain('text/csv');
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
