export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export const USE_MOCK = import.meta.env.VITE_MOCK_API === 'true';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${await response.text()}`);
  }
  return response.json();
}
