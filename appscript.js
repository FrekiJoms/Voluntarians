// =================== Voluntarians Apps Script (complete) ===================
// Paste this entire file into your Apps Script project and deploy as Web App.
// - Supports form-encoded POST and JSON POST
// - Smart suggestions: fuzzy + TF-IDF with caching
// - Records submissions to RAW sheet: TIMESTAMP, MESSAGE, MAIN-CATEGORY, SUB-CATEGORY, SUGGESTIONS_NOTE, SOURCE, EXTRA
// - Feedback endpoint (action=feedback) writes to FEEDBACK sheet
// - GET supports pivot=true (SUB-CATEGORY counts) and JSONP (callback=cb)
// ==========================================================================

// ----------------- CONFIG -----------------
const SECRET_TOKEN = ""; // set "" to disable token check
const REQUIRE_TOKEN = false;
const SHEET_ID = "1qRoxHE7EWtbud7MlMZ56S5aFgb5yYGnrNzUi-CNKs50"; // your spreadsheet id

// --- NEW: MODERATOR CONFIG ---
// Add your moderators here. Make sure to use strong, unique passwords.
const MODERATORS = [
  { id: "097025freki", password: "YOUR_SECRET_PASSWORD" }
  // { id: "another_mod_id", password: "another_secret_password" }
];


// Skillset mapping (main -> subs -> keywords)
const SKILLSETS = [
  {
    main: "Kaizenset",
    subs: [
      { name: "Welding", keywords: ["weld","welding","tig","mig","arc","rod","welders","welding practice","welding table"] },
      { name: "ICT", keywords: ["ict","data processing","computer","database","excel","google sheets","spreadsheet","python","csv","data entry","data analysis"] },
      { name: "Mechatronics", keywords: ["mechatronic","mechatronics","servo","arduino","raspberry","robot","sensor","actuator","pneumatic","motor control","automation"] }
    ]
  },
  {
    main: "TMF",
    subs: [
      { name: "MF1", keywords: ["filing","file","workpiece","mf1","machinery fundamentals 1"] },
      { name: "MF2", keywords: ["lathe","lathe machine","turning","mf2","machinery fundamentals 2","chuck","toolpost"] },
      { name: "TF",  keywords: ["measuring","caliper","vernier","micrometer","tf","technical fundamentals"] }
    ]
  },
  {
    main: "EXE",
    subs: [
      { name: "XF", keywords: ["electronics","belex","delex","selex","xf","electronic fundamentals","oscilloscope","breadboard"] },
      { name: "EF1", keywords: ["wiring","house wiring","ef1","electrical fundamentals 1","breaker","outlet"] },
      { name: "EF2", keywords: ["motor","motor control","ef2","electrical fundamentals 2","starter","contactors"] }
    ]
  }
];

// Suggestions mapping (editable)
const SUGGESTIONS = {
  "kaizenset-welding": [
    "Portable Welding Practice Station",
    "Welding Fume Extraction Prototype",
    "Adjustable Welding Fixture for Trainee Projects"
  ],
  "kaizenset-ict": [
    "Automated Data Entry & Validation Tool",
    "Training Dashboard for Attendance and Scores",
    "CSV to Sheets ETL Helper with Error Reporting"
  ],
  "kaizenset-mechatronics": [
    "Modular Robotic Arm Training Kit",
    "Servo-based Pick-and-Place Trainer",
    "Automated Conveyor with Sorting Sensors"
  ],
  "tmf-mf1": ["Workbench Filing Improvement System","Ergonomic Tool Holder for Filing Station","Workpiece Angle Guide for Beginner Filing"],
  "tmf-mf2": ["Lathe Tool Holder Organizer Fabrication","Coolant Collection & Management System","Turning Tool Geometry Training Aid"],
  "tmf-tf": ["Digital Measuring Tool Borrowing System","Tool Calibration Log Automation","3D-Printed Measuring Tool Organizer"],
  "tmf-welding": ["Welding Rod Smart Storage Cabinet","Portable Welding Practice Table","Safety Shield & Spark Protection Project"],
  "exe-xf": ["Electronics Component Organizer Drawer","Smart Inventory System for Electronics","Oscilloscope Probe Holder + Anti-tangle System"],
  "exe-ef1": ["House Wiring Trainer Board Upgrade","Circuit Breaker Testing Panel Refurbish","Outlet + Lighting Practice Setup Box"],
  "exe-ef2": ["Modular Motor Control Trainer Panel","Motor Starter Circuit Demonstration Board","Smart Fault Simulation System for Motor Control"],
  "uncategorized-unknown": ["General Workstation Improvement Project","Safety and Efficiency Audit Project","Training Room Enhancement Proposal"]
};

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

function appendToRawRow(row){
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName("RAW");
  if(!sh) throw new Error("RAW sheet not found");
  sh.appendRow(row);
}

function readRawAsObjects(){
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName("RAW");
  if(!sh) throw new Error("RAW not found");
  const last = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if(last < 2) return [];
  const headers = sh.getRange(1,1,1,lastCol).getValues()[0];
  const data = sh.getRange(2,1,last-1,lastCol).getValues();
  return data.map(r=>{
    const obj = {};
    headers.forEach((h,i)=> obj[h] = r[i]);
    return obj;
  }).reverse();
}

function readSuggAsObjects() {
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName("SUGG");
  if (!sh) return []; // Return empty if sheet doesn't exist yet
  const last = sh.getLastRow();
  const lastCol = sh.getLastColumn();
  if (last < 2) return [];
  const headers = sh.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = sh.getRange(2, 1, last - 1, lastCol).getValues();
  return data.map(r => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = r[i]);
    return obj;
  }).reverse(); // Show newest first
}

function buildPivotFromRaw(colName){
  const rows = readRawAsObjects();
  const col = colName || "SUB-CATEGORY";
  const counts = {};
  rows.forEach(r=>{
    const key = (r[col] || r[col.toUpperCase()] || r[col.toLowerCase()] || "Unknown").toString();
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts).map(k=>({ label:k, count:counts[k] })).sort((a,b)=>b.count-a.count);
}
function appendSuggestionRow(payload) {
  const ss = openSpreadsheet();
  let sh = ss.getSheetByName("SUGG");
  if (!sh) {
    sh = ss.insertSheet("SUGG");
    sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR']);
  }
  // Ensure the order matches the headers
  const row = [
    new Date(),
    payload.title,
    payload.details,
    payload.mainCategory,
    payload.subCategory,
    payload.author
  ];
  sh.appendRow(row);
}

// ----------------- SIMPLE CATEGORIZATION -----------------
function categorize(text) {
  const t = (text || "").toLowerCase();
  for (const group of SKILLSETS) {
    for (const sub of group.subs) {
      for (const k of sub.keywords) {
        if (!k) continue;
        if (t.includes(k)) return { main: group.main, sub: sub.name };
      }
    }
  }
  return { main: "Uncategorized", sub: "Unknown" };
}

function suggestProject(main, sub) {
  const key = `${(main||"").toLowerCase()}-${(sub||"").toLowerCase()}`;
  if (SUGGESTIONS[key]) return SUGGESTIONS[key];
  const mainKey = `${(main||"").toLowerCase()}-`;
  for (const k in SUGGESTIONS) {
    if (k.startsWith(mainKey) && Array.isArray(SUGGESTIONS[k])) return SUGGESTIONS[k].slice(0,3);
  }
  return SUGGESTIONS["uncategorized-unknown"];
}

// --- NEW: MODERATOR LOGIN HANDLER ---
function handleModeratorLogin(payload) {
  const { id, password } = payload;
  if (!id || !password) {
    return jsonResponse({ success: false, error: "ID and password are required" });
  }

  const mod = MODERATORS.find(m => m.id === id);

  if (!mod) {
    return jsonResponse({ success: false, error: "Invalid ID or password" });
  }

  if (mod.password === password) {
    return jsonResponse({ success: true, message: "Login successful" });
  } else {
    return jsonResponse({ success: false, error: "Invalid ID or password" });
  }
}

// ----------------- TEXT & FUZZY HELPERS -----------------
function normalizeText(s){ return (s||'').toString().toLowerCase().replace(/[^a-z0-9\s\-]/g,' ').replace(/\s+/g,' ').trim(); }
function tokenize(text){ return normalizeText(text).split(' ').filter(Boolean); }

function levenshtein(a,b){
  if(a===b) return 0;
  a = a||''; b = b||'';
  const al = a.length, bl = b.length;
  if(al===0) return bl; if(bl===0) return al;
  const v0 = new Array(bl+1), v1 = new Array(bl+1);
  for(let j=0;j<=bl;j++) v0[j]=j;
  for(let i=0;i<al;i++){
    v1[0]=i+1;
    for(let j=0;j<bl;j++){
      const cost = a.charAt(i) === b.charAt(j) ? 0 : 1;
      v1[j+1] = Math.min(v1[j]+1, v0[j+1]+1, v0[j]+cost);
    }
    for(let j=0;j<=bl;j++) v0[j]=v1[j];
  }
  return v1[bl];
}

function fuzzyContains(haystack, needle){
  if(!needle) return false;
  haystack = normalizeText(haystack);
  needle = normalizeText(needle);
  if(haystack.indexOf(needle) !== -1) return true;
  const words = haystack.split(' ');
  for(const w of words){
    if(Math.abs(w.length - needle.length) > 3) continue;
    if(levenshtein(w, needle) <= 1) return true;
  }
  return false;
}

// ----------------- SMART SUGGEST (FUZZY) -----------------
function smartSuggestFuzzy(message, topN){
  topN = topN || 5;
  const text = normalizeText(message);
  const buckets = {};
  for(const g of SKILLSETS){
    for(const s of g.subs){
      const key = (g.main + '-' + s.name).toLowerCase();
      buckets[key] = buckets[key] || { key, main: g.main, sub: s.name, keywords: (s.keywords||[]).slice(), base: 0.1 };
      buckets[key].keywords = Array.from(new Set(buckets[key].keywords.concat([s.name])));
    }
  }
  for(const k in SUGGESTIONS){
    if(!buckets[k]) buckets[k] = { key:k, main:k.split('-')[0]||'', sub:k.split('-')[1]||'', keywords: [], base:0.05 };
  }

  const scores = [];
  for(const k in buckets){
    const b = buckets[k];
    let score = b.base;
    const matched = [];
    if(b.main && text.indexOf(b.main.toLowerCase()) !== -1){ score += 0.6; matched.push(b.main); }
    for(const kw of b.keywords){
      const kwN = normalizeText(kw);
      if(text.indexOf(' '+kwN+' ') !== -1 || text.indexOf(kwN+' ') === 0 || text.indexOf(' '+kwN) === (text.length - kwN.length -1)){
        score += 0.8; matched.push(kw);
      } else if(fuzzyContains(text, kwN)){
        score += 0.35; matched.push(kw);
      } else {
        const tokens = text.split(' ');
        for(const t of tokens) if(t.length>2 && kwN.indexOf(t)!==-1) score += 0.12;
      }
    }
    if(score > 0.1) scores.push({ key: b.key, main: b.main, sub: b.sub, score: Number(score.toFixed(3)), matched: matched.slice(0,5) });
  }
  scores.sort((a,b)=> b.score - a.score);
  return scores.slice(0, topN);
}

// ----------------- TF-IDF + CACHING -----------------
const TFIDF_CACHE_KEY = 'TFIDF_CACHE_V1';

function buildCorpusDocs(maxRaw=300){
  const docs = [];
  for(const key in SUGGESTIONS){
    const text = (SUGGESTIONS[key]||[]).join(' ');
    docs.push({ id:'sugg::'+key, text: text || key });
  }
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName('RAW');
  if(sh){
    const last = sh.getLastRow();
    if(last > 1){
      const start = Math.max(2, last - maxRaw + 1);
      const rows = sh.getRange(start, 2, last - start + 1, 1).getValues();
      rows.forEach((r,i) => docs.push({ id: 'raw::' + (start+i), text: (r[0]||'').toString() }));
    }
  }
  return docs;
}

function buildTermData(docs){
  const vocab = {};
  const docTerms = [];
  docs.forEach((doc) => {
    const tokens = tokenize(doc.text);
    const counts = {};
    tokens.forEach(t => {
      if(vocab[t] === undefined) vocab[t] = Object.keys(vocab).length;
      counts[t] = (counts[t]||0) + 1;
    });
    docTerms.push({ id: doc.id, counts, len: tokens.length || 1 });
  });
  return { vocab, docTerms };
}

function computeIDF(docTerms, vocab){
  const N = docTerms.length;
  const idf = {};
  for(const token in vocab){
    let df = 0;
    for(let i=0;i<docTerms.length;i++) if(docTerms[i].counts[token]) df++;
    idf[token] = Math.log((N + 1) / (df + 1)) + 1;
  }
  return idf;
}

function buildCacheIfNeeded(){
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(TFIDF_CACHE_KEY);
  if(raw){
    try{
      const cached = JSON.parse(raw);
      if(Date.now() - (cached.ts || 0) < 1000 * 60 * 60) return cached;
    } catch(e){}
  }
  const docs = buildCorpusDocs(300);
  const td = buildTermData(docs);
  const idf = computeIDF(td.docTerms, td.vocab);
  const cached = { ts: Date.now(), vocab: td.vocab, idf: idf, suggDocs: td.docTerms.filter(d=>d.id.startsWith('sugg::')) };
  try{ PropertiesService.getScriptProperties().setProperty(TFIDF_CACHE_KEY, JSON.stringify(cached)); } catch(e){}
  return cached;
}

function buildTfIdfVectorFromCache(text, cache){
  const vec = {};
  const tokens = tokenize(text);
  const len = tokens.length || 1;
  for(const t of tokens){
    if(cache.vocab[t] === undefined) continue;
    vec[t] = ( (vec[t]||0) + 1 ) / len * (cache.idf[t] || 0);
  }
  return vec;
}

function cosineSim(a,b){
  let dot=0, na=0, nb=0;
  for(const t in a){ na += a[t]*a[t]; dot += a[t] * (b[t] || 0); }
  for(const t in b) nb += b[t]*b[t];
  if(na===0 || nb===0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function rankByTfIdf(message, topN){
  topN = topN || 5;
  const cache = buildCacheIfNeeded();
  const msgVec = buildTfIdfVectorFromCache(message, cache);
  const results = [];
  cache.suggDocs.forEach(dt=>{
    const key = dt.id.replace('sugg::','');
    const vec = {};
    for(const token in dt.counts){
      if(cache.idf[token]) vec[token] = (dt.counts[token] / dt.len) * cache.idf[token];
    }
    const sim = cosineSim(msgVec, vec);
    results.push({ key:key, score: Number(sim.toFixed(4)), suggestions: (SUGGESTIONS[key]||[]).slice(0,3) });
  });
  results.sort((a,b)=> b.score - a.score);
  return results.slice(0, topN);
}

// ----------------- COMBINED SUGGESTION -----------------
function combinedSuggest(message, topN){
  topN = topN || 3;
  const fuzzy = smartSuggestFuzzy(message, 8);
  const tfidf = rankByTfIdf(message, 8);
  const tfMap = {}; tfidf.forEach(t=> tfMap[t.key] = t.score);
  const merged = [];
  fuzzy.forEach(f => {
    const fuzzyNorm = Math.min(1, f.score / 1.5); // heuristic normalization
    const tfScore = tfMap[f.key] || 0;
    const finalScore = Number((0.6 * fuzzyNorm + 0.4 * tfScore).toFixed(4));
    const suggList = SUGGESTIONS[f.key] || SUGGESTIONS[(f.main||'').toLowerCase() + '-' + (f.sub||'').toLowerCase()] || SUGGESTIONS['uncategorized-unknown'];
    merged.push({ key: f.key, main: f.main, sub: f.sub, score: finalScore, suggestions: suggList.slice(0,3), reason: 'fuzzy' });
  });
  tfidf.forEach(t => {
    if(!merged.find(m=>m.key===t.key) && t.score > 0.02) merged.push({ key: t.key, main: t.key.split('-')[0]||'', sub: t.key.split('-')[1]||'', score: Number((0.4*t.score).toFixed(4)), suggestions: t.suggestions, reason: 'tfidf' });
  });
  merged.sort((a,b)=> b.score - a.score);
  return merged.slice(0, topN);
}

// ----------------- FEEDBACK APPEND -----------------
function appendFeedbackRow(payload){
  const ss = openSpreadsheet();
  let sh = ss.getSheetByName('FEEDBACK');
  if(!sh) sh = ss.insertSheet('FEEDBACK');
  // TIMESTAMP, MESSAGE, chosenKey, accepted(TRUE/FALSE), uiContext, userId, note
  sh.appendRow([ new Date(), payload.message || '', payload.key || '', payload.accepted ? 'TRUE' : 'FALSE', payload.context || '', payload.user || '', payload.note || '' ]);
}

// ----------------- MAIN WEBHOOK -----------------

/**
 * doPost: handles:
 * - submission: form-encoded or JSON { token, message, source, extra, action }
 * - feedback: action=feedback with fields for feedback
 */
function doPost(e){
  try{
    let payload = {};
    // form-encoded
    if(e.parameter && Object.keys(e.parameter).length > 0){
      payload = Object.assign({}, e.parameter);
    } else if(e.postData && e.postData.contents){
      const parsed = tryParseJSON(e.postData.contents);
      if(!parsed.ok) return jsonResponse({ success:false, error: "Invalid JSON" }, null);
      payload = parsed.value || {};
    }
    // action handling (router)
    const action = (payload.action || '').toString();
    
    // token check (if set)
    if(SECRET_TOKEN){
      if(!payload.token || payload.token !== SECRET_TOKEN) return jsonResponse({ success:false, error:"Unauthorized" }, null);
    }

    if (action === 'moderatorLogin') {
      return handleModeratorLogin(payload);
    }

    if (action === 'submitSuggestion') {
      if (!payload.title || !payload.details || !payload.mainCategory || !payload.subCategory) {
        return jsonResponse({ success: false, error: "Missing required suggestion fields." });
      }
      appendSuggestionRow(payload);
      return jsonResponse({ success: true, result: 'suggestion recorded' });
    }

    if(action === 'feedback'){
      // expect message, key, accepted (true/false), context, user, note
      appendFeedbackRow({ message: payload.message, key: payload.key, accepted: payload.accepted === 'true' || payload.accepted === true, context: payload.context, user: payload.user, note: payload.note });
      return jsonResponse({ success:true, result: 'feedback recorded' }, null);
    }

    // Default Fallback: Normal submission
    const message = (payload.message || "").toString().trim();
    if(!message) return jsonResponse({ success:false, error: "No message provided" }, null);

    // categorize and smart suggest
    const category = categorize(message);
    const ranked = combinedSuggest(message, 3);
    const chosen = (ranked && ranked.length) ? ranked[0] : null;
    const suggestions = chosen ? chosen.suggestions : suggestProject(category.main, category.sub);
    // sanitized: only suggestion titles
    const note = Array.isArray(suggestions) ? suggestions.join(' | ') : String(suggestions);

    // Append to RAW: TIMESTAMP, MESSAGE, MAIN-CATEGORY, SUB-CATEGORY, SOLUTION, SOURCE, EXTRA
    appendToRawRow([ new Date(), message, category.main, category.sub, note, (payload.source||'WEB'), (payload.extra||'') ]);

    return jsonResponse({ success:true, category, suggestions, chosen: chosen || null }, null);

  } catch(err){
    return jsonResponse({ success:false, error: err.toString() }, null);
  }
}


/**
 * doGet: reads RAW sheet
 * params:
 *  - token (if SECRET_TOKEN set)
 *  - limit
 *  - q (filter message contains)
 *  - pivot=true (returns [{label,count},...])
 *  - callback=JSONP callback
 *  - mode=options (simple allowed info)
 */
function doGet(e){
  try{
    const p = e && e.parameter ? e.parameter : {};
    const callback = p.callback;
    const action = p.action || ''; // Get the action parameter

    if(SECRET_TOKEN){
      if(!p.token || p.token !== SECRET_TOKEN) return jsonResponse({ success:false, error:"Unauthorized" }, callback);
    }
    
    if (action === 'getIdeas') {
        const ideas = readSuggAsObjects();
        return jsonResponse({ success: true, count: ideas.length, data: ideas }, callback);
    }

    if(p.mode === "options"){
      return jsonResponse({ success:true, allowed:["GET","POST"], note:"Use callback for JSONP if calling cross-origin." }, callback);
    } 
    if(p.pivot === "true" || p.pivot === true){
      const pivot = buildPivotFromRaw("SUB-CATEGORY");
      return jsonResponse({ success:true, count: pivot.length, data: pivot }, callback);
    }
    // regular fetch from RAW
    let rows = readRawAsObjects();
    if(p.q){
      const q = p.q.toString().toLowerCase();
      rows = rows.filter(r => ((r["MESSAGE"]||"").toString().toLowerCase().indexOf(q) !== -1));
    }
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
