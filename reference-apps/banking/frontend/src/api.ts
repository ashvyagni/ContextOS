export interface Account {
  id: string;
  name: string;
  balance: number;
  currency: string;
  type?: string;
}

export interface Transaction {
  id: string;
  account_id: string;
  type?: string;
  kind?: string;
  amount: number;
  description: string;
  timestamp?: string;
}

export interface WithdrawRequest {
  amount: number;
  description: string;
}

export interface DepositRequest {
  amount: number;
  description: string;
}

export interface TransferRequest {
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description: string;
}

export async function fetchAccounts(): Promise<Account[]> {
  const res = await fetch('/accounts');
  if (!res.ok) throw new Error('Failed to fetch accounts');
  return res.json();
}

export async function fetchAccount(id: string): Promise<Account> {
  const res = await fetch(`/accounts/${id}`);
  if (!res.ok) throw new Error('Account not found');
  return res.json();
}

export async function withdrawFromAccount(
  accountId: string,
  data: WithdrawRequest
): Promise<Transaction> {
  const res = await fetch(`/accounts/${accountId}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Withdrawal failed');
  }
  return res.json();
}

export async function depositToAccount(
  accountId: string,
  data: DepositRequest
): Promise<Transaction> {
  const res = await fetch(`/accounts/${accountId}/deposit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Deposit failed');
  }
  return res.json();
}

export async function transferBetweenAccounts(
  data: TransferRequest
): Promise<Transaction> {
  const res = await fetch('/transfer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Transfer failed');
  }
  return res.json();
}

export async function fetchTransactions(
  accountId: string
): Promise<Transaction[]> {
  const res = await fetch(`/accounts/${accountId}/transactions`);
  if (!res.ok) throw new Error('Failed to fetch transactions');
  return res.json();
}
