# Sheet Structure Reference

## RAW Sheet (Concern Log)
Stores submissions from "SUBMIT A CONCERN" form

| Column | Header | Type | Source | Notes |
|--------|--------|------|--------|-------|
| A | TIMESTAMP | Date | Auto | Current date/time when submitted |
| B | MESSAGE | Text | User Input | The concern text (max 1000 chars) |
| C | MAIN-CATEGORY | Text | Auto-categorized | Based on keyword matching in message |
| D | SUB-CATEGORY | Text | Auto-categorized | Based on keyword matching in message |
| E | Suggested project | Text | Empty | Reserved for future use (blank) |
| F | source | Text | Auto | Always "VOLUN_WEB" for web submissions |

### Example Row:
```
TIMESTAMP           | MESSAGE                          | MAIN-CATEGORY | SUB-CATEGORY | Suggested project | source
2026-01-08 15:30:45 | The welding torch needs repair   | Kaizenset     | Welding      |                   | VOLUN_WEB
```

---

## SUGG Sheet (Idea/Suggestion Log)
Stores submissions from "SUBMIT AN IDEA" form

| Column | Header | Type | Source | Notes |
|--------|--------|------|--------|-------|
| A | TIMESTAMP | Date | Auto | Current date/time when submitted |
| B | TITLE | Text | User Input | Suggestion title |
| C | DETAILS | Text | User Input | Suggestion details/description |
| D | MAIN-CATEGORY | Text | User Selected | From dropdown in form |
| E | SUB-CATEGORY | Text | User Selected | From dropdown in form |
| F | AUTHOR | Text | User Input | Person's name or "Anonymous" |
| G | STATUS | Text | Auto | "Pending", "Delivered", or "Archived" |

### Example Row:
```
TIMESTAMP           | TITLE                  | DETAILS                      | MAIN-CATEGORY | SUB-CATEGORY | AUTHOR  | STATUS
2026-01-08 15:32:10 | Improve welding setup  | Add better ventilation...    | Kaizenset     | Welding      | John    | Pending
```

---

## Categorization Reference

The system automatically categorizes concerns based on keywords in the message.

### MAIN CATEGORIES

#### Kaizenset
- **Welding**
  Keywords: weld, welding, tig, mig, arc, rod, welders, welding practice, welding table
  
- **ICT** (Information & Communication Technology)
  Keywords: ict, data processing, computer, database, excel, google sheets, spreadsheet, python, csv, data entry, data analysis
  
- **Mechatronics**
  Keywords: mechatronic, mechatronics, servo, arduino, raspberry, robot, sensor, actuator, pneumatic, motor control, automation

#### TMF (Technical & Machinery Fundamentals)
- **MF1** (Machinery Fundamentals 1 - Filing)
  Keywords: filing, file, workpiece, mf1, machinery fundamentals 1
  
- **MF2** (Machinery Fundamentals 2 - Lathe)
  Keywords: lathe, lathe machine, turning, mf2, machinery fundamentals 2, chuck, toolpost
  
- **TF** (Technical Fundamentals)
  Keywords: measuring, caliper, vernier, micrometer, tf, technical fundamentals

#### EXE (Electrical/Electronics)
- **XF** (Electronics Fundamentals)
  Keywords: electronics, belex, delex, selex, xf, electronic fundamentals, oscilloscope, breadboard
  
- **EF1** (Electrical Fundamentals 1 - House Wiring)
  Keywords: wiring, house wiring, ef1, electrical fundamentals 1, breaker, outlet
  
- **EF2** (Electrical Fundamentals 2 - Motor Control)
  Keywords: motor, motor control, ef2, electrical fundamentals 2, starter, contactors

#### Other
- **Cafeteria** - Keywords: cafeteria
- **Mass** - Keywords: mass
- **General** - Keywords: general
- **Facilitation** - Keywords: facilitation
- **Offsite** - Keywords: offsite
- **Anvil** - Keywords: anvil

### Auto-Categorization Logic
1. System reads user's message text
2. Converts to lowercase
3. Searches for keywords in order
4. Returns first matching MAIN and SUB category
5. If no match found: MAIN = "Uncategorized", SUB = "Unknown"

### Example:
- Message: "The welding practice area needs better lights"
- Contains: "welding" keyword
- Result: MAIN = "Kaizenset", SUB = "Welding"

---

## API Actions

### POST Requests (Submissions)

#### `submitConcern`
```javascript
{
  action: "submitConcern",
  message: "User's concern text",
  category: "User selected category",
  source: "VOLUN_WEB"
}
```
**Response:** 
```javascript
{
  success: true,
  category: { main: "Auto-category", sub: "Auto-subcategory" }
}
```

#### `submitSuggestion`
```javascript
{
  action: "submitSuggestion",
  title: "Suggestion title",
  details: "Suggestion details",
  mainCategory: "Selected main category",
  subCategory: "Selected sub category",
  author: "Submitter name"
}
```
**Response:**
```javascript
{
  success: true,
  message: "Suggestion submitted successfully."
}
```

### GET Requests (Retrievals)

#### `getStats` 
Returns KPI data from COUNT sheet
```
GET /exec?action=getStats
```

#### `getIdeas`
Returns all non-archived ideas from SUGG sheet
```
GET /exec?action=getIdeas
```

#### Default (get message logs)
Returns all messages from RAW sheet
```
GET /exec?limit=50
```

---

## Data Flow Diagram

```
┌─────────────────┐
│   Web App UI    │
├─────────────────┤
│ Form Submission │
└────────┬────────┘
         │
         ├─ Concern Form
         │     └─→ submitConcern (JSON POST)
         │           ├─ Auto-categorize
         │           └─ Save to RAW sheet
         │
         └─ Idea Form
               └─→ submitSuggestion (Form-encoded POST)
                     └─ Save to SUGG sheet
```

---

## Status Values in SUGG Sheet

- **Pending** - New suggestion, awaiting review (default)
- **Delivered** - Suggestion has been implemented or approved by moderator
- **Archived** - Suggestion rejected or closed

Moderators can change status using the moderator panel.

---

Last Updated: January 8, 2026
