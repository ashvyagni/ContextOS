import { useState } from 'react';
import { AccountList } from './components/AccountList';
import { WithdrawForm } from './components/WithdrawForm';
import { DepositForm } from './components/DepositForm';
import { TransferForm } from './components/TransferForm';
import { TransactionList } from './components/TransactionList';

type Page = 'accounts' | 'withdraw' | 'deposit' | 'transfer' | 'transactions';

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'accounts', label: 'Account Management', icon: '◈' },
  { id: 'withdraw', label: 'Withdraw', icon: '↘' },
  { id: 'deposit', label: 'Deposit', icon: '↗' },
  { id: 'transfer', label: 'Transfer', icon: '⇄' },
  { id: 'transactions', label: 'List Transactions', icon: '▣' },
];

export default function App() {
  const [page, setPage] = useState<Page>('accounts');

  return (
    <div className="min-h-screen bg-[#efe7da] text-[#1d1a17]">
      <div className="mx-auto flex max-w-[1480px] gap-6 px-4 py-6 lg:px-6">
        <aside className="hidden w-[290px] shrink-0 flex-col glass premium-shadow-lg p-5 text-[#f5efe5] lg:flex">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8960e] text-sm font-bold text-[#11100e]">
              C
            </div>
            <div>
              <p className="text-sm font-semibold text-[#f5efe5] tracking-wide">ContextOS</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">Private Banking</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const active = page === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 cursor-pointer ${
                    active
                      ? 'bg-[rgba(212,175,55,0.2)] text-[#f5efe5] ring-1 ring-[rgba(212,175,55,0.3)]'
                      : 'text-[rgba(255,255,255,0.6)] hover:bg-[rgba(212,175,55,0.08)] hover:text-[#f5efe5]'
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-xl text-sm font-semibold ${
                      active ? 'bg-[#d4af37] text-[#11100e]' : 'bg-[rgba(212,175,55,0.1)] text-[#d4af37]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto glass-dark p-4 rounded-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4af37] opacity-80">
              Portfolio health
            </p>
            <div className="mt-3 flex items-end justify-between">
              <div>
                <p className="text-2xl text-[#f5efe5] font-display">92%</p>
                <p className="text-xs text-[rgba(255,255,255,0.5)]">Protected</p>
              </div>
              <div className="rounded-full border border-[#d4af37] bg-[rgba(212,175,55,0.1)] px-2.5 py-1 text-xs font-medium text-[#d4af37]">
                +2.4%
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <header className="mb-6 glass premium-shadow-lg p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a89070] opacity-70">
                  Client overview
                </p>
                <h1 className="mt-2 text-3xl text-[#f5efe5] sm:text-4xl font-display font-semibold">
                  Wealth dashboard
                </h1>
              </div>

              <div className="flex items-center gap-3 glass-dark px-4 py-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#d4af37] to-[#b8960e] text-xs font-semibold text-[#11100e]">
                  AR
                </div>
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-[#f5efe5]">Ariana Ross</p>
                  <p className="text-xs text-[rgba(255,255,255,0.5)]">Primary account holder</p>
                </div>
              </div>
            </div>
          </header>

          <div className="mb-5 flex gap-2 overflow-x-auto glass p-2 lg:hidden">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                  page === item.id ? 'bg-[#d4af37] text-[#11100e]' : 'glass-dark text-[#d4af37]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <main className="glass premium-shadow-lg p-4 sm:p-6">
            {page === 'accounts' && <AccountList />}
            {page === 'withdraw' && <WithdrawForm />}
            {page === 'deposit' && <DepositForm />}
            {page === 'transfer' && <TransferForm />}
            {page === 'transactions' && <TransactionList />}
          </main>
        </div>
      </div>
    </div>
  );
}
