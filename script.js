/* ---------- BATCH ACTIONS LOGIC (FINALIZED) ---------- */

// --- Generic Helper for All Batch Actions ---
async function performModeratorBatchAction(action, timestamps, button) {
  if (!isModerator || !moderatorToken) {
    alert("Your session has expired. Please log in again.");
    openModeratorLoginModal();
    return;
  }
  if (!button) {
    console.error("Batch action called without a button element.");
    return;
  }

  const originalText = button.innerHTML;
  button.innerHTML = '<span class="spinner-tiny"></span>';
  button.disabled = true;
  button.classList.add("loading");

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          action: action,
          timestamps: timestamps.join(","), // Send as comma-separated string
          token: moderatorToken,
        }).toString(),
      }
    );

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (data.success !== true)
      throw new Error(data.error || `Batch ${action} failed.`);

    // SUCCESS: Remove/update cards from the UI
    console.log(`Batch action ${action} successful:`, data.message);
    timestamps.forEach((ts) => {
      const card = qs(
        `.card[data-timestamp="${ts}"], .dashboard-card[data-timestamp="${ts}"]`
      );
      if (card) {
        if (action.includes("Delete")) {
          // Animate and remove for delete actions
          card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          card.style.opacity = "0";
          card.style.transform = "scale(0.95)";
          setTimeout(() => card.remove(), 300);
        } else if (action.includes("Approve")) {
          // Update style for approve actions
          card.classList.add("approved");
          const approveBtn = card.querySelector(".mod-btn.approve");
          if (approveBtn) {
            approveBtn.innerHTML = "✓ Delivered";
            approveBtn.disabled = true;
          }
        }
      }
    });
  } catch (err) {
    console.error(`Batch action failed: ${action}`, err);
    alert(`Batch action failed: ${err.message}`);
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
    button.classList.remove("loading");
    // Uncheck all boxes after action
    qsa(".card-checkbox:checked").forEach((cb) => (cb.checked = false));
    updateIdeaBatchButtons();
    updateMessageBatchButtons();
  }
}

// --- Message Log Functions ---
function updateMessageBatchButtons() {
  const selected = qsa(".message-checkbox:checked");
  const deleteBtn = qs("#batch-delete-messages-btn");
  const selectAllCheckbox = qs("#message-select-all");

  if (deleteBtn) deleteBtn.disabled = selected.length === 0;

  const allVisibleCheckboxes = qsa(
    '.card:not([style*="display: none"]) .message-checkbox'
  );
  if (
    selected.length > 0 &&
    allVisibleCheckboxes.length > 0 &&
    selected.length === allVisibleCheckboxes.length
  ) {
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
  } else {
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  }
}

function toggleSelectAllMessages(isChecked) {
  qsa('.card:not([style*="display: none"]) .message-checkbox').forEach((cb) => {
    cb.checked = isChecked;
  });
  updateMessageBatchButtons();
}

function batchDeleteMessages(event) {
  const timestamps = qsa(".message-checkbox:checked").map((cb) => cb.value);
  if (timestamps.length === 0) return;

  openModeratorConfirmModal(
    `Delete ${timestamps.length} Messages?`,
    "Are you sure you want to permanently delete all selected messages?",
    () =>
      performModeratorBatchAction(
        "batchDeleteMessages",
        timestamps,
        event.target
      )
  );
}

// --- Community Ideas Functions ---
function updateIdeaBatchButtons() {
  const selected = qsa(".idea-checkbox:checked");
  const approveBtn = qs("#batch-approve-btn");
  const deleteBtn = qs("#batch-delete-btn");
  const selectAllCheckbox = qs("#idea-select-all");

  if (approveBtn) approveBtn.disabled = selected.length === 0;
  if (deleteBtn) deleteBtn.disabled = selected.length === 0;

  const allVisibleCheckboxes = qsa(
    '.dashboard-card:not([style*="display: none"]) .idea-checkbox'
  );
  if (
    allVisibleCheckboxes.length > 0 &&
    selected.length > 0 &&
    selected.length === allVisibleCheckboxes.length
  ) {
    if (selectAllCheckbox) selectAllCheckbox.checked = true;
  } else {
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  }
}

function toggleSelectAllIdeas(isChecked) {
  qsa('.dashboard-card:not([style*="display: none"]) .idea-checkbox').forEach(
    (cb) => {
      cb.checked = isChecked;
    }
  );
  updateIdeaBatchButtons();
}

function getSelectedIdeaTimestamps() {
  return qsa(".idea-checkbox:checked").map((cb) => cb.value);
}

function batchApproveIdeas(event) {
  const timestamps = getSelectedIdeaTimestamps();
  if (timestamps.length === 0) return;

  openModeratorConfirmModal(
    `Deliver ${timestamps.length} Ideas?`,
    "Are you sure you want to deliver all selected ideas?",
    () =>
      performModeratorBatchAction("batchApproveIdeas", timestamps, event.target)
  );
}

function batchDeleteIdeas(event) {
  const timestamps = getSelectedIdeaTimestamps();
  if (timestamps.length === 0) return;

  openModeratorConfirmModal(
    `Delete ${timestamps.length} Ideas?`,
    "Are you sure you want to permanently delete all selected ideas?",
    () =>
      performModeratorBatchAction("batchDeleteIdeas", timestamps, event.target)
  );
}

let ideasHaveBeenFetched = false;
let dashboardHasBeenFetched = false;

/* ---------- CONFIG ---------- */
const DEPLOYED_ID =
  "AKfycbxeq9Kkk7nC9z2M4B2FQcuPq6V84HfszLLuqdtL6CgaBOYhk-76QvWlDGnqVRmug5RQIQ";
// NOTE: SECRET TOKEN removed from client. Keep any verification or tokens server-side.

/*
  Replace the URLs below with your published Google Sheets pubchart URLs
  or with WRAPPER_URL + '?src=' + encodeURIComponent(pubchartURL) if you host the responsive wrapper.
*/

const CARD_CHARTS = {
  main: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzGMwUdbf0twIVwDY1iCqoN1_v1D4T9g6D3qmiRKoAo4W9PxY51vDMUyvI2yyzfFDeG3WrxXba5hV_/pubchart?oid=1006276544&format=interactive",
  exe: "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzGMwUdbf0twIVwDY1iCqoN1_v1D4T9g6D3qmiRKoAo4W9PxY51vDMUyvI2yyzfFDeG3WrxXba5hV_/pubchart?oid=1177720902&format=interactive",
  tmf: "https://docs.google.com/spreadsheets/d/e/YOUR_TMF_PUBURL/pubchart?oid=ZZZ&format=interactive",
  kaizenset:
    "https://docs.google.com/spreadsheets/d/e/YOUR_KAIZEN_PUBURL/pubchart?oid=AAA&format=interactive",
};
// questions function
function openQuestionModal(key) {
  const modal = qs("#questionModal");
  const title = qs("#questionModalTitle");
  const body = qs("#questionModalBody");
  let content = "";
  let heading = "";
  // infos
  switch (key) {
    case "made":
      heading = "Voluntarians Hub Origin";
      content =
        "An architected blueprint with a vision crafted by <strong>Kaiser</strong> combined by the determined spirit of <strong>Josh</strong> to bring this dream to life, makes the VOLUNTARIANS Hub turn into reality.";
      break;
    case "overview":
      heading = "Overview";
      content =
        "Voluntarians Hub connect people, those who see problems and those who solve them, forging an era of volunteers.";
      break;
    case "use":
      heading = "How to Use The Hub";
      content = `Welcome to the Voluntarians' Hub! Here’s how to get started:

<strong>1. SUBMIT A CONCERN</strong>
   - Go to the "Submit Concern" page.
   - Choose a category that best fits the issue (e.g., TMF, EXE).
   - Describe the problem or observation in the text area.
   - Click "Send Report" to log it for everyone to see.

<strong>2. BROWSE CONCERNS & IDEAS</strong>
   - Concern Logs: View all submitted concerns. You can search for keywords or sort by date.
   - Suggest Ideas: A place for inspiration! Select categories to see generated project ideas based on common needs.
   - Community Ideas: See detailed project proposals submitted by other users.

<strong>3. SUBMIT YOUR OWN IDEA</strong>
   - On the "Suggest Ideas" page, choose a main and sub-category.
   - This will open a form where you can write a detailed title and description for your own project idea.
   - Click "Send Suggestion" to add it to the "Community Ideas" page.

<strong>4. VISIT THE DASHBOARD</strong>
    - Here you can see the summarized data gathered throughout the application launch
    - compare similar concerns and find solution more easily`;
      break;
    default:
      heading = "Info";
      content = "No content available.";
  }

  title.textContent = heading;
  body.innerHTML = content; // Use innerHTML to render the styling
  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeQuestionModal() {
  const modal = qs("#questionModal");
  if (!modal) return;
  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeQuestionModal();
  });
}

// open per-card modal
function openCardModal(key) {
  const modal = document.getElementById("modal-" + key);
  const iframe = document.getElementById("iframe-" + key);
  if (!modal || !iframe) return;
  // load chart (swap for wrapper if necessary)
  iframe.src = CARD_CHARTS[key] || CARD_CHARTS.main;
  modal.setAttribute("aria-hidden", "false");
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  // focus close for accessibility
  setTimeout(() => {
    const btn = modal.querySelector('button[aria-label="Close chart"], button');
    if (btn) btn.focus();
  }, 50);
}

// close per-card modal
function closeCardModal(key) {
  const modal = document.getElementById("modal-" + key);
  const iframe = document.getElementById("iframe-" + key);

  // pick a sensible focus target; try dashboard view button or main nav
  const returnFocus =
    qs(`.dashboard-card[data-key="${key}"]`) ||
    qs('#primaryNav button[data-target="recommended"]') ||
    qs("#submitBtn");

  // animate close
  animateCloseModal(modal, returnFocus);

  // clear iframe after animation ends (safe guard: wait 380ms)
  setTimeout(() => {
    if (iframe) iframe.src = "about:blank";
  }, 380);
}

// backdrop click handler (only close when clicking backdrop)
function modalBackdropClick(e, key) {
  if (e.target && e.currentTarget && e.target === e.currentTarget)
    closeCardModal(key);
}

// wire click handlers: card body and view buttons
document.addEventListener("click", function (e) {
  const viewBtn = e.target.closest(".view-btn");
  if (viewBtn) {
    const key = viewBtn.getAttribute("data-key");
    if (key) openCardModal(key);
    e.stopPropagation();
    return;
  }

  const card = e.target.closest(".dashboard-card");
  if (card && !card.classList.contains("placeholder")) {
    const key = card.getAttribute("data-key");
    if (key) openCardModal(key);
  }
});

// Hotkey listener for moderator login
document.addEventListener("keydown", function (e) {
  // Moderator Hotkey: Ctrl+Alt+M
  if (e.ctrlKey && e.altKey && (e.key === "m" || e.key === "M")) {
    e.preventDefault();
    // If not already in moderator mode, open the login modal
    if (!isModerator) {
      openModeratorLoginModal();
    }
  }
});

// keyboard: allow Enter/Space to open focused card
document.addEventListener("keydown", function (e) {
  if (
    (e.key === "Enter" || e.key === " ") &&
    document.activeElement &&
    document.activeElement.classList.contains("dashboard-card")
  ) {
    e.preventDefault();
    const key = document.activeElement.getAttribute("data-key");
    if (key) openCardModal(key);
  }

  // ESC closes any open modal
  if (e.key === "Escape") {
    ["main", "exe", "tmf", "kaizenset"].forEach((k) => {
      const m = document.getElementById("modal-" + k);
      if (m && m.getAttribute("aria-hidden") === "false") closeCardModal(k);
    });
  }
});

// Keep your existing message modal close function if present
window.closeMessageModal =
  window.closeMessageModal ||
  function () {
    const b = document.getElementById("messageModalBackdrop");
    if (b) b.setAttribute("aria-hidden", "true");
  };

/* ---------- HELPERS ---------- */
function qs(s) {
  return document.querySelector(s);
}
function qsa(s) {
  return Array.from(document.querySelectorAll(s));
}
function fmtDate(src) {
  if (!src) return "";
  const d = new Date(src);
  return isNaN(d) ? src : d.toLocaleString();
}
function safeText(t) {
  return t === undefined || t === null ? "" : String(t);
}
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function escapeForInline(s) {
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, " ");
}

/* ---------- START SCREEN ---------- */
const homeScreen = qs("#homeScreen"),
  startBtn = qs("#startBtn");
startBtn.addEventListener("click", () => {
  homeScreen.style.transition = "opacity .8s ease, transform .6s ease";
  homeScreen.style.opacity = "0";
  homeScreen.style.transform = "scale(1.02)";
  setTimeout(() => (homeScreen.style.display = "none"), 550);
  setTimeout(() => showSection("submit"), 580);
});

/* ---------- NAV ---------- */
function handleNav(e) {
  const btn = e.currentTarget;
  qsa(".nav-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  const target = btn.getAttribute("data-target");
  showSection(target);

  // Fetch ideas only on the first visit to the tab
  if (target === "idea" && !ideasHaveBeenFetched) {
    fetchIdeas();
    ideasHaveBeenFetched = true;
  }

  // Fetch dashboard stats only on the first visit to the tab
  if (target === "dashboardPage" && !dashboardHasBeenFetched) {
    fetchDashboardStats();
    dashboardHasBeenFetched = true;
  }
}
function showSection(id) {
  qsa(".section").forEach((s) => s.classList.remove("active"));
  const el = qs("#" + id);
  if (el) el.classList.add("active");
  qs(".main").scrollTop = 0;
}
/* ---------- Modal close with pop-out animation helper ---------- */
/*
  Usage:
    // to close a modal element (backdrop or card-modal)
    animateCloseModal(modalElement);

  Behavior:
    - Adds a `.closing` class so CSS pop-out will play (you already have modalPopOut keyframe).
    - Waits for animationend (or 240ms fallback) then sets aria-hidden="true", removes .active/.closing and clears body modal-open.
    - Keeps focus management: moves focus back to a sensible element when possible.
*/
function animateCloseModal(modalEl, returnFocusEl) {
  if (!modalEl) {
    console.warn("animateCloseModal no modalEl");
    return;
  }
  if (modalEl.classList.contains("closing")) return;
  modalEl.classList.add("closing");
  // remove active to let CSS pick "closing" animation visually
  modalEl.classList.remove("active");
  const cleanup = () => {
    modalEl.classList.remove("closing");
    try {
      modalEl.setAttribute("aria-hidden", "true");
    } catch (e) {}
    // remove page modal flags if no other modal open
    const otherOpen = document.querySelector(
      '.modal-backdrop.active, .card-modal[aria-hidden="false"]'
    );
    if (!otherOpen) {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.body.style.overflow = "";
    }
    if (returnFocusEl && typeof returnFocusEl.focus === "function") {
      try {
        returnFocusEl.focus({ preventScroll: true });
      } catch (e) {}
    }
  };

  const onAnim = (ev) => {
    if (
      ev &&
      ev.animationName &&
      ev.animationName.toLowerCase().includes("modalpopout")
    ) {
      modalEl.removeEventListener("animationend", onAnim);
      cleanup();
    }
  };
  modalEl.addEventListener("animationend", onAnim);

  // fallback timeout
  setTimeout(() => {
    if (modalEl.classList.contains("closing")) cleanup();
  }, 420);
}

/* ---------- MODALS ---------- */
const modalBackdrop = qs("#modalBackdrop");
function openModal() {
  modalBackdrop.classList.add("active");
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const frame = qs("#dashboardFrame");
  if (frame && frame.src === "about:blank") {
    frame.src =
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzGMwUdbf0twIVwDY1iCqoN1_v1D4T9g6D3qmiRKoAo4W9PxY51vDMUyvI2yyzfFDeG3WrxXba5hV_/pubchart?oid=1006276544&format=interactive";
  }
}
function closeModal() {
  const modalEl = modalBackdrop;
  // optional: return focus to a primary control
  const returnFocus = qs("#startBtn") || qs("#submitBtn");
  animateCloseModal(modalEl, returnFocus);
}

function backdropClick(e) {
  if (e.target === modalBackdrop) closeModal();
}

// elements
const submitBtnEl = qs("#submitBtn");
const submitLoaderEl = qs("#submitLoader");
const responseBoxEl = qs("#response");
const textareaEl = qs("#concern-text");
const categoryEl = qs("#concern-category");
const charCountEl = qs("#charCount");

// character counter
if (textareaEl && charCountEl) {
  textareaEl.addEventListener("input", () => {
    const len = textareaEl.value.length;
    charCountEl.textContent = `${len} / ${
      textareaEl.getAttribute("maxlength") || 1000
    }`;
    // visual warning when nearing limit
    charCountEl.style.color = len > 900 ? "#ffcc66" : "";
    if (
      len >= (parseInt(textareaEl.getAttribute("maxlength") || 1000) || 1000)
    ) {
      charCountEl.style.color = "#ff6666";
    }
  });
}
// Submit confirmation wiring
const submitConfirmBackdrop = (() => qs("#submitConfirmBackdrop"))();
const confirmCategoryEl = () => qs("#confirmCategory");
const confirmMessageEl = () => qs("#confirmMessage");
const confirmSendBtn = () => qs("#confirmSendBtn");

function openSubmitConfirm() {
  const category =
    (qs("#concern-category") && qs("#concern-category").value) || "";
  const message = (qs("#concern-text") && qs("#concern-text").value) || "";

  const modCommandRegex = /^\/mod\s+([a-zA-Z0-9]+)$/;
  const match = message.match(modCommandRegex);
  if (match) {
    const modId = match[1];
    openModeratorLoginModal(modId);
    qs("#concern-text").value = ""; // Clear the command
    return; // Stop before showing the confirm modal
  }
  // Basic validation before showing modal
  if (!message.trim()) {
    showResponse("Please enter a concern before submitting.", "error");
    qs("#concern-text").focus();
    return;
  }
  if (!category) {
    showResponse("Please choose a category for this concern.", "error");
    qs("#concern-category").focus();
    return;
  }

  // populate modal preview (escapeHtml for safety)
  if (confirmCategoryEl())
    confirmCategoryEl().textContent = `Category: ${escapeHtml(category)}`;
  if (confirmMessageEl()) confirmMessageEl().textContent = message.trim();

  // show modal
  if (submitConfirmBackdrop) {
    submitConfirmBackdrop.classList.add("active");
    submitConfirmBackdrop.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      const cb = document.getElementById("confirmSendBtn");
      if (cb) cb.focus({ preventScroll: true });
    }, 60);
  }

  // ensure the Confirm button sends the current form (use a delegated handler)
  if (confirmSendBtn()) {
    // remove previous handler (if any) to avoid duplicates
    confirmSendBtn().onclick = async function () {
      // close the modal first
      closeSubmitConfirm();
      // call the existing submitConcern() — it will read the inputs itself
      await submitConcern();
    };
  }
}

function closeSubmitConfirm() {
  // if confirm button (or any element inside modal) has focus, move focus back to submit button first
  const active = document.activeElement;
  if (
    active &&
    submitConfirmBackdrop &&
    submitConfirmBackdrop.contains(active)
  ) {
    // move focus to submit button (or clear focus)
    const submitBtnEl = document.getElementById("submitBtn");
    if (submitBtnEl) {
      submitBtnEl.focus({ preventScroll: true });
    } else {
      try {
        active.blur();
      } catch (e) {}
    }
  }

  if (submitConfirmBackdrop) {
    // animate close instead of hiding immediately
    animateCloseModal(submitConfirmBackdrop, qs("#submitBtn"));
    submitConfirmBackdrop.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
}

// submit (updated): category required, remove token from client, optimistic UI
async function submitConcern() {
  const ta = qs("#concern-text");
  const submitBtnEl = qs("#submitBtn");
  const submitLoaderEl = qs("#submitLoader");
  const respEl = qs("#response");
  const categoryEl = qs("#concern-category");
  const message = ta ? String(ta.value || "").trim() : "";
  const category = categoryEl ? String(categoryEl.value || "").trim() : "";

  if (!message) {
    showResponse("Please enter a concern before submitting.", "error");
    if (ta) ta.focus();
    return;
  }
  if (categoryEl && !category) {
    showResponse("Please choose a category for this concern.", "error");
    categoryEl.focus();
    return;
  }

  if (submitBtnEl) submitBtnEl.disabled = true;
  if (submitLoaderEl) submitLoaderEl.style.display = "inline-block";
  if (respEl) respEl.style.display = "none";

  try {
    // This payload is sent as JSON
    const payload = {
      action: "submitConcern",
      message: message,
      source: "VOLUN_WEB",
      category: category, // Include the user-selected category
      extra: "",
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8", // Send as plain text to be parsed by Apps Script
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        redirect: "follow",
        mode: "cors", // Necessary for cross-origin POST requests to Google Apps Script
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server responded with status ${res.status}`);
    }

    const data = await res.json().catch(() => {
      throw new Error("Invalid server response (not JSON).");
    });

    if (!data || data.success !== true) {
      throw new Error(data?.error || "Server returned an unspecified error.");
    }

    const catMain = data.category?.main || "Uncategorized";
    const catSub = data.category?.sub || "Unknown";

    let html = `<div style="margin-bottom:10px"><strong style="color:#00ff88">✓ Concern Submitted Successfully!</strong></div>`;
    html += `<div class="muted" style="margin-bottom:10px">Category: <strong>${escapeHtml(
      catMain
    )}</strong> › <strong>${escapeHtml(catSub)}</strong></div>`;

    showResponse(html, "success");

    if (ta) ta.value = "";
    if (categoryEl) categoryEl.value = "";
    const charCountEl = qs("#charCount");
    if (charCountEl) charCountEl.textContent = "0 / 1000";

    // Refresh the message log
    fetchRecommendations().catch((err) =>
      console.error("Failed to refresh recommendations:", err)
    );
  } catch (err) {
    console.error("Submission error:", err);
    const isAbort = err.name === "AbortError";
    const friendly = isAbort
      ? "Request timed out. Please check your connection and try again."
      : err.message || "An unexpected error occurred.";
    const errorMsg = `<strong style="color:#ff4444">✗ Submission Failed</strong><div style="margin-top:8px">${escapeHtml(
      friendly
    )}</div>`;
    showResponse(errorMsg, "error");
  } finally {
    if (submitBtnEl) submitBtnEl.disabled = false;
    if (submitLoaderEl) submitLoaderEl.style.display = "none";
  }
}

/* ---------- COPY ---------- */
function copyText(text) {
  const decoded = text
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\");
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(decoded)
      .catch(() => prompt("Copy this text manually:", decoded));
  } else prompt("Copy this text:", decoded);
}

/* ---------- RECOMMENDATIONS ---------- */
const cardsContainer = qs("#cards-container"),
  recLoader = qs("#recLoader");
let lastFetched = [];

// 1) Patch fetchRecommendations to avoid sending client token (edit your existing function)
async function fetchRecommendations() {
  cardsContainer.innerHTML = "";
  recLoader.style.display = "inline-block";
  try {
    // Note: this GET must match your Apps Script permissions.
    // If Apps Script requires a token, use a server-side check or POST; avoid embedding secrets in client URLs.
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error(
          "Unauthorized. The server rejected the request (401/403). Check Apps Script access / token policy."
        );
      }
      throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
    }
    // show skeletons while loading
    cardsContainer.innerHTML = "";
    const skeletonCount = 6;
    for (let i = 0; i < skeletonCount; i++) {
      const s = document.createElement("div");
      s.className = "card skeleton";
      s.style.minHeight = "84px";
      s.innerHTML = `<div style="height:14px;width:36%;margin-bottom:8px;background:rgba(255,255,255,0.02);border-radius:6px"></div>
                   <div style="height:10px;width:88%;margin-bottom:6px;background:rgba(255,255,255,0.01);border-radius:6px"></div>
                   <div style="height:10px;width:72%;background:rgba(255,255,255,0.01);border-radius:6px"></div>`;
      cardsContainer.appendChild(s);
    }
    const data = await res.json();
    if (!data || data.success !== true)
      throw new Error(data?.error || "Failed to fetch recommendations");
    const arr = Array.isArray(data.data) ? data.data : [];
    lastFetched = arr;
    renderCardsFromSheetArray(arr);
  } catch (err) {
    console.error("Error fetching recommendations:", err);
    // Show a helpful UI message and keep the loader hidden to avoid hanging state
    cardsContainer.innerHTML = `<div class="muted" style="color:#ff4444">Error loading messages: ${escapeHtml(
      err.message || String(err)
    )}</div>`;
  } finally {
    recLoader.style.display = "none";
    // ensure any skeleton state removed when data loaded or error shown
    // (renderCardsFromSheetArray will replace container contents)
  }
}

function mapRowToItem(rowObj) {
  const keys = Object.keys(rowObj || {});
  const lower = (k) => k.toLowerCase();
  const find = (parts) =>
    keys.find((k) => parts.some((p) => lower(k).includes(p)));
  const timestampKey = find(["timestamp", "date", "time"]);
  const messageKey = find(["message", "msg", "concern"]);
  const mainKey = find(["main", "category"]);
  const subKey = find(["sub", "subcategory"]);
  const suggestionsKey = find(["suggest", "project", "suggested", "projects"]);
  return {
    timestamp: rowObj[timestampKey] || rowObj["Timestamp"] || "",
    message: rowObj[messageKey] || rowObj["Message"] || "",
    main: rowObj[mainKey] || rowObj["Main"] || "",
    sub: rowObj[subKey] || rowObj["Sub"] || "",
    suggestionsRaw: rowObj[suggestionsKey] || rowObj["SuggestedProjects"] || "",
  };
}

/* ---------- RENDERER ---------- */
function renderCardsFromSheetArray(arr) {
  const pageSize = 12;
  const items = arr
    .map(mapRowToItem)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (!items || items.length === 0) {
    cardsContainer.innerHTML =
      '<div class="muted" style="text-align:center; margin-top:20px;"><div style="font-size:24px;">📭</div>No messages yet. Try refreshing or submitting a new concern.</div>';
    return;
  }

  // persist state
  cardsContainer._items = items;
  cardsContainer._page = 0;

  function renderPage(page) {
    const start = page * pageSize;
    const pageItems = items.slice(start, start + pageSize);
    if (page === 0) cardsContainer.innerHTML = "";

    pageItems.forEach((item) => {
      const isLong = item.message && item.message.length > 240;
      const card = document.createElement("div");
      card.className = "card";
      card.dataset.timestamp = item.timestamp; // Add timestamp to card dataset

      // -- CORRECTED HTML STRUCTURE AND CHECKBOX PLACEMENT --
      card.innerHTML = `
        <div class="card-header"">
            <div class="meta" style="margin-bottom: 0px">
                <strong data-timestamp="${item.timestamp}">${fmtDate(
        item.timestamp
      )}</strong> · <span class="muted">${escapeHtml(item.main)} › ${escapeHtml(
        item.sub
      )}</span>
            </div>
        </div>
        <div class="message-preview" style="margin-top: 0px">
          <strong>Message:</strong>
          <div class="msg-preview" aria-label="message preview">${escapeHtml(
            item.message || ""
          )}</div>
          <div class="mod-actions">
                <input type="checkbox" class="card-checkbox message-checkbox" value="${
                  item.timestamp
                }" onchange="updateMessageBatchButtons()">
                <button class="mod-btn delete" onclick="deleteMessage(event, '${
                  item.timestamp
                }')">Delete</button>
            </div>
          ${
            isLong
              ? `<div style="margin-top:8px"><button class="btn ghost see-more-btn">See more…</button></div>`
              : ""
          }
        </div>
      `;
      // -- END OF CORRECTION --

      cardsContainer.appendChild(card);

      const seeMoreBtn = card.querySelector(".see-more-btn");
      if (seeMoreBtn) {
        seeMoreBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          openMessageModal(item, []);
        });
      }

      (function fitPreview() {
        const previewEl = card.querySelector(".msg-preview");
        if (!previewEl) return;
        const fullText = String(item.message || "");
        previewEl.setAttribute("title", fullText);
        previewEl.textContent = fullText;
        if (previewEl.scrollHeight <= previewEl.clientHeight) return;
        let lo = 0,
          hi = fullText.length,
          best = 0;
        while (lo <= hi) {
          const mid = Math.floor((lo + hi) / 2);
          previewEl.textContent = fullText.slice(0, mid) + "...";
          if (previewEl.scrollHeight <= previewEl.clientHeight) {
            best = mid;
            lo = mid + 1;
          } else hi = mid - 1;
        }
        previewEl.textContent = fullText.slice(0, best) + "...";
      })();
    });

    const existingLoad = qs("#loadMoreBtnWrap");
    if (existingLoad) existingLoad.remove();
    const moreWrap = document.createElement("div");
    moreWrap.id = "loadMoreBtnWrap";
    moreWrap.style.textAlign = "center";
    moreWrap.style.margin = "14px 0";
    if (start + pageSize < items.length) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn ghost";
      moreBtn.textContent = "Load more";
      moreBtn.addEventListener("click", () => {
        cardsContainer._page = (cardsContainer._page || 0) + 1;
        renderPage(cardsContainer._page);
        applyFilterAndHighlight();
      });
      moreWrap.appendChild(moreBtn);
    }
    cardsContainer.appendChild(moreWrap);
    applyFilterAndHighlight();
  }

  renderPage(0);
}

// 2) Provide safe stubs if showResponse or clearInput are not yet defined
window.showResponse =
  window.showResponse ||
  function (html, type) {
    const rb = document.getElementById("response");
    if (!rb) return;
    rb.innerHTML = html;
    rb.className = "response";
    if (type === "success") rb.classList.add("success");
    else if (type === "error") rb.classList.add("error");
    rb.style.display = "block";
    try {
      rb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {}
  };
window.clearInput =
  window.clearInput ||
  function () {
    const ta = document.getElementById("concern-text");
    if (ta) ta.value = "";
    const rb = document.getElementById("response");
    if (rb) {
      rb.style.display = "none";
      rb.className = "response";
    }
  };

// 3) Attach event listeners after DOM is ready (prevents inline onclick ReferenceError)
document.addEventListener("DOMContentLoaded", function () {
  // Remove inline onclicks if present and attach robust handlers
  const submitBtn = document.getElementById("submitBtn");
  const clearBtn = document.getElementById("clearBtn");

  if (submitBtn) {
    // remove inline onclick to avoid duplicate handlers
    submitBtn.removeAttribute("onclick");
    submitBtn.addEventListener("click", function (e) {
      // prefer confirmation modal if available
      if (typeof openSubmitConfirm === "function") return openSubmitConfirm();
      if (typeof submitConcern === "function") return submitConcern();
    });
  }

  if (clearBtn) {
    clearBtn.removeAttribute("onclick");
    clearBtn.addEventListener("click", function (e) {
      if (typeof clearInput === "function") clearInput();
    });
  }

  // wire search clear if present
  const searchClear = document.querySelector(".search-clear");
  if (searchClear) {
    searchClear.removeAttribute("onclick");
    searchClear.addEventListener("click", function () {
      const s = document.getElementById("search");
      if (s) s.value = "";
      if (typeof filterCards === "function") filterCards();
    });
  }

  // Finally, perform the initial fetch safely (so it doesn't run before handlers/helpers exist)
  if (typeof fetchRecommendations === "function") {
    fetchRecommendations().catch((err) => {
      console.error("Initial fetch failed:", err);
      const cards = document.getElementById("cards-container");
      if (cards)
        cards.innerHTML = `<div class="muted" style="color:#ff4444">Error loading messages: ${escapeHtml(
          err.message || String(err)
        )}</div>`;
    });
  }
});

/* ---------- MESSAGE MODAL ---------- */
function openMessageModal(item, projects) {
  const modalBackdrop = document.getElementById("messageModalBackdrop");
  const modalBody = document.getElementById("messageModalBody");
  modalBody.innerHTML = `
    <div style="margin-bottom:10px"><strong>${fmtDate(
      item.timestamp
    )}</strong></div>
    <div class="muted" style="margin-bottom:10px">Category: <strong>${escapeHtml(
      item.main
    )}</strong> › <strong>${escapeHtml(item.sub)}</strong></div>
    <div style="margin-bottom:12px"><strong>Message:</strong><pre style="white-space:pre-wrap;margin:6px 0;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.02);">${escapeHtml(
      item.message
    )}</pre></div>
  `;
  modalBackdrop.classList.add("active");
  modalBackdrop.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeMessageModal() {
  const modalEl = document.getElementById("messageModalBackdrop");
  const returnFocus =
    qs("#cards-container") || qs("#search") || qs("#submitBtn");
  animateCloseModal(modalEl, returnFocus);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMessageModal();
});

/* ---------- SORT / FILTER ---------- */
function sortCards() {
  const order = qs("#sortOrder") ? qs("#sortOrder").value : "newest";
  const cards = Array.from(cardsContainer.querySelectorAll(".card"));
  cards.sort((a, b) => {
    const da = new Date(a.querySelector(".meta strong").textContent);
    const db = new Date(b.querySelector(".meta strong").textContent);
    return order === "newest" ? db - da : da - db;
  });
  cards.forEach((c) => cardsContainer.appendChild(c));
}
function applyFilterAndHighlight() {
  const searchEl = qs("#search");
  if (!searchEl) return;
  const q = searchEl.value.trim();
  const qLower = q.toLowerCase();

  // For each card, show/hide and highlight
  Array.from(cardsContainer.querySelectorAll(".card")).forEach((c) => {
    // locate the message preview element
    const previewEl = c.querySelector(".msg-preview");
    const text = previewEl
      ? previewEl.getAttribute("title") || previewEl.textContent
      : c.textContent;
    if (!q) {
      // clear highlights: set the textContent back to original title (we stored it)
      if (previewEl && previewEl.getAttribute("title"))
        previewEl.innerHTML = escapeHtml(previewEl.getAttribute("title"));
      c.style.display = "block";
      return;
    }

    const textLower = (text || "").toLowerCase();
    const matchIndex = textLower.indexOf(qLower);
    if (matchIndex === -1) {
      c.style.display = "none";
      // remove any leftover highlights if previously highlighted
      if (previewEl && previewEl.getAttribute("title"))
        previewEl.innerHTML = escapeHtml(previewEl.getAttribute("title"));
    } else {
      c.style.display = "block";
      // build highlighted HTML: escape parts then wrap matched substring
      const original = previewEl.getAttribute("title") || text;
      const start = original.toLowerCase().indexOf(qLower);
      if (start === -1) {
        previewEl.innerHTML = escapeHtml(original);
      } else {
        const before = escapeHtml(original.slice(0, start));
        const match = escapeHtml(original.slice(start, start + q.length));
        const after = escapeHtml(original.slice(start + q.length));
        previewEl.innerHTML = `${before}<span class="match">${match}</span>${after}`;
      }
    }
  });
}

// keep old name for event wiring compatibility
function filterCards() {
  applyFilterAndHighlight();
}

/* ---------- MOBILE NAV ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const nav = document.querySelector(".nav-buttons");
  if (!hamburger || !nav) return;
  hamburger.setAttribute("aria-expanded", "false");
  hamburger.addEventListener("click", (e) => {
    const expanded = nav.classList.toggle("active");
    hamburger.setAttribute("aria-expanded", String(expanded));
  });
  nav.querySelectorAll(".nav-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      nav.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    })
  );
  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
      nav.classList.remove("active");
      hamburger.setAttribute("aria-expanded", "false");
    }
  });
});

function updateSubcategories() {
  const main = qs("#main-category").value;
  const sub = qs("#sub-category");
  sub.innerHTML = '<option value="">Choose Subcategory</option>';
  if (main === "TMF")
    ["MF1", "MF2", "TF", "Welding"].forEach((s) =>
      sub.append(new Option(s, s))
    );
  else if (main === "EXE")
    ["XF", "EF1", "EF2"].forEach((s) => sub.append(new Option(s, s)));
  else if (main === "Kaizenset")
    ["Welding", "ICT", "Mechatronics"].forEach((s) =>
      sub.append(new Option(s, s))
    );
  else if (main === "Other")
    [
      "Cafeteria",
      "Mass",
      "General",
      "Facilitation",
      "Offsite",
      "Anvil",
    ].forEach((s) => sub.append(new Option(s, s)));
  qs("#suggestion-container").innerHTML = "";
}

/* ---------- IDEAS SECTION ---------- */
let lastFetchedIdeas = [];

async function fetchIdeas() {
  const container = qs("#ideas-container");
  const loader = qs("#ideasLoader");
  if (!container || !loader) return;

  loader.style.display = "block";
  container.innerHTML = ""; // Clear previous cards

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec?action=getIdeas`
    );
    if (!res.ok) throw new Error(`Failed to fetch ideas: ${res.status}`);

    const data = await res.json();
    if (data.success !== true)
      throw new Error(data.error || "Server returned an error.");

    lastFetchedIdeas = Array.isArray(data.data) ? data.data : [];
    renderIdeaCards(lastFetchedIdeas);
  } catch (err) {
    console.error("Error fetching ideas:", err);
    container.innerHTML = `<div class="muted" style="color:#ff4444">Error loading ideas: ${escapeHtml(
      err.message
    )}</div>`;
  } finally {
    loader.style.display = "none";
  }
}
function renderIdeaCards(ideas) {
  const container = qs("#ideas-container");
  const pageSize = 10;
  if (!container) return;

  if (!ideas || ideas.length === 0) {
    container.innerHTML =
      '<div class="muted" style="text-align:center; margin-top:20px; width:100%;"><div style="font-size:24px;">🤔</div>No ideas have been submitted yet.</div>';
    return;
  }

  container._items = ideas;
  container._page = 0;

  function renderPage(page) {
    const start = page * pageSize;
    const pageItems = ideas.slice(start, start + pageSize);
    if (page === 0) container.innerHTML = "";

    pageItems.forEach((idea) => {
      const card = document.createElement("div");
      card.className = "dashboard-card";

      // --- FIX ---
      // Check for "Delivered" to match the backend status.
      if (idea.STATUS === "Delivered") {
        card.classList.add("approved");
      }

      card.dataset.timestamp = idea.TIMESTAMP;
      const searchableText = `${idea.TITLE || ""} ${
        idea.AUTHOR || ""
      }`.toLowerCase();
      card.dataset.searchable = searchableText;

      const title = escapeHtml(idea.TITLE || "No Title");
      const author = escapeHtml(idea.AUTHOR || "Anonymous");

      // --- FIX ---
      // Check for "Delivered" here as well to set the button state correctly.
      const isApproved = idea.STATUS === "Delivered";
      const approveButtonText = isApproved ? "✓ Delivered" : "Deliver";
      const approveButtonDisabled = isApproved ? "disabled" : "";

      // The HTML structure remains correct.
      card.innerHTML = `
                <div class="card-body">
                  <div>
                    <div class="card-heading" data-original-text="${title}">${title}</div>
                    <div class="card-sub muted" data-original-text="${author}">by ${author}</div>
                  </div>
                  <div class="card-actions">
                    <button class="btn" onclick="openIdeaDetailsModal('${idea.TIMESTAMP}')">View</button>
                    <div class="mod-actions">
                        <input type="checkbox" class="card-checkbox idea-checkbox" value="${idea.TIMESTAMP}" onchange="updateIdeaBatchButtons()">
                        <button class="mod-btn approve" onclick="approveIdea(event, '${idea.TIMESTAMP}')" ${approveButtonDisabled}>${approveButtonText}</button>
                        <button class="mod-btn delete" onclick="deleteIdea(event, '${idea.TIMESTAMP}')">Delete</button>
                    </div>
                  </div>
                </div>
            `;

      container.appendChild(card);
    });

    const existingLoad = qs("#ideaLoadMoreBtnWrap");
    if (existingLoad) existingLoad.remove();

    const moreWrap = document.createElement("div");
    moreWrap.id = "ideaLoadMoreBtnWrap";
    moreWrap.style.cssText = "text-align:center; margin:14px 0; width:100%;";

    if (start + pageSize < ideas.length) {
      const moreBtn = document.createElement("button");
      moreBtn.className = "btn ghost";
      moreBtn.textContent = "Load more";
      moreBtn.addEventListener("click", () => {
        container._page++;
        renderPage(container._page);
      });
      moreWrap.appendChild(moreBtn);
    }
    container.appendChild(moreWrap);
    filterIdeaCards();
  }

  renderPage(0);
}

function sortIdeaCards() {
  const order = qs("#ideaSortOrder") ? qs("#ideaSortOrder").value : "newest";
  const container = qs("#ideas-container");
  if (!container) return;
  const cards = Array.from(container.querySelectorAll(".dashboard-card"));

  cards.sort((a, b) => {
    const da = new Date(a.dataset.timestamp);
    const db = new Date(b.dataset.timestamp);
    return order === "newest" ? db - da : da - db;
  });
  cards.forEach((c) => container.appendChild(c));
  // Re-append the 'load more' button at the end
  const loadMore = qs("#ideaLoadMoreBtnWrap");
  if (loadMore) container.appendChild(loadMore);
}

function highlight(text, query) {
  if (!query) return text;
  const escapedQuery = escapeHtml(query.trim());
  if (!escapedQuery) return text;
  const regex = new RegExp(`(${escapedQuery})`, "gi");
  return text.replace(regex, '<span class="match">$1</span>');
}

function filterIdeaCards() {
  const searchEl = qs("#ideaSearch");
  const container = qs("#ideas-container");
  if (!searchEl || !container) return;
  const q = searchEl.value.trim();

  Array.from(container.querySelectorAll(".dashboard-card")).forEach((card) => {
    const searchableText = card.dataset.searchable || "";
    const isMatch =
      q === "" || searchableText.toLowerCase().includes(q.toLowerCase());
    card.style.display = isMatch ? "block" : "none";

    const titleEl = card.querySelector(".card-heading");
    const authorEl = card.querySelector(".card-sub");

    if (titleEl && titleEl.dataset.originalText) {
      titleEl.innerHTML = highlight(titleEl.dataset.originalText, q);
    }
    if (authorEl && authorEl.dataset.originalText) {
      const authorName = authorEl.dataset.originalText;
      authorEl.innerHTML = "by " + highlight(authorName, q);
    }
  });
}

function openIdeaDetailsModal(timestamp) {
  const idea = lastFetchedIdeas.find((i) => i.TIMESTAMP === timestamp);
  if (!idea) {
    alert("Could not find idea details.");
    return;
  }
  const modal = qs("#ideaDetailsModal");
  const body = qs("#ideaDetailsModalBody");
  if (!modal || !body) return;

  body.innerHTML = `
        <div style="margin-bottom:10px"><strong>Submitted:</strong> ${fmtDate(
          idea.TIMESTAMP
        )}</div>
        <div class="muted" style="margin-bottom:10px"><strong>Category:</strong> ${escapeHtml(
          idea["MAIN-CATEGORY"]
        )} › ${escapeHtml(idea["SUB-CATEGORY"])}</div>
        <div class="muted" style="margin-bottom:12px"><strong>Author:</strong> ${escapeHtml(
          idea.AUTHOR
        )}</div>
        <div style="margin-bottom:12px"><strong>Title:</strong><div style="padding:6px 0; font-size: 1.1em; font-weight: 500;">${escapeHtml(
          idea.TITLE
        )}</div></div>
        <div style="margin-bottom:12px"><strong>Details:</strong><pre style="white-space:pre-wrap;margin:6px 0;padding:10px;background:rgba(255,255,255,0.02);border-radius:8px;border:1px solid rgba(255,255,255,0.02);">${escapeHtml(
          idea.DETAILS
        )}</pre></div>
    `;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeIdeaDetailsModal() {
  animateCloseModal(qs("#ideaDetailsModal"));
}

/* ---------- SUGGESTION MODAL ---------- */
function handleSubcategoryChange(event) {
  const mainCategory = qs("#main-category").value;
  const subCategory = event.target.value;
  if (mainCategory && subCategory) {
    openSuggestionModal(mainCategory, subCategory);
  }
}

function openSuggestionModal(mainCategory, subCategory) {
  const modal = qs("#suggestionModal");
  if (!modal) return;

  // Reset form
  qs("#suggestionForm").reset();
  qs("#suggestionResponse").style.display = "none";

  // Populate categories
  const mainSelect = qs("#suggestion-main-category");
  const subSelect = qs("#suggestion-sub-category");

  // Populate and set main category
  mainSelect.innerHTML = qs("#main-category").innerHTML;
  mainSelect.value = mainCategory;

  // Logic to populate sub-categories based on main
  const populateSubs = (mainCatValue) => {
    subSelect.innerHTML = '<option value="">Choose Subcategory</option>';
    const tempSubOptions = {
      TMF: ["MF1", "MF2", "TF", "Welding"],
      EXE: ["XF", "EF1", "EF2"],
      Kaizenset: ["Welding", "ICT", "Mechatronics"],
      Other: [
        "Cafeteria",
        "Mass",
        "General",
        "Facilitation",
        "Offsite",
        "Anvil",
      ],
    };
    if (tempSubOptions[mainCatValue]) {
      tempSubOptions[mainCatValue].forEach((s) =>
        subSelect.append(new Option(s, s))
      );
    }
  };

  populateSubs(mainCategory);
  subSelect.value = subCategory;

  // Update subcategories if main is changed inside the modal
  mainSelect.onchange = () => populateSubs(mainSelect.value);

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  // Wire up the send button to prevent multiple submissions
  qs("#suggestionSendBtn").onclick = () => {
    qs("#suggestionSendBtn").disabled = true;
    submitSuggestion();
  };
}

function closeSuggestionModal() {
  const modal = qs("#suggestionModal");
  if (modal) {
    animateCloseModal(modal, qs("#sub-category"));
    // Reset the main page dropdowns so user can re-select
    qs("#main-category").value = "";
    qs("#sub-category").innerHTML =
      '<option value="">Choose Subcategory</option>';
  }
}

async function submitSuggestion() {
  const loader = qs("#suggestionLoader");
  const responseEl = qs("#suggestionResponse");
  const sendBtn = qs("#suggestionSendBtn");

  const payload = {
    action: "submitSuggestion",
    title: qs("#suggestion-title").value.trim(),
    details: qs("#suggestion-details").value.trim(),
    mainCategory: qs("#suggestion-main-category").value,
    subCategory: qs("#suggestion-sub-category").value,
    author: qs("#suggestion-author").value.trim() || "Anonymous",
  };

  // Validation
  if (
    !payload.title ||
    !payload.details ||
    !payload.mainCategory ||
    !payload.subCategory
  ) {
    showSuggestionResponse(
      "Title, Details, and Categories are required.",
      "error"
    );
    sendBtn.disabled = false; // re-enable button
    return;
  }

  loader.style.display = "block";
  responseEl.style.display = "none";

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams(payload).toString(),
        redirect: "follow",
      }
    );

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (data.success !== true)
      throw new Error(data.error || "Submission failed.");

    showSuggestionResponse("✓ Suggestion submitted successfully!", "success");
    qs("#suggestionForm").reset(); // Clear the form for the next entry
    // setTimeout(closeSuggestionModal, 1500); // This line is now removed.
  } catch (err) {
    console.error("Suggestion submission error:", err);
    showSuggestionResponse(`✗ Error: ${err.message}`, "error");
  } finally {
    loader.style.display = "none";
    sendBtn.disabled = false;
  }
}

function showSuggestionResponse(html, type) {
  const responseEl = qs("#suggestionResponse");
  if (!responseEl) return;
  responseEl.innerHTML = html;
  responseEl.className = "response"; // reset classes
  if (type === "success") responseEl.classList.add("success");
  if (type === "error") responseEl.classList.add("error");
  responseEl.style.display = "block";
}

/* ---------- INITIAL ---------- */
(async function init() {
  showSection("submit");
  fetchRecommendations().catch((err) =>
    console.error("Initial fetch failed:", err)
  );
})();

/* ---------- MODERATOR MODE ---------- */
let isModerator = false;
let moderatorToken = null; // Added to store the session token
let onConfirmCallback = null;

// Opens the custom confirmation modal
function openModeratorConfirmModal(title, message, onConfirm) {
  const modal = qs("#moderatorActionConfirmModal");
  if (!modal) return;

  qs("#moderatorActionConfirmTitle").textContent = title;
  qs("#moderatorActionConfirmMessage").textContent = message;

  onConfirmCallback = onConfirm;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

// Closes the custom confirmation modal
function closeModeratorConfirmModal() {
  animateCloseModal(qs("#moderatorActionConfirmModal"));
  onConfirmCallback = null; // Clear the callback
}

// This should be added to ensure the confirm button is wired up correctly
document.addEventListener("DOMContentLoaded", () => {
  const confirmBtn = qs("#moderatorActionConfirmBtn");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      if (typeof onConfirmCallback === "function") {
        onConfirmCallback();
      }
      closeModeratorConfirmModal();
    };
  }
});

function openModeratorLoginModal(modId = "") {
  const modal = qs("#moderatorLoginModal");
  if (!modal) return;

  qs("#moderatorLoginForm").reset();
  qs("#moderatorLoginResponse").style.display = "none";

  const idInput = qs("#moderator-id");
  const passwordInput = qs("#moderator-password");

  idInput.value = modId;

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (modId) {
    setTimeout(() => passwordInput.focus(), 100);
  } else {
    setTimeout(() => idInput.focus(), 100);
  }

  qs("#moderatorLoginBtn").onclick = () => {
    const id = idInput.value;
    const password = passwordInput.value;
    if (id && password) {
      verifyModeratorLogin(id, password);
    } else {
      showModeratorLoginResponse("Both ID and Password are required.", "error");
    }
  };
}

function closeModeratorLoginModal() {
  animateCloseModal(qs("#moderatorLoginModal"));
}

function showModeratorLoginResponse(html, type) {
  const responseEl = qs("#moderatorLoginResponse");
  if (!responseEl) return;
  responseEl.innerHTML = html;
  responseEl.className = "response";
  if (type === "success") responseEl.classList.add("success");
  if (type === "error") responseEl.classList.add("error");
  responseEl.style.display = "block";
}

async function verifyModeratorLogin(id, password) {
  const loader = qs("#moderatorLoginLoader");
  const loginBtn = qs("#moderatorLoginBtn");
  const responseEl = qs("#moderatorLoginResponse");

  loader.style.display = "block";
  loginBtn.disabled = true;
  responseEl.style.display = "none";

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          action: "moderatorLogin",
          id,
          password,
        }).toString(),
      }
    );
    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();
    if (data.success !== true) throw new Error(data.error || "Login failed.");

    // SUCCESS!
    isModerator = true;
    moderatorToken = data.token; // Store the session token
    showModeratorLoginResponse(
      "✓ Access Granted. Welcome, moderator.",
      "success"
    );
    document.body.classList.add("moderator-mode");
    setTimeout(closeModeratorLoginModal, 1000);
  } catch (err) {
    showModeratorLoginResponse(`✗ Error: ${err.message}`, "error");
    isModerator = false;
    moderatorToken = null;
  } finally {
    loader.style.display = "none";
    loginBtn.disabled = false;
  }
}

// Generic helper to perform a moderator action
async function performModeratorAction(action, timestamp) {
  if (!isModerator || !moderatorToken) {
    console.error("Error: Moderator access required. Please log in again.");
    openModeratorLoginModal();
    showModeratorLoginResponse(
      "Your session has expired. Please log in again.",
      "error"
    );
    return null;
  }

  try {
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: new URLSearchParams({
          action: action,
          timestamp: timestamp,
          token: moderatorToken,
        }).toString(),
      }
    );

    if (!res.ok) throw new Error(`Server error: ${res.status}`);
    const data = await res.json();

    if (data.success !== true) {
      if (data.error && data.error.toLowerCase().includes("session")) {
        isModerator = false;
        moderatorToken = null;
        document.body.classList.remove("moderator-mode");
        openModeratorLoginModal();
        showModeratorLoginResponse(
          "Your session has expired. Please log in again.",
          "error"
        );
      }
      throw new Error(data.error || `Action '${action}' failed.`);
    }

    console.log(`Action ${action} successful:`, data.message);
    return data; // Return successful response
  } catch (err) {
    console.error(`Moderator action failed: ${action}`, err);
    alert(`Action failed: ${err.message}`);
    return null;
  }
}

function deleteMessage(event, timestamp) {
  const button = event.target;
  openModeratorConfirmModal(
    "Delete Message",
    "Are you sure you want to permanently delete this message?",
    async () => {
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner-tiny"></span>';
      button.disabled = true;
      button.classList.add("loading");

      try {
        const result = await performModeratorAction("deleteMessage", timestamp);
        if (result && result.success) {
          console.log("Message deleted successfully.");
          const card = button.closest(".card");
          if (card) {
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(() => card.remove(), 300);
          }
        } else {
          // Re-enable button on failure
          button.innerHTML = originalText;
          button.disabled = false;
          button.classList.remove("loading");
        }
      } catch (e) {
        button.innerHTML = originalText;
        button.disabled = false;
        button.classList.remove("loading");
      }
    }
  );
}

function approveIdea(event, timestamp) {
  const button = event.target;
  openModeratorConfirmModal(
    "Deliver Idea",
    'Are you sure you want to deliver this idea? This will mark it as "Delivered" in the sheet.',
    async () => {
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner-tiny"></span>';
      button.disabled = true;
      button.classList.add("loading");

      try {
        const result = await performModeratorAction("approveIdea", timestamp);
        if (result && result.success) {
          console.log("Idea delivered successfully.");
          const card = button.closest(".dashboard-card");
          if (card) card.classList.add("approved");
          button.innerHTML = "✓ Delivered";
          // Button remains disabled, no need to remove 'loading' or re-enable
        } else {
          button.innerHTML = originalText;
          button.disabled = false;
          button.classList.remove("loading");
        }
      } catch (e) {
        button.innerHTML = originalText;
        button.disabled = false;
        button.classList.remove("loading");
      }
    }
  );
}

function deleteIdea(event, timestamp) {
  const button = event.target;
  openModeratorConfirmModal(
    "Delete Idea",
    "Are you sure you want to permanently delete this idea?",
    async () => {
      const originalText = button.innerHTML;
      button.innerHTML = '<span class="spinner-tiny"></span>';
      button.disabled = true;
      button.classList.add("loading");

      try {
        const result = await performModeratorAction("deleteIdea", timestamp);

        // Check if the action was successful
        if (result && result.success) {
          console.log("Idea deleted successfully.");
          const card = button.closest(".dashboard-card");
          if (card) {
            // Apply the fade-out animation, same as the message log
            card.style.transition = "opacity 0.3s ease, transform 0.3s ease";
            card.style.opacity = "0";
            card.style.transform = "scale(0.95)";
            setTimeout(() => card.remove(), 300);
          }
        } else {
          // If the backend returns an error (like "not found"), restore the button.
          // The alert popup is already handled by the performModeratorAction function.
          button.innerHTML = originalText;
          button.disabled = false;
          button.classList.remove("loading");
        }
      } catch (e) {
        // This handles network errors or other unexpected issues.
        button.innerHTML = originalText;
        button.disabled = false;
        button.classList.remove("loading");
      }
    }
  );
}
function exitModeratorMode() {
  isModerator = false;
  moderatorToken = null;
  document.body.classList.remove("moderator-mode");

  // Optional: Show a brief confirmation message
  const exitBanner = document.createElement("div");
  exitBanner.textContent = "You have exited moderator mode.";
  exitBanner.style.cssText =
    "position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background-color: #228b22; color: white; padding: 12px 24px; border-radius: 10px; z-index: 9999; font-weight: 600; box-shadow: 0 4px 12px rgba(0,0,0,0.2);";
  document.body.appendChild(exitBanner);

  setTimeout(() => {
    exitBanner.style.transition = "opacity 0.5s ease";
    exitBanner.style.opacity = "0";
    setTimeout(() => exitBanner.remove(), 500);
  }, 2500);
}
/* ---------- PASSWORD VISIBILITY TOGGLE ---------- */
function togglePasswordVisibility(icon) {
  const passwordInput = qs("#moderator-password");
  if (!passwordInput || !icon) return;

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    icon.textContent = "🙈"; // Change icon to "hide"
  } else {
    passwordInput.type = "password";
    icon.textContent = "👁️"; // Change icon back to "show"
  }
}
/* ---------- KPI CARD TOOLTIP TOGGLE ---------- */
document.addEventListener("DOMContentLoaded", () => {
  const kpiCards = qsa(".kpi-card");

  // Toggle active class on card click for mobile tooltips
  kpiCards.forEach((card) => {
    card.addEventListener("click", (event) => {
      event.stopPropagation();
      const currentActive = qs(".kpi-card.active");
      if (currentActive && currentActive !== card) {
        currentActive.classList.remove("active");
      }
      card.classList.toggle("active");
    });
  });

  // Close active tooltip when clicking anywhere else
  document.addEventListener("click", () => {
    const activeCard = qs(".kpi-card.active");
    if (activeCard) activeCard.classList.remove("active");
  });
});
/* ---------- DASHBOARD STATS FETCHER ---------- */
async function fetchDashboardStats() {
  // Target all the value elements
  const statElements = {
    totalConcerns: qs("#kpi-total-concerns"),
    totalIdeas: qs("#kpi-total-ideas"),
    ideasDelivered: qs("#kpi-ideas-delivered"),
    activeCategory: qs("#kpi-active-category"),
    activeSubcategory: qs("#kpi-active-subcategory"),
  };

  // Set a loading state
  Object.values(statElements).forEach((el) => {
    if (el) el.textContent = "...";
  });

  try {
    // Fetch data using the 'getStats' action from your backend
    const res = await fetch(
      `https://script.google.com/macros/s/${DEPLOYED_ID}/exec?action=getStats`
    );
    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    const data = await res.json();
    if (data.success !== true)
      throw new Error(data.error || "Failed to fetch stats.");

    const stats = data.data;

    // Populate the cards with the fetched data
    if (statElements.totalConcerns)
      statElements.totalConcerns.textContent = stats.totalConcerns || "0";
    if (statElements.totalIdeas)
      statElements.totalIdeas.textContent = stats.totalIdeas || "0";
    if (statElements.ideasDelivered)
      statElements.ideasDelivered.textContent = stats.ideasDelivered || "0";
    if (statElements.activeCategory)
      statElements.activeCategory.textContent =
        stats.mostActiveCategory || "N/A";
    if (statElements.activeSubcategory)
      statElements.activeSubcategory.textContent =
        stats.mostActiveSubCategory || "N/A";
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err);
    // Display an error state in the UI if the fetch fails
    Object.values(statElements).forEach((el) => {
      if (el) el.textContent = "Err";
    });
  }
}
