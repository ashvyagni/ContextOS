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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b654b]">Ledger</p>
          <h2 className="mt-2 text-3xl text-[#171410]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Transactions
          </h2>
        </div>
        <div className="rounded-full border border-[#d9c9ae] bg-[#f5efe5] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[#544837]">
          {accountId ? 'Filtered account view' : 'Select an account'}
        </div>
      </div>

      <div className="mb-6">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#5b4a3b]">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full max-w-md rounded-2xl border border-[#d9c9ae] bg-[#f5efe5] px-4 py-3 text-base text-[#171410] outline-none transition focus:border-[#9d7a45] focus:ring-4 focus:ring-[#e4d3af]"
        >
          <option value="">Select account</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-20 animate-pulse rounded-2xl border border-[#d9c9ae] bg-[#efe7da]" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-[#d7b7a4] bg-[#f6ebe2] px-4 py-3 text-sm font-medium text-[#6c3420]">
          {error}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const txType = tx.kind ?? tx.type ?? 'withdraw';
            const isDeposit = txType === 'deposit';

            return (
              <div key={tx.id} className="flex items-center justify-between gap-4 rounded-[24px] border border-[#d9c9ae] bg-[#f9f5ee] p-4 shadow-[0_12px_24px_rgba(17,16,14,0.04)]">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg ${
                      isDeposit ? 'bg-[#e9f5ee] text-[#214a3a]' : 'bg-[#f7e7e1] text-[#6c3420]'
                    }`}
                  >
                    {isDeposit ? '↗' : '↘'}
                  </div>
                  <div>
                    <p className="text-base font-semibold capitalize text-[#171410]">{txType}</p>
                    <p className="text-sm text-[#6a564a]">{tx.description || 'No description'}</p>
                    <p className="mt-1 text-xs text-[#8b7765]">{tx.timestamp || 'Recent activity'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`text-2xl ${isDeposit ? 'text-[#214a3a]' : 'text-[#6c3420]'}`}
                    style={{ fontFamily: 'Fraunces, Georgia, serif' }}
                  >
                    {isDeposit ? '+' : '-'}${tx.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7b654b]">USD</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {accountId && !loading && transactions.length === 0 && (
        <div className="rounded-[24px] border border-dashed border-[#d9c9ae] bg-[#f5efe5] px-6 py-10 text-center">
          <p className="text-lg font-medium text-[#171410]">No transactions found.</p>
          <p className="mt-2 text-sm text-[#6a564a]">This account has not recorded any movement yet.</p>
        </div>
      )}
    </div>
  );
}
