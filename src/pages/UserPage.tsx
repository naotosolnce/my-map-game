import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { collection, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase"; // Firebase設定ファイル

// エリアの型定義
interface Area {
  id: string;
  areaName: string;
  passcode: string;
  // 他に必要なフィールドがあれば追加
}

export default function UserPage() {
  const [selectedArea, setSelectedArea] = useState("");
  const [passcode, setPasscode] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Firestoreからエリア一覧を取得
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true);
        const areasCollection = collection(db, "areas"); // コレクション名を適宜調整
        const areasSnapshot = await getDocs(areasCollection);
        
        const areasList: Area[] = areasSnapshot.docs.map(doc => ({
          id: doc.id,
          areaName: doc.data().areaName,
          passcode: doc.data().passcode,
          // 他のフィールドも必要に応じて追加
        }));
        
        setAreas(areasList);
        setError("");
      } catch (err) {
        console.error("エリアの取得に失敗しました:", err);
        setError("エリアの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    fetchAreas();
  }, []);

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    
    // 選択されたエリアを取得
    const selectedAreaData = areas.find(area => area.id === selectedArea);
    
    if (!selectedAreaData) {
      alert("エリアが選択されていません");
      return;
    }
    
    // パスコード検証
    if (passcode !== selectedAreaData.passcode) {
      alert("パスコードが正しくありません");
      return;
    }
    
    // MapPageに遷移（areaIdをパラメータとして渡す）
    navigate(`/map/${selectedArea}`);
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
          disabled={loading}
        >
          <option value="">
            {loading ? "読み込み中..." : "-- 選択してください --"}
          </option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.areaName}
            </option>
          ))}
        </select>

        {error && (
          <div className="text-red-500 text-sm mb-4">
            {error}
          </div>
        )}

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
          disabled={loading}
        >
          参加する
        </button>
      </form>
    </div>
  );
}