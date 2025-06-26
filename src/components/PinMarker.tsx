// src/components/PinMarker.tsx 修正版
import React from 'react';
import type { PinStatus } from '../types';

interface PinMarkerProps {
  status: PinStatus;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  isMyReservation?: boolean; // 自分の予約かどうか
}

const PinMarker: React.FC<PinMarkerProps> = ({ 
  status, 
  onClick, 
  isMyReservation = false 
}) => {
  // デバッグログ追加

  
  const getColorByStatus = (currentStatus: PinStatus): string => {
  
    
    switch (currentStatus) {
      case 'uncompleted':
        return '#3498db';
      case 'reserved':
        return '#eab308';
      case 'uploading':
        return '#f39c12';
      case 'completed':
        return '#1abc9c';
      case 'editing': // 明示的に追加
        return '#e74c3c';
      default:
        console.warn(`PinMarker: Unknown pin status: '${currentStatus}'. Defaulting to gray.`);
        return '#7f8c8d';
    }
  };

  const pinColor = (status === 'reserved' && isMyReservation) 
  ? '#FF6B6B'  // 自分の予約（星マーク）は暖かい赤
  : getColorByStatus(status);  // その他は従来通り

  // 星マークかピンマークかを決定
  const getIconPath = (): string => {
    if (status === 'reserved' && isMyReservation) {
      // 自分の予約の場合は星マーク
      return "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z";
    } else {
      // その他すべてはピンマーク
      return "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z";
    }
  };

  return (
    <div
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(e as any); } : undefined}
    >
      <svg
        width="30"
        height="30"
        viewBox="0 0 24 24"
        fill={pinColor}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d={getIconPath()} />
      </svg>
    </div>
  );
};

export default React.memo(PinMarker);