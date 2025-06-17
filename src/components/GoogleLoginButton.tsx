// src/components/GoogleLoginButton.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

export default function GoogleLoginButton() {
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    console.log("🔍 handleGoogleLogin called");    // ←追加
    try {
      await signInWithPopup(auth, googleProvider);
      console.log("✅ signInWithPopup succeeded");  // ←追加
      navigate("/role-select");
      console.log("➡️ navigate to /role-select");   // ←追加
    } catch (error) {
      console.error("❌ Google login error:", error);
      alert("ログイン失敗:" + error);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
    >
      Googleでログイン
    </button>
  );
}
