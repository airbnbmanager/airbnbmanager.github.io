import type { Investor } from '@/types';
import { mockInvestors } from '@/mocks/data';

let invs = [...mockInvestors];

export async function getInvestors(): Promise<Investor[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...invs];
}

export async function createInvestor(payload: Omit<Investor, 'investor_id'>): Promise<Investor> {
  await new Promise(r => setTimeout(r, 300));
  const newInv: Investor = {
    ...payload,
    investor_id: `INV-${String(invs.length + 1).padStart(2, '0')}`,
  };
  invs.unshift(newInv);
  return newInv;
}
