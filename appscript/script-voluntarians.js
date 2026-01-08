// =================== Voluntarians Apps Script (v2 - Moderator Update) ===================
//
// Changes:
// - Secure moderator login with temporary session tokens (CacheService).
// - Added moderator actions: deleteMessage, deleteIdea, approveIdea.
// - Sheet-modifying functions to delete/update rows based on timestamp.
// - "SUGG" sheet now includes a "STATUS" column.
//
// ======================================================================================

// ----------------- CONFIG -----------------
const SHEET_ID = "1qRoxHE7EWtbud7MlMZ56S5aFgb5yYGnrNzUi-CNKs50"; // your spreadsheet id

// --- MODERATOR CONFIG ---
// IMPORTANT: Replace "YOUR_SECRET_PASSWORD" with a strong, unique password.
const MODERATORS = [
  { id: "097025freki", password: "frekijoms61" },
  { id: "The.Golden.Age_Of_ICT", password: "K41S3R" }
  // { id: "another_mod_id", password: "another_secret_password" }
];


// --- Other configurations from your original script ---
const SKILLSETS = [{"main":"Kaizenset","subs":[{"name":"Welding","keywords":["weld","welding","tig","mig","arc","rod","welders","welding practice","welding table"]},{"name":"ICT","keywords":["ict","data processing","computer","database","excel","google sheets","spreadsheet","python","csv","data entry","data analysis"]},{"name":"Mechatronics","keywords":["mechatronic","mechatronics","servo","arduino","raspberry","robot","sensor","actuator","pneumatic","motor control","automation"]}]},{"main":"TMF","subs":[{"name":"MF1","keywords":["filing","file","workpiece","mf1","machinery fundamentals 1"]},{"name":"MF2","keywords":["lathe","lathe machine","turning","mf2","machinery fundamentals 2","chuck","toolpost"]},{"name":"TF","keywords":["measuring","caliper","vernier","micrometer","tf","technical fundamentals"]}]},{"main":"EXE","subs":[{"name":"XF","keywords":["electronics","belex","delex","selex","xf","electronic fundamentals","oscilloscope","breadboard"]},{"name":"EF1", "keywords":["wiring","house wiring","ef1","electrical fundamentals 1","breaker","outlet"]},{"name":"EF2","keywords":["motor","motor control","ef2","electrical fundamentals 2","starter","contactors"]}]},{"main":"Other","subs":[{"name":"Cafeteria","keywords":["cafeteria"]},{"name":"Mass","keywords":["mass"]},{"name":"General","keywords":["general"]},{"name":"Facilitation","keywords":["facilitation"]},{"name":"Offsite","keywords":["offsite"]},{"name":"Anvil","keywords":["anvil"]}]}];
const SUGGESTIONS = {"kaizenset-welding":["Portable Welding Practice Station","Welding Fume Extraction Prototype","Adjustable Welding Fixture for Trainee Projects"],"kaizenset-ict":["Automated Data Entry & Validation Tool","Training Dashboard for Attendance and Scores","CSV to Sheets ETL Helper with Error Reporting"],"kaizenset-mechatronics":["Modular Robotic Arm Training Kit","Servo-based Pick-and-Place Trainer","Automated Conveyor with Sorting Sensors"],"tmf-mf1":["Workbench Filing Improvement System","Ergonomic Tool Holder for Filing Station","Workpiece Angle Guide for Beginner Filing"],"tmf-mf2":["Lathe Tool Holder Organizer Fabrication","Coolant Collection & Management System","Turning Tool Geometry Training Aid"],"tmf-tf":["Digital Measuring Tool Borrowing System","Tool Calibration Log Automation","3D-Printed Measuring Tool Organizer"],"tmf-welding":["Welding Rod Smart Storage Cabinet","Portable Welding Practice Table","Safety Shield & Spark Protection Project"],"exe-xf":["Electronics Component Organizer Drawer","Smart Inventory System for Electronics","Oscilloscope Probe Holder + Anti-tangle System"],"exe-ef1":["House Wiring Trainer Board Upgrade","Circuit Breaker Testing Panel Refurbish","Outlet + Lighting Practice Setup Box"],"exe-ef2":["Modular Motor Control Trainer Panel","Motor Starter Circuit Demonstration Board","Smart Fault Simulation System for Motor Control"],"uncategorized-unknown":["General Workstation Improvement Project","Safety and Efficiency Audit Project","Training Room Enhancement Proposal"]};

// ----------------- BASIC HELPERS -----------------
function openSpreadsheet(){ return SpreadsheetApp.openById(SHEET_ID); }

function jsonResponse(obj, callback){
  const payload = JSON.stringify(obj);
  if(callback){
    const cbSafe = callback.replace(/[^\w.$]/g,'');
    return ContentService.createTextOutput(cbSafe + "(" + payload + ");").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

function tryParseJSON(str){
  try{ return {ok:true, value: JSON.parse(str)}; } catch(e){ return {ok:false, error: e.toString()}; }
}
/**
 * Fetches the key performance indicators from the COUNT sheet.
 * This reads the data directly from the cells you've set up.
 */
function getDashboardStats() {
  try {
    const sheet = openSpreadsheet().getSheetByName("COUNT");
    if (!sheet) {
      return jsonResponse({ success: false, error: "COUNT sheet not found." });
    }
    // Read the values from the second row (A2:E2) based on your screenshot
    const values = sheet.getRange("A2:E2").getValues()[0];
    
    const stats = {
      totalConcerns: values[0],
      totalIdeas: values[1],
      ideasDelivered: values[2],
      mostActiveCategory: values[3],
      mostActiveSubCategory: values[4]
    };

    return jsonResponse({ success: true, data: stats });
  } catch (err) {
    Logger.log('getDashboardStats Error: ' + err.toString());
    return jsonResponse({ success: false, error: 'Failed to retrieve dashboard stats.' });
  }
}

function getSheetData(sheetName) {
    const ss = openSpreadsheet();
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return { headers: [], values: [], sheet: null };
    const lastRow = sh.getLastRow();
    const lastCol = sh.getLastColumn();
    if (lastRow < 1) return { headers: [], values: [], sheet: sh };
    const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(h => h.toString().toUpperCase());
    if (lastRow < 2) return { headers, values: [], sheet: sh };
    const values = sh.getRange(2, 1, lastRow - 1, lastCol).getValues();
    return { headers, values, sheet: sh };
}

function findRowByTimestamp(sheetName, timestamp) {
    if (!timestamp) return -1;
    const { headers, values } = getSheetData(sheetName);
    const timestampColIndex = headers.indexOf('TIMESTAMP');
    if (timestampColIndex === -1) return -1;

    for (let i = values.length - 1; i >= 0; i--) {
        const cellValue = values[i][timestampColIndex];
        if (cellValue instanceof Date) {
            if (cellValue.toISOString() === timestamp) {
                return i + 2; // Return 1-based sheet row number
            }
        }
    }
    return -1;
}

// ----------------- MODERATOR ACTIONS -----------------
/**
 * Deletes multiple rows from a specified sheet based on a list of timestamps.
 * @param {Object} e The event parameter from doPost.
 * @param {string} sheetName The name of the sheet to modify ('Submissions' or 'Ideas').
 * @returns {ContentService.TextOutput} JSON response.
 */
function handleBatchDelete(e, sheetName) {
  try {
    const payload = JSON.parse(e.postData.contents);
    // Re-verify token for this specific action
    if (!verifyModeratorToken(payload.token)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid or expired session token.' })).setMimeType(ContentService.MimeType.JSON);
    }

    const timestamps = payload.timestamps ? payload.timestamps.split(',') : [];
    if (timestamps.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No timestamps provided for batch deletion.' })).setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const timestampColIndex = headers.findIndex(h => h.toUpperCase() === 'TIMESTAMP');
    if (timestampColIndex === -1) throw new Error('Timestamp column not found in sheet: ' + sheetName);

    const rowsToDelete = [];
    // Use a Set for efficient timestamp lookup
    const timestampSet = new Set(timestamps);

    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = new Date(data[i][timestampColIndex]).toISOString();
      if (timestampSet.has(rowTimestamp)) {
        rowsToDelete.push(i + 1); // +1 because sheet rows are 1-indexed
      }
    }

    // Delete rows from the bottom up to avoid index shifting issues
    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: `${rowsToDelete.length} items deleted from ${sheetName}.` })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`Batch Delete Error in ${sheetName}: ` + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Approves multiple ideas in the "Ideas" sheet based on a list of timestamps.
 * @param {Object} e The event parameter from doPost.
 * @returns {ContentService.TextOutput} JSON response.
 */
function handleBatchApproveIdeas(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    if (!verifyModeratorToken(payload.token)) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid or expired session token.' })).setMimeType(ContentService.MimeType.JSON);
    }

    const timestamps = payload.timestamps ? payload.timestamps.split(',') : [];
    if (timestamps.length === 0) return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No timestamps provided for batch approval.' })).setMimeType(ContentService.MimeType.JSON);

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Ideas');
    if (!sheet) throw new Error('Sheet "Ideas" not found.');

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const timestampColIndex = headers.findIndex(h => h.toUpperCase() === 'TIMESTAMP');
    const statusColIndex = headers.findIndex(h => h.toUpperCase() === 'STATUS');
    if (timestampColIndex === -1 || statusColIndex === -1) throw new Error('Required columns (TIMESTAMP or STATUS) not found in Ideas sheet.');
    
    const timestampSet = new Set(timestamps);
    const rangesToUpdate = [];

    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = new Date(data[i][timestampColIndex]).toISOString();
      if (timestampSet.has(rowTimestamp)) {
        const cellA1 = sheet.getRange(i + 1, statusColIndex + 1).getA1Notation();
        rangesToUpdate.push(cellA1);
      }
    }

    if (rangesToUpdate.length > 0) {
      sheet.getRangeList(rangesToUpdate).setValue('Delivered');
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, message: `${rangesToUpdate.length} ideas delivered successfully.` })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log('Batch Approve Error: ' + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function verifyModeratorToken(token) {
    if (!token) return { verified: false };
    const cache = CacheService.getScriptCache();
    const modId = cache.get(token);
    return modId ? { verified: true, id: modId } : { verified: false };
}

function handleModeratorLogin(payload) {
  const { id, password } = payload;
  if (!id || !password) return jsonResponse({ success: false, error: "ID and password are required." });

  const mod = MODERATORS.find(m => m.id === id);
  if (!mod || mod.password !== password) {
    return jsonResponse({ success: false, error: "Invalid ID or password." });
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(token, mod.id, 7200); // 2-hour session
  return jsonResponse({ success: true, token: token, message: "Login successful." });
}

function handleDeleteMessage(payload) {
    const row = findRowByTimestamp('RAW', payload.timestamp);
    if (row === -1) return jsonResponse({ success: false, error: 'Message not found or already deleted.' });
    getSheetData('RAW').sheet.deleteRow(row);
    return jsonResponse({ success: true, message: 'Message deleted.' });
}

function handleDeleteIdea(payload) {
    const row = findRowByTimestamp('SUGG', payload.timestamp);
    if (row === -1) return jsonResponse({ success: false, error: 'Idea not found or already deleted.' });
    getSheetData('SUGG').sheet.deleteRow(row);
    return jsonResponse({ success: true, message: 'Idea deleted.' });
}

function handleApproveIdea(payload) {
    const { headers, sheet } = getSheetData('SUGG');
    const statusColIndex = headers.indexOf('STATUS');
    if (statusColIndex === -1) {
       return jsonResponse({ success: false, error: "'STATUS' column not found in SUGG sheet." });
    }
    const row = findRowByTimestamp('SUGG', payload.timestamp);
    if (row === -1) return jsonResponse({ success: false, error: 'Idea not found.' });
    sheet.getRange(row, statusColIndex + 1).setValue('Delivered');
    return jsonResponse({ success: true, message: 'Idea delivered.' });
}

function handleBatchDelete(payload, sheetName) {
  try {
    const timestamps = payload.timestamps ? payload.timestamps.split(',') : [];
    if (timestamps.length === 0) {
      return jsonResponse({ success: false, error: 'No timestamps provided for batch deletion.' });
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error(`Sheet "${sheetName}" not found.`);
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const timestampColIndex = headers.findIndex(h => h.toUpperCase() === 'TIMESTAMP');
    if (timestampColIndex === -1) throw new Error('Timestamp column not found in sheet: ' + sheetName);

    const rowsToDelete = [];
    const timestampSet = new Set(timestamps);

    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = new Date(data[i][timestampColIndex]).toISOString();
      if (timestampSet.has(rowTimestamp)) {
        rowsToDelete.push(i + 1);
      }
    }

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      sheet.deleteRow(rowsToDelete[i]);
    }

    return jsonResponse({ success: true, message: `${rowsToDelete.length} items deleted from ${sheetName}.` });
  } catch (err) {
    Logger.log(`Batch Delete Error in ${sheetName}: ` + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function handleBatchApproveIdeas(payload) {
  try {
    const timestamps = payload.timestamps ? payload.timestamps.split(',') : [];
    if (timestamps.length === 0) return jsonResponse({ success: false, error: 'No timestamps provided.' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SUGG');
    if (!sheet) throw new Error('Sheet "SUGG" not found.');

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const timestampColIndex = headers.findIndex(h => h.toUpperCase() === 'TIMESTAMP');
    const statusColIndex = headers.findIndex(h => h.toUpperCase() === 'STATUS');
    if (timestampColIndex === -1 || statusColIndex === -1) throw new Error('Required columns (TIMESTAMP or STATUS) not found.');
    
    const timestampSet = new Set(timestamps);
    const rangesToUpdate = [];

    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = new Date(data[i][timestampColIndex]).toISOString();
      if (timestampSet.has(rowTimestamp)) {
        rangesToUpdate.push(sheet.getRange(i + 1, statusColIndex + 1).getA1Notation());
      }
    }

    if (rangesToUpdate.length > 0) {
      sheet.getRangeList(rangesToUpdate).setValue('Delivered');
    }

    return jsonResponse({ success: true, message: `${rangesToUpdate.length} ideas delivered.` });
  } catch (err) {
    Logger.log('Batch Approve Error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}


// ----------------- DATA READING / WRITING -----------------
/**
 * Handles the submission of a new idea/suggestion from the suggestion modal.
 * Appends the data to the "SUGG" sheet.
 * @param {Object} e The event parameter from doPost, expected to have URL parameters.
 * @returns {ContentService.TextOutput} JSON response.
 */
/**
 * Handles the submission of a new concern from the main form.
 * It categorizes the concern and appends it to the "RAW" sheet with all required columns.
 * @param {Object} e The event parameter from doPost.
 * @returns {ContentService.TextOutput} JSON response.
 */
function handleSubmitConcern(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const message = payload.message || '';

    if (!message.trim()) {
      throw new Error('Message is required.');
    }

    const { main, sub } = categorize(message);
    const source = payload.source || 'VOLUN_WEB';

    // Append to the 'RAW' sheet with all columns: TIMESTAMP, MESSAGE, MAIN-CATEGORY, SUB-CATEGORY, Suggested project, source
    appendToRawRow([new Date(), message, main, sub, '', source]);

    Logger.log(`Concern submitted: "${message.substring(0, 50)}..." Category: ${main}/${sub}`);

    // Return a success response including the categorization result
    return jsonResponse({
      success: true,
      message: "Concern submitted successfully.",
      category: { main: main, sub: sub }
    });

  } catch (err) {
    Logger.log('Submit Concern Error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

/**
 * Handles the submission of a new idea/suggestion from the suggestion modal.
 * Appends the data to the "SUGG" sheet with all required columns.
 * @param {Object} e The event parameter from doPost.
 * @returns {ContentService.TextOutput} JSON response.
 */
function handleSubmitSuggestion(e) {
  try {
    const payload = e.parameter;
    if (!payload.title || !payload.details) throw new Error('Title and Details are required.');
    
    appendSuggestionRow(payload);
    
    Logger.log(`Suggestion submitted: "${payload.title}" by ${payload.author || 'Anonymous'}`);
    
    return jsonResponse({ success: true, message: 'Suggestion submitted successfully.' });
  } catch (err) {
    Logger.log('Submit Suggestion Error: ' + err.toString());
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function readRawAsObjects(){
  const { headers, values } = getSheetData("RAW");
  return values.map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse();
}

function readSuggAsObjects() {
  const { headers, values } = getSheetData("SUGG");
  return values.map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse(); 
}

function appendToRawRow(row){
  try {
    const ss = openSpreadsheet();
    let sh = ss.getSheetByName("RAW");
    if(!sh) {
      sh = ss.insertSheet("RAW");
      sh.appendRow(['TIMESTAMP', 'MESSAGE', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'Suggested project', 'source']);
    }
    // Ensure row has 6 columns: [TIMESTAMP, MESSAGE, MAIN-CATEGORY, SUB-CATEGORY, Suggested project, source]
    if (row.length < 6) {
      while (row.length < 6) {
        row.push('');
      }
    }
    sh.appendRow(row);
    Logger.log('Row appended to RAW sheet: ' + JSON.stringify(row));
  } catch (err) {
    Logger.log('appendToRawRow Error: ' + err.toString());
    throw err;
  }
}

function appendSuggestionRow(payload) {
  try {
    const ss = openSpreadsheet();
    let sh = ss.getSheetByName("SUGG");
    if (!sh) {
      sh = ss.insertSheet("SUGG");
      sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR', 'STATUS']);
    }
    const row = [
      new Date(), 
      payload.title || '', 
      payload.details || '', 
      payload.mainCategory || '', 
      payload.subCategory || '', 
      payload.author || 'Anonymous', 
      'Pending'
    ];
    sh.appendRow(row);
    Logger.log('Row appended to SUGG sheet: ' + payload.title);
  } catch (err) {
    Logger.log('appendSuggestionRow Error: ' + err.toString());
    throw err;
  }
}

// ----------------- CATEGORIZATION (SERVER-SIDE ONLY) -----------------
function categorize(text) { const t = (text || "").toLowerCase(); for (const group of SKILLSETS) { for (const sub of group.subs) { for (const k of sub.keywords) { if (!k) continue; if (t.includes(k)) return { main: group.main, sub: sub.name }; } } } return { main: "Uncategorized", sub: "Unknown" };}

// ----------------- MAIN WEBHOOKS (doPost, doGet) -----------------

function doPost(e) {
  try {
    // Robustly parse the payload from either URL parameters or post body.
    const payload = (e.parameter && e.parameter.action) ? e.parameter : JSON.parse(e.postData.contents);
    const action = payload.action;

    // --- Public Actions (No Token Required) ---
    switch (action) {
      case 'submitConcern':
        // These handlers from your original script may expect the raw 'e' object.
        return handleSubmitConcern(e);
      case 'submitSuggestion':
        return handleSubmitSuggestion(e);
      case 'moderatorLogin':
        return handleModeratorLogin(payload); // Pass the parsed payload.
    }

    // --- Moderator-Only Actions (Token Required from here on) ---
    const tokenVerification = verifyModeratorToken(payload.token);
    if (!tokenVerification.verified) {
      return jsonResponse({ success: false, error: 'Invalid or expired session token.' });
    }

    // Actions below this point are protected.
    switch (action) {
      case 'deleteMessage':
        return handleDeleteMessage(payload);
      case 'approveIdea':
        return handleApproveIdea(payload);
      case 'deleteIdea':
        return handleDeleteIdea(payload);
      
      // --- BATCH ACTIONS ---
      case 'batchDeleteMessages':
        return handleBatchDelete(payload, 'RAW'); // Corrected to use 'RAW' sheet
      case 'batchDeleteIdeas':
        return handleBatchDelete(payload, 'SUGG'); // Corrected to use 'SUGG' sheet
      case 'batchApproveIdeas':
        return handleBatchApproveIdeas(payload);

      default:
        throw new Error('Invalid or unknown moderator action specified.');
    }

  } catch (err) {
    Logger.log('doPost Error: ' + err.toString() + ' Stack: ' + err.stack);
    return jsonResponse({ success: false, error: 'An error occurred in doPost: ' + err.toString() });
  }
}


function doGet(e){
  try {
    const p = e.parameter || {};
    const action = p.action;

    // Route GET requests based on the 'action' parameter
    switch (action) {
      case 'getStats':
        return getDashboardStats();
      case 'getIdeas':
        const ideas = getSheetData("SUGG").values.map(r => ({TIMESTAMP: r[0], TITLE: r[1], DETAILS: r[2], 'MAIN-CATEGORY': r[3], 'SUB-CATEGORY': r[4], AUTHOR: r[5], STATUS: r[6]})).reverse();
        return jsonResponse({ success: true, data: ideas.filter(idea => idea.STATUS !== 'Archived') }, p.callback);
      default:
        // Default action is to get the concern logs
        const rows = getSheetData("RAW").values.map(r => ({Timestamp: r[0], Message: r[1], Category: r[2], Main: r[3], Sub: r[4]})).reverse();
        return jsonResponse({ success: true, data: p.limit ? rows.slice(0, parseInt(p.limit,10)) : rows }, p.callback);
    }
  } catch(err){
    return jsonResponse({ success: false, error: err.toString() }, (e.parameter || {}).callback);
  }
}