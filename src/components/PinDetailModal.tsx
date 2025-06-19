// src/components/PinDetailModal.tsx
import React, { useCallback } from 'react'; // useRefは写真機能がないため不要に
import type { LocationData } from '../types'; // 型安全: 正しい型をインポート

interface PinDetailModalProps {
  pin: LocationData | null;
  currentUserId: string | null | undefined;
  onClose: () => void;
  onReserve?: (pinId: string) => Promise<void>;
  onCancelReservation?: (pinId: string) => Promise<void>;
  onAchieve?: (pinId: string) => Promise<void>; // 写真引数を削除
  onCancelAchievement?: (pinId: string) => Promise<void>;
}

const PinDetailModal: React.FC<PinDetailModalProps> = ({
  pin,
  currentUserId,
  onClose,
  onReserve,
  onCancelReservation,
  onAchieve,
  onCancelAchievement,
}) => {
  // 堅牢性: pinがnullの場合は早期リターン
  if (!pin) {
    console.warn("[PinDetailModal] Pin prop is null, rendering nothing.");
    return null;
  }

  // React特有: イベントハンドラのメモ化
  const handleOverlayClick = useCallback(() => { onClose(); }, [onClose]);
  const handleContentClick = useCallback((e: React.MouseEvent) => { e.stopPropagation(); }, []);

  // 日付フォーマット関数 (堅牢性, 型安全性)
  const formatDate = useCallback((dateValue: Date | null | undefined): string => {
    if (!dateValue) return '情報なし';
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      return dateValue.toLocaleString();
    }
    console.warn("[PinDetailModal] formatDate received an invalid date value:", dateValue);
    return '日付表示エラー';
  }, []);

  // 「達成する」ボタンクリック時の処理 (堅牢性: pinとonAchieveの存在確認)
  const handleAchieveButtonClick = useCallback(async () => {
    if (pin?.id && typeof onAchieve === 'function') { // 型安全: オプショナル引数チェック
      try {
        await onAchieve(pin.id);
      } catch (error) { // 堅牢性: エラーハンドリング
        console.error("[PinDetailModal] onAchieve callback failed:", error);
        // ユーザーへのフィードバックは MapPage 側で行うか、ここで alert なども可
        alert(`達成処理中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      console.error("[PinDetailModal] Cannot call onAchieve: pin or function is missing.");
    }
  }, [pin, onAchieve]); // React特有: 依存配列

  // --- ボタン表示条件のロジック ---
  const isLoggedIn = !!currentUserId;
  const isOrganizer = false; // TODO: 主催者判定
  // const isAdmin = false;  // isAdminは現在使われていない

  const isReservedByCurrentUser = pin.status === 'reserved' && typeof pin.reservedBy === 'string' && pin.reservedBy === currentUserId;
  const isCompletedByCurrentUser = pin.status === 'completed' && typeof pin.completedBy === 'string' && pin.completedBy === currentUserId;

  const showReserveButton = pin.status === 'uncompleted' && isLoggedIn;
  const showCancelReservationButton = (isReservedByCurrentUser || (pin.status === 'reserved' && isOrganizer)) && isLoggedIn;
  const showAchieveButton = isLoggedIn && (pin.status === 'uncompleted' || pin.status === 'reserved');
  const showProcessingMessage = pin.status === 'uploading'; // 'uploading'は写真がないので'processing'などにリネーム検討
  const showCancelAchievementButton = pin.status === 'completed' && isLoggedIn && (isCompletedByCurrentUser || isOrganizer);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-labelledby="pin-modal-title">
      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', minWidth: '350px', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }} onClick={handleContentClick} role="document">
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5em', cursor: 'pointer', padding: '5px', lineHeight: '1' }} aria-label="閉じる">×</button>
        <h2 id="pin-modal-title">{pin.address || `ピン (ID: ${pin.id})`}</h2>
        {pin.title && <p><strong>{pin.title}</strong></p>}
        <hr style={{ margin: '10px 0' }} />
        <div style={{ marginBottom: '15px' }}>
          <p><strong>ID:</strong> {pin.id}</p>
          <p><strong>ステータス:</strong> <span style={{ fontWeight: 'bold', color: pin.status === 'completed' ? 'green' : pin.status === 'reserved' ? 'orange' : (pin.status === 'uploading' ? 'blue' : 'inherit') }}>{pin.status}</span></p>
          <p><strong>作成日時:</strong> {formatDate(pin.createdAt)}</p>
          {pin.status === 'reserved' && ( <> <p><strong>予約者:</strong> {pin.reservedBy ? (pin.reservedBy === currentUserId ? 'あなた' : `UID ${pin.reservedBy.substring(0,6)}...`) : 'なし'}</p> <p><strong>予約日時:</strong> {formatDate(pin.reservedAt)}</p> </> )}
          {pin.status === 'completed' && ( <> <p><strong>達成者:</strong> {pin.completedBy ? (pin.completedBy === currentUserId ? 'あなた' : `UID ${pin.completedBy.substring(0,6)}...`) : 'なし'}</p> <p><strong>達成日時:</strong> {formatDate(pin.completedAt)}</p> {/* 写真表示はなし */} </> )}
        </div>
        <hr style={{ margin: '15px 0' }}/>
        <div className="action-buttons">
          <h3>アクション</h3>
          {showProcessingMessage && <p style={{ color: 'blue', fontWeight: 'bold' }}>処理中です...</p>}

          {!showProcessingMessage && showReserveButton && typeof onReserve === 'function' && (<button onClick={() => onReserve(pin.id)} style={{ marginRight: '10px', padding: '8px 12px' }}>予約する</button>)}
          {!showProcessingMessage && showCancelReservationButton && typeof onCancelReservation === 'function' && (<button onClick={() => onCancelReservation(pin.id)} style={{ marginRight: '10px', padding: '8px 12px' }}>予約を解除する</button>)}
          {!showProcessingMessage && showAchieveButton && typeof onAchieve === 'function' && (<button onClick={handleAchieveButtonClick} style={{ marginRight: '10px', padding: '8px 12px' }}>達成する</button>)}
          {!showProcessingMessage && showCancelAchievementButton && typeof onCancelAchievement === 'function' && (<button onClick={() => onCancelAchievement(pin.id)} style={{ padding: '8px 12px' }}>達成を解除する</button>)}

          {!isLoggedIn && !showProcessingMessage && (<p style={{color: 'gray'}}>アクションを実行するにはログインしてください。</p>)}
          {isLoggedIn && !showReserveButton && !showCancelReservationButton && !showAchieveButton && !showCancelAchievementButton && !showProcessingMessage && (<p>現在実行できるアクションはありません。</p>)}
        </div>
      </div>
    </div>
  );
};
export default React.memo(PinDetailModal);