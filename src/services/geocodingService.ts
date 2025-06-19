// src/services/geocodingService.ts

// MAPBOX Geocoding API
const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export interface GeocodingResult {
  lat: number;
  lng: number;
  fullAddress: string;
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult> => {
  if (!MAPBOX_ACCESS_TOKEN) {
    throw new Error('MAPBOX_ACCESS_TOKENが設定されていません');
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=jp&limit=1`;
    
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
    
    return {
      lat,
      lng,
      fullAddress: feature.place_name,
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
      // エラーでも処理を継続
    }
  }
  
  return results;
};