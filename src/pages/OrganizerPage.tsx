import type { FormEvent } from "react";
import { useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { fetchAddressesFromSheet } from "../services/sheetsService";
import { geocodeAddresses } from "../services/geocodingService";
import { saveLocationsToFirestore, updateAreaGeocoded } from "../services/locationService";

export default function OrganizerPage() {
  const [areaName, setAreaName] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [passcode, setPasscode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("ログインユーザーが見つかりません");
      
      // 1. エリア情報を保存
      setProgress("エリア情報を保存中...");
      const areaDoc = await addDoc(collection(db, "areas"), {
        areaName,
        sheetUrl,
        passcode,
        organizerUid: user.uid,
        createdAt: serverTimestamp(),
        geocoded: false,
      });
      const areaId = areaDoc.id;
      
      // 2. スプレッドシートから住所を取得
      setProgress("スプレッドシートから住所を読み込み中...");
      const addresses = await fetchAddressesFromSheet(sheetUrl);
      console.log('取得した住所:', addresses);
      
      if (addresses.length === 0) {
        throw new Error("スプレッドシートから住所が取得できませんでした");
      }
      
      // 3. ジオコーディング実行
      setProgress("住所を座標に変換中...");
      const geocodingResults = await geocodeAddresses(addresses, (current, total) => {
        setProgress(`住所を座標に変換中... (${current}/${total})`);
      });
      console.log('ジオコーディング結果:', geocodingResults);
      
      if (geocodingResults.length === 0) {
        throw new Error("住所の座標変換に失敗しました");
      }
      
      // 4. Firestoreにピン情報を保存
      setProgress("ピン情報を保存中...");
      await saveLocationsToFirestore(areaId, geocodingResults);
      
      // 5. エリアのジオコーディング完了フラグを更新
      await updateAreaGeocoded(areaId);
      
      alert(`主催者設定を保存しました！\n住所数: ${addresses.length}\nピン登録数: ${geocodingResults.length}`);
      navigate("/user");
      
    } catch (error) {
      console.error('処理エラー:', error);
      alert("保存に失敗しました: " + (error as Error).message);
    } finally {
      setIsProcessing(false);
      setProgress("");
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
          disabled={isProcessing}
        />

        <label className="block mb-1">スプレッドシートURL</label>
        <input
          type="url"
          value={sheetUrl}
          onChange={(e) => setSheetUrl(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-4"
          required
          disabled={isProcessing}
        />

        <label className="block mb-1">パスコード</label>
        <input
          type="text"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          className="w-full border px-3 py-2 rounded mb-6"
          required
          disabled={isProcessing}
        />

        {progress && (
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {progress}
          </div>
        )}

        <button
          type="submit"
          disabled={isProcessing}
          className={`w-full py-2 rounded transition ${
            isProcessing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          } text-white`}
        >
          {isProcessing ? '処理中...' : '設定を保存'}
        </button>
      </form>
    </div>
  );
}