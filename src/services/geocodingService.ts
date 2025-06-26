// src/services/geocodingService.ts

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export interface GeocodingResult {
  lat: number;
  lng: number;
  originalAddress: string;    // 元の日本語住所
  mapboxAddress: string;      // Mapboxの住所（参考用）
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('MAPBOX_ACCESS_TOKENが設定されていません');
  }

  if (!address || address.trim() === '') {
    throw new Error('住所が空です');
  }

  try {
    const encodedAddress = encodeURIComponent(address.trim());
    // 日本語優先設定を追加
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=jp&language=ja&limit=1`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('ジオコーディングAPIエラー');
    }
    
    const data = await response.json();
    
    if (!data.features || data.features.length === 0) {
      throw new Error(`住所が見つかりません: ${address}`);
    }
    
    const feature = data.features[0];
    const [lng, lat] = feature.center;
    
    // 数値チェック
    if (!isFinite(lat) || !isFinite(lng)) {
      throw new Error(`無効な座標: ${address}`);
    }
    
    return {
      lat,
      lng,
      originalAddress: address.trim(),                    // 元の住所をそのまま保持
      mapboxAddress: feature.place_name || 'Mapbox住所取得失敗',  // Mapboxの住所は参考用
    };
  } catch (error) {
    console.error('ジオコーディングエラー:', error);
    throw error;
  }
};

// 複数住所を順次処理（API制限対策）
export const geocodeAddresses = async (
  addresses: string[],
  onProgress?: (current: number, total: number) => void
): Promise<GeocodingResult[]> => {
  const results: GeocodingResult[] = [];
  
  for (let i = 0; i < addresses.length; i++) {
    try {
      // API制限回避のため1秒待機
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const result = await geocodeAddress(addresses[i]);
      results.push(result);
      
      if (onProgress) {
        onProgress(i + 1, addresses.length);
      }
    } catch (error) {
      console.error(`住所処理失敗: ${addresses[i]}`, error);
      // エラーの場合でも元住所だけは保持（座標は0,0）
      results.push({
        lat: 0,
        lng: 0,
        originalAddress: addresses[i] || `住所${i + 1}`,
        mapboxAddress: 'ジオコーディング失敗'
      });
    }
  }
  
  return results;
};