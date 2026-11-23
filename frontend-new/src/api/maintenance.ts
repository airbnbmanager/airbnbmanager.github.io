import type { MaintenanceTicket } from '@/types';
import { mockMaintenanceTickets } from '@/mocks/data';

let tickets = [...mockMaintenanceTickets];

export async function getMaintenanceTickets(): Promise<MaintenanceTicket[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...tickets];
}

export async function createMaintenanceTicket(payload: Omit<MaintenanceTicket, 'id'>): Promise<MaintenanceTicket> {
  await new Promise(r => setTimeout(r, 300));
  const newTicket: MaintenanceTicket = {
    ...payload,
    id: `MNT-${300 + tickets.length + 1}`,
  };
  tickets.unshift(newTicket);
  return newTicket;
}

export async function updateMaintenanceTicket(id: string, payload: Partial<MaintenanceTicket>): Promise<MaintenanceTicket> {
  await new Promise(r => setTimeout(r, 250));
  const idx = tickets.findIndex(t => t.id === id);
  if (idx === -1) throw new Error('Ticket not found');
  tickets[idx] = { ...tickets[idx], ...payload };
  return tickets[idx];
}
