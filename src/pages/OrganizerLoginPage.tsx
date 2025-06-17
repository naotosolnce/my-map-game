// src/components/OrganizerLoginPage.tsx
import type { FormEvent, ChangeEvent } from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function OrganizerLoginPage() {
  const [passcode, setPasscode] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const correctPass = import.meta.env.VITE_ORGANIZER_PASS;

    if (passcode === correctPass) {
      navigate('/organizer');
    } else {
      alert('パスコードが間違っています');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow"
      >
        <h2 className="text-xl font-bold mb-4">主催者ログイン</h2>
        <input
          type="password"
          placeholder="パスコードを入力"
          value={passcode}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setPasscode(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
        />
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          ログイン
        </button>
      </form>
    </div>
  );
}
