import { NavLink, Outlet } from 'react-router-dom';
import { useTheme, type ThemeChoice } from '../hooks/useTheme';
import type { AuthState } from '../hooks/useAuth';
import { authRoutes } from '../lib/api';
import { useExpenseStore } from '../store/expenseStore';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/expenses', label: 'Expenses' },
  { to: '/charts', label: 'Charts' },
  { to: '/recurring', label: 'Recurring' },
  { to: '/categories', label: 'Categories' },
];

const CHOICE_ICON: Record<ThemeChoice, string> = {
  light: '☀️',
  dark: '🌙',
  system: '🖥️',
};
const CHOICE_LABEL: Record<ThemeChoice, string> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

interface Props {
  auth: AuthState;
}

export default function Layout({ auth }: Props) {
  const { choice, cycle } = useTheme();
  const syncStatus = useExpenseStore((s) => s.syncStatus);

  return (
    <div className="min-h-full">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-teal-600 text-sm font-bold text-white">
              $
            </span>
            <h1 className="text-lg font-semibold tracking-tight">Expense Tracker</h1>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex flex-wrap gap-1">
              {links.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    [
                      'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                    ].join(' ')
                  }
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
            <AuthBadge auth={auth} syncStatus={syncStatus} />
            <button
              type="button"
              onClick={cycle}
              title={`Theme: ${CHOICE_LABEL[choice]} (click to cycle)`}
              aria-label={`Theme: ${CHOICE_LABEL[choice]}. Click to change.`}
              className="ml-1 grid h-8 w-8 place-items-center rounded-md text-base text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {CHOICE_ICON[choice]}
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-5xl px-4 pb-8 pt-2 text-center text-xs text-slate-400 dark:text-slate-500">
        {auth.status === 'authenticated'
          ? 'Signed in — changes sync to your Azure account.'
          : 'Local-first. Data lives in your browser.'}
      </footer>
    </div>
  );
}

function AuthBadge({
  auth,
  syncStatus,
}: {
  auth: AuthState;
  syncStatus: 'guest' | 'idle' | 'syncing' | 'error';
}) {
  if (auth.status === 'loading') {
    return (
      <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline">
        …
      </span>
    );
  }

  if (auth.status === 'guest') {
    return (
      <a
        href={authRoutes.loginGitHub}
        className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        title="Sign in with GitHub to sync across devices"
      >
        Sign in
      </a>
    );
  }

  const syncLabel =
    syncStatus === 'syncing'
      ? 'Syncing…'
      : syncStatus === 'error'
        ? 'Sync error'
        : 'Synced';
  const syncColor =
    syncStatus === 'error'
      ? 'text-rose-600 dark:text-rose-400'
      : 'text-slate-400 dark:text-slate-500';

  return (
    <div className="flex items-center gap-2">
      <span className="hidden flex-col items-end text-right text-[10px] leading-tight sm:flex">
        <span className="font-medium text-slate-700 dark:text-slate-200">
          {auth.principal.userDetails}
        </span>
        <span className={syncColor}>{syncLabel}</span>
      </span>
      <a
        href={authRoutes.logout}
        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        title="Sign out"
      >
        Sign out
      </a>
    </div>
  );
}
