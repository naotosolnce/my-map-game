// src/pages/RoleSelect.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { checkOrganizerStatus, getUserInfo } from '../services/authService';
import type { User } from 'firebase/auth';

export default function RoleSelect() {
 const navigate = useNavigate();
 const [loading, setLoading] = useState(false);
 const [user, setUser] = useState<User | null>(null);
 const [userInfo, setUserInfo] = useState<any>(null);

 // コンポーネント読み込み時にユーザー情報を取得
 useEffect(() => {
   const currentUser = auth.currentUser;
   if (currentUser) {
     setUser(currentUser);
     const info = getUserInfo(currentUser);
     setUserInfo(info);
     console.log('Current User Info:', info);
   } else {
     navigate('/login');
   }
 }, [navigate]);

 const handleOrganizerClick = async () => {
   if (!user) {
     alert('ログインが必要です');
     return;
   }

   setLoading(true);
   
   try {
     const { isOrganizer, organizerData } = await checkOrganizerStatus(user);
     
     if (isOrganizer) {
       console.log('Organizer Data:', organizerData);
       navigate('/organizer');
     } else {
       alert(`主催者権限がありません。\n\nあなたのUID: ${user.uid}\n\n管理者にこのUIDを伝えて、主催者として登録を依頼してください。`);
     }
   } catch (error) {
     console.error('主催者チェックエラー:', error);
     alert('エラーが発生しました。再度お試しください。');
   } finally {
     setLoading(false);
   }
 };

 const handleUserClick = () => {
   navigate('/user');
 };

 if (!user) {
   return (
     <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center">
       <div className="text-center">
         <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl shadow-lg mb-4 border border-white/20">
           <div className="w-6 h-6 border-2 border-white/60 border-t-white rounded-full animate-spin"></div>
         </div>
         <p className="text-white/80 font-medium">ログイン情報を確認中...</p>
       </div>
     </div>
   );
 }

 return (
   <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 relative overflow-hidden">
     {/* 動的背景エフェクト */}
     <div className="absolute inset-0">
       <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
       <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
       <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-2xl animate-pulse delay-2000"></div>
     </div>

     {/* グリッドパターン */}
     <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent" 
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)`,
            backgroundSize: '50px 50px'
          }}>
     </div>

     <div className="relative z-10">
       {/* ヘッダー */}
       <div className="pt-12 pb-8 px-6 text-center">
         <div className="relative inline-block mb-6">
           <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-3xl shadow-2xl flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform duration-500">
             <div className="w-12 h-12 bg-white/90 rounded-2xl flex items-center justify-center backdrop-blur-sm">
               <span className="text-2xl">🎯</span>
             </div>
           </div>
           <div className="absolute -inset-4 bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 rounded-3xl blur-xl opacity-30 animate-pulse"></div>
         </div>
         
         <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
           役割を選択
         </h1>
         <p className="text-purple-200 text-lg font-medium">
           あなたの参加方法を選んでください
         </p>
       </div>

       {/* ユーザー情報カード */}
       <div className="px-6 mb-8">
         <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 shadow-2xl">
           <div className="flex items-center mb-4">
             <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
               <span className="text-white text-xl">👤</span>
             </div>
             <h3 className="text-xl font-bold text-white">ログイン情報</h3>
           </div>
           
           <div className="space-y-3">
             <div className="flex items-center p-3 bg-white/5 rounded-2xl border border-white/10">
               <span className="text-cyan-400 mr-3 text-lg">📧</span>
               <span className="text-white font-medium break-all">{userInfo?.email || user?.email}</span>
             </div>
             <div className="flex items-center p-3 bg-white/5 rounded-2xl border border-white/10">
               <span className="text-purple-400 mr-3 text-lg">#</span>
               <span className="text-purple-200 font-mono text-sm break-all">{userInfo?.uid || user?.uid}</span>
             </div>
           </div>
           
           <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-400/30">
             <div className="flex items-start">
               <span className="text-amber-400 mr-2 text-lg flex-shrink-0">💡</span>
               <p className="text-amber-100 text-sm leading-relaxed font-medium">
                 主催者権限が必要な場合は、上記UIDを管理者にお伝えください
               </p>
             </div>
           </div>
         </div>
       </div>

       {/* 選択肢カード */}
       <div className="px-6 space-y-6">
         {/* 主催者カード */}
         <button
           type="button"
           onClick={handleOrganizerClick}
           disabled={loading}
           className={`w-full group relative overflow-hidden ${
             loading
               ? 'cursor-not-allowed opacity-60'
               : 'cursor-pointer hover:scale-105 active:scale-95'
           } transition-all duration-300`}
         >
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 rounded-3xl"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-700 to-pink-700 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
           <div className="relative p-8 rounded-3xl shadow-2xl border border-white/20">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-5">
                 <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                   {loading ? (
                     <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <span className="text-white text-3xl">🛡️</span>
                   )}
                 </div>
                 <div className="text-left">
                   <h3 className="text-2xl font-black text-white mb-1">
                     {loading ? '権限確認中...' : '主催者として参加'}
                   </h3>
                   <p className="text-indigo-100 font-medium">
                     {loading ? 'しばらくお待ちください' : 'ゲームを作成・管理する'}
                   </p>
                 </div>
               </div>
               {!loading && (
                 <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl group-hover:translate-x-2 group-hover:bg-white/30 transition-all duration-300">
                   <span className="text-white text-xl">→</span>
                 </div>
               )}
             </div>
           </div>
         </button>

         {/* ユーザーカード */}
         <button
           type="button"
           onClick={handleUserClick}
           disabled={loading}
           className={`w-full group relative overflow-hidden ${
             loading
               ? 'cursor-not-allowed opacity-60'
               : 'cursor-pointer hover:scale-105 active:scale-95'
           } transition-all duration-300`}
         >
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 rounded-3xl"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-700 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
           <div className="relative p-8 rounded-3xl shadow-2xl border border-white/20">
             <div className="flex items-center justify-between">
               <div className="flex items-center space-x-5">
                 <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-sm shadow-xl">
                   <span className="text-white text-3xl">👥</span>
                 </div>
                 <div className="text-left">
                   <h3 className="text-2xl font-black text-white mb-1">
                     ユーザーとして参加
                   </h3>
                   <p className="text-emerald-100 font-medium">
                     エリアを選んでゲームに参加
                   </p>
                 </div>
               </div>
               {!loading && (
                 <div className="flex items-center justify-center w-12 h-12 bg-white/20 rounded-2xl group-hover:translate-x-2 group-hover:bg-white/30 transition-all duration-300">
                   <span className="text-white text-xl">→</span>
                 </div>
               )}
             </div>
           </div>
         </button>
       </div>

       {/* フッター */}
       <div className="mt-16 pb-12 text-center">
         <div className="inline-flex items-center px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full border border-white/20">
           <span className="text-purple-300 mr-2">📱</span>
           <p className="text-purple-200 font-medium">
             スマートフォンでの利用を推奨します
           </p>
         </div>
       </div>
     </div>
   </div>
 );
}