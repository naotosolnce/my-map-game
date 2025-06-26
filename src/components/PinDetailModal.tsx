// src/components/PinDetailModal.tsx 修正版
import React, { useCallback, useState, useEffect } from 'react';
import type { LocationData } from '../types';
import { checkOrganizerStatus } from '../services/authService';
import { auth } from '../firebase';

interface PinDetailModalProps {
  pin: LocationData; // null を削除
  currentUserId: string | null | undefined;
  isAdmin?: boolean; // 新規追加
  isEditMode?: boolean; // 新規追加
  onClose: () => void;
  onReserve?: (pinId: string) => Promise<void>;
  onCancelReservation?: (pinId: string) => Promise<void>;
  onAchieve?: (pinId: string) => Promise<void>;
  onCancelAchievement?: (pinId: string) => Promise<void>;
  onStartEdit?: (pinId: string) => void; // 新規追加
  onCancelEdit?: () => void; // 新規追加
  onSaveEdit?: () => void; // 新規追加
  tempPosition?: {lat: number, lng: number} | null; // 新規追加
}

const PinDetailModal: React.FC<PinDetailModalProps> = ({
  pin,
  currentUserId,
  isAdmin = false, // 新規追加
  isEditMode = false, // 新規追加
  onClose,
  onReserve,
  onCancelReservation,
  onAchieve,
  onCancelAchievement,
  onStartEdit, // 新規追加
  onCancelEdit, // 新規追加
  onSaveEdit, // 新規追加
  tempPosition, // 新規追加
}) => {
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [checkingOrganizerStatus, setCheckingOrganizerStatus] = useState(true);

  // 管理者権限チェック
  useEffect(() => {
    const checkOrganizer = async () => {
      if (!currentUserId || !auth.currentUser) {
        setIsOrganizer(false);
        setCheckingOrganizerStatus(false);
        return;
      }

      try {
        const { isOrganizer: organizerStatus } = await checkOrganizerStatus(auth.currentUser);
        setIsOrganizer(organizerStatus);
      } catch (error) {
        console.error('管理者権限チェックエラー:', error);
        setIsOrganizer(false);
      } finally {
        setCheckingOrganizerStatus(false);
      }
    };

    checkOrganizer();
  }, [currentUserId]);

  // ナビゲーション関数
  const openNavigation = useCallback((lat: number, lng: number) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    
    if (isIOS) {
      // Apple Maps
      window.open(`http://maps.apple.com/?daddr=${lat},${lng}`);
    } else if (isAndroid) {
      // Android: Google Mapsアプリ優先
      const intent = `intent://maps.google.com/maps?daddr=${lat},${lng}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
      window.location.href = intent;
    } else {
      // PC等: Google Maps Web版
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
    }
  }, []);

  const handleOverlayClick = useCallback(() => { onClose(); }, [onClose]);
  const handleContentClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); }, []);

  const formatDate = useCallback((dateValue: Date | null | undefined): string => {
    if (!dateValue) return '情報なし';
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue.toLocaleString();
    }
    console.warn("[PinDetailModal] formatDate received an invalid date value:", dateValue);
    return '日付表示エラー';
  }, []);

  const handleAchieveButtonClick = useCallback(async () => {
    if (pin?.id && typeof onAchieve === 'function') {
      try {
        await onAchieve(pin.id);
      } catch (error) {
        console.error("[PinDetailModal] onAchieve callback failed:", error);
        alert(`達成処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.error("[PinDetailModal] Cannot call onAchieve: pin or function is missing.");
    }
  }, [pin, onAchieve]);

  // 編集ボタンクリック
  const handleEditClick = useCallback(() => {
    if (pin?.id && typeof onStartEdit === 'function') {
      onStartEdit(pin.id);
    }
  }, [pin, onStartEdit]);

  // ナビボタンクリック
  const handleNavigationClick = useCallback(() => {
    const lat = tempPosition?.lat || pin.lat;
    const lng = tempPosition?.lng || pin.lng;
    openNavigation(lat, lng);
  }, [pin, tempPosition, openNavigation]);

  // --- ボタン表示条件のロジック ---
  const isLoggedIn = !!currentUserId;
  
  // isAdmin と isOrganizer を統合
  const hasAdminRights = isAdmin || isOrganizer;

  const isReservedByCurrentUser = pin.status === 'reserved' && typeof pin.reservedBy === 'string' && pin.reservedBy === currentUserId;
  const isCompletedByCurrentUser = pin.status === 'completed' && typeof pin.completedBy === 'string' && pin.completedBy === currentUserId;

  const showReserveButton = pin.status === 'uncompleted' && isLoggedIn && !isEditMode;
  const showCancelReservationButton = (isReservedByCurrentUser || (pin.status === 'reserved' && hasAdminRights)) && isLoggedIn && !isEditMode;
  const showAchieveButton = isLoggedIn && !isEditMode && (
    pin.status === 'uncompleted' || 
    (pin.status === 'reserved' && (pin.reservedBy === currentUserId || hasAdminRights))
  );
  const showProcessingMessage = pin.status === 'uploading';
  const showCancelAchievementButton = pin.status === 'completed' && isLoggedIn && (isCompletedByCurrentUser || hasAdminRights) && !isEditMode;

  // 管理者用ボタン
  const showEditButton = hasAdminRights && !checkingOrganizerStatus && !isEditMode;

  // ナビボタン表示条件
  const showNavigationButton = isLoggedIn && !isEditMode;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="pin-modal-title">
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', minWidth: '350px', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={handleContentClick} role="document">
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', padding: '5px', lineHeight: '1' }} aria-label="閉じる">×</button>
        
        <h2 id="pin-modal-title">{pin.address || `ピン (ID: ${pin.id})`}</h2>
        {isEditMode && (
          <div style={{ backgroundColor: '#fff3cd', padding: '12px', borderRadius: '6px', marginBottom: '12px', border: '1px solid #ffeaa7' }}>
            <p style={{ margin: 0, color: '#856404', fontWeight: 'bold' }}>📍 編集モード: マップ上のピンをドラッグして位置を調整してください</p>
          </div>
        )}
        
        {pin.title && <p><strong>{pin.title}</strong></p>}
        <hr style={{ margin: '10px 0' }} />
        <div style={{ marginBottom: '15px' }}>
          <p><strong>ID:</strong> {pin.id}</p>
          <p><strong>ステータス:</strong> <span style={{ fontWeight: 'bold', color: pin.status === 'completed' ? 'green' : pin.status === 'reserved' ? 'orange' : (pin.status === 'uploading' ? 'blue' : 'inherit') }}>{pin.status}</span></p>
          <p><strong>作成日時:</strong> {formatDate(pin.createdAt)}</p>
          <p><strong>座標:</strong> {tempPosition ? `${tempPosition.lat.toFixed(6)}, ${tempPosition.lng.toFixed(6)} (編集中)` : `${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)}`}</p>
          {pin.status === 'reserved' && ( 
            <> 
              <p><strong>予約者:</strong> {pin.reservedBy ? (pin.reservedBy === currentUserId ? 'あなた' : `UID ${pin.reservedBy.substring(0,6)}...`) : 'なし'}</p> 
              <p><strong>予約日時:</strong> {formatDate(pin.reservedAt)}</p> 
            </> 
          )}
          {pin.status === 'completed' && ( 
            <> 
              <p><strong>達成者:</strong> {pin.completedBy ? (pin.completedBy === currentUserId ? 'あなた' : `UID ${pin.completedBy.substring(0,6)}...`) : 'なし'}</p> 
              <p><strong>達成日時:</strong> {formatDate(pin.completedAt)}</p> 
            </> 
          )}
        </div>
        <hr style={{ margin: '15px 0' }}/>
        <div className="action-buttons">
          <h3>アクション</h3>
          {showProcessingMessage && <p style={{ color: 'blue', fontWeight: 'bold' }}>処理中です...</p>}

          {/* 編集モード用ボタン */}
          {hasAdminRights && isEditMode && (
            <div style={{ marginBottom: '12px' }}>
              <button 
                onClick={onSaveEdit} 
                style={{ width: '100%', padding: '12px', marginBottom: '8px', backgroundColor: '#4caf50', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
              >
                ✅ 位置を保存
              </button>
              <button 
                onClick={onCancelEdit} 
                style={{ width: '100%', padding: '12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
              >
                ❌ 編集をキャンセル
              </button>
            </div>
          )}

          {/* 通常のアクションボタン */}
          {!showProcessingMessage && showReserveButton && typeof onReserve === 'function' && (
            <button onClick={() => onReserve(pin.id)} style={{ marginRight: '10px', padding: '8px 12px' }}>予約する</button>
          )}
          {!showProcessingMessage && showCancelReservationButton && typeof onCancelReservation === 'function' && (
            <button onClick={() => onCancelReservation(pin.id)} style={{ marginRight: '10px', padding: '8px 12px' }}>予約を解除する</button>
          )}
          {!showProcessingMessage && showAchieveButton && typeof onAchieve === 'function' && (
            <button onClick={handleAchieveButtonClick} style={{ marginRight: '10px', padding: '8px 12px' }}>達成する</button>
          )}
          {!showProcessingMessage && showCancelAchievementButton && typeof onCancelAchievement === 'function' && (
            <button onClick={() => onCancelAchievement(pin.id)} style={{ padding: '8px 12px' }}>達成を解除する</button>
          )}

          {/* ナビゲーションボタン */}
          {showNavigationButton && (
            <button 
              onClick={handleNavigationClick} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
            >
              🧭 ナビする
            </button>
          )}

          {/* 管理者用編集ボタン */}
          {showEditButton && (
            <button 
              onClick={handleEditClick} 
              style={{ width: '100%', padding: '12px', marginTop: '8px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', fontWeight: '500' }}
            >
              📍 ピン位置を修正
            </button>
          )}

          {!isLoggedIn && !showProcessingMessage && (<p style={{color: 'gray'}}>アクションを実行するにはログインしてください。</p>)}
          {isLoggedIn && !showReserveButton && !showCancelReservationButton && !showAchieveButton && !showCancelAchievementButton && !showEditButton && !showNavigationButton && !showProcessingMessage && (<p>現在実行できるアクションはありません。</p>)}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PinDetailModal);