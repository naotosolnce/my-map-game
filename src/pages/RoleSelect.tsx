// src/pages/RoleSelect.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export default function RoleSelect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleOrganizerClick = async () => {
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('ログインが必要です');
        setLoading(false);
        return;
      }

      // Firestoreのadminsコレクションから管理者かどうかをチェック
      const adminDocRef = doc(db, 'admins', user.uid);
      const adminDoc = await getDoc(adminDocRef);
      
      if (adminDoc.exists()) {
        // 管理者権限あり - 主催者ページへ
        navigate('/organizer');
      } else {
        // 管理者権限なし
        alert('主催者権限がありません。管理者にお問い合わせください。');
      }
    } catch (error) {
      console.error('管理者チェックエラー:', error);
      alert('エラーが発生しました。再度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = () => {
    navigate('/user');
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">役割を選択してください</h1>
      <div className="space-y-4">
        <button
          type="button"
          onClick={handleOrganizerClick}
          disabled={loading}
          className={`w-64 py-2 rounded transition ${
            loading 
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? '確認中...' : '主催者として参加'}
        </button>
        <button
          type="button"
          onClick={handleUserClick}
          className="w-64 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          ユーザーとして参加
        </button>
      </div>
    </div>
  );
}