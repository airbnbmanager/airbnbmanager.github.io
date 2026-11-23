import type { Guest } from '@/types';
import { mockGuests } from '@/mocks/data';

let guestsData = [...mockGuests];

export async function getGuests(): Promise<Guest[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...guestsData];
}

export async function getGuestById(id: string): Promise<Guest | null> {
  await new Promise(r => setTimeout(r, 120));
  return guestsData.find(g => g.id === id) || null;
}

export async function createGuest(payload: Omit<Guest, 'id' | 'created_at'>): Promise<Guest> {
  await new Promise(r => setTimeout(r, 300));
  const newGuest: Guest = {
    ...payload,
    id: `G-${String(guestsData.length + 1).padStart(3, '0')}`,
    created_at: new Date().toISOString().slice(0, 10),
  };
  guestsData.unshift(newGuest);
  return newGuest;
}

export async function updateGuest(id: string, payload: Partial<Guest>): Promise<Guest> {
  await new Promise(r => setTimeout(r, 300));
  const idx = guestsData.findIndex(g => g.id === id);
  if (idx === -1) throw new Error('Guest not found');
  guestsData[idx] = { ...guestsData[idx], ...payload };
  return guestsData[idx];
}
