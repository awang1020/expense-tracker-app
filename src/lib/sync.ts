import { fetchData, putData, type UserData } from './api';
import { useExpenseStore } from '../store/expenseStore';

const DEBOUNCE_MS = 500;

let debounceHandle: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;

function snapshot(): UserData {
  const s = useExpenseStore.getState();
  return {
    expenses: s.expenses,
    categories: s.categories,
    recurring: s.recurring,
    budgets: s.budgets,
  };
}

async function pushNow() {
  const store = useExpenseStore.getState();
  store.setSyncStatus('syncing');
  try {
    const { updatedAt } = await putData(snapshot());
    useExpenseStore.getState().setSyncStatus('idle', updatedAt);
  } catch (err) {
    console.error('sync push failed', err);
    useExpenseStore.getState().setSyncStatus('error');
  }
}

function schedulePush() {
  if (debounceHandle !== null) clearTimeout(debounceHandle);
  debounceHandle = setTimeout(() => {
    debounceHandle = null;
    void pushNow();
  }, DEBOUNCE_MS);
}

function attachAutoPush() {
  if (unsubscribe) return;
  unsubscribe = useExpenseStore.subscribe((state, prev) => {
    if (
      state.expenses !== prev.expenses ||
      state.categories !== prev.categories ||
      state.recurring !== prev.recurring ||
      state.budgets !== prev.budgets
    ) {
      schedulePush();
    }
  });
}

export function stopSync() {
  if (debounceHandle !== null) {
    clearTimeout(debounceHandle);
    debounceHandle = null;
  }
  unsubscribe?.();
  unsubscribe = null;
  useExpenseStore.getState().setSyncStatus('guest');
}

/**
 * Bring the store into sync with the server for the current user.
 * Rules:
 *   - server has data → replace local with server (server wins)
 *   - server empty + local has data → push local up (implicit first-time import)
 *   - server empty + local empty  → do nothing (fresh account)
 */
export async function startSync(): Promise<'used-server' | 'seeded-from-local' | 'empty'> {
  const store = useExpenseStore.getState();
  store.setSyncStatus('syncing');
  try {
    const doc = await fetchData();
    if (doc === null) {
      // Not authenticated after all; bail.
      store.setSyncStatus('guest');
      return 'empty';
    }

    const serverHasData = !!doc.updatedAt;
    const localHasData = store.expenses.length > 0 || store.categories.length > 0;

    if (serverHasData) {
      useExpenseStore.getState().replaceAll(doc.data);
      useExpenseStore.getState().setSyncStatus('idle', doc.updatedAt);
      attachAutoPush();
      return 'used-server';
    }

    if (localHasData) {
      await pushNow();
      attachAutoPush();
      return 'seeded-from-local';
    }

    useExpenseStore.getState().setSyncStatus('idle');
    attachAutoPush();
    return 'empty';
  } catch (err) {
    console.error('startSync failed', err);
    useExpenseStore.getState().setSyncStatus('error');
    throw err;
  }
}
