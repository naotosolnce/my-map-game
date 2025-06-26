// src/types/index.ts 完全版

// PinStatusに'editing'を追加
export type PinStatus = 'uncompleted' | 'reserved' | 'uploading' | 'completed' | 'editing';

// LocationDataにupdatedAtを追加
export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  status: PinStatus;
  address?: string;
  areaId?: string;
  title?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null; // 新規追加
  reservedAt?: Date | null;
  completedAt?: Date | null;
  reservedBy?: string | null;
  completedBy?: string | null;
  photoUrl?: string | null;
}