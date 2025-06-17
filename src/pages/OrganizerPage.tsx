import type { FormEvent } from "react";
import { useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function OrganizerPage() {
  const [areaName, setAreaName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [passcode, setPasscode] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("ログインユーザーが見つかりません");
      await addDoc(collection(db, "areas"), {
        areaName,
        sheetUrl,
        passcode,
        organizerUid: user.uid,
        createdAt: serverTimestamp(),
        geocoded: false,
      });
      alert("主催者設定を保存しました");
      navigate("/user");
    } catch (error) {
      console.error(error);
      alert("保存に失敗しました: " + (error as Error).message);
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white p-6 rounded-lg shadow"
      >
        <h1 className="text-xl font-semibold mb-4">主催者設定</h1>

        <label className="block mb-1">エリア名</label>
        <input
          type="text"
          value={areaName}
          onChange={(e) => setAreaName(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          required
        />

        <label className="block mb-1">スプレッドシートURL</label>
        <input
          type="url"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          required
        />

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
          className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition"
        >
          設定を保存
        </button>
      </form>
    </div>
  );
}