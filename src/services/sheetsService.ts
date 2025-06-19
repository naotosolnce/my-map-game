// src/services/sheetsService.ts
import Papa from 'papaparse';

// Google Sheets CSVエクスポート機能
export const fetchAddressesFromSheet = async (sheetUrl: string): Promise<string[]> => {
  try {
    // Google SheetsのURLをCSV形式に変換
    const csvUrl = convertToCsvUrl(sheetUrl);
    console.log('CSV URL:', csvUrl); // デバッグ用
    
    const response = await fetch(csvUrl, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
      },
      mode: 'cors'
    });
    
    if (!response.ok) {
      throw new Error(`スプレッドシートの取得に失敗しました: ${response.status} ${response.statusText}`);
    }
    
    const csvText = await response.text();
    console.log('取得したCSVデータ:', csvText.substring(0, 200) + '...'); // デバッグ用（最初の200文字）
    
    // CSVをパース（住所が1列目にあると仮定）
    const result = Papa.parse<string[]>(csvText, {
      header: false,
      skipEmptyLines: true,
      delimiter: ',',
    });
    
    if (result.errors && result.errors.length > 0) {
      console.warn('CSV解析中のエラー:', result.errors);
    }
    
    // 1列目の住所データを抽出
    // 1列目の住所データを抽出
const addresses: string[] = [];

if (result.data) {
  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    if (Array.isArray(row) && row.length > 0) {
      const address = row[0];
      if (typeof address === 'string' && address.trim() && address !== 'undefined') {
        // 1行目がヘッダー行かチェック
        if (i === 0 && (address.toLowerCase() === 'address' || address === '住所')) {
          continue; // ヘッダー行はスキップ
        }
        addresses.push(address.trim());
      }
    }
  }
}
    
    console.log('抽出した住所:', addresses); // デバッグ用
    return addresses;
  } catch (error) {
    console.error('スプレッドシート読み込みエラー:', error);
    throw error;
  }
};

// Google SheetsのURLをCSV用に変換
const convertToCsvUrl = (sheetUrl: string): string => {
  // 既に公開用CSVのURLの場合はそのまま返す
  if (sheetUrl.includes('/pub?output=csv') || sheetUrl.includes('/export?format=csv')) {
    return sheetUrl;
  }
  
  // 公開用URL（/pub形式）の場合
  if (sheetUrl.includes('/pub')) {
    // https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub
    // ↓
    // https://docs.google.com/spreadsheets/d/e/{PUBLISHED_ID}/pub?output=csv
    const baseUrl = sheetUrl.split('?')[0]; // クエリパラメータを除去
    return `${baseUrl}?output=csv`;
  }
  
  // 通常の編集用URL（/edit形式）の場合
  // https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
  // ↓
  // https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid=0
  const sheetIdMatch = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!sheetIdMatch || !sheetIdMatch[1]) {
    throw new Error('無効なスプレッドシートURLです');
  }
  
  const sheetId = sheetIdMatch[1];
  
  // gidの取得（シートタブのID）
  const gidMatch = sheetUrl.match(/gid=([0-9]+)/);
  const gid = gidMatch && gidMatch[1] ? gidMatch[1] : '0';
  
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
};

// 使用例:
// const addresses = await fetchAddressesFromSheet('https://docs.google.com/spreadsheets/d/e/2PACX-1vQPweKxoT8lKf4IZ0GmznDq_GZJkPdkFmrsUOwgHlpIsgRWGHTR_LQGjEofV3mJ6lB5HufFcuyR2pXz/pub?output=csv');