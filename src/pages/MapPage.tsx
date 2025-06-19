// src/pages/MapPage.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import type { Root as ReactRoot } from 'react-dom/client';

import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap, Marker as MapboxMarker, LngLatLike } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import PinMarker from '../components/PinMarker';
import PinDetailModal from '../components/PinDetailModal';
import type { LocationData, PinStatus } from '../types';

import { db, auth } from '../firebase'; // storage はインポートしない
import { doc, updateDoc, serverTimestamp, collection, query, where, onSnapshot } from 'firebase/firestore';
import type { User } from 'firebase/auth';
// Cloudinary や Firebase Storage のインポートは不要（写真なし達成のため）

const MAPBOX_ACCESS_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (MAPBOX_ACCESS_TOKEN) { mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN; }
else { console.warn("[MapPage] Mapbox Token not set."); }

const MapPage: React.FC = () => {
  const { areaId } = useParams<{ areaId: string }>();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const activeMarkersRef = useRef<Map<string, { marker: MapboxMarker; root: ReactRoot }>>(new Map());
  const [isMapLoaded, setIsMapLoaded] = useState<boolean>(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [selectedPin, setSelectedPin] = useState<LocationData | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  useEffect(() => { /* ... (認証監視 - 前回と同様) ... */
    const unsub = auth.onAuthStateChanged(user => { setCurrentUser(user); setAuthLoading(false); }); return () => unsub();
  }, []);
  useEffect(() => { /* ... (Firestoreデータ取得 - 前回と同様、データ整形を堅牢に) ... */
    if (!areaId || authLoading) { console.log(authLoading? "Auth loading, skip fetch" : "No areaId, skip fetch"); return; }
    setPageError(null);
    const q = query(collection(db, 'locations'), where('areaId', '==', areaId));
    const unsub = onSnapshot(q, snapshot => {
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
            } else { console.warn(`Invalid data for ${d.id}`, data); }
        });
        setLocations(fetched);
    }, err => { console.error("Error fetching locs:", err); setPageError("Data fetch error"); });
    return () => unsub();
  }, [areaId, authLoading]);
  useEffect(() => { /* ... (Mapbox初期化 - 前回と同様) ... */
    if (!MAPBOX_ACCESS_TOKEN || mapRef.current || !mapContainerRef.current || authLoading) return;
    try {
        const map = new mapboxgl.Map({ container: mapContainerRef.current!, style: 'mapbox://styles/mapbox/streets-v11', center: [139.76, 35.68], zoom: 12 });
        mapRef.current = map;
        map.on('load', () => setIsMapLoaded(true));
        map.on('error', e => setPageError(`Map error: ${e.error?.message || 'Unknown'}`));
    } catch(e: any) { setPageError(`Map init error: ${e?.message || 'Unknown'}`); }
    return () => { mapRef.current?.remove(); mapRef.current = null; setIsMapLoaded(false); };
  }, [authLoading]);
  const handlePinClick = useCallback((loc: LocationData) => { /* ... (前回と同様) ... */ setSelectedPin(loc); if (mapRef.current && typeof loc.lng==='number' && typeof loc.lat==='number') mapRef.current.flyTo({center:[loc.lng, loc.lat], zoom:15}); }, []);

  const updateSelectedPinState = (updates: Partial<LocationData>) => {
    setSelectedPin(prev => (prev) ? { ...prev, ...updates } : null);
  };

  const handleReservePin = async (pinId: string): Promise<void> => { /* ... (前回と同様) ... */
    if (!currentUser) { setPageError("Login required"); return Promise.reject(new Error("Not logged in")); }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'uncompleted') { setPageError("Cannot reserve"); return Promise.reject(new Error("Not reservable")); }
    const pinRef = doc(db, "locations", pinId);
    const updateData = { status: "reserved" as PinStatus, reservedBy: currentUser.uid, reservedAt: serverTimestamp() };
    try { await updateDoc(pinRef, updateData); updateSelectedPinState({ status: "reserved", reservedBy: currentUser.uid, reservedAt: new Date() }); }
    catch (e) { console.error("Reserve err:", e); setPageError("予約失敗"); return Promise.reject(e); }
  };
  const handleCancelReservation = async (pinId: string): Promise<void> => { /* ... (前回と同様) ... */
    if (!currentUser) { setPageError("Login required"); return Promise.reject(new Error("Not logged in")); }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'reserved') { setPageError("Not reserved"); return Promise.reject(new Error("Not reserved")); }
    if (selectedPin.reservedBy !== currentUser.uid /* && !isOrganizer */) { setPageError("Not owner"); return Promise.reject(new Error("Permission denied")); }
    const pinRef = doc(db, "locations", pinId);
    const updateData = { status: "uncompleted" as PinStatus, reservedBy: null, reservedAt: null };
    try { await updateDoc(pinRef, updateData); updateSelectedPinState({ status: "uncompleted", reservedBy: null, reservedAt: null }); }
    catch (e) { console.error("Cancel reserve err:", e); setPageError("予約解除失敗"); return Promise.reject(e); }
  };

  // 「達成する」処理 (写真なし版)
  const handleAchievePin = async (pinId: string): Promise<void> => { // file引数を削除
    if (!currentUser) { setPageError("ログインが必要です"); return Promise.reject(new Error("Not logged in")); }
    if (!selectedPin || selectedPin.id !== pinId) { setPageError("ピン未選択"); return Promise.reject(new Error("Pin not selected")); }
    const canAchieve = selectedPin.status === 'uncompleted' || selectedPin.status === 'reserved';
    if (!canAchieve) { setPageError("達成できません"); return Promise.reject(new Error("Not achievable")); }

    const originalStatus = selectedPin.status; // エラーロールバック用
    const pinRef = doc(db, "locations", pinId);
    setPageError(null);

    try {
      // 処理中であることを示すためにステータスを更新 (任意)
      updateSelectedPinState({ status: 'uploading' }); // 'uploading'は'processing' などでも良い
      // Firestoreにも即時反映させるなら updateDoc もここで行う
      // await updateDoc(pinRef, { status: 'uploading' });

      console.log(`[MapPage] Achieving pin ${pinId} by ${currentUser.uid} (no photo).`);

      await updateDoc(pinRef, {
        status: "completed" as PinStatus,
        completedBy: currentUser.uid,
        completedAt: serverTimestamp(),
        photoUrl: null, // 写真なし
        reservedBy: null,
        reservedAt: null,
      });
      updateSelectedPinState({ status: 'completed', completedBy: currentUser.uid, completedAt: new Date(), photoUrl: null, reservedBy: null, reservedAt: null });
    } catch (error) {
      console.error(`[MapPage] Error achieving pin ${pinId}:`, error);
      setPageError(`達成処理エラー: ${error instanceof Error ? error.message : String(error)}`);
      // エラー時は元のステータスに戻す (selectedPinが'uploading'になっていれば、その前の状態に戻す)
      updateSelectedPinState({ status: originalStatus });
      // Firestoreのステータスもロールバックするなら
      // try { await updateDoc(pinRef, { status: originalStatus }); } catch (revertErr) { console.error("Revert status err:", revertErr); }
      return Promise.reject(error);
    }
  };

  const handleCancelAchievement = async (pinId: string): Promise<void> => { /* ... (前回と同様) ... */
    if (!currentUser) { setPageError("Login required"); return Promise.reject(new Error("Not logged in")); }
    if (!selectedPin || selectedPin.id !== pinId || selectedPin.status !== 'completed') { setPageError("Not completed"); return Promise.reject(new Error("Not completed")); }
    if (selectedPin.completedBy !== currentUser.uid /* && !isOrganizer */) { setPageError("Not owner"); return Promise.reject(new Error("Permission denied")); }
    const pinRef = doc(db, "locations", pinId);
    try {
        await updateDoc(pinRef, { status: "uncompleted", completedBy: null, completedAt: null, photoUrl: null });
        updateSelectedPinState({ status: 'uncompleted', completedBy: null, completedAt: null, photoUrl: null });
    } catch (e) { console.error("Cancel achieve err:", e); setPageError("Cancel achieve failed"); return Promise.reject(e); }
  };

  useEffect(() => { /* ... (マーカー更新 - 前回と同様) ... */
    if (!isMapLoaded || !mapRef.current || !MAPBOX_ACCESS_TOKEN || authLoading) return;
    const map = mapRef.current;
    const newMarkers = new Map<string, { marker: MapboxMarker; root: ReactRoot }>();
    locations.forEach(loc => {
        if (!loc.id || typeof loc.lat !== 'number' || !isFinite(loc.lat) || typeof loc.lng !== 'number' || !isFinite(loc.lng)) return;
        let entry = activeMarkersRef.current.get(loc.id);
        if (entry) {
            entry.root.render(<PinMarker status={loc.status} onClick={() => handlePinClick(loc)} />);
            entry.marker.setLngLat([loc.lng, loc.lat]);
            newMarkers.set(loc.id, entry);
            activeMarkersRef.current.delete(loc.id);
        } else {
            try {
                const el = document.createElement('div');
                const root = createRoot(el);
                root.render(<PinMarker status={loc.status} onClick={() => handlePinClick(loc)} />);
                const marker = new mapboxgl.Marker({element:el,anchor:'bottom'}).setLngLat([loc.lng,loc.lat]as LngLatLike).addTo(map);
                newMarkers.set(loc.id, {marker,root});
            } catch(e:any){console.error("Marker create fail:",loc.id,e);}
        }
    });
    activeMarkersRef.current.forEach(({marker,root},_id)=>{root.unmount();marker.remove();});
    activeMarkersRef.current = newMarkers;
  }, [locations, isMapLoaded, handlePinClick, authLoading]);

  if (authLoading && !pageError) { return <div style={{ padding: '20px', textAlign: 'center' }}>認証情報読込中...</div>; }
  // ... (エラー表示、マップコンテナ)

  return (
    <>
      <div ref={mapContainerRef} style={{ width: '100%', height: 'calc(100vh - 0px)' }} />
      {selectedPin && (
        <PinDetailModal
          pin={selectedPin}
          currentUserId={currentUser?.uid}
          onClose={() => { setSelectedPin(null); setPageError(null); }}
          onReserve={handleReservePin}
          onCancelReservation={handleCancelReservation}
          onAchieve={handleAchievePin} // ★ onAchieveWithFile から onAchieve に変更
          onCancelAchievement={handleCancelAchievement}
        />
      )}
      {pageError && !selectedPin && (<div style={{ position: 'fixed', bottom: '20px', left: '20px', backgroundColor: 'lightcoral', color: 'white', padding: '10px', borderRadius: '5px', zIndex: 1001, opacity: 0.9 }}>エラー: {pageError}</div>)}
    </>
  );
};
export default MapPage;