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
const SKILLSETS = [{"main":"Kaizenset","subs":[{"name":"Welding","keywords":["weld","welding","tig","mig","arc","rod","welders","welding practice","welding table"]},{"name":"ICT","keywords":["ict","data processing","computer","database","excel","google sheets","spreadsheet","python","csv","data entry","data analysis"]},{"name":"Mechatronics","keywords":["mechatronic","mechatronics","servo","arduino","raspberry","robot","sensor","actuator","pneumatic","motor control","automation"]}]},{"main":"TMF","subs":[{"name":"MF1","keywords":["filing","file","workpiece","mf1","machinery fundamentals 1"]},{"name":"MF2","keywords":["lathe","lathe machine","turning","mf2","machinery fundamentals 2","chuck","toolpost"]},{"name":"TF","keywords":["measuring","caliper","vernier","micrometer","tf","technical fundamentals"]}]},{"main":"EXE","subs":[{"name":"XF","keywords":["electronics","belex","delex","selex","xf","electronic fundamentals","oscilloscope","breadboard"]},{"name":"EF1","keywords":["wiring","house wiring","ef1","electrical fundamentals 1","breaker","outlet"]},{"name":"EF2","keywords":["motor","motor control","ef2","electrical fundamentals 2","starter","contactors"]}]}];
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

    // Find the row matching the timestamp. Iterate backwards for efficiency.
    for (let i = values.length - 1; i >= 0; i--) {
        const cellValue = values[i][timestampColIndex];
        if (cellValue instanceof Date) {
            // Compare ISO strings for accuracy
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
    if (modId) {
        return { verified: true, id: modId };
    }
    return { verified: false };
}

function handleModeratorLogin(payload) {
  const { id, password } = payload;
  if (!id || !password) return jsonResponse({ success: false, error: "ID and password are required." });

  const mod = MODERATORS.find(m => m.id === id);
  if (!mod || mod.password !== password) {
    return jsonResponse({ success: false, error: "Invalid ID or password." });
  }

  // Generate a secure, random token
  const token = Utilities.getUuid();
  
  // Store the token in cache with a 2-hour expiration
  CacheService.getScriptCache().put(token, mod.id, 7200);

  return jsonResponse({ success: true, token: token, message: "Login successful." });
}

function handleDeleteMessage(payload) {
    const row = findRowByTimestamp('RAW', payload.timestamp);
    if (row === -1) {
        return jsonResponse({ success: false, error: 'Message not found or already deleted.' });
    }
    const { sheet } = getSheetData('RAW');
    sheet.deleteRow(row);
    return jsonResponse({ success: true, message: 'Message deleted successfully.' });
}

function handleDeleteIdea(payload) {
    const row = findRowByTimestamp('SUGG', payload.timestamp);
    if (row === -1) {
        return jsonResponse({ success: false, error: 'Idea not found or already deleted.' });
    }
    const { sheet } = getSheetData('SUGG');
    sheet.deleteRow(row);
    return jsonResponse({ success: true, message: 'Idea deleted successfully.' });
}

function handleApproveIdea(payload) {
    const { headers, sheet } = getSheetData('SUGG');
    const statusColIndex = headers.indexOf('STATUS');
    if (statusColIndex === -1) {
       return jsonResponse({ success: false, error: 'STATUS': "column not found in SUGG sheet" return jsonResponse({ success: false, error: "'STATUS' column not found in SUGG sheet." });
 });
    }

    const row = findRowByTimestamp('SUGG', payload.timestamp);
    if (row === -1) {
        return jsonResponse({ success: false, error: 'Idea not found.' });
    }
    
    // Update the status in the correct column (index is 0-based, but sheet range is 1-based)
    sheet.getRange(row, statusColIndex + 1).setValue('Approved');
    return jsonResponse({ success: true, message: 'Idea approved.' });
}

// ----------------- DATA READING / WRITING -----------------

function readRawAsObjects(){
  const { headers, values } = getSheetData("RAW");
  return values.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).reverse();
}

function readSuggAsObjects() {
  const { headers, values } = getSheetData("SUGG");
  return values.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).reverse(); 
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
    // Add STATUS column header
    sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR', 'STATUS']);
  }
  const row = [
    new Date(),
    payload.title,
    payload.details,
    payload.mainCategory,
    payload.subCategory,
    payload.author,
    'Pending' // Default status
  ];
  sh.appendRow(row);
}

// ----------------- CATEGORIZATION & SUGGESTION LOGIC (Unchanged) -----------------
function categorize(text) { const t = (text || "").toLowerCase(); for (const group of SKILLSETS) { for (const sub of group.subs) { for (const k of sub.keywords) { if (!k) continue; if (t.includes(k)) return { main: group.main, sub: sub.name }; } } } return { main: "Uncategorized", sub: "Unknown" };}
function suggestProject(main, sub) { const key = `${(main||"").toLowerCase()}-${(sub||"").toLowerCase()}`; if (SUGGESTIONS[key]) return SUGGESTIONS[key]; const mainKey = `${(main||"").toLowerCase()}-`; for (const k in SUGGESTIONS) { if (k.startsWith(mainKey) && Array.isArray(SUGGESTIONS[k])) return SUGGESTIONS[k].slice(0,3); } return SUGGESTIONS["uncategorized-unknown"];}

// ----------------- MAIN WEBHOOKS (doPost, doGet) -----------------

function doPost(e){
  try{
    let payload = {};
    if(e.parameter && Object.keys(e.parameter).length > 0){
      payload = Object.assign({}, e.parameter);
    } else if(e.postData && e.postData.contents){
      const parsed = tryParseJSON(e.postData.contents);
      if(!parsed.ok) return jsonResponse({ success:false, error: "Invalid JSON" });
      payload = parsed.value || {};
    }
    
    const action = (payload.action || '').toString();

    // --- Action Router ---

    if (action === 'moderatorLogin') {
      return handleModeratorLogin(payload);
    }
    
    // --- Moderator-Protected Actions ---
    if (action === 'deleteMessage' || action === 'deleteIdea' || action === 'approveIdea') {
      const mod = verifyModeratorToken(payload.token);
      if (!mod.verified) {
        return jsonResponse({ success: false, error: 'Invalid or expired session. Please log in again.' });
      }
      
      if (action === 'deleteMessage') return handleDeleteMessage(payload);
      if (action === 'deleteIdea') return handleDeleteIdea(payload);
      if (action === 'approveIdea') return handleApproveIdea(payload);
    }

    if (action === 'submitSuggestion') {
      if (!payload.title || !payload.details || !payload.mainCategory || !payload.subCategory) {
        return jsonResponse({ success: false, error: "Missing required suggestion fields." });
      }
      appendSuggestionRow(payload);
      return jsonResponse({ success: true, result: 'suggestion recorded' });
    }

    // --- Default Action: Submit a Concern ---
    const message = (payload.message || "").toString().trim();
    if(!message) return jsonResponse({ success:false, error: "No message provided" });

    const category = categorize(message);
    const suggestions = suggestProject(category.main, category.sub);
    const note = Array.isArray(suggestions) ? suggestions.join(' | ') : String(suggestions);

    appendToRawRow([ new Date(), message, category.main, category.sub, note, (payload.source||'WEB'), (payload.extra||'') ]);

    return jsonResponse({ success:true, category, suggestions });

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
        // IMPORTANT: Here you might want to filter out ideas that are not 'Approved'.
        // For now, returning all.
        const filteredIdeas = ideas.filter(idea => idea.STATUS !== 'Archived'); // Example filter
        return jsonResponse({ success: true, count: filteredIdeas.length, data: filteredIdeas }, callback);
    }
    
    // Fallback to original doGet functionality for fetching raw messages
    let rows = readRawAsObjects();
    if(p.limit){
      const lim = parseInt(p.limit,10);
      if(!isNaN(lim) && lim>0) rows = rows.slice(0, lim);
    }
    return jsonResponse({ success:true, count: rows.length, data: rows }, callback);

  } catch(err){
    const cb = (e && e.parameter && e.parameter.callback) || null;
    return jsonResponse({ success:false, error: err.toString() }, cb);
  }
}
