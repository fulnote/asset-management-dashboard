/**
 * Google Apps Script (GAS) Web App 用コード
 * 
 * 以下のコードを Google スプレッドシートの「拡張機能」>「Apps Script」に貼り付け、
 * 新しいデプロイから「ウェブアプリ」としてデプロイ（アクセスできるユーザー: 全員）してください。
 */

function doGet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. 資産シートの読込
  const assetsSheet = spreadsheet.getSheetByName("資産") || spreadsheet.getSheetByName("assets") || spreadsheet.getSheets()[0];
  const assetsRange = assetsSheet.getDataRange();
  const assetsValues = assetsRange.getValues();
  const assetsHeaders = assetsValues[0];
  const assets = [];
  
  for (let i = 1; i < assetsValues.length; i++) {
    const row = assetsValues[i];
    if (!row[0] || row[0].toString().trim() === "") continue; // 空行はスキップ
    const asset = {};
    for (let j = 0; j < assetsHeaders.length; j++) {
      asset[assetsHeaders[j]] = row[j];
    }
    assets.push(asset);
  }
  
  // 2. 資産推移シートの読込
  const historySheet = spreadsheet.getSheetByName("推移") || spreadsheet.getSheetByName("history");
  const historyByCategory = [];
  
  if (historySheet) {
    const historyRange = historySheet.getDataRange();
    const historyValues = historyRange.getValues();
    const historyHeaders = historyValues[0];
    
    for (let i = 1; i < historyValues.length; i++) {
      const row = historyValues[i];
      if (!row[0] || row[0].toString().trim() === "") continue;
      const point = {};
      for (let j = 0; j < historyHeaders.length; j++) {
        const header = historyHeaders[j];
        if (header === "date" || header === "日付") {
          let dateVal = row[j];
          if (dateVal instanceof Date) {
            point["date"] = Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else {
            point["date"] = dateVal;
          }
        } else {
          point[header] = row[j];
        }
      }
      historyByCategory.push(point);
    }
  }
  
  // 3. ライフプラン設定シートの読込
  const lpSettingsSheet = spreadsheet.getSheetByName("ライフプラン設定") || spreadsheet.getSheetByName("lifeplan_settings");
  let lifePlanParams = null;
  
  if (lpSettingsSheet) {
    const lpValues = lpSettingsSheet.getDataRange().getValues();
    lifePlanParams = {};
    for (let i = 0; i < lpValues.length; i++) {
      const key = lpValues[i][0] ? lpValues[i][0].toString().trim() : "";
      const value = lpValues[i][1];
      if (key && key !== "項目" && key !== "項目名" && key !== "Key") {
        lifePlanParams[key] = value;
      }
    }
  }
  
  // 4. ライフイベントシートの読込
  const lpEventsSheet = spreadsheet.getSheetByName("ライフイベント") || spreadsheet.getSheetByName("life_events");
  const lifeEvents = [];
  
  if (lpEventsSheet) {
    const lpEventsValues = lpEventsSheet.getDataRange().getValues();
    const lpHeaders = lpEventsValues[0].map(h => h.toString().trim()); // ヘッダー
    
    for (let i = 1; i < lpEventsValues.length; i++) {
      const row = lpEventsValues[i];
      if (!row[0] || row[0].toString().trim() === "") continue; // 空行スキップ
      const eventObj = {};
      for (let j = 0; j < lpHeaders.length; j++) {
        eventObj[lpHeaders[j]] = row[j];
      }
      lifeEvents.push(eventObj);
    }
  }
  
  const result = {
    assets: assets,
    historyByCategory: historyByCategory,
    lifePlanParams: lifePlanParams,
    lifeEvents: lifeEvents
  };
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}
