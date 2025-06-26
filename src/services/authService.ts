// src/services/authService.ts
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

// ユーザー情報を取得する関数（既存のコードで使用されている）
export const getUserInfo = (user: User) => {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
};

// 主催者権限をチェックする関数
export const checkOrganizerStatus = async (user: User) => {
  try {
    // Firestoreの organizers コレクションでユーザーのUIDを検索
    const organizerDocRef = doc(db, 'organizers', user.uid);
    const organizerDoc = await getDoc(organizerDocRef);
    
    if (organizerDoc.exists()) {
      return {
        isOrganizer: true,
        organizerData: organizerDoc.data()
      };
    } else {
      return {
        isOrganizer: false,
        organizerData: null
      };
    }
  } catch (error) {
    console.error('checkOrganizerStatus error:', error);
    throw error;
  }
};

// エリアの編集権限をチェックする関数（新規追加）
export const checkAreaEditPermission = async (user: User, areaId: string): Promise<boolean> => {
  if (!user || !areaId) {
    return false;
  }

  try {
    // 1. adminsコレクションをチェック（全エリア編集可能）
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) {
      console.log(`[AreaPermission] User ${user.uid} is admin - full access granted`);
      return true;
    }

    // 2. 該当エリアのorganizerUidをチェック
    const areaDoc = await getDoc(doc(db, 'areas', areaId));
    if (areaDoc.exists()) {
      const areaData = areaDoc.data();
      const organizerUid = areaData.organizerUid;
      
      if (organizerUid === user.uid) {
        console.log(`[AreaPermission] User ${user.uid} is organizer of area ${areaId}`);
        return true;
      } else {
        console.log(`[AreaPermission] User ${user.uid} is not organizer of area ${areaId} (organizer: ${organizerUid})`);
        return false;
      }
    } else {
      console.warn(`[AreaPermission] Area ${areaId} not found`);
      return false;
    }
  } catch (error) {
    console.error('[AreaPermission] Error checking permissions:', error);
    return false;
  }
};

// 管理者権限のみをチェックする関数（新規追加）
export const checkAdminPermission = async (user: User): Promise<boolean> => {
  if (!user) {
    return false;
  }

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('[AreaPermission] Error checking admin permissions:', error);
    return false;
  }
};