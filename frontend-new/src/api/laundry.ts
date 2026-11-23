import type { LaundryRecord } from '@/types';
import { mockLaundryRecords } from '@/mocks/data';

let laundries = [...mockLaundryRecords];

export async function getLaundryRecords(): Promise<LaundryRecord[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...laundries];
}

export async function createLaundryRecord(payload: Omit<LaundryRecord, 'id'>): Promise<LaundryRecord> {
  await new Promise(r => setTimeout(r, 300));
  const newRec: LaundryRecord = {
    ...payload,
    id: `LND-${200 + laundries.length + 1}`,
  };
  laundries.unshift(newRec);
  return newRec;
}

export async function updateLaundryStatus(id: string, status: LaundryRecord['status']): Promise<LaundryRecord> {
  await new Promise(r => setTimeout(r, 250));
  const idx = laundries.findIndex(l => l.id === id);
  if (idx === -1) throw new Error('Record not found');
  laundries[idx].status = status;
  return laundries[idx];
}
