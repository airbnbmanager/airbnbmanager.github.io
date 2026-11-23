import type { DashboardStats } from '@/types';
import { mockDashboardStats } from '@/mocks/data';

export async function getDashboardStats(): Promise<DashboardStats> {
  await new Promise(r => setTimeout(r, 250));
  return mockDashboardStats;
}
