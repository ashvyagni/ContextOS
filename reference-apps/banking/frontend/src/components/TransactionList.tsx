import { useState, useEffect } from 'react';
import { fetchAccounts, fetchTransactions, type Account, type Transaction } from '../api';

export function TransactionList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
  }, []);

  useEffect(() => {
    if (!accountId) {
      setTransactions([]);
      return;
    }
    setLoading(true);
    fetchTransactions(accountId)
      .then(setTransactions)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [accountId]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a89070] opacity-70">Ledger</p>
          <h2 className="mt-2 text-3xl text-[#f5efe5] font-display font-semibold">
            Transactions
          </h2>
        </div>
        <div className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#d4af37]">
          {accountId ? 'Filtered account view' : 'Select an account'}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a89070]">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-base text-[#f5efe5] outline-none transition focus:border-[rgba(212,175,55,0.5)] focus:ring-2 focus:ring-[rgba(212,175,55,0.15)] cursor-pointer"
        >
          <option value="" className="bg-[#1a1815]">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id} className="bg-[#1a1815]">
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse glass rounded-2xl" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[rgba(241,107,82,0.3)] bg-[rgba(241,107,82,0.1)] px-4 py-3 text-sm font-medium text-[#f16b52]">
          {error}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const txType = tx.kind ?? tx.type ?? 'withdraw';
            const isDeposit = txType === 'deposit';

            return (
              <div key={tx.id} className="glass flex items-center justify-between gap-4 p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${
                      isDeposit
                        ? 'bg-[rgba(79,208,139,0.15)] text-[#4fd08b]'
                        : 'bg-[rgba(241,107,82,0.15)] text-[#f16b52]'
                    }`}
                  >
                    {isDeposit ? '↗' : '↘'}
                  </div>
                  <div>
                    <p className="text-base font-semibold capitalize text-[#f5efe5]">{txType}</p>
                    <p className="text-sm text-[rgba(255,255,255,0.6)]">{tx.description || 'No description'}</p>
                    <p className="mt-1 text-xs text-[rgba(255,255,255,0.4)]">{tx.timestamp || 'Recent activity'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-2xl font-display font-semibold ${isDeposit ? 'text-[#4fd08b]' : 'text-[#f16b52]'}`}
                  >
                    {isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[rgba(255,255,255,0.5)]">USD</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {accountId && !loading && transactions.length === 0 && (
        <div className="glass rounded-2xl border-dashed px-6 py-10 text-center">
          <p className="text-lg font-medium text-[#f5efe5]">No transactions found.</p>
          <p className="mt-2 text-sm text-[rgba(255,255,255,0.5)]">This account has not recorded any movement yet.</p>
        </div>
      )}
    </div>
  );
}
