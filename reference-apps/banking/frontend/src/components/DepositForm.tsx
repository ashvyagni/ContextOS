import { useState, useEffect } from 'react';
import { fetchAccounts, depositToAccount, type Account } from '../api';

export function DepositForm() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts().then(setAccounts);
  }, []);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const tx = await depositToAccount(accountId, {
        amount: parseFloat(amount),
        description: description || 'Deposit',
      });
      setMessage(`Deposit successful: ${tx.amount} to ${tx.account_id}`);
      setAmount('');
      setDescription('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7b654b]">Cash in</p>
          <h2 className="mt-2 text-3xl text-[#171410]" style={{ fontFamily: 'Fraunces, Georgia, serif' }}>
            Deposit funds
          </h2>
        </div>
        <div className="rounded-full border border-[#a4c4b0] bg-[#e7f0ea] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#214a3a]">
          Incoming credit
        </div>
      </div>

      <form onSubmit={handleDeposit} className="space-y-5 rounded-[28px] border border-[#d9c9ae] bg-[#f9f5ee] p-5 shadow-[0_14px_28px_rgba(17,16,14,0.04)] sm:p-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#5b4a3b]">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-2xl border border-[#d9c9ae] bg-[#f5efe5] px-4 py-3 text-base text-[#171410] outline-none transition focus:border-[#9d7a45] focus:ring-4 focus:ring-[#e4d3af]"
          >
            <option value="">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.type || 'Checking'} · {a.currency} {a.balance.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#5b4a3b]">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-[#5b4a3b]">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-[#d9c9ae] bg-[#f5efe5] py-3 pl-8 pr-4 text-base text-[#171410] outline-none transition focus:border-[#9d7a45] focus:ring-4 focus:ring-[#e4d3af]"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#5b4a3b]">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-[#d9c9ae] bg-[#f5efe5] px-4 py-3 text-base text-[#171410] outline-none transition focus:border-[#9d7a45] focus:ring-4 focus:ring-[#e4d3af]"
            placeholder="e.g. Salary deposit"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !accountId || !amount}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-[#8b6e42] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f9f5ee] transition hover:bg-[#705630] disabled:cursor-not-allowed disabled:bg-[#cabda4] disabled:text-[#5b4a3b]"
        >
          {loading ? 'Processing...' : 'Deposit funds'}
        </button>

        {message && (
          <div className="rounded-2xl border border-[#a9c6b0] bg-[#eaf4ed] px-4 py-3 text-sm font-medium text-[#204e38]">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-[#d7b7a4] bg-[#f6ebe2] px-4 py-3 text-sm font-medium text-[#6c3420]">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
