// src/components/ProgressDisplay.tsx - 修正版
import React from 'react';
import type { LocationData } from '../types';

interface ProgressDisplayProps {
  locations: LocationData[];
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ 
  locations
}) => {
  // 進捗計算
  const calculateProgress = () => {
    const total = locations.length;
    const completed = locations.filter(loc => loc.status === 'completed').length;
    const reserved = locations.filter(loc => loc.status === 'reserved').length;
    const uncompleted = locations.filter(loc => loc.status === 'uncompleted').length;
    const uploading = locations.filter(loc => loc.status === 'uploading').length;
    
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return {
      total,
      completed,
      reserved,
      uncompleted,
      uploading,
      completionRate
    };
  };

  const progress = calculateProgress();

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {/* 達成率円グラフ */}
      <div className="flex items-center justify-center">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
            <path
              d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            <path
              d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray={`${progress.completionRate}, 100`}
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-emerald-600">{progress.completionRate}%</span>
            <span className="text-xs text-gray-500">達成率</span>
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 p-3 rounded-lg text-center border border-emerald-100">
          <div className="text-lg font-bold text-emerald-600 mb-1">
            {progress.completed}
          </div>
          <div className="text-xs text-emerald-800">
            達成済み
          </div>
        </div>

        <div className="bg-amber-50 p-3 rounded-lg text-center border border-amber-100">
          <div className="text-lg font-bold text-amber-600 mb-1">
            {progress.reserved}
          </div>
          <div className="text-xs text-amber-800">
            予約中
          </div>
        </div>

        <div className="bg-blue-50 p-3 rounded-lg text-center border border-blue-100">
          <div className="text-lg font-bold text-blue-600 mb-1">
            {progress.uncompleted}
          </div>
          <div className="text-xs text-blue-800">
            未達成
          </div>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-200">
          <div className="text-lg font-bold text-gray-600 mb-1">
            {progress.total}
          </div>
          <div className="text-xs text-gray-700">
            総数
          </div>
        </div>
      </div>

      {/* プログレスバー */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">進捗</span>
          <span className="text-sm text-gray-500">
            {progress.completed} / {progress.total}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-blue-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress.completionRate}%` }}
          />
        </div>
      </div>

      {/* アップロード中の表示 */}
      {progress.uploading > 0 && (
        <div className="bg-orange-50 p-3 rounded-lg text-center border border-orange-200">
          <div className="text-xs text-orange-700 mb-1">📤 アップロード中</div>
          <div className="text-sm font-bold text-orange-600">
            {progress.uploading} 箇所
          </div>
        </div>
      )}

      {/* 目標達成まで */}
      {progress.completionRate < 100 && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 p-3 rounded-lg text-center border border-red-200">
          <div className="text-xs text-red-700 mb-1">🎯 目標達成まで</div>
          <div className="text-lg font-bold text-red-600">
            あと {progress.total - progress.completed} 箇所
          </div>
        </div>
      )}

      {/* 完全達成時の祝福メッセージ */}
      {progress.completionRate === 100 && progress.total > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-lg text-center border border-emerald-200">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-sm font-bold text-emerald-700">
            おめでとうございます！
          </div>
          <div className="text-xs text-emerald-600 mt-1">
            全ての箇所を達成しました
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProgressDisplay);