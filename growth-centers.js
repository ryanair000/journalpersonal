"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const RESOURCE_KEY = "myLittleLife.resources.v1";
  const NOTICE_KEY = "myLittleLife.growthNotice";
  const TIMER_KEY = "myLittleLife.studyTimer.v1";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pad = (value) => String(value).padStart(2, "0");
  const today = new Date();
  const dateKey = localDateKey(today);
  const ASSESSMENT_TYPES = ["Assignment", "Exam", "Quiz", "Presentation", "Practical", "Reading"];
  const ASSESSMENT_STATUSES = ["Not started", "In progress", "Ready", "Done"];
  const CONTENT_STATUSES = ["Idea", "In progress", "Scheduled", "Posted"];
  const CONTENT_PLATFORMS = ["Instagram", "TikTok", "YouTube", "Blog", "X", "LinkedIn", "Other"];
  const WORK_STATUSES = ["Idea", "Active", "Waiting", "Done"];
  const PEOPLE_GROUPS = ["Family", "Friend", "Relationship", "Classmate", "Colleague", "Other"];
  const CENTER_OPTIONS = [
    ["todayCenter", "Today summary"],
    ["reminderCenter", "Reminders centre"],
    ["studyCenterPlus", "Study assessment centre"],
    ["contentCalendar", "Content calendar"],
    ["workCenterPlus", "Work project pipeline"],
    ["connectionsCenter", "People follow-up centre"],
    ["resourceOrganizer", "Resource organizer"],
    ["systemCenter", "Data and system centre"]
  ];

  function localDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function addDays(date, amount) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function daysBetween(first, second) {
    const a = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const b = new Date(second.getFullYear(), second.getMonth(), second.getDate());
    return Math.round((b - a) / 86400000);
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    Object.entries(options.attrs || {}).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    });
    return node;
  }

  function ensureStyles() {
    if (!qs('link[href="expansion-suite.css"]')) {
      document.head.append(element("link", { attrs: { rel: "stylesheet", href: "expansion-suite.css" } }));
    }
  }

  function normalizeState(raw) {
    const state = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    state.version = Number(state.version) || 2;
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.weekly = state.weekly && typeof state.weekly === "object" ? state.weekly : {};
    state.journal = Array.isArray(state.journal) ? state.journal : [];
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.lists = state.lists && typeof state.lists === "object" ? state.lists : {};
    [
      "tasks", "planner", "classes", "ideas", "drafts", "people", "study",
      "units", "research", "businesses", "workGoals", "workLogs", "social",
      "accounts", "relationshipItems"
    ].forEach((key) => {
      state.lists[key] = Array.isArray(state.lists[key]) ? state.lists[key] : [];
    });
    state.suite = state.suite && typeof state.suite === "object" ? state.suite : {};
    state.suite.reminders = Array.isArray(state.suite.reminders) ? state.suite.reminders : [];
    state.suite.assessments = Array.isArray(state.suite.assessments) ? state.suite.assessments : [];
    state.suite.workProjects = Array.isArray(state.suite.workProjects) ? state.suite.workProjects : [];
    state.suite.hiddenCenters = Array.isArray(state.suite.hiddenCenters) ? state.suite.hiddenCenters : [];
    return state;
  }

  function loadState() {
    return normalizeState(safeParse(localStorage.getItem(STORAGE_KEY), {}));
  }

  function captureUnsavedFields(state) {
    const existing = state.daily[dateKey] && typeof state.daily[dateKey] === "object" ? state.daily[dateKey] : {};
    state.daily[dateKey] = { mood: "", habits: [false, false, false, false], wellbeing: {}, meals: {}, feeling: "", gratitude: "", memory: "", quickNote: "", ...existing };
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) state.daily[dateKey].quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) state.daily[dateKey].gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function saveState(state, message = "", reload = true) {
    const normalized = normalizeState(state);
    captureUnsavedFields(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    if (message) sessionStorage.setItem(NOTICE_KEY, message);
    if (reload) globalThis.location.reload();
  }

  function formatDate(value, short = false) {
    const date = typeof value === "string" ? parseDate(value) || new Date(value) : value;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "No date";
    return date.toLocaleDateString("en-KE", short ? { day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short" });
  }

  function formatMoney(value) {
    return `KSh ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function twoStep(button, confirmationText, callback) {
    if (button.dataset.armed === "true") {
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalText || "Delete";
      callback();
      return;
    }
    button.dataset.originalText = button.textContent;
    button.dataset.armed = "true";
    button.textContent = confirmationText;
    clearTimeout(button.armTimer);
    button.armTimer = setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalText || button.textContent;
    }, 5000);
  }

  function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const link = element("a", { attrs: { href: url, download: filename } });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function createDialog() {
    if (qs("#growthDialog")) return qs("#growthDialog");
    const dialog = element("div", { className: "growth-dialog", attrs: { id: "growthDialog", role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "growthDialogTitle" } });
    const backdrop = element("button", { className: "growth-dialog-backdrop", attrs: { type: "button", "aria-label": "Close dialog" } });
    const form = element("form", { className: "growth-dialog-card", attrs: { id: "growthDialogForm", novalidate: "" } });
    const close = element("button", { className: "growth-dialog-close", text: "×", attrs: { type: "button", "aria-label": "Close dialog" } });
    form.append(close, element("p", { className: "eyebrow", attrs: { id: "growthDialogEyebrow" } }), element("h2", { attrs: { id: "growthDialogTitle" } }), element("p", { className: "growth-dialog-description", attrs: { id: "growthDialogDescription" } }), element("div", { className: "growth-dialog-fields", attrs: { id: "growthDialogFields" } }), element("p", { className: "growth-dialog-error", attrs: { id: "growthDialogError", role: "alert" } }));
    const footer = element("div", { className: "growth-dialog-footer" });
    const cancel = element("button", { className: "suite-secondary-button", text: "Cancel", attrs: { type: "button" } });
    const submit = element("button", { className: "save-button", text: "Save →", attrs: { type: "submit", id: "growthDialogSubmit" } });
    footer.append(cancel, submit);
    form.append(footer);
    dialog.append(backdrop, form);
    document.body.append(dialog);
    [backdrop, close, cancel].forEach((button) => button.addEventListener("click", closeDialog));
    document.addEventListener("keydown", (event) => {
      if (!dialog.classList.contains("open")) return;
      if (event.key === "Escape") { event.preventDefault(); closeDialog(); return; }
      if (event.key !== "Tab") return;
      const focusable = qsa('button, input, textarea, select, [tabindex]:not([tabindex="-1"])', form).filter((node) => !node.disabled && node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return dialog;
  }

  let dialogOpener = null;

  function closeDialog() {
    const dialog = qs("#growthDialog");
    dialog?.classList.remove("open");
    dialog?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    qs("#growthDialogForm").onsubmit = null;
    dialogOpener?.focus?.();
  }

  function field(labelText, control, help = "") {
    const label = element("label", { className: "growth-field" });
    label.append(element("span", { text: labelText }), control);
    if (help) label.append(element("small", { text: help }));
    return label;
  }

  function input(config = {}) {
    if (config.type === "textarea") {
      const node = element("textarea", { attrs: { name: config.name, rows: config.rows || 4, maxlength: config.maxlength, placeholder: config.placeholder, required: config.required ? "" : null } });
      node.value = config.value || "";
      return node;
    }
    return element("input", { attrs: { name: config.name, type: config.type || "text", value: config.value ?? "", min: config.min, max: config.max, step: config.step, maxlength: config.maxlength, placeholder: config.placeholder, required: config.required ? "" : null, autocomplete: "off" } });
  }

  function select(name, options, selected = "") {
    const node = element("select", { attrs: { name } });
    options.forEach((option) => {
      const value = typeof option === "string" ? option : option.value;
      const label = typeof option === "string" ? option : option.label;
      const item = element("option", { text: label, attrs: { value } });
      item.selected = value === selected;
      node.append(item);
    });
    return node;
  }

  function openDialog(config, opener) {
    const dialog = createDialog();
    dialogOpener = opener || document.activeElement;
    qs("#growthDialogEyebrow").textContent = config.eyebrow || "Dashboard centre";
    qs("#growthDialogTitle").textContent = config.title;
    qs("#growthDialogDescription").textContent = config.description || "";
    qs("#growthDialogError").textContent = "";
    const container = qs("#growthDialogFields");
    container.replaceChildren();
    config.fields.forEach((item) => {
      const control = item.type === "select" ? select(item.name, item.options, item.value || "") : input(item);
      container.append(field(item.label, control, item.help || ""));
    });
    const form = qs("#growthDialogForm");
    qs("#growthDialogSubmit").textContent = config.submitText || "Save →";
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const error = config.validate?.(values) || "";
      if (error) { qs("#growthDialogError").textContent = error; return; }
      config.save(values);
    };
    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => qs("input, textarea, select", container)?.focus());
  }

  function summaryCards(entries) {
    const grid = element("div", { className: "growth-summary-grid" });
    entries.forEach(([label, value, note]) => {
      const card = element("article");
      card.append(element("small", { text: label }), element("strong", { text: value }), element("span", { text: note }));
      grid.append(card);
    });
    return grid;
  }

  function actionButton(text, label = text, className = "suite-mini-button") {
    return element("button", { className, text, attrs: { type: "button", "aria-label": label, title: label } });
  }

  function buildStudyCenter() {
    qs("#studyCenterPlus")?.remove();
    const state = loadState();
    const assessments = state.suite.assessments.slice().sort((a, b) => (parseDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER));
    const upcoming = assessments.filter((item) => item.status !== "Done" && item.dueDate && daysBetween(today, parseDate(item.dueDate)) >= 0 && daysBetween(today, parseDate(item.dueDate)) <= 14).length;
    const overdue = assessments.filter((item) => item.status !== "Done" && item.dueDate && parseDate(item.dueDate) < new Date(today.getFullYear(), today.getMonth(), today.getDate())).length;
    const completed = assessments.filter((item) => item.status === "Done").length;
    const section = element("section", { className: "growth-center study-center-plus section", attrs: { id: "studyCenterPlus", "aria-labelledby": "studyCenterPlusTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Study assessment centre" }), element("h2", { text: "See deadlines clearly and study one step at a time.", attrs: { id: "studyCenterPlusTitle" } }));
    const add = element("button", { className: "small-link", text: "＋ Add assessment", attrs: { type: "button" } });
    add.addEventListener("click", () => openAssessmentDialog(null, add));
    heading.append(copy, add);
    section.append(heading, summaryCards([["Assessments", assessments.length, "All saved items"], ["Due in 14 days", upcoming, "Upcoming"], ["Needs attention", overdue, "Overdue"], ["Completed", completed, "Finished"]]));
    const layout = element("div", { className: "study-plus-layout" });
    const listCard = element("article", { className: "growth-card study-assessment-card" });
    listCard.append(element("p", { className: "eyebrow", text: "Assignments, exams & reading" }), element("h3", { text: "Assessment list" }));
    const list = element("div", { className: "assessment-list" });
    if (!assessments.length) list.append(element("p", { className: "growth-empty", text: "No assessments saved yet. Add one when a deadline becomes real." }));
    else assessments.forEach((assessment) => {
      const date = parseDate(assessment.dueDate);
      const diff = date ? daysBetween(today, date) : null;
      const row = element("article", { className: `assessment-row status-${String(assessment.status || "").toLowerCase().replaceAll(" ", "-")}${diff !== null && diff < 0 && assessment.status !== "Done" ? " overdue" : ""}` });
      const dateBlock = element("span", { className: "assessment-date" });
      dateBlock.append(element("b", { text: date ? date.getDate() : "—" }), element("small", { text: date ? date.toLocaleDateString("en-KE", { month: "short" }).toUpperCase() : "OPEN" }));
      const copyNode = element("div", { className: "assessment-copy" });
      copyNode.append(element("strong", { text: assessment.title || "Assessment" }), element("span", { text: `${assessment.type || "Assessment"}${assessment.unit ? ` · ${assessment.unit}` : ""}` }), element("small", { text: assessment.notes || (date ? formatDate(date) : "No due date") }));
      const status = element("span", { className: "assessment-status", text: assessment.status || "Not started" });
      const actions = element("div", { className: "suite-inline-actions" });
      const advance = actionButton(assessment.status === "Done" ? "Restore" : "Next", "Update assessment status");
      advance.addEventListener("click", () => {
        const nextState = loadState();
        const target = nextState.suite.assessments.find((item) => item.id === assessment.id);
        if (!target) return;
        if (target.status === "Done") target.status = "In progress";
        else target.status = ASSESSMENT_STATUSES[Math.min(ASSESSMENT_STATUSES.length - 1, ASSESSMENT_STATUSES.indexOf(target.status || "Not started") + 1)];
        saveState(nextState, "Assessment status updated.");
      });
      const edit = actionButton("Edit");
      edit.addEventListener("click", () => openAssessmentDialog(assessment, edit));
      const remove = actionButton("Delete", `Delete ${assessment.title}`, "suite-mini-button suite-danger-text");
      remove.addEventListener("click", () => twoStep(remove, "Delete?", () => {
        const nextState = loadState();
        nextState.suite.assessments = nextState.suite.assessments.filter((item) => item.id !== assessment.id);
        saveState(nextState, "Assessment deleted.");
      }));
      actions.append(advance, edit, remove);
      row.append(dateBlock, copyNode, status, actions);
      list.append(row);
    });
    listCard.append(list);
    const timerCard = element("article", { className: "growth-card study-timer-card" });
    timerCard.append(element("p", { className: "eyebrow", text: "Focus timer" }), element("h3", { text: "A calm study sprint" }), element("p", { className: "growth-copy", text: "Choose a time that fits your energy. Pausing or stopping early is completely fine." }));
    const timerDisplay = element("strong", { className: "study-timer-display", attrs: { id: "studyTimerDisplay", role: "timer", "aria-live": "off" } });
    timerCard.append(timerDisplay);
    const presets = element("div", { className: "study-timer-presets" });
    [25, 45, 60].forEach((minutes) => {
      const button = actionButton(`${minutes} min`, `Set timer to ${minutes} minutes`, "suite-secondary-button");
      button.addEventListener("click", () => setTimer(minutes * 60));
      presets.append(button);
    });
    timerCard.append(presets);
    const timerActions = element("div", { className: "study-timer-actions" });
    const start = element("button", { className: "save-button", text: "Start", attrs: { type: "button", id: "studyTimerStart" } });
    const reset = element("button", { className: "suite-secondary-button", text: "Reset", attrs: { type: "button" } });
    timerActions.append(start, reset);
    timerCard.append(timerActions);
    start.addEventListener("click", toggleTimer);
    reset.addEventListener("click", () => setTimer(loadTimerState().duration || 25 * 60));
    layout.append(listCard, timerCard);
    section.append(layout);
    const schoolHub = qs("#schoolHub");
    if (schoolHub) schoolHub.after(section);
    else qs("main.dashboard")?.append(section);
    renderTimer();
  }

  function openAssessmentDialog(item, opener) {
    openDialog({
      eyebrow: "Study centre",
      title: item ? "Edit assessment" : "Add assessment",
      description: "Save the deadline and enough context to know your next step.",
      fields: [
        { name: "title", label: "Title", value: item?.title || "", required: true, maxlength: 200, placeholder: "Assignment, exam, reading…" },
        { name: "type", label: "Type", type: "select", value: item?.type || "Assignment", options: ASSESSMENT_TYPES },
        { name: "unit", label: "Unit or subject", value: item?.unit || "", maxlength: 120 },
        { name: "dueDate", label: "Due date", type: "date", value: item?.dueDate || "" },
        { name: "status", label: "Status", type: "select", value: item?.status || "Not started", options: ASSESSMENT_STATUSES },
        { name: "notes", label: "Next step or notes", type: "textarea", value: item?.notes || "", maxlength: 1200, placeholder: "What will move this forward?" }
      ],
      save(values) {
        const nextState = loadState();
        const target = item ? nextState.suite.assessments.find((entry) => entry.id === item.id) : null;
        const value = { ...(target || {}), id: target?.id || createId(), title: String(values.title || "").trim().slice(0, 200), type: ASSESSMENT_TYPES.includes(values.type) ? values.type : "Assignment", unit: String(values.unit || "").slice(0, 120), dueDate: String(values.dueDate || ""), status: ASSESSMENT_STATUSES.includes(values.status) ? values.status : "Not started", notes: String(values.notes || "").slice(0, 1200), updatedAt: new Date().toISOString() };
        if (target) Object.assign(target, value);
        else nextState.suite.assessments.push(value);
        closeDialog();
        saveState(nextState, item ? "Assessment updated." : "Assessment added.");
      }
    }, opener);
  }

  let timerInterval = null;

  function loadTimerState() {
    const stored = safeParse(sessionStorage.getItem(TIMER_KEY), {});
    const duration = Number(stored.duration) > 0 ? Number(stored.duration) : 25 * 60;
    let remaining = Number(stored.remaining) >= 0 ? Number(stored.remaining) : duration;
    const running = Boolean(stored.running);
    if (running && stored.startedAt) remaining = Math.max(0, remaining - Math.floor((Date.now() - Number(stored.startedAt)) / 1000));
    return { duration, remaining, running: running && remaining > 0, startedAt: running ? Date.now() : null };
  }

  function storeTimer(state) {
    sessionStorage.setItem(TIMER_KEY, JSON.stringify(state));
  }

  function setTimer(seconds) {
    clearInterval(timerInterval);
    storeTimer({ duration: seconds, remaining: seconds, running: false, startedAt: null });
    renderTimer();
  }

  function toggleTimer() {
    const state = loadTimerState();
    if (state.running) {
      storeTimer({ ...state, running: false, startedAt: null });
      clearInterval(timerInterval);
    } else if (state.remaining > 0) storeTimer({ ...state, running: true, startedAt: Date.now() });
    renderTimer();
  }

  function renderTimer() {
    clearInterval(timerInterval);
    const display = qs("#studyTimerDisplay");
    const start = qs("#studyTimerStart");
    if (!display || !start) return;
    const update = () => {
      const state = loadTimerState();
      display.textContent = `${pad(Math.floor(state.remaining / 60))}:${pad(state.remaining % 60)}`;
      start.textContent = state.running ? "Pause" : state.remaining === 0 ? "Start again" : "Start";
      if (state.remaining === 0) {
        clearInterval(timerInterval);
        showToast("Study sprint complete. Take a gentle pause.");
        storeTimer({ ...state, running: false, startedAt: null });
      } else if (state.running) storeTimer({ ...state, remaining: state.remaining, startedAt: Date.now() });
    };
    update();
    if (loadTimerState().running) timerInterval = setInterval(update, 1000);
  }

  function allContent(state) {
    return [...state.lists.ideas.map((item) => ({ ...item, source: "ideas" })), ...state.lists.drafts.map((item) => ({ ...item, source: "drafts" }))];
  }

  function buildContentCalendar() {
    qs("#contentCalendar")?.remove();
    const state = loadState();
    const items = allContent(state);
    const scheduled = items.filter((item) => item.publishDate && item.status !== "Posted");
    const weekCount = scheduled.filter((item) => {
      const date = parseDate(item.publishDate);
      return date && daysBetween(today, date) >= 0 && daysBetween(today, date) <= 7;
    }).length;
    const posted = items.filter((item) => item.status === "Posted").length;
    const unscheduled = items.filter((item) => !item.publishDate && item.status !== "Posted");
    const section = element("section", { className: "growth-center content-calendar-center section", attrs: { id: "contentCalendar", "aria-labelledby": "contentCalendarTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Content publishing calendar" }), element("h2", { text: "Turn ideas into a realistic publishing rhythm.", attrs: { id: "contentCalendarTitle" } }));
    const add = element("button", { className: "small-link", text: "＋ Add content", attrs: { type: "button" } });
    add.addEventListener("click", () => openContentDialog(null, add));
    heading.append(copy, add);
    section.append(heading, summaryCards([["All content", items.length, "Ideas and drafts"], ["Scheduled", scheduled.length, "Has a publish date"], ["Next 7 days", weekCount, "Coming up"], ["Posted", posted, "Completed"]]));
    const calendar = element("div", { className: "content-calendar-grid" });
    for (let offset = 0; offset < 14; offset += 1) {
      const date = addDays(today, offset);
      const key = localDateKey(date);
      const dayItems = items.filter((item) => item.publishDate === key);
      const column = element("article", { className: `content-calendar-day${offset === 0 ? " today" : ""}` });
      const header = element("header");
      header.append(element("small", { text: date.toLocaleDateString("en-KE", { weekday: "short" }) }), element("strong", { text: String(date.getDate()) }), element("span", { text: String(dayItems.length) }));
      column.append(header);
      if (!dayItems.length) column.append(element("p", { className: "calendar-empty", text: "Open" }));
      else dayItems.slice(0, 4).forEach((item) => {
        const button = element("button", { className: `content-calendar-item status-${String(item.status || "idea").toLowerCase().replaceAll(" ", "-")}`, attrs: { type: "button" } });
        button.append(element("strong", { text: item.text || "Content" }), element("small", { text: item.platform || item.status || "Content" }));
        button.addEventListener("click", () => openContentDialog(item, button));
        column.append(button);
      });
      calendar.append(column);
    }
    section.append(calendar);
    const lower = element("div", { className: "content-calendar-lower" });
    const queue = element("article", { className: "growth-card content-queue-card" });
    queue.append(element("p", { className: "eyebrow", text: "Unscheduled queue" }), element("h3", { text: "Ideas waiting for a date" }));
    const queueList = element("div", { className: "content-queue-list" });
    if (!unscheduled.length) queueList.append(element("p", { className: "growth-empty", text: "Everything active has a date, or the queue is empty." }));
    unscheduled.slice(0, 12).forEach((item) => {
      const row = element("div");
      const copyNode = element("span");
      copyNode.append(element("strong", { text: item.text || "Content" }), element("small", { text: item.status || "Idea" }));
      const schedule = actionButton("Schedule");
      schedule.addEventListener("click", () => openContentDialog(item, schedule));
      row.append(copyNode, schedule);
      queueList.append(row);
    });
    queue.append(queueList);
    const pipeline = element("article", { className: "growth-card content-pipeline-card" });
    pipeline.append(element("p", { className: "eyebrow", text: "Pipeline" }), element("h3", { text: "Move content forward" }));
    const pipelineList = element("div", { className: "content-pipeline-list" });
    items.slice().sort((a, b) => (parseDate(a.publishDate)?.getTime() || Number.MAX_SAFE_INTEGER) - (parseDate(b.publishDate)?.getTime() || Number.MAX_SAFE_INTEGER)).slice(0, 12).forEach((item) => {
      const row = element("div");
      const copyNode = element("span");
      copyNode.append(element("strong", { text: item.text || "Content" }), element("small", { text: `${item.status || "Idea"}${item.publishDate ? ` · ${formatDate(item.publishDate, true)}` : ""}` }));
      const actions = element("span", { className: "suite-inline-actions" });
      const next = actionButton(item.status === "Posted" ? "Restore" : "Next");
      next.addEventListener("click", () => advanceContent(item));
      const edit = actionButton("Edit");
      edit.addEventListener("click", () => openContentDialog(item, edit));
      const duplicate = actionButton("Copy", "Duplicate content");
      duplicate.addEventListener("click", () => duplicateContent(item));
      actions.append(next, edit, duplicate);
      row.append(copyNode, actions);
      pipelineList.append(row);
    });
    pipeline.append(pipelineList);
    lower.append(queue, pipeline);
    section.append(lower);
    const contentHub = qs("#content");
    if (contentHub) contentHub.after(section);
    else qs("main.dashboard")?.append(section);
  }

  function findContent(state, id) {
    for (const key of ["ideas", "drafts"]) {
      const index = state.lists[key].findIndex((item) => item.id === id);
      if (index >= 0) return { key, index, item: state.lists[key][index] };
    }
    return null;
  }

  function openContentDialog(item, opener) {
    openDialog({
      eyebrow: "Content calendar",
      title: item ? "Edit content" : "Add content",
      description: "Choose a status and date that match what you can realistically publish.",
      fields: [
        { name: "text", label: "Idea or title", value: item?.text || "", required: true, maxlength: 300, placeholder: "What are you creating?" },
        { name: "platform", label: "Platform", type: "select", value: item?.platform || "Instagram", options: CONTENT_PLATFORMS },
        { name: "status", label: "Status", type: "select", value: item?.status || "Idea", options: CONTENT_STATUSES },
        { name: "publishDate", label: "Publish date", type: "date", value: item?.publishDate || "" },
        { name: "notes", label: "Notes", type: "textarea", value: item?.notes || item?.meta || "", maxlength: 1200, placeholder: "Hook, format, assets, or next step" }
      ],
      save(values) {
        const nextState = loadState();
        const found = item ? findContent(nextState, item.id) : null;
        const current = found ? nextState.lists[found.key].splice(found.index, 1)[0] : {};
        const status = CONTENT_STATUSES.includes(values.status) ? values.status : "Idea";
        const value = { ...current, id: current.id || createId(), text: String(values.text || "").trim().slice(0, 300), platform: CONTENT_PLATFORMS.includes(values.platform) ? values.platform : "Other", status, publishDate: String(values.publishDate || ""), notes: String(values.notes || "").slice(0, 1200), meta: `${values.platform || "Content"}${values.publishDate ? ` · ${formatDate(values.publishDate, true)}` : " · not scheduled"}`, updatedAt: new Date().toISOString() };
        nextState.lists[status === "Idea" ? "ideas" : "drafts"].push(value);
        closeDialog();
        saveState(nextState, item ? "Content updated." : "Content added.");
      }
    }, opener);
  }

  function advanceContent(item) {
    const state = loadState();
    const found = findContent(state, item.id);
    if (!found) return;
    const current = state.lists[found.key].splice(found.index, 1)[0];
    if (current.status === "Posted") current.status = "In progress";
    else current.status = CONTENT_STATUSES[Math.min(CONTENT_STATUSES.length - 1, CONTENT_STATUSES.indexOf(current.status || (found.key === "ideas" ? "Idea" : "In progress")) + 1)];
    state.lists[current.status === "Idea" ? "ideas" : "drafts"].push(current);
    saveState(state, "Content status updated.");
  }

  function duplicateContent(item) {
    const state = loadState();
    const found = findContent(state, item.id);
    if (!found) return;
    state.lists.ideas.push({ ...found.item, id: createId(), text: `${found.item.text || "Content"} — copy`.slice(0, 300), status: "Idea", publishDate: "", updatedAt: new Date().toISOString() });
    saveState(state, "Content duplicated as an idea.");
  }

  function buildWorkCenter() {
    qs("#workCenterPlus")?.remove();
    const state = loadState();
    const projects = state.suite.workProjects;
    const active = projects.filter((item) => item.status === "Active").length;
    const dueSoon = projects.filter((item) => item.status !== "Done" && item.dueDate && parseDate(item.dueDate) && daysBetween(today, parseDate(item.dueDate)) >= 0 && daysBetween(today, parseDate(item.dueDate)) <= 14).length;
    const value = projects.filter((item) => item.status !== "Done").reduce((sum, item) => sum + Number(item.value || 0), 0);
    const done = projects.filter((item) => item.status === "Done").length;
    const section = element("section", { className: "growth-center work-center-plus section", attrs: { id: "workCenterPlus", "aria-labelledby": "workCenterPlusTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Work project pipeline" }), element("h2", { text: "Keep clients, projects, and next actions visible.", attrs: { id: "workCenterPlusTitle" } }));
    const add = element("button", { className: "small-link", text: "＋ Add work project", attrs: { type: "button" } });
    add.addEventListener("click", () => openWorkDialog(null, add));
    heading.append(copy, add);
    section.append(heading, summaryCards([["Projects", projects.length, "All saved work"], ["Active", active, "Currently moving"], ["Due in 14 days", dueSoon, "Upcoming"], ["Open value", formatMoney(value), `${done} completed`]]));
    const board = element("div", { className: "work-pipeline-board" });
    WORK_STATUSES.forEach((status) => {
      const column = element("article", { className: `work-pipeline-column status-${status.toLowerCase()}` });
      const header = element("header");
      const items = projects.filter((item) => item.status === status);
      header.append(element("strong", { text: status }), element("span", { text: String(items.length) }));
      column.append(header);
      const list = element("div", { className: "work-project-list" });
      if (!items.length) list.append(element("p", { className: "pipeline-empty", text: "No projects here." }));
      items.forEach((project) => {
        const card = element("article", { className: "work-project-card" });
        card.append(element("small", { text: project.client || "Personal project" }), element("strong", { text: project.title || "Work project" }), element("p", { text: project.nextAction || project.notes || "Add the next action when it is clear." }));
        const meta = element("div", { className: "work-project-meta" });
        meta.append(element("span", { text: project.dueDate ? formatDate(project.dueDate, true) : "No deadline" }), element("span", { text: project.value ? formatMoney(project.value) : "No value set" }));
        const actions = element("div", { className: "suite-inline-actions" });
        const next = actionButton(status === "Done" ? "Restore" : "Next");
        next.addEventListener("click", () => advanceWorkProject(project));
        const edit = actionButton("Edit");
        edit.addEventListener("click", () => openWorkDialog(project, edit));
        const copyButton = actionButton("Copy");
        copyButton.addEventListener("click", () => duplicateWorkProject(project));
        const remove = actionButton("Delete", `Delete ${project.title}`, "suite-mini-button suite-danger-text");
        remove.addEventListener("click", () => twoStep(remove, "Delete?", () => {
          const nextState = loadState();
          nextState.suite.workProjects = nextState.suite.workProjects.filter((item) => item.id !== project.id);
          saveState(nextState, "Work project deleted.");
        }));
        actions.append(next, edit, copyButton, remove);
        card.append(meta, actions);
        list.append(card);
      });
      column.append(list);
      board.append(column);
    });
    section.append(board);
    const workHub = qs("#workHub");
    if (workHub) workHub.after(section);
    else qs("main.dashboard")?.append(section);
  }

  function openWorkDialog(item, opener) {
    openDialog({
      eyebrow: "Work pipeline",
      title: item ? "Edit work project" : "Add work project",
      description: "Keep the next useful action clearer than the whole project.",
      fields: [
        { name: "title", label: "Project", value: item?.title || "", required: true, maxlength: 200 },
        { name: "client", label: "Client or business", value: item?.client || "", maxlength: 160 },
        { name: "status", label: "Status", type: "select", value: item?.status || "Idea", options: WORK_STATUSES },
        { name: "dueDate", label: "Due date", type: "date", value: item?.dueDate || "" },
        { name: "value", label: "Estimated value (KSh)", type: "number", value: item?.value || "", min: 0, max: 100000000, step: 1 },
        { name: "nextAction", label: "Next action", value: item?.nextAction || "", maxlength: 300, placeholder: "The next concrete step" },
        { name: "notes", label: "Notes", type: "textarea", value: item?.notes || "", maxlength: 1600 }
      ],
      validate(values) {
        const amount = values.value === "" ? 0 : Number(values.value);
        return Number.isFinite(amount) && amount >= 0 && amount <= 100000000 ? "" : "Enter a valid project value.";
      },
      save(values) {
        const nextState = loadState();
        const target = item ? nextState.suite.workProjects.find((entry) => entry.id === item.id) : null;
        const value = { ...(target || {}), id: target?.id || createId(), title: String(values.title || "").trim().slice(0, 200), client: String(values.client || "").slice(0, 160), status: WORK_STATUSES.includes(values.status) ? values.status : "Idea", dueDate: String(values.dueDate || ""), value: Number(values.value || 0), nextAction: String(values.nextAction || "").slice(0, 300), notes: String(values.notes || "").slice(0, 1600), updatedAt: new Date().toISOString() };
        if (target) Object.assign(target, value);
        else nextState.suite.workProjects.push(value);
        closeDialog();
        saveState(nextState, item ? "Work project updated." : "Work project added.");
      }
    }, opener);
  }

  function advanceWorkProject(project) {
    const state = loadState();
    const target = state.suite.workProjects.find((item) => item.id === project.id);
    if (!target) return;
    if (target.status === "Done") target.status = "Active";
    else target.status = WORK_STATUSES[Math.min(WORK_STATUSES.length - 1, WORK_STATUSES.indexOf(target.status || "Idea") + 1)];
    saveState(state, "Project status updated.");
  }

  function duplicateWorkProject(project) {
    const state = loadState();
    state.suite.workProjects.push({ ...project, id: createId(), title: `${project.title || "Project"} — copy`.slice(0, 200), status: "Idea", dueDate: "", updatedAt: new Date().toISOString() });
    saveState(state, "Work project duplicated.");
  }

  function buildConnectionsCenter() {
    qs("#connectionsCenter")?.remove();
    const state = loadState();
    const people = state.lists.people;
    const overdue = people.filter((person) => person.nextContact && parseDate(person.nextContact) && parseDate(person.nextContact) < new Date(today.getFullYear(), today.getMonth(), today.getDate())).length;
    const nextSeven = people.filter((person) => person.nextContact && parseDate(person.nextContact) && daysBetween(today, parseDate(person.nextContact)) >= 0 && daysBetween(today, parseDate(person.nextContact)) <= 7).length;
    const contactedMonth = people.filter((person) => {
      const date = parseDate(person.lastContact);
      return date && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
    }).length;
    const section = element("section", { className: "growth-center connections-center section", attrs: { id: "connectionsCenter", "aria-labelledby": "connectionsCenterTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "People follow-up centre" }), element("h2", { text: "Remember people without turning care into pressure.", attrs: { id: "connectionsCenterTitle" } }));
    const add = element("button", { className: "small-link", text: "＋ Add person", attrs: { type: "button" } });
    add.addEventListener("click", () => openPersonDialog(null, add));
    heading.append(copy, add);
    section.append(heading, summaryCards([["People", people.length, "Saved connections"], ["Check in soon", nextSeven, "Next 7 days"], ["Needs attention", overdue, "Past follow-up date"], ["Contacted this month", contactedMonth, "Logged check-ins"]]));
    const controls = element("div", { className: "connection-controls" });
    const search = element("input", { attrs: { type: "search", id: "connectionSearch", placeholder: "Search people", autocomplete: "off", "aria-label": "Search people" } });
    const filter = select("groupFilter", [{ value: "All", label: "All groups" }, ...PEOPLE_GROUPS], "All");
    controls.append(search, filter);
    section.append(controls);
    const list = element("div", { className: "connection-followup-grid", attrs: { id: "connectionFollowupGrid" } });
    section.append(list);
    function render() {
      const query = search.value.trim().toLowerCase();
      const group = filter.value;
      const rows = loadState().lists.people.filter((person) => group === "All" || (person.group || "Other") === group).filter((person) => !query || `${person.name || ""} ${person.meta || ""} ${person.notes || ""}`.toLowerCase().includes(query)).sort((a, b) => (parseDate(a.nextContact)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.nextContact)?.getTime() ?? Number.MAX_SAFE_INTEGER) || String(a.name || "").localeCompare(String(b.name || "")));
      list.replaceChildren();
      if (!rows.length) { list.append(element("p", { className: "growth-empty", text: "No people match this view." })); return; }
      rows.forEach((person) => {
        const card = element("article", { className: "connection-followup-card" });
        const avatar = element("span", { className: "connection-avatar", text: person.initial || String(person.name || "?").charAt(0).toUpperCase() });
        const copyNode = element("div", { className: "connection-followup-copy" });
        copyNode.append(element("small", { text: person.group || "Other" }), element("strong", { text: person.name || "Person" }), element("p", { text: person.notes || person.meta || "Add a note about how you want to stay connected." }));
        const dates = element("div", { className: "connection-dates" });
        dates.append(element("span", { text: `Last: ${person.lastContact ? formatDate(person.lastContact, true) : "Not logged"}` }), element("span", { text: `Next: ${person.nextContact ? formatDate(person.nextContact, true) : "Open"}` }));
        const actions = element("div", { className: "suite-inline-actions" });
        const logged = actionButton("Contacted");
        logged.addEventListener("click", () => {
          const nextState = loadState();
          const target = nextState.lists.people.find((item) => item.id === person.id);
          if (!target) return;
          target.lastContact = dateKey;
          const currentNext = parseDate(target.nextContact);
          if (!currentNext || currentNext <= today) target.nextContact = localDateKey(addDays(today, 14));
          saveState(nextState, `Contact with ${target.name || "person"} logged.`);
        });
        const edit = actionButton("Edit");
        edit.addEventListener("click", () => openPersonDialog(person, edit));
        const remove = actionButton("Delete", `Delete ${person.name}`, "suite-mini-button suite-danger-text");
        remove.addEventListener("click", () => twoStep(remove, "Delete?", () => {
          const nextState = loadState();
          nextState.lists.people = nextState.lists.people.filter((item) => item.id !== person.id);
          saveState(nextState, "Person deleted.");
        }));
        actions.append(logged, edit, remove);
        card.append(avatar, copyNode, dates, actions);
        list.append(card);
      });
    }
    search.addEventListener("input", render);
    filter.addEventListener("change", render);
    render();
    const peopleHub = qs("#peopleHub");
    if (peopleHub) peopleHub.after(section);
    else qs("main.dashboard")?.append(section);
  }

  function openPersonDialog(item, opener) {
    openDialog({
      eyebrow: "People follow-up",
      title: item ? "Edit person" : "Add person",
      description: "Dates are optional. Use them only when reminders make staying connected easier.",
      fields: [
        { name: "name", label: "Name or nickname", value: item?.name || "", required: true, maxlength: 160 },
        { name: "group", label: "Group", type: "select", value: item?.group || inferGroup(item?.meta), options: PEOPLE_GROUPS },
        { name: "lastContact", label: "Last contact", type: "date", value: item?.lastContact || "" },
        { name: "nextContact", label: "Next check-in", type: "date", value: item?.nextContact || "" },
        { name: "notes", label: "Connection note", type: "textarea", value: item?.notes || item?.meta || "", maxlength: 1200, placeholder: "What helps this relationship feel cared for?" }
      ],
      save(values) {
        const nextState = loadState();
        const target = item ? nextState.lists.people.find((entry) => entry.id === item.id) : null;
        const name = String(values.name || "").trim().slice(0, 160);
        const value = { ...(target || {}), id: target?.id || createId(), name, initial: name.charAt(0).toUpperCase(), group: PEOPLE_GROUPS.includes(values.group) ? values.group : "Other", lastContact: String(values.lastContact || ""), nextContact: String(values.nextContact || ""), notes: String(values.notes || "").slice(0, 1200), meta: `${values.group || "Other"} · ${String(values.notes || "Keep in touch").slice(0, 200)}`, action: "Check in →", tone: target?.tone || "peach" };
        if (target) Object.assign(target, value);
        else nextState.lists.people.push(value);
        closeDialog();
        saveState(nextState, item ? "Person updated." : "Person added.");
      }
    }, opener);
  }

  function inferGroup(meta = "") {
    const text = String(meta).toLowerCase();
    if (text.includes("family")) return "Family";
    if (text.includes("friend")) return "Friend";
    if (text.includes("relationship")) return "Relationship";
    if (text.includes("class")) return "Classmate";
    if (text.includes("work") || text.includes("colleague")) return "Colleague";
    return "Other";
  }

  function resourceDataFromDom() {
    return qsa("#resourceList .resource-card").map((card) => ({ id: createId(), title: qs("h3", card)?.textContent.trim() || "Resource", category: qs(".resource-category", card)?.textContent.trim() || "Personal", url: qs("a.resource-link", card)?.getAttribute("href") || "", note: qs("p", card)?.textContent.trim() || "", pinned: qs(".resource-pin-button", card)?.getAttribute("aria-pressed") === "true" }));
  }

  function loadResourceData() {
    const stored = safeParse(localStorage.getItem(RESOURCE_KEY), null);
    return Array.isArray(stored) ? stored : resourceDataFromDom();
  }

  function buildResourceOrganizer() {
    const resourcesSection = qs("#resources");
    const list = qs("#resourceList");
    if (!resourcesSection || !list) return false;
    if (!list.children.length && localStorage.getItem(RESOURCE_KEY) === null) return false;
    qs("#resourceOrganizer")?.remove();
    const resources = loadResourceData();
    const links = resources.filter((item) => item.url).length;
    const pinned = resources.filter((item) => item.pinned).length;
    const duplicateKeys = new Map();
    resources.forEach((item) => {
      const key = `${String(item.title || "").trim().toLowerCase()}|${String(item.url || "").trim().toLowerCase()}`;
      duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
    });
    const duplicates = [...duplicateKeys.values()].reduce((sum, count) => sum + Math.max(0, count - 1), 0);
    const organizer = element("article", { className: "resource-organizer", attrs: { id: "resourceOrganizer" } });
    const heading = element("div", { className: "resource-organizer-heading" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Resource organizer" }), element("h3", { text: "Keep the library tidy and portable." }));
    const actions = element("div", { className: "resource-organizer-actions" });
    const exportButton = element("button", { className: "suite-secondary-button", text: "Export resources", attrs: { type: "button" } });
    const importButton = element("button", { className: "suite-secondary-button", text: "Import resources", attrs: { type: "button" } });
    const cleanButton = element("button", { className: "suite-secondary-button", text: "Clean duplicates", attrs: { type: "button", disabled: duplicates ? null : "" } });
    const file = element("input", { className: "sr-only", attrs: { type: "file", accept: ".json,application/json", id: "resourceOrganizerImport" } });
    actions.append(exportButton, importButton, cleanButton, file);
    heading.append(copy, actions);
    organizer.append(heading, summaryCards([["Resources", resources.length, "Saved items"], ["Links & contacts", links, "Openable"], ["Pinned", pinned, "Prioritised"], ["Duplicates", duplicates, "Matching title and link"]]));
    exportButton.addEventListener("click", () => downloadText(`my-little-life-resources-${dateKey}.json`, JSON.stringify(resources, null, 2), "application/json"));
    importButton.addEventListener("click", () => file.click());
    file.addEventListener("change", async () => {
      const selected = file.files?.[0];
      if (!selected || selected.size > 2 * 1024 * 1024) { showToast("Choose a resource backup smaller than 2 MB."); return; }
      try {
        const parsed = safeParse(await selected.text(), null);
        if (!Array.isArray(parsed)) throw new Error("Not a resource list");
        localStorage.setItem(RESOURCE_KEY, JSON.stringify(parsed.map((item) => normalizeResource(item)).filter(Boolean)));
        sessionStorage.setItem(NOTICE_KEY, "Resources imported.");
        globalThis.location.reload();
      } catch {
        showToast("That file is not a valid resource list.");
      } finally {
        file.value = "";
      }
    });
    cleanButton.addEventListener("click", () => twoStep(cleanButton, "Clean now?", () => {
      const seen = new Map();
      resources.forEach((item) => {
        const key = `${String(item.title || "").trim().toLowerCase()}|${String(item.url || "").trim().toLowerCase()}`;
        const previous = seen.get(key);
        if (!previous || (!previous.pinned && item.pinned)) seen.set(key, item);
      });
      localStorage.setItem(RESOURCE_KEY, JSON.stringify([...seen.values()]));
      sessionStorage.setItem(NOTICE_KEY, "Duplicate resources cleaned.");
      globalThis.location.reload();
    }));
    const toolbar = qs(".resources-toolbar", resourcesSection);
    if (toolbar) toolbar.after(organizer);
    else resourcesSection.prepend(organizer);
    decorateResourceCards();
    new MutationObserver(() => decorateResourceCards()).observe(list, { childList: true });
    return true;
  }

  function normalizeResource(item) {
    if (!item || typeof item !== "object") return null;
    const title = String(item.title || "").trim().slice(0, 120);
    if (!title) return null;
    const category = ["Study", "Wellbeing", "Money", "Career", "Personal"].includes(item.category) ? item.category : "Personal";
    let url = String(item.url || "").trim();
    if (url) {
      try {
        const parsed = new URL(url, globalThis.location.href);
        if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol) && !url.startsWith("#")) url = "";
      } catch {
        if (!url.startsWith("#")) url = "";
      }
    }
    return { id: String(item.id || createId()), title, category, url, note: String(item.note || "").slice(0, 500), pinned: Boolean(item.pinned) };
  }

  function decorateResourceCards() {
    qsa("#resourceList .resource-card").forEach((card) => {
      if (card.dataset.organized === "true") return;
      card.dataset.organized = "true";
      const title = qs("h3", card)?.textContent.trim() || "";
      const category = qs(".resource-category", card)?.textContent.trim() || "Personal";
      const edit = actionButton("Edit", `Edit ${title}`, "resource-edit-button");
      edit.addEventListener("click", () => {
        const resources = loadResourceData();
        const item = resources.find((resource) => resource.title === title && resource.category === category) || { id: createId(), title, category, url: qs("a.resource-link", card)?.getAttribute("href") || "", note: qs("p", card)?.textContent.trim() || "", pinned: qs(".resource-pin-button", card)?.getAttribute("aria-pressed") === "true" };
        openResourceEditDialog(item, edit);
      });
      qs(".resource-actions", card)?.prepend(edit);
    });
  }

  function openResourceEditDialog(item, opener) {
    openDialog({
      eyebrow: "Resource organizer",
      title: "Edit resource",
      description: "Update the saved title, category, link, or note.",
      fields: [
        { name: "title", label: "Title", value: item.title || "", required: true, maxlength: 120 },
        { name: "category", label: "Category", type: "select", value: item.category || "Personal", options: ["Study", "Wellbeing", "Money", "Career", "Personal"] },
        { name: "url", label: "Link or contact", value: item.url || "", maxlength: 500 },
        { name: "note", label: "Note", type: "textarea", value: item.note || "", maxlength: 500 },
        { name: "pinned", label: "Pinned", type: "select", value: item.pinned ? "Yes" : "No", options: ["No", "Yes"] }
      ],
      save(values) {
        const resources = loadResourceData();
        const index = resources.findIndex((resource) => resource.id === item.id || (resource.title === item.title && resource.category === item.category));
        const normalized = normalizeResource({ ...item, title: values.title, category: values.category, url: values.url, note: values.note, pinned: values.pinned === "Yes" });
        if (!normalized) return;
        if (index >= 0) resources[index] = normalized;
        else resources.push(normalized);
        localStorage.setItem(RESOURCE_KEY, JSON.stringify(resources));
        closeDialog();
        sessionStorage.setItem(NOTICE_KEY, "Resource updated.");
        globalThis.location.reload();
      }
    }, opener);
  }

  function addCenterSettings() {
    const form = qs("#settingsForm");
    const section = qs("#settings");
    if (!form || !section || qs("#suiteCenterSettings")) return;
    const state = loadState();
    const card = element("article", { className: "settings-card settings-card-wide", attrs: { id: "suiteCenterSettings" } });
    card.append(element("p", { className: "eyebrow", text: "Expanded centres" }), element("h3", { text: "Choose which new centres stay visible" }), element("p", { className: "settings-card-copy", text: "Hidden centres keep all saved data and can be restored here." }));
    const grid = element("div", { className: "settings-toggle-grid" });
    CENTER_OPTIONS.forEach(([id, labelText]) => {
      const label = element("label", { className: "settings-toggle" });
      const checkbox = element("input", { attrs: { type: "checkbox", name: `suite-visible-${id}`, value: id } });
      checkbox.checked = !state.suite.hiddenCenters.includes(id);
      const copyNode = element("span");
      copyNode.append(element("strong", { text: labelText }), element("small", { text: "Show this centre on the dashboard." }));
      label.append(checkbox, copyNode);
      grid.append(label);
    });
    card.append(grid);
    const dataCard = qs(".settings-data-card", section);
    if (dataCard) dataCard.before(card);
    else form.append(card);
    form.addEventListener("submit", () => {
      const nextState = loadState();
      nextState.suite.hiddenCenters = CENTER_OPTIONS.filter(([id]) => !qs(`[name="suite-visible-${id}"]`, form)?.checked).map(([id]) => id);
      captureUnsavedFields(nextState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }, { capture: true });
  }

  function applyCenterVisibility() {
    const state = loadState();
    CENTER_OPTIONS.forEach(([id]) => {
      const section = qs(`#${id}`);
      if (section) section.hidden = state.suite.hiddenCenters.includes(id);
    });
  }

  function retargetNavigation() {
    const mappings = { "#content": ["#contentCalendar", "Content calendar"], "#schoolHub": ["#studyCenterPlus", "Study centre"], "#workHub": ["#workCenterPlus", "Work projects"], "#peopleHub": ["#connectionsCenter", "People follow-up"] };
    Object.entries(mappings).forEach(([oldHref, [newHref, label]]) => {
      const link = qs(`.sidebar nav a[href="${oldHref}"]`);
      if (!link) return;
      link.setAttribute("href", newHref);
      const icon = qs("span", link)?.textContent || "";
      link.replaceChildren(element("span", { text: icon }), document.createTextNode(` ${label}`));
    });
  }

  ensureStyles();
  createDialog();
  buildStudyCenter();
  buildContentCalendar();
  buildWorkCenter();
  buildConnectionsCenter();
  retargetNavigation();
  let resourceAttempts = 0;
  const resourceTimer = setInterval(() => {
    resourceAttempts += 1;
    if (buildResourceOrganizer() || resourceAttempts > 30) clearInterval(resourceTimer);
  }, 100);
  addCenterSettings();
  applyCenterVisibility();
  const notice = sessionStorage.getItem(NOTICE_KEY);
  if (notice) {
    sessionStorage.removeItem(NOTICE_KEY);
    showToast(notice);
  }
})();
