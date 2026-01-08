# Before & After: Code Comparison

## Issue #1: Column Mismatch in RAW Sheet

### ❌ BEFORE (Broken)
```javascript
function appendToRawRow(row){
  const ss = openSpreadsheet();
  const sh = ss.getSheetByName("RAW");
  if(!sh) throw new Error("RAW sheet not found");  // ← crashes if sheet missing
  sh.appendRow(row);
}

// Called with only 5 columns:
appendToRawRow([new Date(), message, userCategory, main, sub]);

// Result: 6th column stays blank/shifts data
// RAW Sheet expected: [TIMESTAMP, MESSAGE, MAIN-CAT, SUB-CAT, Suggested project, source]
// Actually got:     [TIMESTAMP, MESSAGE, USER-CAT,  MAIN,    SUB, (empty), (empty)]
```

### ✅ AFTER (Fixed)
```javascript
function appendToRawRow(row){
  try {
    const ss = openSpreadsheet();
    let sh = ss.getSheetByName("RAW");
    if(!sh) {
      // Auto-create with correct headers
      sh = ss.insertSheet("RAW");
      sh.appendRow(['TIMESTAMP', 'MESSAGE', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'Suggested project', 'source']);
    }
    // Ensure row has 6 columns
    if (row.length < 6) {
      while (row.length < 6) {
        row.push('');  // ← pad with empty strings
      }
    }
    sh.appendRow(row);
    Logger.log('Row appended to RAW sheet: ' + JSON.stringify(row));  // ← debugging
  } catch (err) {
    Logger.log('appendToRawRow Error: ' + err.toString());
    throw err;
  }
}

// Now called with 6 columns:
appendToRawRow([new Date(), message, main, sub, '', source]);

// Result: Perfect alignment
// RAW Sheet: [TIMESTAMP, MESSAGE, MAIN-CATEGORY, SUB-CATEGORY, Suggested project, source]
// Actually: [Date,      Message, Auto-Cat,      Auto-SubCat,   "",                VOLUN_WEB]
```

---

## Issue #2: Duplicate Functions

### ❌ BEFORE (Broken - Two Definitions)
```javascript
// FIRST DEFINITION (lines ~325-375)
function handleSubmitConcern(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const message = payload.message || '';
    const userCategory = payload.category || '';  // ← unused & causing issues
    
    if (!message.trim() || !userCategory.trim()) {
      throw new Error('Message and category are required.');  // ← wrong validation
    }
    
    const { main, sub } = categorize(message);
    
    // ❌ Wrong: only 5 columns
    appendToRawRow([new Date(), message, userCategory, main, sub]);
    
    return jsonResponse({...});
  } catch (err) {...}
}

// SECOND DEFINITION (lines ~421-435) - OVERWRITES FIRST ONE
function handleSubmitConcern(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const message = payload.message || '';
    
    if (!message.trim()) throw new Error('Message is required.');  // ← simpler
    
    const { main, sub } = categorize(message);
    
    // ❌ Still wrong: only 5 columns
    appendToRawRow([new Date(), message, payload.category || '', main, sub]);
    
    return jsonResponse({ success: true, category: { main, sub } });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// Router calls the second definition (since it overwrote the first)
// ↓ Result: Inconsistent behavior, missing error logging
```

### ✅ AFTER (Fixed - Single Definition)
```javascript
/**
 * Handles the submission of a new concern from the main form.
 * It categorizes the concern and appends it to the "RAW" sheet with all required columns.
 */
function handleSubmitConcern(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const message = payload.message || '';

    if (!message.trim()) {
      throw new Error('Message is required.');
    }

    const { main, sub } = categorize(message);
    const source = payload.source || 'VOLUN_WEB';  // ← proper source

    // ✅ Correct: 6 columns with proper mapping
    appendToRawRow([new Date(), message, main, sub, '', source]);

    Logger.log(`Concern submitted: "${message.substring(0, 50)}..." Category: ${main}/${sub}`);

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

// Only ONE definition now - no conflicts
// ✓ Proper error handling
// ✓ Detailed logging
// ✓ Correct column count
```

---

## Issue #3: Missing Error Handling

### ❌ BEFORE (Silent Failures)
```javascript
function appendSuggestionRow(payload) {
  const ss = openSpreadsheet();
  let sh = ss.getSheetByName("SUGG");
  if (!sh) {
    sh = ss.insertSheet("SUGG");
    sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR', 'STATUS']);
  }
  // ❌ No null checks - crashes if payload.title is undefined
  const row = [ new Date(), payload.title, payload.details, payload.mainCategory, payload.subCategory, payload.author, 'Pending' ];
  sh.appendRow(row);
  // ❌ No logging - can't debug if something goes wrong
}
```

### ✅ AFTER (Robust)
```javascript
function appendSuggestionRow(payload) {
  try {
    const ss = openSpreadsheet();
    let sh = ss.getSheetByName("SUGG");
    if (!sh) {
      sh = ss.insertSheet("SUGG");
      sh.appendRow(['TIMESTAMP', 'TITLE', 'DETAILS', 'MAIN-CATEGORY', 'SUB-CATEGORY', 'AUTHOR', 'STATUS']);
    }
    // ✓ Null-safe with || defaults
    const row = [
      new Date(), 
      payload.title || '',                    // ← fallback to empty string
      payload.details || '', 
      payload.mainCategory || '', 
      payload.subCategory || '', 
      payload.author || 'Anonymous',          // ← fallback to "Anonymous"
      'Pending'
    ];
    sh.appendRow(row);
    Logger.log('Row appended to SUGG sheet: ' + payload.title);  // ✓ Debugging
  } catch (err) {
    Logger.log('appendSuggestionRow Error: ' + err.toString());   // ✓ Error logging
    throw err;
  }
}
```

---

## Summary of Changes

| Aspect | Before | After |
|--------|--------|-------|
| **Function Definitions** | Duplicate (2 each) | Single clean definition |
| **Column Count** | 5 columns | 6 columns ✓ |
| **Data Mapping** | Wrong (userCategory in wrong position) | Correct (main, sub, empty, source) |
| **Error Handling** | None (crashes silently) | Try-catch with logging |
| **Null Safety** | No checks (potential undefined errors) | Defaults with \|\| operator |
| **Logging** | No logging (can't debug) | Detailed Logger statements |
| **Auto-Sheet Creation** | Throws error if missing | Creates with correct headers |
| **Column Padding** | Not implemented | Pads to 6 columns automatically |

---

## Testing: Expected Behavior After Fix

### Test: Submit a Concern
```
Input:
  - Message: "The welding table is wobbly"
  - Category: (auto-selected from user dropdown)

Apps Script Processing:
  1. Parse message ✓
  2. Auto-categorize: main="Kaizenset", sub="Welding" ✓
  3. Create row: [Date, Message, "Kaizenset", "Welding", "", "VOLUN_WEB"] ✓
  4. Append to RAW sheet ✓
  5. Log: "Concern submitted: "The welding table is wobbly..." Category: Kaizenset/Welding" ✓

Google Sheet Result:
  ✓ New row appears in RAW sheet within 1-2 seconds
  ✓ All 6 columns populated correctly
  ✓ No data shifting or alignment issues
```

### Test: Submit a Suggestion
```
Input:
  - Title: "Add better lighting"
  - Details: "Welding area needs brighter lights"
  - Main Cat: "Kaizenset"
  - Sub Cat: "Welding"
  - Author: "John Smith"

Apps Script Processing:
  1. Validate title & details ✓
  2. Create row: [Date, "Add better lighting", "Welding area...", "Kaizenset", "Welding", "John Smith", "Pending"] ✓
  3. Append to SUGG sheet ✓
  4. Log: "Suggestion submitted: "Add better lighting" by John Smith" ✓

Google Sheet Result:
  ✓ New row appears in SUGG sheet within 1-2 seconds
  ✓ All 7 columns populated
  ✓ Status automatically set to "Pending"
```

---

## Files Modified

1. **appscript/script-voluntarians.js** - Updated
   - ✅ Fixed handleSubmitConcern()
   - ✅ Fixed handleSubmitSuggestion()
   - ✅ Fixed appendToRawRow()
   - ✅ Fixed appendSuggestionRow()
   - ✅ Removed duplicate definitions

2. **appscript.js** - Updated (same fixes as above)

Both are synchronized with identical fixes.

---

**Status: Ready for deployment to Google Apps Script** ✅
