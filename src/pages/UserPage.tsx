import { useState, FormEvent } from "react";

export default function UserPage() {
  const [selectedArea, setSelectedArea] = useState("");
  const [passcode, setPasscode] = useState("");

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    // TODO: パスコード検証＋マップ画面へ遷移
    alert(`選択エリア: ${selectedArea}\nパスコード: ${passcode}`);
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleJoin}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow"
      >
        <h1 className="text-xl font-semibold mb-4">エリア選択</h1>

        <label className="block mb-1">エリアを選択</label>
        <select
          value={selectedArea}
          onChange={(e) => setSelectedArea(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          required
        >
          <option value="">-- 選択してください --</option>
          <option value="Area A">Area A</option>
          <option value="Area B">Area B</option>
        </select>

        <label className="block mb-1">パスコード</label>
        <input
          type="text"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-6"
          required
        />

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          参加する
        </button>
      </form>
    </div>
  );
}
