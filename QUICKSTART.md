# 🎯 Quick Start: Deploy & Test (5 Minutes)

## The Problem (Fixed ✅)
Concerns and ideas weren't saving to Google Sheet - **now they will!**

## What You Need to Do

### Step 1: Copy Updated Code (1 min)
1. Open `appscript/script-voluntarians.js` in your project folder
2. Select ALL (Ctrl+A) and Copy

### Step 2: Update Google Apps Script (2 min)
1. Go to your Google Sheet
2. Click **Tools** → **Script Editor**
3. Select ALL code (Ctrl+A) and Delete
4. Paste the copied code
5. Click **Save** (Ctrl+S)
6. Click **Deploy** → **New Deployment** → **Web app**
7. Set: Execute as YOU, Anyone can access
8. Copy the new URL/ID if needed

### Step 3: Test (2 min)

**Test 1 - Submit a Concern:**
1. Open your web app
2. Click "SUBMIT A CONCERN"
3. Pick any category, type "TEST" as message
4. Click Submit
5. Go to Google Sheet → **RAW** tab
6. **Scroll down** - See your test row? ✅ Success!

**Test 2 - Submit a Suggestion:**
1. Back in web app, click "SUBMIT AN IDEA"
2. Fill in Title, Details, Categories
3. Click Submit
4. Go to Google Sheet → **SUGG** tab
5. **Scroll down** - See your test row? ✅ Success!

---

## What Changed (Technical Summary)

| Fix | Impact |
|-----|--------|
| Fixed 6-column mapping for RAW sheet | Data now saves in correct columns |
| Removed duplicate functions | No more conflicting code |
| Added error handling | Better debugging if issues occur |
| Added logging | Can see what's happening |

**Result:** Submissions now properly save to Google Sheet! 🎉

---

## If Something Goes Wrong

### Check the Logs:
1. Google Apps Script editor → **Execution log** (bottom)
2. Look for error messages
3. Try again

### Most Common Issues:
- **"RAW sheet not found"** → Script auto-creates it (fixed!)
- **Wrong columns** → Now fixed with proper 6-column mapping
- **Missing data** → Error logging will show exactly what failed

---

## Files That Changed
- ✅ `appscript/script-voluntarians.js` 
- ✅ `appscript.js`

Both have identical fixes.

---

## Success Criteria ✅
After deployment:
- [ ] Concerns appear in RAW sheet
- [ ] Suggestions appear in SUGG sheet
- [ ] All columns properly populated
- [ ] No errors in Apps Script logs

**Done!** You're good to go. 🚀

---

For detailed info:
- **What was fixed:** See `FIXES_APPLIED.md`
- **How to deploy:** See `DEPLOYMENT_GUIDE.md`
- **Before/After code:** See `BEFORE_AND_AFTER.md`
- **Data structure:** See `SCHEMA.md`
