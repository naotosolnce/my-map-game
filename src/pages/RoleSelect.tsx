// src/pages/RoleSelect.tsx
import { useNavigate } from 'react-router-dom';

export default function RoleSelect() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-6">役割を選択してください</h1>
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/organizer-login')}
          className="w-64 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          主催者として参加
        </button>
        <button
          type="button"
          onClick={() => navigate('/user')}
          className="w-64 bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          ユーザーとして参加
        </button>
      </div>
    </div>
  );
}
