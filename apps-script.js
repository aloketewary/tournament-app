// ===== PASTE THIS IN Google Apps Script (Extensions → Apps Script) =====
// Then Deploy → Manage deployments → Edit → New version → Deploy

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === 'addMatch') {
      var matchSheet = getOrCreateMatchSheet(ss, data.sheetName);
      var lastRow = Math.max(matchSheet.getLastRow(), 1);
      var matchNum = lastRow;
      var matchId = 'M' + matchNum;
      var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm');

      matchSheet.getRange(lastRow + 1, 1, 1, 8).setValues([[
        matchId,
        data.team1 || '',
        data.team2 || '',
        data.scheduledDate || '',
        data.winner || '',
        data.remarks || '',
        data.updatedBy || '',
        now
      ]]);

      return ContentService.createTextOutput(JSON.stringify({ success: true, matchId: matchId }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'updateMatch') {
      var matchSheet = getOrCreateMatchSheet(ss, data.sheetName);

      var values = matchSheet.getDataRange().getValues();
      var now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd-MMM-yyyy HH:mm');
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === data.matchId) {
          if (data.scheduledDate !== undefined) matchSheet.getRange(i + 1, 4).setValue(data.scheduledDate);
          if (data.winner !== undefined) matchSheet.getRange(i + 1, 5).setValue(data.winner);
          if (data.remarks !== undefined) matchSheet.getRange(i + 1, 6).setValue(data.remarks);
          matchSheet.getRange(i + 1, 7).setValue(data.updatedBy || '');
          matchSheet.getRange(i + 1, 8).setValue(now);
          return ContentService.createTextOutput(JSON.stringify({ success: true }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Match not found' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'deleteMatch') {
      var matchSheet = getOrCreateMatchSheet(ss, data.sheetName);

      var values = matchSheet.getDataRange().getValues();
      for (var i = 1; i < values.length; i++) {
        if (String(values[i][0]) === data.matchId) {
          matchSheet.deleteRow(i + 1);
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
    sheet.getRange(1, 1, 1, 8).setValues([['Match ID', 'Team 1', 'Team 2', 'Scheduled Date', 'Winner', 'Remarks', 'Updated By', 'Updated At']]);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
    sheet.setColumnWidth(1, 80);
    sheet.setColumnWidth(2, 120);
    sheet.setColumnWidth(3, 120);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 120);
    sheet.setColumnWidth(6, 200);
    sheet.setColumnWidth(7, 120);
    sheet.setColumnWidth(8, 150);
  } else {
    // Migrate old sheets: add missing columns if needed
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < 8 || headers[6] !== 'Updated By') {
      sheet.getRange(1, 7).setValue('Updated By');
      sheet.getRange(1, 8).setValue('Updated At');
      sheet.getRange(1, 7, 1, 2).setFontWeight('bold');
    }
  }

  return sheet;
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}
