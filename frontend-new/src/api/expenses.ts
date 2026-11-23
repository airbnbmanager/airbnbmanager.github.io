import type { Expense } from '@/types';
import { mockExpenses } from '@/mocks/data';

let exps = [...mockExpenses];

export async function getExpenses(): Promise<Expense[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...exps];
}

export async function createExpense(payload: Omit<Expense, 'id' | 'created_at'>): Promise<Expense> {
  await new Promise(r => setTimeout(r, 300));
  const newExp: Expense = {
    ...payload,
    id: `EXP-${500 + exps.length + 1}`,
    created_at: new Date().toISOString().slice(0, 10),
  };
  exps.unshift(newExp);
  return newExp;
}

export async function deleteExpense(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 250));
  exps = exps.filter(e => e.id !== id);
}
