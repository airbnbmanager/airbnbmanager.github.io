import type { Room } from '@/types';
import { mockRooms } from '@/mocks/data';

let roomsData = [...mockRooms];

export async function getRooms(): Promise<Room[]> {
  await new Promise(r => setTimeout(r, 200));
  return [...roomsData];
}

export async function getRoomById(id: string): Promise<Room | null> {
  await new Promise(r => setTimeout(r, 120));
  return roomsData.find(r => r.room_id === id) || null;
}

export async function updateRoom(id: string, payload: Partial<Room>): Promise<Room> {
  await new Promise(r => setTimeout(r, 300));
  const idx = roomsData.findIndex(r => r.room_id === id);
  if (idx === -1) throw new Error('Room not found');
  roomsData[idx] = { ...roomsData[idx], ...payload };
  return roomsData[idx];
}
