import type { User } from '@/types';

const STORAGE_KEY = 'haven_auth_user';

const MOCK_USERS: (User & { password: string })[] = [
  { id: 'U-001', name: 'Praveen Singh', email: 'praveen@uniquehavenhomes.com', role: 'owner', password: 'owner123' },
  { id: 'U-002', name: 'Operations Admin', email: 'admin@uniquehavenhomes.com', role: 'admin', password: 'admin123' },
  { id: 'U-003', name: 'House Staff', email: 'staff@uniquehavenhomes.com', role: 'staff', password: 'staff123' },
];

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {
      id: 'U-001',
      name: 'Praveen Singh',
      email: 'praveen@uniquehavenhomes.com',
      role: 'owner',
    };
  } catch {
    return null;
  }
}

export async function loginUser(email: string, password: string): Promise<User> {
  await new Promise(r => setTimeout(r, 600));
  const found = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  if (!found) throw new Error('Invalid email or password. Use demo credentials shown below.');
  const { password: _, ...user } = found;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function logoutUser(): void {
  localStorage.removeItem(STORAGE_KEY);
}
