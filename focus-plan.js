"use strict";

(() => {
  const STORAGE_KEY = "mllFocusPlanV1";
  const SEED_KEY = "mllFocusPlanSeededV1";
  const CALENDAR_SOURCE = "revision-business-sprint-v1";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeText = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const minutesBetween = (start, end) => {
    const [startHour, startMinute] = String(start).split(":").map(Number);
    const [endHour, endMinute] = String(end).split(":").map(Number);
    return Math.max(0, endHour * 60 + endMinute - startHour * 60 - startMinute);
  };
  const formatDate = (value, options = { weekday: "long", month: "short", day: "numeric" }) => new Date(`${value}T00:00:00`).toLocaleDateString("en-KE", options);
  const formatTime = (value) => {
    const [hour, minute] = String(value || "").split(":").map(Number);
    if (!Number.isFinite(hour)) return "Time open";
    return new Date(2000, 0, 1, hour, minute || 0).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" });
  };
  const readArray = (key) => {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };
  const createId = () => `focus-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const unitNames = {
    BPL3103: "Pharmacology II (Autonomic Pharmacology)",
    BPL3102: "Pharmacology I (Introduction to Pharmacology)",
    BPC4102: "Pharmaceutical Chemistry VII (NMR)",
    BPC4101: "Spectroscopy III",
    BPL5101: "Clinical Pharmacy V",
    BPL4106: "Pharmacology VIII (GIT)",
    BPL4201: "Pharmacology IX (Chemotherapy I)",
    BPL4105: "Pharmacology VII (CVS)",
    BPC3103: "Pharmaceutical Chemistry III (Analytical Methods I)",
    BPL4104: "Pharmacology VI (Respiratory and Renal)",
    BPC4204: "Pharmaceutical Chemistry XII (ANS)",
    BCH2206: "Spectroscopy II",
    BPL4205: "Clinical Pharmacy IV",
    BPT3102: "Pharmaceutics II (Drug Standards and GMP)",
    BPA2204: "Human Pathology IV",
    BMM2102: "Immunology",
    BPT4204: "Pharmacy Management III",
    BPT4103: "Pharmacy Management I",
    BPA2203: "Human Pathology III",
    BPC3202: "Pharmaceutical Chemistry V (CNS Drugs)",
    PBCU001: "Research Methods",
    BPL4103: "Clinical Pharmacy II",
    BPC4202: "Pharmaceutical Chemistry X (NSAIDs and Antihistamines)",
    BPL4203: "Pharmacology XI (Vitamins and Endocrine)",
    BPT4102: "Pharmaceutics VI (Unit Operations)"
  };

  const examDates = {
    BPL3103: "2026-08-06", BPL3102: "2026-08-07", BPC4102: "2026-08-07", BPC4101: "2026-08-08",
    BPL5101: "2026-08-10", BPL4201: "2026-08-11", BPL4106: "2026-08-11", BPC3103: "2026-08-12",
    BPL4105: "2026-08-12", BPC4204: "2026-08-13", BPL4104: "2026-08-13", BCH2206: "2026-08-14",
    BPL4205: "2026-08-14", BPT3102: "2026-08-15", BPA2204: "2026-08-16", BMM2102: "2026-08-16",
    BPT4204: "2026-08-17", BPT4103: "2026-08-17", BPA2203: "2026-08-18", BPC3202: "2026-08-19",
    PBCU001: "2026-08-19", BPL4103: "2026-08-19", BPC4202: "2026-08-20", BPL4203: "2026-08-21",
    BPT4102: "2026-08-21"
  };

  const studyDetail = "Reading + active recall + past-paper questions + a short error log.";
  const seedBlocks = () => {
    const blocks = [];
    const add = (date, start, end, type, title, code = "", detail = "", extra = {}) => blocks.push({
      id: `sprint-${date.replaceAll("-", "")}-${String(code || type).toLowerCase()}-${start.replace(":", "")}`,
      date, start, end, type, title, code, detail, examDate: code ? examDates[code] || "" : "", done: false, skipped: false, createdAt: new Date().toISOString(), ...extra
    });
    const study = (date, start, end, code) => add(date, start, end, "study", unitNames[code], code, studyDetail);

    add("2026-07-28", "08:30", "12:00", "attachment", "Search and shortlist attachment facilities", "", "Find suitable hospitals, pharmacies, or organizations; record contacts and requirements.");
    study("2026-07-28", "14:00", "15:30", "BPL3103");
    study("2026-07-28", "15:45", "17:15", "BPL3102");
    add("2026-07-28", "19:00", "20:00", "business", "Build the Exampoa launch checklist", "EXAMPOA", "Define the minimum launch pages, materials, quality checks, and next action.");

    study("2026-07-29", "08:00", "09:30", "BPC4102");
    study("2026-07-29", "09:45", "11:15", "BPC4101");
    study("2026-07-29", "14:00", "15:30", "BPL5101");
    add("2026-07-29", "19:00", "20:00", "business", "Prepare one Exampoa revision-material page", "EXAMPOA", "Finish one useful page end to end; keep a note of anything blocking publication.");

    add("2026-07-30", "08:30", "12:00", "attachment", "Tailor and send attachment applications", "", "Prepare the required documents, contact selected facilities, and schedule follow-ups.");
    study("2026-07-30", "14:00", "15:30", "BPL4106");
    study("2026-07-30", "15:45", "17:15", "BPL4201");

    study("2026-07-31", "08:00", "09:30", "BPL4105");
    study("2026-07-31", "09:45", "11:15", "BPC3103");
    study("2026-07-31", "14:00", "15:30", "BPL4104");
    add("2026-07-31", "19:00", "20:00", "business", "Upload and quality-check one Exampoa resource", "EXAMPOA", "Check naming, answer accuracy, mobile readability, and download flow.");

    study("2026-08-01", "08:00", "09:30", "BPC4204");
    study("2026-08-01", "09:45", "11:15", "BCH2206");
    study("2026-08-01", "14:00", "15:30", "BPL4205");
    add("2026-08-01", "17:00", "18:00", "business", "Test Exampoa on mobile and fix one issue", "EXAMPOA", "Use the student view; complete the highest-impact mobile or navigation fix.");

    study("2026-08-02", "09:00", "10:30", "BPT3102");
    study("2026-08-02", "10:45", "12:15", "BPA2204");
    study("2026-08-02", "14:00", "15:30", "BMM2102");
    add("2026-08-02", "17:00", "18:00", "business", "Write Exampoa page titles and descriptions", "EXAMPOA", "Improve search clarity for the most important launch pages without expanding scope.");

    study("2026-08-03", "08:00", "09:30", "BPT4204");
    study("2026-08-03", "09:45", "11:15", "BPT4103");
    study("2026-08-03", "14:00", "15:30", "BPA2203");
    add("2026-08-03", "17:00", "18:00", "business", "Schedule Exampoa launch content", "EXAMPOA", "Prepare one announcement and one helpful revision post; pause business work after this block.");

    add("2026-08-04", "08:30", "11:00", "attachment", "Follow up on attachment applications", "", "Call or message the facilities already contacted and record every response or next date.");
    study("2026-08-04", "11:30", "13:00", "BPC3202");
    study("2026-08-04", "14:00", "15:30", "PBCU001");
    study("2026-08-04", "15:45", "17:15", "BPL4103");

    study("2026-08-05", "08:00", "09:30", "BPC4202");
    study("2026-08-05", "09:45", "11:15", "BPL4203");
    study("2026-08-05", "14:00", "15:30", "BPT4102");
    add("2026-08-05", "16:00", "17:00", "review", "Mixed recall for the first four exams", "BPL3103 + BPL3102 + BPC4102 + BPC4101", "Use only recall sheets, questions, and the error log. Stop on time and prepare exam materials.");

    return blocks;
  };

  const readPlan = () => readArray(STORAGE_KEY);
  const writePlan = (blocks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
    qs("#focusPlanSaveNote")?.classList.add("saved");
    window.setTimeout(() => qs("#focusPlanSaveNote")?.classList.remove("saved"), 900);
  };

  const calendarCategory = (type) => type === "study" || type === "review" ? "school" : "work";
  const calendarColor = (type) => type === "business" ? "purple-event" : type === "attachment" ? "green-event" : "coral-event";
  const calendarTitle = (block) => block.type === "study" ? `Study · ${block.code} · ${block.title}` : block.type === "business" ? `Exampoa · ${block.title}` : block.title;
  const toCalendarEvent = (block, existingId = "") => ({
    id: existingId || `calendar-${block.id}`,
    date: block.date,
    title: calendarTitle(block),
    category: calendarCategory(block.type),
    startTime: block.start,
    endTime: block.end,
    location: block.type === "attachment" ? "Attachment search" : block.type === "business" ? "Exampoa" : "Study space",
    notes: block.detail,
    repeat: "none",
    meta: `${calendarCategory(block.type) === "school" ? "School" : "Work"} · ${block.start}–${block.end}`,
    color: calendarColor(block.type),
    source: CALENDAR_SOURCE,
    focusBlockId: block.id
  });

  const refreshCalendarMemory = (events) => {
    try {
      calendarEvents.splice(0, calendarEvents.length, ...events);
      renderCalendar();
      renderUpcoming();
    } catch {
      // The calendar module may not be present on a future lightweight page.
    }
  };

  const syncCalendar = (blocks) => {
    const events = readArray("calendarEvents");
    let changed = false;
    blocks.filter((block) => !block.skipped).forEach((block) => {
      const index = events.findIndex((event) => event.focusBlockId === block.id || (event.source === CALENDAR_SOURCE && event.date === block.date && event.title === calendarTitle(block)));
      if (index >= 0) {
        const next = toCalendarEvent(block, events[index].id);
        if (JSON.stringify(events[index]) !== JSON.stringify(next)) { events[index] = next; changed = true; }
      } else {
        events.push(toCalendarEvent(block));
        changed = true;
      }
    });
    const activeIds = new Set(blocks.filter((block) => !block.skipped).map((block) => block.id));
    const kept = events.filter((event) => event.source !== CALENDAR_SOURCE || activeIds.has(event.focusBlockId));
    if (kept.length !== events.length) changed = true;
    if (changed) {
      localStorage.setItem("calendarEvents", JSON.stringify(kept));
      refreshCalendarMemory(kept);
    }
  };

  const logCompletedStudy = (block, completed) => {
    if (!["study", "review"].includes(block.type)) return;
    const sessions = readArray("studySessions").filter((session) => session.focusBlockId !== block.id);
    if (completed) sessions.unshift({ topic: `${block.code ? `${block.code} · ` : ""}${block.title}`, duration: `${minutesBetween(block.start, block.end)} minutes`, date: block.date, focusBlockId: block.id });
    localStorage.setItem("studySessions", JSON.stringify(sessions));
  };

  let plan = [];
  let dialogState = null;

  const statusOf = (block) => block.done ? "done" : block.skipped ? "skipped" : "open";
  const typeLabel = (type) => ({ study: "Study", attachment: "Attachment", business: "Exampoa", review: "Mixed review" }[type] || "Plan");

  const renderStats = () => {
    const studyBlocks = plan.filter((block) => block.type === "study");
    const studyDone = studyBlocks.filter((block) => block.done).length;
    const businessBlocks = plan.filter((block) => block.type === "business");
    const attachmentBlocks = plan.filter((block) => block.type === "attachment");
    const totalDone = plan.filter((block) => block.done).length;
    const totalMinutes = studyBlocks.reduce((sum, block) => sum + minutesBetween(block.start, block.end), 0);
    const overallPercent = plan.length ? Math.round(totalDone / plan.length * 100) : 0;
    const host = qs("#focusPlanStats");
    if (!host) return;
    host.innerHTML = `
      <article class="focus-plan-stat"><span>Unit coverage</span><strong>${studyDone} / ${studyBlocks.length}</strong><small>first-pass blocks complete</small><div class="focus-plan-progress"><i style="width:${studyBlocks.length ? Math.round(studyDone / studyBlocks.length * 100) : 0}%"></i></div></article>
      <article class="focus-plan-stat"><span>Revision time</span><strong>${(totalMinutes / 60).toFixed(1)} h</strong><small>planned before 6 August</small></article>
      <article class="focus-plan-stat"><span>Protected life blocks</span><strong>${attachmentBlocks.length} + ${businessBlocks.length}</strong><small>attachment days + Exampoa sessions</small></article>
      <article class="focus-plan-stat"><span>Whole sprint</span><strong>${overallPercent}%</strong><small>${totalDone} of ${plan.length} blocks complete</small><div class="focus-plan-progress"><i style="width:${overallPercent}%"></i></div></article>`;
  };

  const populateDateFilter = () => {
    const select = qs("#focusPlanDateFilter");
    if (!select) return;
    const selected = select.value;
    const dates = [...new Set(plan.map((block) => block.date))].sort();
    select.innerHTML = '<option value="all">All days</option>' + dates.map((date) => `<option value="${date}">${escapeText(formatDate(date, { weekday: "short", month: "short", day: "numeric" }))}</option>`).join("");
    select.value = dates.includes(selected) ? selected : "all";
  };

  const renderPlan = () => {
    renderStats();
    populateDateFilter();
    const typeFilter = qs("#focusPlanTypeFilter")?.value || "all";
    const statusFilter = qs("#focusPlanStatusFilter")?.value || "all";
    const dateFilter = qs("#focusPlanDateFilter")?.value || "all";
    const today = localDateKey();
    const visible = plan.filter((block) => (typeFilter === "all" || block.type === typeFilter) && (statusFilter === "all" || statusOf(block) === statusFilter) && (dateFilter === "all" || block.date === dateFilter));
    const dates = [...new Set(visible.map((block) => block.date))].sort();
    const host = qs("#focusPlanDays");
    if (!host) return;
    if (!dates.length) {
      host.innerHTML = '<div class="focus-plan-empty"><strong>No blocks match these filters.</strong><br><small>Change a filter or add a new block.</small></div>';
      return;
    }
    host.innerHTML = dates.map((date) => {
      const blocks = visible.filter((block) => block.date === date).sort((a, b) => a.start.localeCompare(b.start));
      const done = blocks.filter((block) => block.done).length;
      return `<article class="focus-plan-day ${date === today ? "today" : ""}" data-focus-date="${date}">
        <header class="focus-plan-day-heading"><span>${escapeText(formatDate(date, { weekday: "long" }))}</span><strong>${escapeText(formatDate(date, { month: "short", day: "numeric" }))}</strong><small>${blocks.length} planned block${blocks.length === 1 ? "" : "s"}</small><b>${date === today ? "TODAY" : `${done}/${blocks.length} DONE`}</b></header>
        <div class="focus-plan-blocks">${blocks.map((block) => `<div class="focus-plan-block ${statusOf(block)}" data-focus-id="${escapeText(block.id)}">
          <input class="focus-plan-check" type="checkbox" data-focus-complete aria-label="Mark ${escapeText(block.title)} complete" ${block.done ? "checked" : ""} ${block.skipped ? "disabled" : ""}>
          <div class="focus-plan-time"><span>${escapeText(formatTime(block.start))}</span><small>${minutesBetween(block.start, block.end)} min</small></div>
          <div class="focus-plan-block-copy"><span class="focus-plan-type ${escapeText(block.type)}">${escapeText(typeLabel(block.type))}</span>${block.code ? `<span class="focus-plan-code">${escapeText(block.code)}</span>` : ""}<strong>${escapeText(block.title)}</strong><small>${escapeText(block.detail || "Add preparation notes")}${block.examDate ? ` · Exam ${escapeText(formatDate(block.examDate, { month: "short", day: "numeric" }))}` : ""}</small></div>
          <div class="focus-plan-block-actions">${block.type === "study" ? '<button type="button" data-focus-resources>Resources</button>' : ""}<button type="button" data-focus-edit>Edit</button><button type="button" data-focus-skip>${block.skipped ? "Restore" : "Skip"}</button></div>
        </div>`).join("")}</div>
      </article>`;
    }).join("");
  };

  const buildDialog = () => {
    const dialog = document.createElement("div");
    dialog.className = "focus-plan-dialog";
    dialog.setAttribute("aria-hidden", "true");
    dialog.innerHTML = `<button class="focus-plan-dialog-backdrop" type="button" aria-label="Close planner form"></button><form class="focus-plan-dialog-card" id="focusPlanForm"><button class="focus-plan-dialog-close" type="button" aria-label="Close">&times;</button><p class="eyebrow">Schedule a realistic block</p><h2 id="focusPlanDialogTitle">Add plan block</h2><p class="focus-plan-dialog-description">Keep the time, purpose, and next action together. The block will also appear in your calendar.</p><div class="focus-plan-form-grid">
      <label class="wide">Title<input name="title" required maxlength="220" placeholder="What will you complete?"></label>
      <label>Type<select name="type"><option value="study">Study</option><option value="attachment">Attachment</option><option value="business">Exampoa</option><option value="review">Mixed review</option></select></label>
      <label>Unit or project code<input name="code" maxlength="80" placeholder="e.g. BPL3103 or EXAMPOA"></label>
      <label>Date<input name="date" type="date" required></label>
      <label>Exam date<input name="examDate" type="date"></label>
      <label>Start time<input name="start" type="time" required></label>
      <label>End time<input name="end" type="time" required></label>
      <label class="wide">Block method or next action<textarea name="detail" maxlength="700" placeholder="What will make this block complete?"></textarea></label>
    </div><p class="focus-plan-form-error" role="alert"></p><div class="focus-plan-dialog-actions"><button type="button" data-focus-cancel>Cancel</button><button type="submit">Save block</button></div></form>`;
    document.body.append(dialog);
    const form = qs("#focusPlanForm", dialog);
    const close = () => { dialog.classList.remove("open"); dialog.setAttribute("aria-hidden", "true"); dialogState = null; };
    qsa(".focus-plan-dialog-close, .focus-plan-dialog-backdrop, [data-focus-cancel]", dialog).forEach((button) => button.addEventListener("click", close));
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && dialog.classList.contains("open")) close(); });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const error = qs(".focus-plan-form-error", form);
      if (values.end <= values.start) { error.textContent = "End time must be later than the start time."; return; }
      const existing = dialogState?.block;
      const next = { id: existing?.id || createId(), title: values.title.trim(), type: values.type, code: values.code.trim().toUpperCase(), date: values.date, examDate: values.examDate || "", start: values.start, end: values.end, detail: values.detail.trim(), done: existing?.done || false, skipped: existing?.skipped || false, createdAt: existing?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (existing) plan[plan.findIndex((block) => block.id === existing.id)] = next;
      else plan.push(next);
      plan.sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`));
      writePlan(plan);
      syncCalendar(plan);
      renderPlan();
      updateTodayCommand();
      close();
    });
    return {
      open(block = null) {
        dialogState = { block };
        form.reset();
        qs("#focusPlanDialogTitle", dialog).textContent = block ? "Edit plan block" : "Add plan block";
        qs(".focus-plan-form-error", form).textContent = "";
        const values = block || { title: "", type: "study", code: "", date: localDateKey(), examDate: "", start: "09:00", end: "10:30", detail: studyDetail };
        Object.entries(values).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value ?? ""; });
        dialog.classList.add("open");
        dialog.setAttribute("aria-hidden", "false");
        requestAnimationFrame(() => form.elements.title.focus());
      }
    };
  };

  const updateTodayCommand = () => {
    const card = qs("#todayCommandCenter");
    if (!card) return;
    const today = localDateKey();
    const next = plan.filter((block) => !block.done && !block.skipped && block.date >= today).sort((a, b) => `${a.date} ${a.start}`.localeCompare(`${b.date} ${b.start}`))[0];
    const item = qs(".today-command-item", card);
    const link = qs(".pp-heading .pp-button", card);
    if (item && next) item.innerHTML = `<span>Next planned block</span><strong>${escapeText(next.code || typeLabel(next.type))}</strong><small>${escapeText(formatDate(next.date, { weekday: "short", month: "short", day: "numeric" }))} · ${escapeText(formatTime(next.start))} · ${escapeText(next.title)}</small>`;
    if (link) { link.href = "#focusPlan"; link.textContent = "Open full plan"; }
  };

  const initializePlan = () => {
    plan = readPlan();
    if (!plan.length && localStorage.getItem(SEED_KEY) !== "true") {
      plan = seedBlocks();
      writePlan(plan);
      localStorage.setItem(SEED_KEY, "true");
    }
    syncCalendar(plan);
  };

  const init = () => {
    if (!qs("#focusPlan")) return;
    initializePlan();
    qs("#autoStudyPlanner")?.remove();
    const schoolShortcuts = qs("#schoolOverview .school-overview-links");
    if (schoolShortcuts && !qs('[href="#focusPlan"]', schoolShortcuts)) {
      const shortcut = document.createElement("a");
      shortcut.href = "#focusPlan";
      shortcut.innerHTML = "Revision sprint <span>→</span>";
      schoolShortcuts.prepend(shortcut);
    }
    const dialog = buildDialog();
    populateDateFilter();
    renderPlan();
    updateTodayCommand();
    qs("#addFocusPlanBlock")?.addEventListener("click", () => dialog.open());
    qs("#showTodayFocusPlan")?.addEventListener("click", () => {
      const today = localDateKey();
      const dateSelect = qs("#focusPlanDateFilter");
      const hasToday = plan.some((block) => block.date === today);
      dateSelect.value = hasToday ? today : "all";
      renderPlan();
      qs(hasToday ? `[data-focus-date="${today}"]` : ".focus-plan-day")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    qsa("#focusPlanTypeFilter, #focusPlanStatusFilter, #focusPlanDateFilter").forEach((select) => select.addEventListener("change", renderPlan));
    qs("#focusPlanDays")?.addEventListener("click", (event) => {
      const row = event.target.closest("[data-focus-id]");
      const block = plan.find((item) => item.id === row?.dataset.focusId);
      if (!block) return;
      if (event.target.closest("[data-focus-resources]")) document.dispatchEvent(new CustomEvent("mll:open-unit-resources", { detail: { unit: block.code, action: "view" } }));
      if (event.target.closest("[data-focus-edit]")) dialog.open(block);
      if (event.target.closest("[data-focus-skip]")) {
        block.skipped = !block.skipped;
        if (block.skipped) block.done = false;
        writePlan(plan);
        syncCalendar(plan);
        renderPlan();
        updateTodayCommand();
      }
    });
    qs("#focusPlanDays")?.addEventListener("change", (event) => {
      if (!event.target.matches("[data-focus-complete]")) return;
      const row = event.target.closest("[data-focus-id]");
      const block = plan.find((item) => item.id === row?.dataset.focusId);
      if (!block) return;
      block.done = event.target.checked;
      block.completedAt = block.done ? new Date().toISOString() : "";
      logCompletedStudy(block, block.done);
      writePlan(plan);
      renderPlan();
      updateTodayCommand();
      try { renderStudySessions(); } catch { /* Optional legacy study log. */ }
    });
    window.mllFocusPlan = { getBlocks: () => [...plan], openAddForm: () => dialog.open(), render: renderPlan };
  };

  window.addEventListener("load", init);
})();
