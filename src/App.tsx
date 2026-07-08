import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Categories from './pages/Categories';
import Recurring from './pages/Recurring';
import { useAuth } from './hooks/useAuth';
import { startSync, stopSync } from './lib/sync';
import { useExpenseStore } from './store/expenseStore';

const ChartsPage = lazy(() => import('./pages/ChartsPage'));

function ChartsFallback() {
  return (
    <div className="card text-center text-sm text-slate-500">Loading charts…</div>
  );
}

export default function App() {
  useEffect(() => {
    const store = useExpenseStore;
    const run = () => store.getState().materializeRecurring();
    if (store.persist.hasHydrated()) {
      run();
      return;
    }
    const unsub = store.persist.onFinishHydration(run);
    return unsub;
  }, []);

  const auth = useAuth();
  useEffect(() => {
    if (auth.status !== 'authenticated') {
      if (auth.status === 'guest') stopSync();
      return;
    }
    void startSync();
    return () => stopSync();
  }, [auth.status]);

  return (
    <Routes>
      <Route element={<Layout auth={auth} />}>
        <Route index element={<Dashboard />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route
          path="/charts"
          element={
            <Suspense fallback={<ChartsFallback />}>
              <ChartsPage />
            </Suspense>
          }
        />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="*" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
