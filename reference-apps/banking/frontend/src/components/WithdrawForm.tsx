import { useState, useEffect } from 'react';
import { fetchAccounts, withdrawFromAccount, type Account } from '../api';

export function WithdrawForm() {
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

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const tx = await withdrawFromAccount(accountId, {
        amount: parseFloat(amount),
        description: description || 'Withdrawal',
      });
      setMessage(`Withdrawal successful: $${tx.amount.toFixed(2)} from ${tx.account_id}`);
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
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#a89070] opacity-70">Transfer out</p>
          <h2 className="mt-2 text-3xl text-[#f5efe5] font-display font-semibold">
            Withdraw funds
          </h2>
        </div>
        <div className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.1)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
          Cash movement
        </div>
      </div>

      <form onSubmit={handleWithdraw} className="space-y-5 glass p-5 sm:p-6">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a89070]">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-base text-[#f5efe5] outline-none transition focus:border-[rgba(212,175,55,0.5)] focus:ring-2 focus:ring-[rgba(212,175,55,0.15)] cursor-pointer"
          >
            <option value="" className="bg-[#1a1815]">Select account</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#1a1815]">
                {a.name} · {a.type || 'Checking'} · {a.currency} {a.balance.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a89070]">Amount</label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm font-medium text-[#d4af37]">
              $
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(255,255,255,0.05)] py-3 pl-8 pr-4 text-base text-[#f5efe5] placeholder:text-[rgba(255,255,255,0.3)] outline-none transition focus:border-[rgba(212,175,55,0.5)] focus:ring-2 focus:ring-[rgba(212,175,55,0.15)]"
              placeholder="0.00"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-[#a89070]">Description</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(255,255,255,0.05)] px-4 py-3 text-base text-[#f5efe5] placeholder:text-[rgba(255,255,255,0.3)] outline-none transition focus:border-[rgba(212,175,55,0.5)] focus:ring-2 focus:ring-[rgba(212,175,55,0.15)]"
            placeholder="e.g. Weekly transfer"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !accountId || !amount}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#d4af37] to-[#b8960e] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#11100e] transition hover:from-[#e8c95f] hover:to-[#d4af37] disabled:cursor-not-allowed disabled:from-[rgba(212,175,55,0.3)] disabled:to-[rgba(212,175,55,0.3)] disabled:text-[rgba(17,16,14,0.4)] cursor-pointer"
        >
          {loading ? 'Processing...' : 'Withdraw funds'}
        </button>

        {message && (
          <div className="rounded-2xl border border-[rgba(79,208,139,0.3)] bg-[rgba(79,208,139,0.1)] px-4 py-3 text-sm font-medium text-[#4fd08b]">
            {message}
          </div>
        )}
        {error && (
          <div className="rounded-2xl border border-[rgba(241,107,82,0.3)] bg-[rgba(241,107,82,0.1)] px-4 py-3 text-sm font-medium text-[#f16b52]">
            {error}
          </div>
        )}
      </form>
    </div>
  );
}
