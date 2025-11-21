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
  { id: "097025freki", password: "YOUR_SECRET_PASSWORD" }
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
    sheet.getRange(row, statusColIndex + 1).setValue('Approved');
    return jsonResponse({ success: true, message: 'Idea approved.' });
}

// ----------------- DATA READING / WRITING -----------------

function readRawAsObjects(){
  const { headers, values } = getSheetData("RAW");
  return values.map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse();
}

function readSuggAsObjects() {
  const { headers, values } = getSheetData("SUGG");
  return values.map(r => { const obj = {}; headers.forEach((h, i) => obj[h] = r[i]); return obj; }).reverse(); 
}

function appendToRawRow(row){
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName("RAW");
  if(!sh) throw new Error("RAW sheet not found");
  sh.appendRow(row);
}

function appendSuggestionRow(payload) {
  const ss = openSpreadsheet();
  let sh = ss.getSheetByName("SUGG");
  if (!sh) {
    sh = ss.insertSheet("SUGG");
    sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR', 'STATUS']);
  }
  const row = [ new Date(), payload.title, payload.details, payload.mainCategory, payload.subCategory, payload.author, 'Pending' ];
  sh.appendRow(row);
}

// ----------------- CATEGORIZATION (SERVER-SIDE ONLY) -----------------
function categorize(text) { const t = (text || "").toLowerCase(); for (const group of SKILLSETS) { for (const sub of group.subs) { for (const k of sub.keywords) { if (!k) continue; if (t.includes(k)) return { main: group.main, sub: sub.name }; } } } return { main: "Uncategorized", sub: "Unknown" };}

// ----------------- MAIN WEBHOOKS (doPost, doGet) -----------------

function doPost(e){
  try{
    let payload = {};
    if(e.parameter && Object.keys(e.parameter).length > 0){ payload = e.parameter; }
    else if(e.postData && e.postData.contents){ payload = JSON.parse(e.postData.contents); }
    
    const action = (payload.action || '').toString();

    // --- Action Router ---
    switch(action) {
      case 'moderatorLogin':
        return handleModeratorLogin(payload);
      
      case 'deleteMessage':
      case 'deleteIdea':
      case 'approveIdea':
        const mod = verifyModeratorToken(payload.token);
        if (!mod.verified) return jsonResponse({ success: false, error: 'Invalid or expired session.' });
        if (action === 'deleteMessage') return handleDeleteMessage(payload);
        if (action === 'deleteIdea') return handleDeleteIdea(payload);
        if (action === 'approveIdea') return handleApproveIdea(payload);
        break;

      case 'submitSuggestion':
        if (!payload.title || !payload.details) return jsonResponse({ success: false, error: "Missing suggestion fields." });
        appendSuggestionRow(payload);
        return jsonResponse({ success: true, result: 'suggestion recorded' });

      case 'submitConcern':
      case '': // Default action
        const message = (payload.message || "").toString().trim();
        if(!message) return jsonResponse({ success:false, error: "No message provided" });
        const category = categorize(message);
        appendToRawRow([ new Date(), message, category.main, category.sub, '', (payload.source||'WEB'), (payload.extra||'') ]);
        return jsonResponse({ success:true, category: category });
      
      default:
        return jsonResponse({ success: false, error: 'Unknown action: ' + action });
    }

  } catch(err){
    return jsonResponse({ success:false, error: err.toString() });
  }
}

function doGet(e){
  try{
    const p = e && e.parameter ? e.parameter : {};
    const callback = p.callback;
    const action = p.action || '';

    if (action === 'getIdeas') {
        const ideas = readSuggAsObjects();
        const filteredIdeas = ideas.filter(idea => idea.STATUS !== 'Archived');
        return jsonResponse({ success: true, count: filteredIdeas.length, data: filteredIdeas }, callback);
    }
    
    let rows = readRawAsObjects();
    if(p.limit) rows = rows.slice(0, parseInt(p.limit,10));
    return jsonResponse({ success:true, count: rows.length, data: rows }, callback);

  } catch(err){
    return jsonResponse({ success:false, error: err.toString() }, (e && e.parameter && e.parameter.callback) || null);
  }
}
