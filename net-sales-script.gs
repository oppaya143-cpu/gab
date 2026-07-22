var SHEET_NAME = "Net Sales";
var PEOPLE_SHEET = "PeopleList";
var PROCESS_COL_LIMIT = 8;
var PEOPLE_COL = 7;
var SALES_COL = 8;
var COL_E = 5;
var COL_F = 6;

var lastExecutionTime = 0;
var DEBOUNCE_INTERVAL = 1000; 
var isProcessing = false;

function _ss() { 
  return SpreadsheetApp.getActiveSpreadsheet(); 
}

function _debounce() {
  var now = new Date().getTime();
  if (now - lastExecutionTime < DEBOUNCE_INTERVAL || isProcessing) {
    return false;
  }
  lastExecutionTime = now;
  return true;
}

function _setProcessing(value) {
  isProcessing = value;
}

function _ensureSheet() {
  var ss = _ss();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  
  var headers = ["Date / Time","Gross","Fee","Net","Username","Descriptions","Chatter Sales","Sales Report"];
  try { 
    if (sheet.getLastColumn() < PROCESS_COL_LIMIT) {
      sheet.insertColumnsAfter(sheet.getLastColumn(), PROCESS_COL_LIMIT - sheet.getLastColumn()); 
    } 
  } catch(e){
    Logger.log("_ensureSheet insertColumns error: " + e);
  }
  
  var lastCol = Math.max(sheet.getLastColumn(), headers.length);
  var existing = sheet.getRange(1,1,1,lastCol).getValues()[0];
  var need = false;
  
  for (var i=0;i<headers.length;i++){
    if (!existing[i] || String(existing[i]).trim()==="") { 
      existing[i] = headers[i]; 
      need = true; 
    }
  }
  
  if (need) sheet.getRange(1,1,1,existing.length).setValues([existing]);
  sheet.setFrozenRows(1);

  _ensurePeopleListSheet();
  return sheet;
}

function _ensurePeopleListSheet() {
  var ss = _ss();
  var ps = ss.getSheetByName(PEOPLE_SHEET);
  if (!ps) ps = ss.insertSheet(PEOPLE_SHEET);
  
  try {
    var lr = Math.max(1, ps.getLastRow());
    var vals = ps.getRange(1, 1, lr, 2).getValues().map(function(r){
      return [ String(r[0] || "").trim(), String(r[1] || "").trim() ];
    });
    var has = vals.some(function(v){ return v[0] !== "" || v[1] !== ""; });
    if (!has) {
      ps.clear();
      ps.getRange(1,1,2,2).setValues([[" | Inbox 1",""],[" | Inbox 2",""]]);
    }
    lr = Math.max(1, ps.getLastRow());
    var data = ps.getRange(1,1,lr,2).getValues();
    for (var i=0;i<data.length;i++){ 
      ps.getRange(i+1,1).setValue(String(data[i][0] || "").trim());
      ps.getRange(i+1,2).setValue(String(data[i][1] || "").trim());
    }
  } catch(e){
    Logger.log("_ensurePeopleListSheet error: " + e);
  }

  return ps;
}

function _applyDoubleBorders(sheet, startRow, endRow) {
  if (!sheet) return;
  try {
    // Validate input parameters
    if (startRow < 1 || endRow < startRow) {
      Logger.log("_applyDoubleBorders: Invalid range - startRow: " + startRow + ", endRow: " + endRow);
      return;
    }
    
    var actualEndRow = Math.min(endRow, sheet.getLastRow());
    if (actualEndRow < startRow) actualEndRow = startRow;
    
    var fullRange = sheet.getRange(startRow, 1, actualEndRow - startRow + 1, PROCESS_COL_LIMIT);
    
    // Create robust border specification
    var border = SpreadsheetApp.newBorder()
      .setBorder(true, true, true, true, true, true, "#f08bb1", SpreadsheetApp.BorderStyle.DOUBLE)
      .build();
    
    // Apply with verification
    fullRange.setBorder(border);
    
    Logger.log("_applyDoubleBorders: Applied DOUBLE borders #f08bb1 to rows " + startRow + " to " + actualEndRow);
  } catch(e){
    Logger.log("_applyDoubleBorders CRITICAL ERROR: " + e);
  }
}

function _applyDoubleBordersWithRetry(sheet, startRow, endRow, maxAttempts) {
  if (!sheet) return;
  
  maxAttempts = maxAttempts || 5;
  var baseDelay = 150;
  
  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      Utilities.sleep(baseDelay + (attempt * 100));
      _applyDoubleBorders(sheet, startRow, endRow);
      Logger.log("_applyDoubleBordersWithRetry: Success on attempt " + (attempt + 1));
      return true;
    } catch(e){
      Logger.log("_applyDoubleBordersWithRetry: Attempt " + (attempt + 1) + " failed - " + e);
      if (attempt === maxAttempts - 1) {
        Logger.log("_applyDoubleBordersWithRetry: Max attempts reached");
        return false;
      }
    }
  }
  return false;
}

function _ensureBlackFontAtoG(sheet, startRow, endRow) {
  if (!sheet || startRow > endRow) return;
  try {
    for (var col = 1; col <= 7; col++) {
      try {
        var range = sheet.getRange(startRow, col, endRow - startRow + 1, 1);
        range.setFontColor("#000000");
      } catch(e){
        Logger.log("_ensureBlackFontAtoG column " + col + " error: " + e);
      }
    }
  } catch(e){
    Logger.log("_ensureBlackFontAtoG error: " + e);
  }
}

function _applyAllFormatting(sheet, dataStartRow, dataEndRow) {
  if (!sheet) return;

  var lastRow = Math.max(dataEndRow, sheet.getLastRow(), 50);

  try {
    var headerRange = sheet.getRange(1, 1, 1, PROCESS_COL_LIMIT);
    headerRange.setFontFamily("Grenze Gotisch").setFontSize(18).setBold(true).setHorizontalAlignment("center").setVerticalAlignment("middle").setBackground("#f4bfd4").setFontColor("#000000");
    sheet.setRowHeight(1, 44);
  } catch(e){
    Logger.log("Header formatting error: " + e);
  }

  try {
    var colA = sheet.getRange(2, 1, Math.max(1, lastRow - 1), 1);
    colA.setFontFamily("Merriweather").setFontSize(9).setFontWeight("bold").setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setColumnWidth(1, 150);
  } catch(e){
    Logger.log("Column A formatting error: " + e);
  }

  try {
    var colB = sheet.getRange(2, 2, Math.max(1, lastRow - 1), 1);
    colB.setFontFamily("Lexend").setFontSize(10).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setColumnWidth(2, 80);
  } catch(e){
    Logger.log("Column B formatting error: " + e);
  }

  try {
    var colC = sheet.getRange(2, 3, Math.max(1, lastRow - 1), 1);
    colC.setFontFamily("Lexend").setFontSize(9).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setColumnWidth(3, 50);
  } catch(e){
    Logger.log("Column C formatting error: " + e);
  }

  try {
    var colD = sheet.getRange(2, 4, Math.max(1, lastRow - 1), 1);
    colD.setFontFamily("Lexend").setFontSize(10).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setColumnWidth(4, 80);
  } catch(e){
    Logger.log("Column D formatting error: " + e);
  }

  try {
    var colE = sheet.getRange(2, 5, Math.max(1, lastRow - 1), 1);
    colE.setFontFamily("Oswald").setFontSize(10).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
    sheet.setColumnWidth(5, 140);
  } catch(e){
    Logger.log("Column E formatting error: " + e);
  }

  try {
    var colF = sheet.getRange(2, 6, Math.max(1, lastRow - 1), 1);
    colF.setFontFamily("Merriweather").setFontSize(10).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle");
  } catch(e){
    Logger.log("Column F formatting error: " + e);
  }

  try {
    var colG = sheet.getRange(2, 7, Math.max(1, lastRow - 1), 1);
    colG.setFontFamily("Grenze Gotisch").setFontSize(12).setFontColor("#000000").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.setColumnWidth(7, 200);
  } catch(e){
    Logger.log("Column G formatting error: " + e);
  }

  try {
    var colH = sheet.getRange(2, 8, Math.max(1, lastRow - 1), 1);
    colH.setFontFamily("Fredericka the Great").setFontSize(16).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
    sheet.setColumnWidth(8, 300);
  } catch(e){
    Logger.log("Column H formatting error: " + e);
  }

  try {
    for (var r = 2; r <= lastRow; r++) {
      try {
        var idx = r - 2;
        var bg = (idx % 2 === 0) ? "#FFFFFF" : "#FFF0F4";
        sheet.getRange(r, 1, 1, PROCESS_COL_LIMIT).setBackground(bg);
      } catch(e){}
    }
  } catch(e){
    Logger.log("Row background error: " + e);
  }

  _ensureBlackFontAtoG(sheet, 2, lastRow);
  
  // CRITICAL: Apply DOUBLE borders LAST with ROBUST RETRY LOGIC
  _applyDoubleBordersWithRetry(sheet, 1, lastRow, 5);
}

function applyChatterValidation() {
  var sheet = _ensureSheet();
  var ps = _ensurePeopleListSheet();
  var lr = Math.max(1, ps.getLastRow());
  var choices = ps.getRange(1,1,lr,1).getValues().map(function(r){ return String(r[0]||"").trim(); }).filter(Boolean);
  if (choices.length === 0) return;
  
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(choices, true).setAllowInvalid(true).build();
  var lastRow = Math.max(2, sheet.getMaxRows());
  try { sheet.getRange(2, PEOPLE_COL, lastRow-1, 1).setDataValidation(rule); } catch(e){
    Logger.log("applyChatterValidation error: " + e);
  }
}

function formatDateTimeInColumnA(sheet, startRow, endRow) {
  if (!sheet || startRow > endRow) return;
  
  try {
    var range = sheet.getRange(startRow, 1, endRow - startRow + 1, 1);
    var values = range.getValues();
    
    var out = [];
    var anyDate = false;
    
    for (var i = 0; i < values.length; i++) {
      var val = values[i][0];
      if (val && val !== "") {
        try {
          if (val instanceof Date) {
            out.push([val]);
            anyDate = true;
            continue;
          }
          
          var dateStr = String(val).trim();
          dateStr = dateStr.replace(/\s+/g, " ");
          var monthMatch = dateStr.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
          var timeMatch = dateStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          var parsedDate = null;
          
          if (monthMatch) {
            var monthName = monthMatch[1];
            var day = parseInt(monthMatch[2], 10);
            var year = parseInt(monthMatch[3], 10);
            var monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            var monthIndex = -1;
            for (var mi=0; mi<monthNames.length; mi++){
              if (monthName.substr(0,3).toLowerCase() === monthNames[mi].toLowerCase().substr(0,3)) {
                monthIndex = mi;
                break;
              }
            }
            var hour = 0, minute = 0;
            if (timeMatch) {
              hour = parseInt(timeMatch[1],10);
              minute = parseInt(timeMatch[2],10);
              var ampm = timeMatch[3] ? String(timeMatch[3]).toLowerCase() : null;
              if (ampm === 'pm' && hour < 12) hour += 12;
              if (ampm === 'am' && hour === 12) hour = 0;
            }
            if (monthIndex >= 0) {
              parsedDate = new Date(year, monthIndex, day, hour, minute, 0);
            }
          } else {
            var dp = Date.parse(dateStr);
            if (!isNaN(dp)) parsedDate = new Date(dp);
          }
          
          if (parsedDate && parsedDate.toString() !== "Invalid Date") {
            out.push([parsedDate]);
            anyDate = true;
          } else {
            out.push([val]);
          }
        } catch (err) {
          Logger.log("Error parsing date at row " + (startRow + i) + ": " + err);
          out.push([val]);
        }
      } else {
        out.push([val]);
      }
    }
    
    range.setValues(out);
    if (anyDate) {
      try {
        range.setNumberFormat("mmm dd, yyyy hh:mm am/pm");
      } catch(e){}
    }
    
    // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC
    _applyDoubleBordersWithRetry(sheet, startRow, endRow, 5);
  } catch (err) {
    Logger.log("formatDateTimeInColumnA error: " + err);
  }
}

function formatCurrencyColumns(sheet, startRow, endRow) {
  if (!sheet || startRow > endRow) return;
  
  try {
    var cols = [2, 3, 4];
    
    for (var c = 0; c < cols.length; c++) {
      try {
        var colNum = cols[c];
        var range = sheet.getRange(startRow, colNum, endRow - startRow + 1, 1);
        var values = range.getValues();
        var numericValues = [];
        
        for (var i = 0; i < values.length; i++) {
          var val = values[i][0];
          
          if (val && val !== "") {
            var strVal = String(val).trim();
            var numValue = parseFloat(strVal.replace(/[\$,\s]/g, "")) || 0;
            numericValues.push([numValue]);
          } else {
            numericValues.push([""]);
          }
        }
        
        range.setValues(numericValues);
        range.setNumberFormat('"$"#,##0.00');
      } catch (err) {
        Logger.log("formatCurrencyColumns column " + cols[c] + " error: " + err);
      }
    }
    
    // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC
    _applyDoubleBordersWithRetry(sheet, startRow, endRow, 5);
  } catch (err) {
    Logger.log("formatCurrencyColumns error: " + err);
  }
}

function applyChatterRowColorsWithH(sheet) {
  if (!sheet) sheet = _ensureSheet();
  var ss = _ss();
  var ps = ss.getSheetByName(PEOPLE_SHEET);
  if (!ps) {
    Logger.log("applyChatterRowColorsWithH: PEOPLE_SHEET not found");
    return;
  }

  var peopleRows = [];
  try {
    peopleRows = ps.getRange(1,1,Math.max(1,ps.getLastRow()),2).getDisplayValues();
  } catch (e) {
    Logger.log("applyChatterRowColorsWithH: error reading PeopleList: " + e);
  }
  var peopleMap = {};
  for (var i=0;i<peopleRows.length;i++){
    var name = String(peopleRows[i][0] || "").trim();
    var targ = String(peopleRows[i][1] || "").trim();
    if (!name) continue;
    var key = name.toLowerCase();
    var tnum = parseFloat((targ||"").toString().replace(/[^0-9.\-]/g,"")) || 0;
    peopleMap[key] = tnum;
  }

  function findTargetForChatter(chatterStr) {
    if (!chatterStr) return 0;
    var key = chatterStr.toLowerCase().trim();
    if (peopleMap.hasOwnProperty(key)) return peopleMap[key];
    for (var k in peopleMap) {
      if (!k) continue;
      if (key.indexOf(k) !== -1 || k.indexOf(key) !== -1) {
        return peopleMap[k];
      }
    }
    return 0;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var startRow = 2;
  var numRows = lastRow - 1;
  if (numRows <= 0) return;

  var gVals = [];
  try { gVals = sheet.getRange(startRow, PEOPLE_COL, numRows, 1).getDisplayValues(); } catch(e){ Logger.log("read PEOPLE_COL error: "+e); return; }

  var rowBgColors = [];
  var bgMatrix = [];
  for (var r = 0; r < gVals.length; r++) {
    var chatter = String(gVals[r][0] || "").trim();
    var chatterLower = chatter.toLowerCase();
    var chosenColor = null;

    var p0 = (peopleRows[0] && String(peopleRows[0][0]||"").trim().toLowerCase()) || "";
    var p1 = (peopleRows[1] && String(peopleRows[1][0]||"").trim().toLowerCase()) || "";
    var p2 = (peopleRows[2] && String(peopleRows[2][0]||"").trim().toLowerCase()) || "";
    var p3 = (peopleRows[3] && String(peopleRows[3][0]||"").trim().toLowerCase()) || "";
    var p4 = (peopleRows[4] && String(peopleRows[4][0]||"").trim().toLowerCase()) || "";
    var p5 = (peopleRows[5] && String(peopleRows[5][0]||"").trim().toLowerCase()) || "";

    if (p0 && (chatterLower === p0 || chatterLower.indexOf(p0) !== -1)) chosenColor = "#FF99C8";
    else if (p1 && (chatterLower === p1 || chatterLower.indexOf(p1) !== -1)) chosenColor = "#FFB3DE";
    else if (p2 && (chatterLower === p2 || chatterLower.indexOf(p2) !== -1)) chosenColor = "#FFD1DC";
    else if (p3 && (chatterLower === p3 || chatterLower.indexOf(p3) !== -1)) chosenColor = "#FFC0CB";
    else if (p4 && (chatterLower === p4 || chatterLower.indexOf(p4) !== -1)) chosenColor = "#FFAFBD";
    else if (p5 && (chatterLower === p5 || chatterLower.indexOf(p5) !== -1)) chosenColor = "#FFB7C5";
    else {
      var sheetRow = startRow + r;
      chosenColor = (sheetRow % 2 === 0) ? "#FFFFFF" : "#FFF0F4";
    }

    rowBgColors.push(chosenColor);
    var rowBg = [];
    for (var c = 0; c < PROCESS_COL_LIMIT; c++) rowBg.push(chosenColor);
    bgMatrix.push(rowBg);
  }

  try { sheet.getRange(startRow,1,bgMatrix.length,PROCESS_COL_LIMIT).setBackgrounds(bgMatrix); } catch(e){ Logger.log("setBackgrounds error: "+e); }

  var hVals = [];
  try {
    hVals = sheet.getRange(startRow, SALES_COL, numRows, 1).getDisplayValues();
  } catch (e) {
    Logger.log("read H error: "+e);
    return;
  }

  for (var i = 0; i < numRows; i++) {
    try {
      var rowNum = startRow + i;
      var hText = String(hVals[i][0] || "").trim();
      var gText = String(gVals[i][0] || "").trim();
      var defaultBg = rowBgColors[i] || "#FFFFFF";
      var cell = sheet.getRange(rowNum, SALES_COL);

      if (!hText) {
        try {
          cell.setBackground(defaultBg).setFontColor("#000000").setFontFamily("Fredericka the Great").setFontSize(16).setFontWeight("normal").setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
          try { cell.setFontStyle("normal"); } catch(e){}
        } catch (e) {}
        continue;
      }

      var net = _parseNetFromText(hText);
      if (net === null || isNaN(net)) {
        try {
          cell.setBackground(defaultBg).setFontColor("#000000").setFontWeight("normal").setFontFamily("Fredericka the Great").setFontSize(16).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
          try { cell.setFontStyle("normal"); } catch(e) {}
        } catch(e){}
        continue;
      }

      var target = findTargetForChatter(gText);
      if (!target || isNaN(target) || target <= 0) {
        try {
          cell.setBackground(defaultBg).setFontColor("#000000").setFontWeight("normal").setFontFamily("Fredericka the Great").setFontSize(16).setHorizontalAlignment("center").setVerticalAlignment("middle").setWrap(true);
          try { cell.setFontStyle("normal"); } catch(e) {}
        } catch(e){}
        continue;
      }

      var ratio = net / target;
      var bg = defaultBg;
      var fontColor = "#000000";
      var bold = false;
      var italic = false;

      if (ratio >= 2.0) {
        bg = "#274e13";
        fontColor = "#b6e2a1";
      } else if (ratio >= 1.0) {
        bg = "#38761d";
        fontColor = "#a4ce8b";
      } else if (ratio >= 0.5) {
        bg = "#bf9000";
        fontColor = "#f9f9c5";
      } else {
        bg = "#8d2b2a";
        fontColor = "#fdc7c7";
      }

      try {
        cell.setBackground(bg)
            .setFontColor(fontColor)
            .setFontWeight(bold ? "bold" : "normal")
            .setFontFamily("Fredericka the Great")
            .setFontSize(16)
            .setHorizontalAlignment("center")
            .setVerticalAlignment("middle")
            .setWrap(true);
        try { cell.setFontStyle("normal"); } catch(e) {}
      } catch (e) {
        Logger.log("applyChatterRowColorsWithH: error styling H at row " + rowNum + ": " + e);
      }
    } catch (e) {
      Logger.log("applyChatterRowColorsWithH: error processing row " + i + ": " + e);
    }
  }
  
  // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC
  _applyDoubleBordersWithRetry(sheet, startRow, lastRow, 5);
}

function _parseNetFromText(txt) {
  if (!txt) return null;
  var s = String(txt);
  var m = s.match(/NET\s*SALES\s*[:\-\s]*\$?\s*([0-9,]+(?:\.[0-9]+)?)/i);
  if (m && m[1]) {
    var num = parseFloat(m[1].replace(/,/g, ""));
    return isNaN(num) ? null : num;
  }
  var m2 = s.match(/(-?\d{1,3}(?:,\d{3})*(?:\.\d+)|-?\d+(?:\.\d+))/g);
  if (m2 && m2.length) {
    var last = m2[m2.length-1];
    var num2 = parseFloat(last.replace(/,/g, ""));
    return isNaN(num2) ? null : num2;
  }
  return null;
}

function extractNetFromHToD_readonly(sheet) {
  if (!sheet) sheet = _ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { parsedCount: 0, total: 0, values: [] };
  }

  var startRow = 2;
  var numRows = lastRow - (startRow - 1);
  var hVals = sheet.getRange(startRow, SALES_COL, numRows, 1).getDisplayValues();

  var parsedCount = 0;
  var total = 0;
  var values = [];

  for (var i = 0; i < hVals.length; i++) {
    var htxt = String(hVals[i][0] || "").trim();
    var parsed = _parseNetFromText(htxt);
    if (parsed !== null) {
      parsedCount++;
      total += parsed;
      values.push(parsed);
    } else {
      values.push(null);
    }
  }

  return { parsedCount: parsedCount, total: total, values: values };
}

function getTotalNetFromH(sheet) {
  if (!sheet) sheet = _ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  var startRow = 2;
  var numRows = lastRow - (startRow - 1);
  var hVals = sheet.getRange(startRow, SALES_COL, numRows, 1).getDisplayValues();

  var total = 0;
  for (var i = 0; i < hVals.length; i++) {
    var parsed = _parseNetFromText(String(hVals[i][0] || ""));
    if (parsed !== null) total += parsed;
  }
  Logger.log("getTotalNetFromH: total=" + total.toFixed(2));
  return total;
}

function writeSalesReportBlockPerChatter(sheet) {
  if (!sheet) sheet = _ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  var netVals = sheet.getRange(2,4,lastRow-1,1).getValues().map(function(r){ return r[0]; });
  var chatterVals = sheet.getRange(2,7,lastRow-1,1).getDisplayValues().map(function(r){ return String(r[0]||"").trim(); });

  var totals = {};
  var firstRow = {};
  for (var i = 0; i < chatterVals.length; i++) {
    var key = chatterVals[i] || "";
    if (!key) continue;
    if (firstRow[key] === undefined) firstRow[key] = i + 2;
    var n = parseFloat(String(netVals[i] || 0).replace(/[^0-9.\-]/g,"")) || 0;
    totals[key] = (totals[key] || 0) + n;
  }

  try { sheet.getRange(2, SALES_COL, Math.max(1, lastRow-1), 1).clearContent(); } catch(e){
    Logger.log("writeSalesReportBlockPerChatter clearContent error: " + e);
  }

  var londonDate = Utilities.formatDate(new Date(), "Europe/London", "MM/dd/yy");

  for (var key in firstRow) {
    try {
      var rowNum = firstRow[key];
      var total = totals[key] || 0;
      var formattedTotal = total >= 1000 ? total.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : total.toFixed(2);
      var block = key + "\n" + londonDate + "\nNET SALES: $" + formattedTotal;
      var cell = sheet.getRange(rowNum, SALES_COL);
      cell.setValue(block);
    } catch(e){
      Logger.log("writeSalesReportBlockPerChatter cell error: " + e);
    }
  }

  applyChatterRowColorsWithH(sheet);
  deleteSubscriptionRowsInF(sheet);
}

function updateSalesReportForChatters(sheet, chatterNamesArray) {
  if (!sheet) sheet = _ensureSheet();
  writeSalesReportBlockPerChatter(sheet);
}

function deleteSubscriptionRowsInF(sheet) {
  if (!sheet) sheet = _ensureSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("deleteSubscriptionRowsInF: No data rows to process");
    return;
  }
  
  var fRange = sheet.getRange(2, COL_F, lastRow - 1, 1);
  var fVals = fRange.getDisplayValues();
  
  var subPattern = /subscription/i;
  var rowsToDelete = [];

  for (var i = 0; i < fVals.length; i++) {
    try {
      var txt = String(fVals[i][0] || "").trim();
      var rowNum = i + 2;
      
      if (subPattern.test(txt)) {
        rowsToDelete.push(rowNum);
        Logger.log("deleteSubscriptionRowsInF: MARKED FOR DELETION - Row " + rowNum + " - '" + txt + "'");
      }
    } catch(e){
      Logger.log("deleteSubscriptionRowsInF row check error: " + e);
    }
  }

  if (rowsToDelete.length > 0) {
    rowsToDelete.sort(function(a, b) { return b - a; });
    
    for (var j = 0; j < rowsToDelete.length; j++) {
      try { 
        sheet.deleteRow(rowsToDelete[j]);
        Logger.log("deleteSubscriptionRowsInF: DELETED Row " + rowsToDelete[j]);
      } catch (err) { 
        Logger.log("deleteSubscriptionRowsInF: Error deleting row " + rowsToDelete[j] + ": " + err); 
      }
    }
    Logger.log("deleteSubscriptionRowsInF: Successfully deleted " + rowsToDelete.length + " subscription rows");
  }
  
  // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC after deletion
  var newLastRow = sheet.getLastRow();
  _applyDoubleBordersWithRetry(sheet, 1, newLastRow, 5);
}

function extractOnlyFansUsernameFromString(s) {
  if (!s) return "";
  try {
    var str = String(s);
    var re = /onlyfans\.com\/(?:u\/)?([A-Za-z0-9_]+)/i;
    var m = str.match(re);
    if (m && m[1]) return m[1];
    var re2 = /^\s*@?u([A-Za-z0-9_]+)\s*$/i;
    var m2 = str.match(re2);
    if (m2 && m2[1]) return m2[1];
  } catch(e){
    Logger.log("extractOnlyFansUsernameFromString error: " + e);
  }
  return "";
}

function onEditInstallable(e) {
  if (!_debounce()) {
    Logger.log("onEditInstallable: Debounced (too soon)");
    return;
  }
  
  _setProcessing(true);
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (!sh || sh.getName() !== SHEET_NAME) return;

    var col = e.range.getColumn();
    var row = e.range.getRow();
    if ((col !== PEOPLE_COL && col !== 4) || row === 1) return;

    var startRow = e.range.getRow();
    var numRows = e.range.getNumRows();

    var gRange = sh.getRange(startRow, PEOPLE_COL, numRows, 1).getDisplayValues().map(function(r){ return String(r[0]||"").trim(); });
    var unique = {};
    for (var i=0;i<gRange.length;i++){
      if (gRange[i]) unique[gRange[i]] = true;
    }

    if (col === 4 && Object.keys(unique).length === 0) {
      var singleChatter = String(sh.getRange(row, PEOPLE_COL).getDisplayValue() || "").trim();
      if (singleChatter) unique[singleChatter] = true;
    }

    var keys = Object.keys(unique);
    if (keys.length === 0) return;

    updateSalesReportForChatters(sh, keys);
    _applyAllFormatting(sh, 2, Math.max(2, sh.getLastRow()));
    deleteSubscriptionRowsInF(sh);
    applyChatterRowColorsWithH(sh);
  } catch (err) {
    Logger.log("onEditInstallable error: " + err);
  } finally {
    _setProcessing(false);
  }
}

function onEditCopyEtoF(e) {
  if (!_debounce()) {
    Logger.log("onEditCopyEtoF: Debounced (too soon)");
    return;
  }
  
  _setProcessing(true);
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (!sh || sh.getName() !== SHEET_NAME) return;

    var editedRange = e.range;
    var startCol = editedRange.getColumn();
    var numCols = editedRange.getNumColumns();
    var startRow = editedRange.getRow();
    var numRows = editedRange.getNumRows();

    Logger.log("onEditCopyEtoF triggered - startCol: " + startCol + ", startRow: " + startRow + ", numRows: " + numRows);

    if (startCol === 1 || (startCol <= 1 && startCol + numCols > 1)) {
      Logger.log("Formatting column A");
      formatDateTimeInColumnA(sh, startRow, startRow + numRows - 1);
    }

    if ((startCol >= 2 && startCol <= 4) || (startCol < 2 && startCol + numCols > 4)) {
      Logger.log("Formatting currency columns B, C, D");
      formatCurrencyColumns(sh, startRow, startRow + numRows - 1);
    }

    if (startCol > COL_E || (startCol + numCols - 1) < COL_E) {
      _applyAllFormatting(sh, 2, Math.max(2, sh.getLastRow()));
      deleteSubscriptionRowsInF(sh);
      applyChatterRowColorsWithH(sh);
      _setProcessing(false);
      return;
    }

    var eDisplay = sh.getRange(startRow, COL_E, numRows, 1).getDisplayValues();
    var eFormulas = sh.getRange(startRow, COL_E, numRows, 1).getFormulas();
    var fVals = sh.getRange(startRow, COL_F, numRows, 1).getValues();

    var batchWritesF = [];
    var batchRowsF = [];
    var batchWritesE = [];
    var batchRowsE = [];

    for (var i = 0; i < numRows; i++) {
      try {
        var rowIndex = startRow + i;
        if (rowIndex === 1) continue;
        var disp = String(eDisplay[i][0] || "").trim();
        var fcur = String(fVals[i][0] || "").trim();
        var formula = String(eFormulas[i][0] || "").trim();

        if (fcur === "" && disp !== "" && !(/^\s*@u[0-9A-Za-z_3.]+/i.test(disp))) {
          batchWritesF.push([disp]);
          batchRowsF.push(rowIndex);
        }

        var username = "";

        if (formula) {
          var m = formula.match(/HYPERLINK\s*\(\s*["']([^"']+)["']/i);
          if (m && m[1]) username = extractOnlyFansUsernameFromString(m[1]);
          else {
            var any = formula.match(/onlyfans\.com\/(?:u\/)?[A-Za-z0-9_]+/i);
            if (any) username = extractOnlyFansUsernameFromString(any[0]);
          }
        }

        if (!username) {
          try {
            var cell = sh.getRange(rowIndex, COL_E);
            var rtv = cell.getRichTextValue && cell.getRichTextValue();
            if (rtv) {
              var runs = rtv.getRuns && rtv.getRuns();
              if (runs && runs.length) {
                for (var rIdx = 0; rIdx < runs.length; rIdx++) {
                  var url = runs[rIdx].getLinkUrl && runs[rIdx].getLinkUrl();
                  if (url) {
                    username = extractOnlyFansUsernameFromString(url);
                    if (username) break;
                  }
                }
              }
              if (!username && typeof rtv.getLinkUrl === "function") {
                var overall = rtv.getLinkUrl();
                if (overall) username = extractOnlyFansUsernameFromString(overall);
              }
            }
          } catch (err) {
            Logger.log("onEditCopyEtoF getRichTextValue error: " + err);
          }
        }

        if (!username && disp) username = extractOnlyFansUsernameFromString(disp);

        if (username) {
          var normalized = "@" + String(username).replace(/^/i, "");
          var currentE = String(sh.getRange(rowIndex, COL_E).getDisplayValue() || "").trim();
          if (currentE !== normalized) {
            batchWritesE.push([normalized]);
            batchRowsE.push(rowIndex);
          }
        }
      } catch(e){
        Logger.log("onEditCopyEtoF row processing error: " + e);
      }
    }

    if (batchRowsF.length > 0) {
      var idx = 0;
      while (idx < batchRowsF.length) {
        try {
          var startIdx = idx;
          var endIdx = idx;
          while (endIdx + 1 < batchRowsF.length && batchRowsF[endIdx + 1] === batchRowsF[endIdx] + 1) endIdx++;
          var writeStartRow = batchRowsF[startIdx];
          var blockSize = endIdx - startIdx + 1;
          var blockValues = [];
          for (var k = startIdx; k <= endIdx; k++) blockValues.push(batchWritesF[k]);
          sh.getRange(writeStartRow, COL_F, blockSize, 1).setValues(blockValues);
          idx = endIdx + 1;
        } catch(e){
          Logger.log("onEditCopyEtoF batch F write error: " + e);
          idx++;
        }
      }
    }

    if (batchRowsE.length > 0) {
      var idx2 = 0;
      while (idx2 < batchRowsE.length) {
        try {
          var sIdx = idx2;
          var eIdx = idx2;
          while (eIdx + 1 < batchRowsE.length && batchRowsE[eIdx + 1] === batchRowsE[eIdx] + 1) eIdx++;
          var writeStart = batchRowsE[sIdx];
          var blockSize2 = eIdx - sIdx + 1;
          var blockVals2 = [];
          for (var m = sIdx; m <= eIdx; m++) blockVals2.push(batchWritesE[m]);
          sh.getRange(writeStart, COL_E, blockSize2, 1).setValues(blockVals2);
          idx2 = eIdx + 1;
        } catch(e){
          Logger.log("onEditCopyEtoF batch E write error: " + e);
          idx2++;
        }
      }
    }
    
    // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC after batch writes
    _applyDoubleBordersWithRetry(sh, 2, Math.max(2, sh.getLastRow()), 5);
    
    _applyAllFormatting(sh, 2, Math.max(2, sh.getLastRow()));
    deleteSubscriptionRowsInF(sh);
    applyChatterRowColorsWithH(sh);
  } catch (err) {
    Logger.log("onEditCopyEtoF error: " + err);
  } finally {
    _setProcessing(false);
  }
}

function syncNetSales() {
  if (!_debounce()) {
    Logger.log("syncNetSales: Debounced (too soon)");
    return;
  }
  
  _setProcessing(true);
  try {
    var sheet = _ensureSheet();
    _ensurePeopleListSheet();
    _formatPeopleListSheet();
    applyChatterValidation();

    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      _applyAllFormatting(sheet,2,2);
      Logger.log("syncNetSales: No data to sync");
      return;
    }

    deleteSubscriptionRowsInF(sheet);
    
    lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      _applyAllFormatting(sheet,2,2);
      Logger.log("syncNetSales: All subscription rows deleted");
      return;
    }

    var existingE = [];
    try { 
      existingE = sheet.getRange(2,5,Math.max(1,lastRow-1),1).getDisplayValues().map(function(r){ return String(r[0]||""); }); 
    } catch(e){ 
      Logger.log("syncNetSales existingE error: " + e);
      existingE = []; 
    }

    var readCols = Math.min(Math.max(5, sheet.getLastColumn()), PROCESS_COL_LIMIT);
    var numRows = lastRow - 1;
    var raw = sheet.getRange(2,1,numRows,readCols).getValues();

    var cleanedAtoE = [];

    for (var i=0;i<raw.length;i++){
      try {
        var row = raw[i];
        var date = row[0];
        var gross = row[1];
        var fee = row[2];
        var net = row[3];
        var rawE = row[4];

        var eOut = rawE || existingE[i] || "";
        cleanedAtoE.push([date, gross, fee, net, eOut]);
      } catch(e){
        Logger.log("syncNetSales row processing error: " + e);
      }
    }

    try { sheet.getRange(2,1,cleanedAtoE.length,5).setValues(cleanedAtoE); } catch(e){
      Logger.log("syncNetSales setValues error: " + e);
    }

    // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC
    _applyDoubleBordersWithRetry(sheet, 2, sheet.getLastRow(), 5);

    try {
      if (cleanedAtoE.length > 0) sheet.hideColumns(3); else sheet.showColumns(3);
    } catch(e){
      Logger.log("syncNetSales hideColumns error: " + e);
    }

    applyChatterValidation();

    try { sheet.showRows(1, Math.max(1, sheet.getMaxRows())); } catch(e){
      Logger.log("syncNetSales showRows error: " + e);
    }

    _applyAllFormatting(sheet, 2, Math.max(2, sheet.getLastRow()));

    applyChatterRowColorsWithH(sheet);
    writeSalesReportBlockPerChatter(sheet);
    
    Logger.log("syncNetSales completed successfully");
  } catch (err) {
    Logger.log("syncNetSales error: " + err);
  } finally {
    _setProcessing(false);
  }
}

function _formatPeopleListSheet() {
  var ps = _ensurePeopleListSheet();
  if (!ps) return;

  try {
    var totalRows = Math.max(ps.getMaxRows(), 2);
    
    try {
      ps.getRange(1, 1, totalRows, 1).setFontFamily("EB Garamond").setWrap(true).setFontColor("#000000");
      ps.setColumnWidth(1, 300);
    } catch(e){
      Logger.log("PeopleList Column A error: " + e);
    }

    try {
      ps.getRange(1, 2, totalRows, 1).setFontSize(15).setFontWeight("bold").setFontColor("#000000");
      ps.setColumnWidth(2, 100);
    } catch(e){
      Logger.log("PeopleList Column B error: " + e);
    }

    for (var r = 1; r <= totalRows; r++) {
      try {
        var bg = (r % 2 === 1) ? "#FFC2D9" : "#C2E1FC";
        ps.getRange(r, 1, 1, 2).setBackground(bg);
      } catch(e){}
    }
  } catch(e){
    Logger.log("_formatPeopleListSheet error: " + e);
  }
}

function installTriggersOnce() {
  var ss = _ss();
  var projectTriggers = ScriptApp.getProjectTriggers();
  var hasCopy = false, hasEdit = false, hasTime = false;
  
  for (var i=0;i<projectTriggers.length;i++){
    var t = projectTriggers[i];
    try {
      if (t.getHandlerFunction() === "onEditCopyEtoF" && t.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) hasCopy = true;
      if (t.getHandlerFunction() === "onEditInstallable" && t.getTriggerSource() === ScriptApp.TriggerSource.SPREADSHEETS) hasEdit = true;
      if (t.getHandlerFunction() === "syncNetSales" && t.getTriggerSource() === ScriptApp.TriggerSource.CLOCK) hasTime = true;
    } catch (e) {
      Logger.log("installTriggersOnce check error: " + e);
    }
  }
  
  if (!hasCopy) {
    ScriptApp.newTrigger("onEditCopyEtoF").forSpreadsheet(ss).onEdit().create();
    Logger.log("installTriggersOnce: Created onEditCopyEtoF trigger");
  }
  if (!hasEdit) {
    ScriptApp.newTrigger("onEditInstallable").forSpreadsheet(ss).onEdit().create();
    Logger.log("installTriggersOnce: Created onEditInstallable trigger");
  }
  if (!hasTime) {
    ScriptApp.newTrigger("syncNetSales").timeBased().everyMinutes(5).create();
    Logger.log("installTriggersOnce: Created syncNetSales trigger");
  }
}

function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("𝐂𝐥𝐞𝐚𝐫 𝐒𝐚𝐥𝐞𝐬")
      .addItem("Clear Pasted Data", "clearNetSalesData")
      .addToUi();
    
    _ensureSheet();
    _ensurePeopleListSheet();
    _formatPeopleListSheet();
    try { installTriggersOnce(); } catch(e) { Logger.log("installTriggersOnce onOpen failed: " + e); }
    Logger.log("onOpen: Script initialized successfully");
  } catch (err) {
    Logger.log("onOpen error: " + err);
  }
}

function clearNetSalesData() {
  _setProcessing(true);
  try {
    var sheet = _ensureSheet();
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2,1,lastRow-1,PROCESS_COL_LIMIT).clearContent();
      
      // CRITICAL: Reapply DOUBLE borders with ROBUST RETRY LOGIC after clear
      _applyDoubleBordersWithRetry(sheet, 2, Math.max(2, sheet.getLastRow()), 5);
      
      _applyAllFormatting(sheet,2,Math.max(2,sheet.getLastRow()));
      applyChatterRowColorsWithH(sheet);
      Logger.log("clearNetSalesData: Data cleared successfully");
    }
  } catch (err) {
    Logger.log("clearNetSalesData error: " + err);
  } finally {
    _setProcessing(false);
  }
}
