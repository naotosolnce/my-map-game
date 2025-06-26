// src/services/locationService.ts
import { db } from '../firebase';
import { collection, doc, writeBatch, updateDoc, getDocs, query, where } from 'firebase/firestore';
import type { GeocodingResult } from './geocodingService';

export interface LocationData {
  id: string;
  areaId: string;
  address: string;              // 表示用の日本語住所
  mapboxAddress?: string;       // Mapboxの住所（参考用）
  lat: number;
  lng: number;
  status: 'uncompleted' | 'reserved' | 'uploading' | 'completed';
  // 予約関連
  reservedBy?: string | null;
  reservedAt?: Date | null;
  // 達成関連
  completedBy?: string | null;
  completedAt?: Date | null;
  photoUrl?: string | null;
  // 旧フィールド（後方互換性のため残す）
  achievedBy?: string;
  achievedAt?: Date;
  createdAt?: Date;
}

// 位置情報を一括保存
export const saveLocationsToFirestore = async (
  areaId: string,
  geocodingResults: GeocodingResult[]
): Promise<void> => {
  const batch = writeBatch(db);
  
  geocodingResults.forEach((result, index) => {
    const locationId = `${areaId}_${index}`;
    const locationRef = doc(db, 'locations', locationId);
    
    // データの検証
    const address = result.originalAddress || result.mapboxAddress || `住所${index + 1}`;
    const lat = isFinite(result.lat) ? result.lat : 0;
    const lng = isFinite(result.lng) ? result.lng : 0;
    
    batch.set(locationRef, {
      areaId,
      address: address,                                   // 日本語住所を保存
      mapboxAddress: result.mapboxAddress || null,        // Mapbox住所は参考用
      lat: lat,
      lng: lng,
      status: 'uncompleted',
      reservedBy: null,
      reservedAt: null,
      completedBy: null,
      completedAt: null,
      photoUrl: null,
      createdAt: new Date(),
    });
  });
  
  await batch.commit();
  console.log(`${geocodingResults.length}件のピンを保存しました（日本語住所使用）`);
};

// 位置情報のステータスを更新
export const updateLocationStatus = async (
  locationId: string,
  status: LocationData['status'],
  userId?: string
): Promise<void> => {
  const locationRef = doc(db, 'locations', locationId);
  const updateData: Partial<LocationData> = { status };
  
  switch (status) {
    case 'reserved':
      updateData.reservedBy = userId;
      updateData.reservedAt = new Date();
      break;
    case 'completed':
      updateData.completedBy = userId;
      updateData.completedAt = new Date();
      // 予約情報をクリア
      updateData.reservedBy = null;
      updateData.reservedAt = null;
      break;
    case 'uncompleted':
      // 全ての状態をクリア
      updateData.reservedBy = null;
      updateData.reservedAt = null;
      updateData.completedBy = null;
      updateData.completedAt = null;
      updateData.photoUrl = null;
      break;
  }
  
  await updateDoc(locationRef, updateData);
};

// 写真URLを更新
export const updateLocationPhoto = async (
  locationId: string,
  photoUrl: string
): Promise<void> => {
  const locationRef = doc(db, 'locations', locationId);
  await updateDoc(locationRef, {
    photoUrl,
    status: 'completed',
    completedAt: new Date(),
  });
};

// エリアのジオコーディング完了フラグを更新
export const updateAreaGeocoded = async (areaId: string): Promise<void> => {
  const areaRef = doc(db, 'areas', areaId);
  await updateDoc(areaRef, {
    geocoded: true,
    geocodedAt: new Date(),
  });
};

// エリアの位置情報を取得
export const getLocationsByAreaId = async (areaId: string): Promise<LocationData[]> => {
  const q = query(collection(db, 'locations'), where('areaId', '==', areaId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LocationData[];
};