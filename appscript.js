// ----------------- CONFIG -----------------
/**
 * Simple config:
 * - SECRET_TOKEN: optional small security token for POST requests
 * - SKILLSETS: edit/add categories here (main -> subs -> keywords)
 */
const SECRET_TOKEN = "vtjmn027"; // <-- change this to a secret string, or leave "" to disable

const SKILLSETS = [
  {
    main: "TMF",
    subs: [
      { name: "MF1", keywords: ["filing","file","workpiece","mf1","machinery fundamentals 1"] },
      { name: "MF2", keywords: ["lathe","lathe machine","turning","mf2","machinery fundamentals 2","chuck","toolpost"] },
      { name: "TF",  keywords: ["measuring","caliper","vernier","micrometer","tf","technical fundamentals"] },
      { name: "Welding", keywords: ["weld","tig","mig","arc","rod","welding"] }
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

// Project suggestions mapping (editable)
const SUGGESTIONS = {
  "tmf-mf1": [
    "Workbench Filing Improvement System",
    "Ergonomic Tool Holder for Filing Station",
    "Workpiece Angle Guide for Beginner Filing"
  ],
  "tmf-mf2": [
    "Lathe Tool Holder Organizer Fabrication",
    "Coolant Collection & Management System",
    "Turning Tool Geometry Training Aid"
  ],
  "tmf-tf": [
    "Digital Measuring Tool Borrowing System",
    "Tool Calibration Log Automation",
    "3D-Printed Measuring Tool Organizer"
  ],
  "tmf-welding": [
    "Welding Rod Smart Storage Cabinet",
    "Portable Welding Practice Table",
    "Safety Shield & Spark Protection Project"
  ],
  "exe-xf": [
    "Electronics Component Organizer Drawer",
    "Smart Inventory System for Electronics",
    "Oscilloscope Probe Holder + Anti-tangle System"
  ],
  "exe-ef1": [
    "House Wiring Trainer Board Upgrade",
    "Circuit Breaker Testing Panel Refurbish",
    "Outlet + Lighting Practice Setup Box"
  ],
  "exe-ef2": [
    "Modular Motor Control Trainer Panel",
    "Motor Starter Circuit Demonstration Board",
    "Smart Fault Simulation System for Motor Control"
  ],
  "uncategorized-unknown": [
    "General Workstation Improvement Project",
    "Safety and Efficiency Audit Project",
    "Training Room Enhancement Proposal"
  ]
};

// ----------------- MAIN WEBHOOK -----------------
function doPost(e) {
  try {
    // Must parse JSON safely
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (jsonErr) {
        return respond({ success: false, error: "Invalid JSON payload" }, 400);
      }
    }

    // Token auth (JSON ONLY)
    if (SECRET_TOKEN) {
      if (!payload.token || payload.token !== SECRET_TOKEN) {
        return respond({ success: false, error: "Unauthorized Access" }, 401);
      }
    }

    const message = (payload.message || "").toString().trim();
    const source = payload.source || "VOLUN";
    const extra  = payload.extra  || "";

    if (!message) {
      return respond({ success: false, error: "No message provided" }, 400);
    }

    // ----- your existing logic stays the same -----
    const category = categorize(message);
    const suggestions = suggestProject(category.main, category.sub);

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ss.getSheetByName("RAW")
      .appendRow([ new Date(), message, category.main, category.sub, "new", source, extra ]);
    ss.getSheetByName("RECOMMENDED")
      .appendRow([ new Date(), message, category.main, category.sub, suggestions.join(" | "), "rule-based" ]);

    return respond({
      success: true,
      category,
      suggestions,
      reply: "Feedback received. Recommendations generated."
    }, 200);

  } catch (err) {
    return respond({ success: false, error: err.toString() }, 500);
  }
}

// Optional GET endpoint: return latest recommended items as JSON
function doGet(e) {
  try {
    if (SECRET_TOKEN) {
      const auth = e.parameter?.token;
      if (!auth || auth !== SECRET_TOKEN) {
        return respond({ success: false, error: "Unauthorized — invalid token" }, 401);
      }
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const rec = ss.getSheetByName("RECOMMENDED");

    let data = [];
    const last = rec.getLastRow();

    // Prevent the RANGE ERROR
    if (last > 1) {
      data = rec.getRange(2, 1, last - 1, rec.getLastColumn()).getValues();
    }

    const keys = rec.getRange(1,1,1,rec.getLastColumn()).getValues()[0];
    const results = data.map(row => {
      const obj = {};
      keys.forEach((k,i) => obj[k] = row[i]);
      return obj;
    }).reverse();

    return respond({ success: true, data: results }, 200);

  } catch (err) {
    return respond({ success: false, error: err.toString() }, 500);
  }
}

// ----------------- HELPERS -----------------
function respond(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  if (statusCode) {
    // Apps Script doesn't directly set HTTP status codes easily for web apps,
    // but returning JSON is usually enough. Advanced approach requires doGet/doPost deployment settings.
  }
  return output;
}

function categorize(text) {
  const t = text.toLowerCase();
  for (const group of SKILLSETS) {
    for (const sub of group.subs) {
      for (const k of sub.keywords) {
        if (!k) continue;
        if (t.includes(k)) {
          return { main: group.main, sub: sub.name };
        }
      }
    }
  }
  return { main: "Uncategorized", sub: "Unknown" };
}

function suggestProject(main, sub) {
  const key = `${(main||"").toLowerCase()}-${(sub||"").toLowerCase()}`;
  if (SUGGESTIONS[key]) return SUGGESTIONS[key];
  // fallback to main-level suggestions if available (e.g., "tmf-")
  const mainKey = `${(main||"").toLowerCase()}-`;
  for (const k in SUGGESTIONS) {
    if (k.startsWith(mainKey) && Array.isArray(SUGGESTIONS[k])) {
      return SUGGESTIONS[k].slice(0,3);
    }
  }
  return SUGGESTIONS["uncategorized-unknown"];
}