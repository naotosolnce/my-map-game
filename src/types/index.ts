// src/types/index.ts
// import type { Timestamp } from 'firebase/firestore'; // もしFirestoreのTimestamp型を直接扱う場合

export type PinStatus = 'uncompleted' | 'reserved' | 'uploading' | 'completed';

export interface LocationData {
  id: string;
  lat: number;
  lng: number;
  status: PinStatus;
  address?: string; // オプショナル
  areaId?: string;  // オプショナル

  // アプリケーションで必要になる可能性のあるフィールド
  title?: string; // ピンのカスタムタイトル (オプショナル)

  reservedBy?: string | null;   // 予約者のUID
  reservedAt?: Date | null;     // 予約日時 (Dateオブジェクトに変換後)
                                // (Firestoreから直接なら Timestamp | null)

  completedBy?: string | null;  // 達成者のUID
  completedAt?: Date | null;    // 達成日時 (Dateオブジェクトに変換後)
                                // (Firestoreから直接なら Timestamp | null)

  photoUrl?: string | null;     // 達成写真のURL

  createdAt?: Date | null;      // ピン作成日時 (Dateオブジェクトに変換後)
                                // (Firestoreから直接なら Timestamp | null)

  // その他、ゲームに必要な情報があれば追加
  // description?: string;
  // points?: number;
}