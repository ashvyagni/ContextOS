import { useState, useEffect, useMemo } from 'react';
import { fetchAccounts, type Account } from '../api';
import { ScrollReveal } from './RevealAnimations';

const TYPE_OPTIONS = ['All', 'Checking', 'Savings', 'Investment', 'Business', 'Joint'];

const formatMoney = (currency: string, value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const maskAccountNumber = (id: string) => {
  const digits = (id || '').replace(/\D/g, '') || '0000';
  return `•••• ${digits.slice(-4) || '0000'}`;
};

export function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string>('All');
  const [query, setQuery] = useState('');

  useEffect(() => {
    fetchAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredAccounts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return accounts.filter((account) => {
      const accountType = account.type || 'Checking';
      const matchesType = activeType === 'All' || accountType === activeType;
      const matchesQuery =
        normalized.length === 0 ||
        account.name.toLowerCase().includes(normalized) ||
        account.id.toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [accounts, activeType, query]);

  const groupedAccounts = useMemo(() => {
    return filteredAccounts.reduce<Record<string, Account[]>>((grouped, account) => {
      const type = account.type || 'Checking';
      grouped[type] = grouped[type] ?? [];
      grouped[type].push(account);
      return grouped;
    }, {});
  }, [filteredAccounts]);

  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0);
  const avgBalance = accounts.length ? totalBalance / accounts.length : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse glass rounded-2xl" />
          ))}
        </div>
        <div className="h-48 animate-pulse glass rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass p-5 text-[#e8c95f] border-[rgba(232,201,95,0.3)]">
        <p className="font-semibold">Unable to load accounts</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a89070] opacity-70">Overview</p>
          <h2 className="mt-2 text-3xl text-[#f5efe5]" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
            Accounts
          </h2>
        </div>

        <div className="flex w-full max-w-md items-center gap-2 glass px-3 py-2.5">
          <span className="text-lg text-[#d4af37]">⌕</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search accounts"
            className="w-full border-0 bg-transparent text-sm text-[#f5efe5] placeholder:text-[rgba(255,255,255,0.4)] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TYPE_OPTIONS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveType(type)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition ${
              activeType === type
                ? 'border-[#d4af37] bg-gradient-to-r from-[#d4af37] to-[#b8960e] text-[#11100e]'
                : 'border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-[#d4af37]'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-dark p-5 text-[#f5efe5]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4af37] opacity-80">Total balance</p>
          <p className="mt-3 text-3xl text-[#f5efe5]" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
            {formatMoney('USD', totalBalance)}
          </p>
        </div>
        <div className="glass p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a89070] opacity-70">Monthly activity</p>
          <p className="mt-3 text-3xl text-[#f5efe5]" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
            {formatMoney('USD', totalBalance * 0.08)}
          </p>
        </div>
        <div className="glass p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a89070] opacity-70">Average balance</p>
          <p className="mt-3 text-3xl text-[#f5efe5]" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
            {formatMoney('USD', avgBalance)}
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {Object.entries(groupedAccounts).map(([type, items], groupIndex) => (
          <ScrollReveal key={type} delay={groupIndex * 0.1}>
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.26em] text-[#a89070] opacity-70">{type}</h3>
                <span className="glass px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                  {items.length} accounts
                </span>
              </div>

              <div className="space-y-4">
                {items.map((account, itemIndex) => (
                  <ScrollReveal key={account.id} delay={itemIndex * 0.05}>
                <article
                  className="overflow-hidden glass premium-shadow p-5"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#d4af37] to-[#b8960e] text-xs font-semibold uppercase tracking-[0.12em] text-[#11100e]">
                        {account.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-lg font-medium text-[#f5efe5]">{account.name}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <span className="glass px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
                            {account.type || 'Checking'}
                          </span>
                          <span className="text-xs text-[rgba(255,255,255,0.5)]">{maskAccountNumber(account.id)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#a89070] opacity-70">Available</p>
                      <p className="mt-2 text-3xl text-[#f5efe5]" style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 600 }}>
                        {formatMoney(account.currency, account.balance)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-[rgba(212,175,55,0.1)] pt-4 text-sm text-[rgba(255,255,255,0.4)]">
                    <span>{account.id}</span>
                    <span>{account.currency}</span>
                  </div>
                </article>
                  </ScrollReveal>
                ))}
              </div>
            </section>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
