// src/components/PinMarker.tsx
import React from 'react';
import type { PinStatus } from '../types'; // src/types/index.ts からインポート

interface PinMarkerProps {
  status: PinStatus;
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
}

const PinMarker: React.FC<PinMarkerProps> = ({ status, onClick }) => {
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
      default:
        // PinStatus型が厳密であれば、このdefaultは通常到達しない
        // もしPinStatusに (string & {}) のようなフォールバック型を含むなら警告が有効
        console.warn(`PinMarker: Unknown pin status: '${currentStatus}'. Defaulting to gray.`);
        return '#7f8c8d';
    }
  };

  const pinColor = getColorByStatus(status);

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
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
      </svg>
    </div>
  );
};

export default React.memo(PinMarker);