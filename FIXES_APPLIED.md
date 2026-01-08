# Bug Fixes Applied - Data Submission Issue

## Problem
Concerns and ideas submitted through the web app UI were appearing in the interface but **not being saved to the Google Sheet database**.

## Root Causes Identified

### 1. **Duplicate Function Definitions**
- Both `handleSubmitConcern()` and `handleSubmitSuggestion()` were defined **twice** in the Apps Script
- The second definitions (lines ~421-437) were overriding the first ones (lines ~325-354)
- This caused inconsistent behavior and potential routing issues

### 2. **Missing Column Mappings**
The RAW sheet has **6 columns**:
- `TIMESTAMP`, `MESSAGE`, `MAIN-CATEGORY`, `SUB-CATEGORY`, `Suggested project`, `source`

But the old code only appended **5 values**:
```javascript
appendToRawRow([new Date(), message, userCategory, main, sub]); // Only 5 columns!
```

This mismatch caused the sheet to skip or misalign data.

### 3. **Inconsistent Data Handling**
- The `appendToRawRow()` function didn't handle missing columns
- The `appendSuggestionRow()` function wasn't catching errors properly
- No error logging to help debug submission failures

## Fixes Applied

### ✅ Fix 1: Removed Duplicate Functions
- Kept only one `handleSubmitConcern()` definition
- Kept only one `handleSubmitSuggestion()` definition
- Removed conflicting duplicate definitions at lines ~421-437

### ✅ Fix 2: Corrected Column Mapping for RAW Sheet
```javascript
// OLD (5 columns):
appendToRawRow([new Date(), message, userCategory, main, sub]);

// NEW (6 columns):
appendToRawRow([new Date(), message, main, sub, '', source]);
// Columns: TIMESTAMP | MESSAGE | MAIN-CATEGORY | SUB-CATEGORY | Suggested project (empty) | source
```

### ✅ Fix 3: Enhanced appendToRawRow()
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
    // Pad row to 6 columns
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
```

### ✅ Fix 4: Improved appendSuggestionRow()
- Added try-catch error handling
- Added null-safety checks for payload values
- Added detailed logging for debugging

### ✅ Fix 5: Better Error Logging
Both functions now include:
```javascript
Logger.log(`Concern submitted: "${message.substring(0, 50)}..." Category: ${main}/${sub}`);
Logger.log('Row appended to RAW sheet: ' + JSON.stringify(row));
```

This allows you to check the Apps Script logs if submissions still fail.

## Files Modified
1. `appscript/script-voluntarians.js` - Main script file (updated)
2. `appscript.js` - Root script file (updated)

## Next Steps

### 1. **Deploy the Updated Script**
In Google Apps Script:
1. Copy the updated code from either file
2. Go to your [Apps Script project](https://script.google.com/)
3. Paste the updated code into the editor
4. Click **Deploy** → **New Deployment** → Select **Type: Web app**
5. Execute as: Your account
6. Who has access: Anyone
7. Copy the new deployment URL and update the `DEPLOYED_ID` in your HTML if needed

### 2. **Test the Submission**
1. Submit a test concern through the web app
2. Check if it appears in the RAW sheet
3. Submit a test suggestion
4. Check if it appears in the SUGG sheet

### 3. **Debug if Needed**
If submissions still don't work:
1. Go to your [Apps Script project](https://script.google.com/)
2. Click **Execution log** or **Logs** at the bottom
3. Check for error messages
4. The logging statements will show exactly what data was submitted

## Column Order Reference

### RAW Sheet (6 columns)
```
A: TIMESTAMP (auto-generated Date)
B: MESSAGE (user's concern text)
C: MAIN-CATEGORY (auto-categorized from keywords)
D: SUB-CATEGORY (auto-categorized from keywords)
E: Suggested project (empty for concerns)
F: source (e.g., "VOLUN_WEB")
```

### SUGG Sheet (7 columns)
```
A: TIMESTAMP (auto-generated Date)
B: TITLE (suggestion title from user)
C: DETAILS (suggestion details from user)
D: MAIN-CATEGORY (selected by user)
E: SUB-CATEGORY (selected by user)
F: AUTHOR (user's name or "Anonymous")
G: STATUS (default "Pending", can be "Delivered" or "Archived")
```

---

**Last Updated:** January 8, 2026
**Status:** ✅ Code fixes applied, ready for deployment
