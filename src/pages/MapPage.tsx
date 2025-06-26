// src/pages/MapPage.tsx 最終版（エラー修正済み + 進捗表示機能追加）
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';

import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import PinMarker from '../components/PinMarker';
import PinDetailModal from '../components/PinDetailModal';
import type { LocationData, PinStatus } from '../types';

import { db, auth } from '../firebase';
import { checkAreaEditPermission } from '../services/authService';
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import ProgressDisplay from '../components/ProgressDisplay';

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (MAPBOX_ACCESS_TOKEN) { 
  mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN; 
} else { 
  console.warn("[MapPage] Mapbox Token not set."); 
}

const MapPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const activeMarkersRef = useRef<Map<string, { marker: mapboxgl.Marker; root: Root }>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<LocationData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState<boolean>(false);

  // 編集モード用のstate
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [tempEditPosition, setTempEditPosition] = useState<{lat: number, lng: number} | null>(null);

  // 検索機能のstate
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<LocationData[]>([]);
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false);

  // エリア編集権限チェック
  const [canEditArea, setCanEditArea] = useState<boolean>(false);

  // 進捗表示機能のstate
  const [isProgressVisible, setIsProgressVisible] = useState<boolean>(false);

  // 進捗表示トグル関数
  const toggleProgressDisplay = () => {
    setIsProgressVisible(prev => !prev);
  };

  useEffect(() => {
    const checkPermissions = async () => {
      if (!currentUser || !areaId) {
        setCanEditArea(false);
        return;
      }

      try {
        const hasPermission = await checkAreaEditPermission(currentUser, areaId);
        setCanEditArea(hasPermission);
      } catch (error) {
        console.error('権限チェックエラー:', error);
        setCanEditArea(false);
      }
    };

    checkPermissions();
  }, [currentUser, areaId]);

  // ピン位置更新関数
  const updatePinPosition = async (pinId: string, newLat: number, newLng: number): Promise<void> => {
    try {
      const pinRef = doc(db, 'locations', pinId);
      await updateDoc(pinRef, {
        lat: newLat,
        lng: newLng,
        updatedAt: serverTimestamp()
      });
      console.log(`Pin ${pinId} position updated to: ${newLat}, ${newLng}`);
    } catch (error) {
      console.error('Error updating pin position:', error);
      setPageError('ピン位置の更新に失敗しました');
      throw error;
    }
  };

  // 編集モード開始関数
  const startEditMode = (pinId: string) => {
    if (!canEditArea) {
      setPageError('このエリアの編集権限がありません');
      return;
    }
    const targetPin = locations.find(loc => loc.id === pinId);
    if (targetPin) {
      setTempEditPosition({ lat: targetPin.lat, lng: targetPin.lng });
    }
    setIsEditMode(true);
    setEditingPinId(pinId);
    setSelectedPin(null);
  };

  // 編集保存関数
  const saveEditPosition = async () => {
    if (!editingPinId || !tempEditPosition) {
      setPageError('保存する位置情報がありません');
      return;
    }
    
    try {
      await updatePinPosition(editingPinId, tempEditPosition.lat, tempEditPosition.lng);
      
      // 該当マーカーのみ削除
      const existingMarker = activeMarkersRef.current.get(editingPinId);
      if (existingMarker) {
        existingMarker.root.unmount();
        existingMarker.marker.remove();
        activeMarkersRef.current.delete(editingPinId);
      }
      
      // 編集モード終了
      setIsEditMode(false);
      setEditingPinId(null);
      setTempEditPosition(null);
      
      console.log(`Pin ${editingPinId} position saved successfully`);
    } catch (error) {
      console.error('位置保存エラー:', error);
      setPageError('位置の保存に失敗しました');
    }
  };

  // 編集モードキャンセル関数
  const cancelEditMode = () => {
    setIsEditMode(false);
    setEditingPinId(null);
    setTempEditPosition(null);
  };

  useEffect(() => { 
    const unsub = auth.onAuthStateChanged(user => { 
      setCurrentUser(user); 
      setAuthLoading(false); 
    }); 
    return () => unsub();
  }, []);

  useEffect(() => { 
    if (!areaId || authLoading) { 
      console.log(authLoading? "Auth loading, skip fetch" : "No areaId, skip fetch"); 
      return; 
    }
    setPageError(null);
    const q = query(collection(db, 'locations'), where('areaId', '==', areaId));
    const unsub = onSnapshot(q, snapshot => {
        // 編集モード中はスキップ
        if (isEditMode && editingPinId) {
          console.log(`Skipping update - editing pin ${editingPinId}`);
          return;
        }
        
        const fetched: LocationData[] = [];
        snapshot.forEach(d => {
            const data = d.data();
            const stat = data.status as PinStatus;
            const isValidStat = ['uncompleted', 'reserved', 'uploading', 'completed'].includes(stat);
            if (typeof data.lat === 'number' && isFinite(data.lat) && typeof data.lng === 'number' && isFinite(data.lng) && isValidStat) {
                fetched.push({
                    id: d.id, lat: data.lat, lng: data.lng, status: stat,
                    address: typeof data.address === 'string' ? data.address : undefined,
                    areaId: typeof data.areaId === 'string' ? data.areaId : undefined,
                    title: typeof data.title === 'string' ? data.title : undefined,
                    createdAt: (data.createdAt?.toDate) ? data.createdAt.toDate() : null,
                    reservedAt: (data.reservedAt?.toDate) ? data.reservedAt.toDate() : null,
                    completedAt: (data.completedAt?.toDate) ? data.completedAt.toDate() : null,
                    reservedBy: typeof data.reservedBy === 'string' ? data.reservedBy : null,
                    completedBy: typeof data.completedBy === 'string' ? data.completedBy : null,
                    photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : null,
                });
            } else { 
              console.warn(`Invalid data for ${d.id}`, data); 
            }
        });
        setLocations(fetched);
    }, err => { 
      console.error("Error fetching locations:", err); 
      setPageError("Data fetch error"); 
    });
    return () => unsub();
  }, [areaId, authLoading, isEditMode, editingPinId]);

  // 検索処理
  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();
    const results = locations.filter(location => {
      if (location.address && location.address.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      if (location.title && location.title.toLowerCase().includes(normalizedQuery)) {
        return true;
      }
      return false;
    });

    results.sort((a, b) => {
      const aAddressIndex = a.address?.toLowerCase().indexOf(normalizedQuery) ?? 999;
      const bAddressIndex = b.address?.toLowerCase().indexOf(normalizedQuery) ?? 999;
      const aTitleIndex = a.title?.toLowerCase().indexOf(normalizedQuery) ?? 999;
      const bTitleIndex = b.title?.toLowerCase().indexOf(normalizedQuery) ?? 999;
      
      const aMinIndex = Math.min(aAddressIndex, aTitleIndex);
      const bMinIndex = Math.min(bAddressIndex, bTitleIndex);
      
      return aMinIndex - bMinIndex;
    });

    setSearchResults(results);
  }, [locations]);

  // 検索結果のピンを選択
  const handleSearchResultSelect = useCallback((location: LocationData) => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchVisible(false);
    
    if (mapRef.current && typeof location.lng === 'number' && typeof location.lat === 'number') {
      mapRef.current.flyTo({
        center: [location.lng, location.lat],
        zoom: 16,
        duration: 1000
      });
    }
    
    setSelectedPin(location);
  }, []);

  // 検索をクリア
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  useEffect(() => { 
    if (!MAPBOX_ACCESS_TOKEN || mapRef.current || !mapContainerRef.current || authLoading) return;
    try {
        const map = new mapboxgl.Map({ 
          container: mapContainerRef.current!, 
          style: 'mapbox://styles/mapbox/streets-v11', 
          center: [139.76, 35.68], 
          zoom: 12 
        });
        mapRef.current = map;
        map.on('load', () => setIsMapLoaded(true));
        map.on('error', e => setPageError(`Map error: ${e.error?.message || 'Unknown'}`));
    } catch(e: any) { 
      setPageError(`Map init error: ${e?.message || 'Unknown'}`); 
    }
    return () => { 
      mapRef.current?.remove(); 
      mapRef.current = null; 
      setIsMapLoaded(false); 
    };
  }, [authLoading]);

  const handlePinClick = useCallback((location: LocationData) => { 
    setSelectedPin(location); 
    if (mapRef.current && typeof location.lng==='number' && typeof location.lat==='number') 
      mapRef.current.flyTo({center:[location.lng, location.lat], zoom:15}); 
  }, []);

  const updateSelectedPinState = (updates: Partial<LocationData>) => {
    setSelectedPin(prev => (prev) ? { ...prev, ...updates } : null);
  };

  const handleReservePin = async (pinId: string): Promise<void> => { 
    if (!currentUser) { 
      setPageError("Login required"); 
      return Promise.reject(new Error("Not logged in")); 
    }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'uncompleted') { 
      setPageError("Cannot reserve"); 
      return Promise.reject(new Error("Not reservable")); 
    }
    const pinRef = doc(db, "locations", pinId);
    const updateData = { 
      status: "reserved" as PinStatus, 
      reservedBy: currentUser.uid, 
      reservedAt: serverTimestamp() 
    };
    try { 
      await updateDoc(pinRef, updateData); 
      updateSelectedPinState({ 
        status: "reserved", 
        reservedBy: currentUser.uid, 
        reservedAt: new Date() 
      }); 
    }
    catch (e) { 
      console.error("Reserve err:", e); 
      setPageError("予約失敗"); 
      return Promise.reject(e); 
    }
  };

  const handleCancelReservation = async (pinId: string): Promise<void> => { 
    if (!currentUser) { 
      setPageError("Login required"); 
      return Promise.reject(new Error("Not logged in")); 
    }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'reserved') { 
      setPageError("Not reserved"); 
      return Promise.reject(new Error("Not reserved")); 
    }
    if (selectedPin.reservedBy !== currentUser.uid) { 
      setPageError("Not owner"); 
      return Promise.reject(new Error("Permission denied")); 
    }
    const pinRef = doc(db, "locations", pinId);
    const updateData = { 
      status: "uncompleted" as PinStatus, 
      reservedBy: null, 
      reservedAt: null 
    };
    try { 
      await updateDoc(pinRef, updateData); 
      updateSelectedPinState({ 
        status: "uncompleted", 
        reservedBy: null, 
        reservedAt: null 
      }); 
    }
    catch (e) { 
      console.error("Cancel reserve err:", e); 
      setPageError("予約解除失敗"); 
      return Promise.reject(e); 
    }
  };

  const handleAchievePin = async (pinId: string): Promise<void> => {
    if (!currentUser) { 
      setPageError("ログインが必要です"); 
      return Promise.reject(new Error("Not logged in")); 
    }
    if (!selectedPin || selectedPin.id !== pinId) { 
      setPageError("ピン未選択"); 
      return Promise.reject(new Error("Pin not selected")); 
    }
    const canAchieve = selectedPin.status === 'uncompleted' || selectedPin.status === 'reserved';
    if (!canAchieve) { 
      setPageError("達成できません"); 
      return Promise.reject(new Error("Not achievable")); 
    }

    const originalStatus = selectedPin.status;
    const pinRef = doc(db, "locations", pinId);
    setPageError(null);

    try {
      updateSelectedPinState({ status: 'uploading' });
      console.log(`[MapPage] Achieving pin ${pinId} by ${currentUser.uid} (no photo).`);

      await updateDoc(pinRef, {
        status: "completed" as PinStatus,
        completedBy: currentUser.uid,
        completedAt: serverTimestamp(),
        photoUrl: null,
        reservedBy: null,
        reservedAt: null,
      });
      updateSelectedPinState({ 
        status: 'completed', 
        completedBy: currentUser.uid, 
        completedAt: new Date(), 
        photoUrl: null, 
        reservedBy: null, 
        reservedAt: null 
      });
    } catch (error) {
      console.error(`[MapPage] Error achieving pin ${pinId}:`, error);
      setPageError(`達成処理エラー: ${error instanceof Error ? error.message : String(error)}`);
      updateSelectedPinState({ status: originalStatus });
      return Promise.reject(error);
    }
  };

  const handleCancelAchievement = async (pinId: string): Promise<void> => { 
    if (!currentUser) { 
      setPageError("Login required"); 
      return Promise.reject(new Error("Not logged in")); 
    }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'completed') { 
      setPageError("Not completed"); 
      return Promise.reject(new Error("Not completed")); 
    }
    if (selectedPin.completedBy !== currentUser.uid) { 
      setPageError("Not owner"); 
      return Promise.reject(new Error("Permission denied")); 
    }
    const pinRef = doc(db, "locations", pinId);
    try {
        await updateDoc(pinRef, { 
          status: "uncompleted", 
          completedBy: null, 
          completedAt: null, 
          photoUrl: null 
        });
        updateSelectedPinState({ 
          status: 'uncompleted', 
          completedBy: null, 
          completedAt: null, 
          photoUrl: null 
        });
    } catch (e) { 
      console.error("Cancel achieve err:", e); 
      setPageError("Cancel achieve failed"); 
      return Promise.reject(e); 
    }
  };

  // 現在地マーカーを更新する関数
  const updateUserLocationMarker = (lat: number, lng: number, heading?: number) => {
    if (!mapRef.current) return;

    if (userLocationMarkerRef.current) {
      userLocationMarkerRef.current.remove();
    }

    const el = document.createElement('div');
    const rotation = heading !== undefined ? heading : 0;
    
    el.innerHTML = `
      <div style="
        width: 28px; 
        height: 28px; 
        background: rgba(255, 255, 255, 0.6); 
        border-radius: 50%; 
        border: 2px solid rgba(255, 255, 255, 0.8); 
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(1);
        transform-origin: center;
      ">
        <div style="
          transform: rotate(${rotation}deg);
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-bottom: 14px solid #ff4444;
          filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
        "></div>
      </div>
    `;
    
    const marker = new mapboxgl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(mapRef.current);
      
    userLocationMarkerRef.current = marker;
    setUserLocation({ lat, lng });
  };

  // 現在地を取得して表示する関数
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setPageError('位置情報がサポートされていません');
      return;
    }

    setIsTrackingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const heading = position.coords.heading;
        
        updateUserLocationMarker(lat, lng, heading ?? undefined);
        
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 16
          });
        }
        
        setIsTrackingLocation(false);
        console.log('現在地表示完了:', lat, lng, heading);
      },
      (error) => {
        console.error('位置情報エラー:', error);
        setPageError('位置情報の取得に失敗しました');
        setIsTrackingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  // 現在地に戻るボタンのクリックハンドラー
  const handleGoToCurrentLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 16
      });
    } else {
      getCurrentLocation();
    }
  };

  useEffect(() => { 
  if (!isMapLoaded || !mapRef.current || !MAPBOX_ACCESS_TOKEN || authLoading) return;
  const map = mapRef.current;
  
  // ここに追加 ↓
  console.log(`総ピン数: ${locations.length}`);
  console.log('ピン詳細:', locations);
  
    
    // 全マーカーを削除して再作成（シンプルアプローチ）
    activeMarkersRef.current.forEach(({marker, root}) => {
  marker.remove();
  setTimeout(() => {
    root.unmount();
  }, 0);
});
    activeMarkersRef.current.clear();
    
    // DOM上のマーカー要素も削除
    const existingMarkers = document.querySelectorAll('.mapboxgl-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // 新しいマーカーを作成
    locations.forEach(location => {
      if (!location.id || typeof location.lat !== 'number' || !isFinite(location.lat) || typeof location.lng !== 'number' || !isFinite(location.lng)) return;
      
      try {
        const el = document.createElement('div');
        const root = createRoot(el);
        const pinStatus = isEditMode && editingPinId === location.id ? 'editing' as const : location.status;
        
root.render(
  <PinMarker 
    status={pinStatus} 
    onClick={() => handlePinClick(location)}
    isMyReservation={location.status === 'reserved' && location.reservedBy === currentUser?.uid}
  />
);
        

        
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          draggable: isEditMode && editingPinId === location.id
        })
          .setLngLat([location.lng, location.lat])
          .addTo(map);

        // ドラッグイベント
        if (isEditMode && editingPinId === location.id) {
          marker.on('drag', () => {
            const newPosition = marker.getLngLat();
            setTempEditPosition({ lat: newPosition.lat, lng: newPosition.lng });
          });
        }

        activeMarkersRef.current.set(location.id, { marker, root });
      } catch(e: any) {
        console.error("Marker create fail:", location.id, e);
      }
    });
  }, [locations, isMapLoaded, handlePinClick, authLoading, isEditMode, editingPinId]);

  // マップ読み込み完了後に現在地を取得
  useEffect(() => {
    if (isMapLoaded && !userLocation) {
      getCurrentLocation();
    }
  }, [isMapLoaded, userLocation]);

  if (authLoading && !pageError) { 
    return <div style={{ padding: '20px', textAlign: 'center' }}>認証情報読込中...</div>; 
  }

  return (
    <>
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 0px)' }} />
      
      {/* 検索バー */}
      <div className="fixed top-4 left-4 z-40" style={{ maxWidth: '300px' }}>
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-lg">🔍</span>
            <input
              type="text"
              placeholder="住所で検索..."
              value={searchQuery}
              onChange={(e) => {
                const value = e.target.value;
                setSearchQuery(value);
                handleSearch(value);
                setIsSearchVisible(value.length > 0);
              }}
              onFocus={() => {
                if (searchQuery.length > 0) {
                  setIsSearchVisible(true);
                }
              }}
              className="flex-1 border-0 outline-none text-gray-700 placeholder-gray-400 bg-transparent text-sm"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* 検索結果 */}
        {isSearchVisible && searchResults.length > 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map((location) => (
              <div
                key={location.id}
                onClick={() => handleSearchResultSelect(location)}
                className="p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="font-medium text-gray-800 text-xs mb-1 truncate">
                  {location.address || 'アドレス未設定'}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={`px-1 py-0.5 rounded text-xs font-medium ${
                    location.status === 'completed' 
                      ? 'bg-green-100 text-green-800' 
                      : location.status === 'reserved'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {location.status === 'completed' ? '達成済み' : 
                     location.status === 'reserved' ? '予約中' : '未達成'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {isSearchVisible && searchQuery && searchResults.length === 0 && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-center text-gray-500 text-xs">
            検索結果が見つかりませんでした
          </div>
        )}
      </div>

      {/* 進捗表示トグルボタン */}
      <button
        onClick={toggleProgressDisplay}
        className="fixed top-4 right-4 z-50 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg shadow-lg p-2 transition-all duration-200 hover:shadow-xl"
        title="進捗を表示"
      >
        <span className="text-lg">📊</span>
      </button>

      {/* 進捗表示パネル */}
      {isProgressVisible && (
        <>
          {/* オーバーレイ */}
          <div 
            className="fixed inset-0 bg-black/30 z-45"
            onClick={toggleProgressDisplay}
          />
          
          {/* 進捗パネル */}
          <div className="fixed top-16 right-4 w-80 z-50 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            {/* ヘッダー */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">📊</span>
                  </div>
                  <h3 className="text-white font-bold text-sm">エリア進捗状況</h3>
                </div>
                <button
                  onClick={toggleProgressDisplay}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <span className="text-lg">✕</span>
                </button>
              </div>
            </div>
            
            {/* 進捗内容 - 修正されたProgressDisplayコンポーネントを使用 */}
            <div className="p-4">
              <ProgressDisplay 
                locations={locations}
              />
            </div>
          </div>
        </>
      )}
      
      {/* 現在地ボタン */}
      <button
        onClick={handleGoToCurrentLocation}
        disabled={isTrackingLocation}
        className={`fixed bottom-5 right-5 w-12 h-12 bg-white border-2 border-gray-300 rounded-full shadow-lg z-30 flex items-center justify-center text-xl transition-all duration-200 ${
          isTrackingLocation 
            ? 'cursor-not-allowed opacity-60' 
            : 'cursor-pointer hover:shadow-xl hover:border-blue-400'
        }`}
        title="現在地に移動"
      >
        {isTrackingLocation ? (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>📍</span>
        )}
      </button>

      {/* 編集モード時のフローティングコントロール */}
      {isEditMode && editingPinId && tempEditPosition && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          left: '20px',
          right: '20px',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          padding: '16px',
          zIndex: 1500,
          border: '2px solid #e74c3c',
          maxWidth: '400px',
          margin: '0 auto',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '20px',
              marginRight: '12px',
            }}>📍</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                margin: '0 0 4px 0', 
                color: '#e74c3c',
                fontSize: '16px',
                fontWeight: 'bold',
              }}>
                ピン位置編集中
              </h3>
              <p style={{
                margin: '0',
                fontSize: '12px',
                color: '#666',
                lineHeight: '1.3',
              }}>
                赤いピンをドラッグして位置を調整
              </p>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '11px',
            fontFamily: 'monospace',
            textAlign: 'center',
          }}>
            <span style={{ color: '#666' }}>座標: </span>
            <span style={{ color: '#333', fontWeight: 'bold' }}>
              {tempEditPosition.lat.toFixed(6)}, {tempEditPosition.lng.toFixed(6)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={saveEditPosition}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              ✅ 保存
            </button>
            <button
              onClick={cancelEditMode}
              style={{
                flex: 1,
                padding: '10px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
              }}
            >
              ❌ キャンセル
            </button>
          </div>
        </div>
      )}

      {/* 編集モード時の背景オーバーレイ */}
      {isEditMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.2)',
          zIndex: 1000,
          pointerEvents: 'none',
        }} />
      )}

      {selectedPin && (
        <PinDetailModal
          pin={selectedPin}
          currentUserId={currentUser?.uid}
          isAdmin={canEditArea}
          isEditMode={isEditMode && editingPinId === selectedPin.id}
          onClose={() => { 
            setSelectedPin(null); 
            setPageError(null); 
            if (isEditMode) cancelEditMode();
          }}
          onReserve={handleReservePin}
          onCancelReservation={handleCancelReservation}
          onAchieve={handleAchievePin}
          onCancelAchievement={handleCancelAchievement}
          onStartEdit={startEditMode}
          onCancelEdit={cancelEditMode}
        />
      )}

      {pageError && !selectedPin && (
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          left: '20px', 
          backgroundColor: 'lightcoral', 
          color: 'white', 
          padding: '10px', 
          borderRadius: '5px', 
          zIndex: 1001, 
          opacity: 0.9 
        }}>
          エラー: {pageError}
        </div>
      )}
      
    </>
  );
};

export default MapPage;