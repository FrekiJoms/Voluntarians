# 🚀 Deployment Guide - Google Apps Script Update

## What's Fixed
Your web app was submitting data that appeared in the UI but wasn't saving to Google Sheets. This is now fixed!

**Root causes resolved:**
- ✅ Duplicate function definitions causing conflicts
- ✅ Missing column mappings for RAW sheet (was appending 5 columns instead of 6)
- ✅ Added error handling and logging
- ✅ Improved robustness with null checks

---

## Step 1: Access Google Apps Script Editor

1. Go to your Google Sheet: https://docs.google.com/spreadsheets/d/1qRoxHE7EWtbud7MlMZ56S5aFgb5yYGnrNzUi-CNKs50/edit
2. Click **Tools** → **Script Editor** (opens in new tab)
3. You should see your current Apps Script code

---

## Step 2: Copy Updated Code

The updated code is in:
- **File:** `appscript/script-voluntarians.js` in your Voluntarians project folder

**Or use the root file:**
- **File:** `appscript.js` in your Voluntarians project folder

Both files have been updated with identical fixes.

---

## Step 3: Replace the Script Code

1. In Google Apps Script editor, select **ALL** existing code (Ctrl+A)
2. Delete it
3. Copy the entire contents of `appscript/script-voluntarians.js` 
4. Paste into the Apps Script editor
5. **Save** (Ctrl+S)

---

## Step 4: Deploy the Web App

1. In Google Apps Script editor, click **Deploy** (top right)
2. Click **New Deployment** (or **Edit** if existing)
3. Click the gear icon ⚙️ → Select **Web app**
4. Configure:
   - **Execute as:** Your Google account
   - **Who has access:** Anyone
5. Click **Deploy**
6. Copy the deployment URL

**Important:** If the `DEPLOYED_ID` in your HTML changed, update it:
- Find this line in `index.html`:
  ```javascript
  const DEPLOYED_ID = 'AKfycbyj4zbaO2ybMsrkCdGThxga-F4h4jm6dpIvjehDCQJUVwgfisG9Gqko5LX32o3CT7eGQg';
  ```
- If a new deployment was created, replace with the new ID from the deployment URL

---

## Step 5: Test the Submission

### Test Concern Submission:
1. Open your web app
2. Click **SUBMIT A CONCERN**
3. Enter:
   - Category: Any option
   - Message: "Test concern - please save to sheet"
4. Click **Submit**
5. You should see: ✓ Concern Submitted Successfully!

### Verify in Google Sheet:
1. Go to your spreadsheet
2. Click the **RAW** sheet tab
3. **Scroll to the bottom** - you should see your test concern as a new row with:
   - Column A (TIMESTAMP): Current date/time
   - Column B (MESSAGE): "Test concern - please save to sheet"
   - Column C (MAIN-CATEGORY): Auto-categorized
   - Column D (SUB-CATEGORY): Auto-categorized
   - Column E (Suggested project): Empty (blank)
   - Column F (source): "VOLUN_WEB"

### Test Suggestion Submission:
1. Open your web app
2. Click **SUBMIT AN IDEA**
3. Fill in:
   - Title: "Test Suggestion"
   - Details: "Testing the fix"
   - Main Category: Any
   - Sub Category: Any
   - Author: Your name
4. Click **Submit**

### Verify in Google Sheet:
1. Go to the **SUGG** sheet tab
2. **Scroll to the bottom** - you should see your test suggestion with all 7 columns filled

---

## Step 6: Debug (If Needed)

If submissions still don't work:

### Check Apps Script Logs:
1. Go to Google Apps Script editor
2. Click **Execution log** or **Logs** (at the bottom)
3. Look for your submission timestamp
4. Error messages will show exactly what went wrong

### Common Issues:

| Issue | Solution |
|-------|----------|
| "RAW sheet not found" | The script will auto-create it - check if it was created |
| Wrong column alignment | Verify column headers match exactly (case-sensitive) |
| Blank rows being created | The padding logic should prevent this - check logs |

---

## Key Changes Made

### 1. Fixed Column Mapping
**Before (BROKEN):**
```javascript
appendToRawRow([new Date(), message, userCategory, main, sub]); // 5 columns
```

**After (FIXED):**
```javascript
appendToRawRow([new Date(), message, main, sub, '', source]); // 6 columns
```

### 2. Removed Duplicate Functions
- Removed second `handleSubmitConcern()` definition
- Removed second `handleSubmitSuggestion()` definition
- Kept only the correct implementations

### 3. Added Robust Error Handling
- Try-catch blocks on all sheet operations
- Automatic sheet creation if missing
- Column padding to ensure 6 columns in RAW sheet
- Detailed logging for debugging

---

## Success Indicators ✅

After deployment, you should see:
- ✅ Submissions appear in UI immediately
- ✅ Data also appears in Google Sheet within seconds
- ✅ No "error" messages in console
- ✅ Apps Script logs show "Row appended to RAW sheet" messages
- ✅ All 6 columns in RAW sheet are populated
- ✅ All 7 columns in SUGG sheet are populated

---

## Need Help?

If something doesn't work:
1. **Check the Apps Script logs** for error messages
2. **Verify column headers** in your sheets match exactly:
   - RAW: `TIMESTAMP`, `MESSAGE`, `MAIN-CATEGORY`, `SUB-CATEGORY`, `Suggested project`, `source`
   - SUGG: `TIMESTAMP`, `TITLE`, `DETAILS`, `MAIN-CATEGORY`, `SUB-CATEGORY`, `AUTHOR`, `STATUS`
3. **Try refreshing** your web app and submitting again
4. **Check browser console** (F12) for any client-side errors

---

**You're all set! Deploy and test.** 🎉

For detailed info about what was changed, see `FIXES_APPLIED.md`
