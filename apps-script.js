// ===== PASTE THIS IN Google Apps Script (Extensions → Apps Script) =====
// Then Deploy → New Deployment → Web App → Execute as: Me, Access: Anyone → Deploy
// Copy the URL and paste it in .env as VITE_APPS_SCRIPT_URL
// IMPORTANT: After updating this script, you must create a NEW deployment version

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'addMatch') {
      var matchSheet = getOrCreateMatchSheet(ss, data.sheetName);
      var lastRow = Math.max(matchSheet.getLastRow(), 1);
      var matchNum = lastRow; // row 1 is header, so row 2 = M1
      var matchId = 'M' + matchNum;

      matchSheet.getRange(lastRow + 1, 1, 1, 6).setValues([[
        matchId,
        data.team1 || '',
        data.team2 || '',
        data.scheduledDate || '',
        data.winner || '',
        data.remarks || ''
      ]]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, matchId: matchId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'updateMatch') {
      var matchSheetName = data.sheetName + '_Matches';
      var sheet = ss.getSheetByName(matchSheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Match sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === data.matchId) {
          if (data.scheduledDate !== undefined) sheet.getRange(i + 1, 4).setValue(data.scheduledDate);
          if (data.winner !== undefined) sheet.getRange(i + 1, 5).setValue(data.winner);
          if (data.remarks !== undefined) sheet.getRange(i + 1, 6).setValue(data.remarks);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Match not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'deleteMatch') {
      var matchSheetName = data.sheetName + '_Matches';
      var sheet = ss.getSheetByName(matchSheetName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Match sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      var values = sheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === data.matchId) {
          sheet.deleteRow(i + 1);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Match not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    lock.releaseLock();
  }
}

function getOrCreateMatchSheet(ss, sheetName) {
  var matchSheetName = sheetName + '_Matches';
  var sheet = ss.getSheetByName(matchSheetName);

  if (!sheet) {
    sheet = ss.insertSheet(matchSheetName);
    sheet.getRange(1, 1, 1, 6).setValues([['Match ID', 'Team 1', 'Team 2', 'Scheduled Date', 'Winner', 'Remarks']]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 200);
  }

  return sheet;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
