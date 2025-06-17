// src/pages/GoogleLoginPage.tsx
import { useEffect } from 'react';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function GoogleLoginPage() {
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);

      console.log("ログインユーザーのUID:", auth.currentUser?.uid); // ここでUIDを表示

      navigate('/role');
    } catch (error) {
      console.error(error);
      alert('ログインに失敗しました');
    }
  };

  useEffect(() => {
    if (auth.currentUser) {
      navigate('/role');
    }
  }, [navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <button
        type="button"
        onClick={handleLogin}
        className="bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition"
      >
        Googleでログイン
      </button>
    </div>
  );
}
