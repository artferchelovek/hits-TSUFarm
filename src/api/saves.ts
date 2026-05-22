import { apiRequest } from "./client.ts";

export interface CloudSaveMeta {
  slot: number;
  name: string | null;
  timestamp: number | null;
  updatedAt: string | null;
}

export interface CloudSaveData {
  id: number;
  userId: number;
  slot: number;
  name: string;
  gameState: Record<string, unknown>;
  worldData: string;
  timestamp: number;
  createdAt: string;
  updatedAt: string;
}

export function listSaves() {
  return apiRequest<CloudSaveMeta[]>("GET", "/saves");
}

export function saveToSlot(
  slot: number,
  data: { name?: string; gameState: unknown; worldData: string },
) {
  return apiRequest<CloudSaveData>("PUT", `/saves/${slot}`, data);
}

export function loadFromSlot(slot: number) {
  return apiRequest<CloudSaveData>("GET", `/saves/${slot}`);
}

export function deleteSlot(slot: number) {
  return apiRequest<void>("DELETE", `/saves/${slot}`);
}
