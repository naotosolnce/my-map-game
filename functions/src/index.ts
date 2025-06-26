import { onRequest, onCall } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
// import { getAuth } from 'firebase-admin/auth';
import * as logger from 'firebase-functions/logger';

// Firebase Admin SDK初期化
initializeApp();

// 管理者初期設定用（一度だけ実行する関数）
export const setupAdmin = onRequest(async (req, res) => {
  const db = getFirestore();
  
  // ここにあなたのメールアドレスを入力してください
  const adminEmail = 'naotosolnce@gmail.com'; // 実際のメールアドレスに変更
  
  try {
    logger.info('Admin setup started');
    
    // 一時的にsetupコレクションに管理者情報を保存
    await db.collection('setup').doc('admin').set({
      email: adminEmail,
      role: 'super_admin',
      createdAt: new Date(),
      status: 'pending_uid_setup'
    });
    
    logger.info('Admin setup completed');
    res.json({ 
      success: true, 
      message: 'Admin setup completed. Please login with Google to get your UID.',
      email: adminEmail
    });
  } catch (error) {
    logger.error('Admin setup failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// 主催者権限チェック関数
export const checkOrganizerStatus = onCall(async (request) => {
  const { auth } = request;
  
  if (!auth) {
    throw new Error('Authentication required');
  }
  
  const db = getFirestore();
  const uid = auth.uid;
  
  try {
    // organizersコレクションでUIDを確認
    const organizerDoc = await db.collection('organizers').doc(uid).get();
    
    return {
      isOrganizer: organizerDoc.exists,
      organizerData: organizerDoc.exists ? organizerDoc.data() : null
    };
  } catch (error) {
    logger.error('Error checking organizer status:', error);
    throw new Error('Failed to check organizer status');
  }
});