"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const RESOURCE_KEY = "myLittleLife.resources.v1";
  const HISTORY_KEY = "myLittleLife.changeHistory.v1";
  const BACKUP_KEY = "myLittleLife.autoBackups.v1";
  const NOTICE_KEY = "myLittleLife.commandNotice";
  const TRACKED_KEYS = new Set([STORAGE_KEY, RESOURCE_KEY]);
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pad = (value) => String(value).padStart(2, "0");
  const today = new Date();
  const dateKey = localDateKey(today);
  let historyGuard = false;

  function localDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDate(value) {
    if (!value) return null;
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
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
    state.lists = state.lists && typeof state.lists === "object" ? state.lists : {};
    [
      "tasks", "planner", "classes", "ideas", "drafts", "people", "study",
      "units", "research", "businesses", "workGoals", "workLogs", "social",
      "accounts", "relationshipItems"
    ].forEach((key) => {
      state.lists[key] = Array.isArray(state.lists[key]) ? state.lists[key] : [];
    });
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.finances = state.finances && typeof state.finances === "object" ? state.finances : {};
    state.finances.income = Array.isArray(state.finances.income) ? state.finances.income : [];
    state.finances.goals = Array.isArray(state.finances.goals) ? state.finances.goals : [];
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
    state.daily[dateKey] = {
      mood: "",
      habits: [false, false, false, false],
      wellbeing: {},
      meals: {},
      feeling: "",
      gratitude: "",
      memory: "",
      quickNote: "",
      ...existing
    };
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

  function formatDate(value, options = {}) {
    const parsed = typeof value === "string" ? parseDate(value) || new Date(value) : value;
    if (!(parsed instanceof Date) || Number.isNaN(parsed.getTime())) return "No date";
    return parsed.toLocaleDateString("en-KE", options.short
      ? { day: "numeric", month: "short" }
      : { weekday: "short", day: "numeric", month: "short" });
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
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function announce(message) {
    const live = qs("#suiteLiveRegion");
    if (!live) return;
    live.textContent = "";
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function allExpenses(state) {
    return Object.values(state.weekly).flatMap((week) => Array.isArray(week?.expenses) ? week.expenses : []);
  }

  function monthExpenses(state, key = monthKey(today)) {
    return allExpenses(state).filter((entry) => {
      const date = new Date(entry?.createdAt || entry?.date || "");
      return !Number.isNaN(date.getTime()) && monthKey(date) === key;
    });
  }

  function eventOccurrence(item, startDate = today, horizon = 14) {
    if (item?.date) {
      const parsed = parseDate(item.date);
      if (!parsed) return null;
      if (!item.recurring) return parsed;
      const diff = daysBetween(parsed, startDate);
      if (diff <= 0) {
        const weeks = Math.ceil(Math.abs(diff) / 7);
        const candidate = new Date(parsed);
        candidate.setDate(candidate.getDate() + weeks * 7);
        while (candidate < new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())) {
          candidate.setDate(candidate.getDate() + 7);
        }
        return candidate;
      }
      return parsed;
    }
    const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
      .findIndex((day) => day.toLowerCase() === String(item?.day || "").toLowerCase());
    if (weekday < 0) return null;
    const candidate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    candidate.setDate(candidate.getDate() + ((weekday - candidate.getDay() + 7) % 7));
    return daysBetween(startDate, candidate) <= horizon ? candidate : null;
  }

  function derivedReminders(state) {
    const reminders = [];
    const now = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const add = (item) => reminders.push({ id: item.id || createId(), ...item });
    state.suite.reminders.forEach((reminder) => {
      if (reminder?.done) return;
      const date = parseDate(reminder.date);
      add({
        id: reminder.id,
        kind: "manual",
        title: String(reminder.title || "Reminder"),
        detail: String(reminder.note || "Personal reminder"),
        date: reminder.date || "",
        section: reminder.section || "#reminderCenter",
        sourceId: reminder.id,
        urgency: date && date < now ? "overdue" : date && daysBetween(now, date) <= 2 ? "soon" : "normal"
      });
    });
    ["tasks", "planner"].forEach((listKey) => {
      state.lists[listKey].forEach((task) => {
        if (task?.done || !task?.date) return;
        const date = parseDate(task.date);
        if (!date) return;
        const diff = daysBetween(now, date);
        if (diff > 7) return;
        add({
          kind: "task",
          title: task.text || "Task",
          detail: diff < 0 ? `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue` : diff === 0 ? "Due today" : `Due in ${diff} days`,
          date: task.date,
          section: "#plannerCenter",
          urgency: diff < 0 ? "overdue" : diff <= 1 ? "soon" : "normal"
        });
      });
    });
    state.suite.assessments.forEach((assessment) => {
      if (assessment?.status === "Done" || !assessment?.dueDate) return;
      const date = parseDate(assessment.dueDate);
      if (!date) return;
      const diff = daysBetween(now, date);
      if (diff > 14) return;
      add({
        kind: "study",
        title: assessment.title || "Assessment",
        detail: diff < 0 ? "Assessment overdue" : diff === 0 ? "Due today" : `Due in ${diff} days`,
        date: assessment.dueDate,
        section: "#studyCenterPlus",
        urgency: diff < 0 ? "overdue" : diff <= 2 ? "soon" : "normal"
      });
    });
    state.lists.people.forEach((person) => {
      if (!person?.nextContact) return;
      const date = parseDate(person.nextContact);
      if (!date) return;
      const diff = daysBetween(now, date);
      if (diff > 7) return;
      add({
        kind: "people",
        title: `Check in with ${person.name || "someone"}`,
        detail: diff < 0 ? "Follow-up is overdue" : diff === 0 ? "Planned for today" : `In ${diff} days`,
        date: person.nextContact,
        section: "#connectionsCenter",
        urgency: diff < 0 ? "overdue" : diff <= 1 ? "soon" : "normal"
      });
    });
    [...state.lists.ideas, ...state.lists.drafts].forEach((item) => {
      if (!item?.publishDate || item?.status === "Posted") return;
      const date = parseDate(item.publishDate);
      if (!date) return;
      const diff = daysBetween(now, date);
      if (diff > 7) return;
      add({
        kind: "content",
        title: item.text || "Content",
        detail: diff < 0 ? "Publishing date passed" : diff === 0 ? "Scheduled today" : `Scheduled in ${diff} days`,
        date: item.publishDate,
        section: "#contentCalendar",
        urgency: diff < 0 ? "overdue" : diff <= 1 ? "soon" : "normal"
      });
    });
    return reminders.sort((a, b) => {
      const first = parseDate(a.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const second = parseDate(b.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return first - second || a.title.localeCompare(b.title);
    });
  }

  function installHistoryCapture() {
    if (globalThis.__littleLifeHistoryCaptureInstalled) return;
    globalThis.__littleLifeHistoryCaptureInstalled = true;
    const previousSetItem = Storage.prototype.setItem;
    const previousRemoveItem = Storage.prototype.removeItem;
    function pushHistory(key, previousValue, nextValue, action) {
      if (historyGuard || !TRACKED_KEYS.has(key) || previousValue === nextValue) return;
      const history = safeParse(sessionStorage.getItem(HISTORY_KEY), []);
      const items = Array.isArray(history) ? history : [];
      items.unshift({ id: createId(), key, previousValue, nextValue, action, at: new Date().toISOString() });
      historyGuard = true;
      try {
        sessionStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 20)));
      } finally {
        historyGuard = false;
      }
    }
    Storage.prototype.setItem = function setItem(key, value) {
      const previousValue = this === localStorage ? this.getItem(key) : null;
      const result = previousSetItem.call(this, key, value);
      if (this === localStorage) pushHistory(key, previousValue, String(value), "Updated");
      return result;
    };
    Storage.prototype.removeItem = function removeItem(key) {
      const previousValue = this === localStorage ? this.getItem(key) : null;
      const result = previousRemoveItem.call(this, key);
      if (this === localStorage) pushHistory(key, previousValue, null, "Removed");
      return result;
    };
    globalThis.__littleLifeHistoryRestore = (entry) => {
      historyGuard = true;
      try {
        if (entry.previousValue === null) previousRemoveItem.call(localStorage, entry.key);
        else previousSetItem.call(localStorage, entry.key, entry.previousValue);
      } finally {
        historyGuard = false;
      }
    };
  }

  function createAutomaticBackup() {
    const dashboardData = localStorage.getItem(STORAGE_KEY) || "{}";
    const resourceData = localStorage.getItem(RESOURCE_KEY) || "[]";
    if (dashboardData.length > 2_000_000 || resourceData.length > 750_000) return;
    const existing = safeParse(localStorage.getItem(BACKUP_KEY), []);
    const backups = Array.isArray(existing) ? existing : [];
    const latest = backups[0];
    const same = latest?.dashboardData === dashboardData && latest?.resourceData === resourceData;
    const recent = latest?.at && Date.now() - new Date(latest.at).getTime() < 6 * 60 * 60 * 1000;
    if (same && recent) return;
    backups.unshift({ id: createId(), at: new Date().toISOString(), dashboardData, resourceData, size: dashboardData.length + resourceData.length });
    historyGuard = true;
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backups.slice(0, 5)));
    } catch (error) {
      console.warn("Automatic local backup could not be saved.", error);
    } finally {
      historyGuard = false;
    }
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
    announce("Click the button again to confirm.");
    clearTimeout(button.armTimer);
    button.armTimer = setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalText || button.textContent;
    }, 5000);
  }

  function ensureAccessibilityShell() {
    if (!qs("#suiteSkipLink")) {
      document.body.prepend(element("a", { className: "suite-skip-link", text: "Skip to dashboard content", attrs: { id: "suiteSkipLink", href: "#home" } }));
    }
    if (!qs("#suiteLiveRegion")) {
      document.body.append(element("div", { className: "sr-only", attrs: { id: "suiteLiveRegion", role: "status", "aria-live": "polite", "aria-atomic": "true" } }));
    }
    const main = qs("main.dashboard");
    if (main && !main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    if (!qs("#backToTop")) {
      const button = element("button", { className: "suite-back-top", text: "↑", attrs: { id: "backToTop", type: "button", "aria-label": "Back to top", title: "Back to top" } });
      button.addEventListener("click", () => {
        globalThis.scrollTo({ top: 0, behavior: "smooth" });
        qs("#home")?.focus({ preventScroll: true });
      });
      document.body.append(button);
      globalThis.addEventListener("scroll", () => button.classList.toggle("show", globalThis.scrollY > 650), { passive: true });
    }
  }

  function setupMobileNavigation() {
    const sidebar = qs(".sidebar");
    const topbar = qs(".topbar");
    if (!sidebar || !topbar || qs("#mobileNavToggle")) return;
    sidebar.setAttribute("id", "dashboardSidebar");
    const toggle = element("button", { className: "suite-mobile-nav-toggle", text: "☰", attrs: { id: "mobileNavToggle", type: "button", "aria-label": "Open dashboard navigation", "aria-controls": "dashboardSidebar", "aria-expanded": "false" } });
    topbar.prepend(toggle);
    function setOpen(open) {
      sidebar.classList.toggle("mobile-open", open);
      document.body.classList.toggle("suite-nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "×" : "☰";
      toggle.setAttribute("aria-label", open ? "Close dashboard navigation" : "Open dashboard navigation");
    }
    toggle.addEventListener("click", () => setOpen(!sidebar.classList.contains("mobile-open")));
    qsa("nav a", sidebar).forEach((link) => link.addEventListener("click", () => setOpen(false)));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sidebar.classList.contains("mobile-open")) setOpen(false);
    });
  }

  function addTopbarActions(reminderCount) {
    const topbar = qs(".topbar");
    if (!topbar) return {};
    let group = qs("#suiteTopbarActions");
    if (!group) {
      group = element("div", { className: "suite-topbar-actions", attrs: { id: "suiteTopbarActions" } });
      const avatar = qs(".avatar", topbar);
      if (avatar) avatar.before(group);
      else topbar.append(group);
    }
    group.replaceChildren();
    const command = element("button", { className: "suite-icon-button", text: "⌘", attrs: { type: "button", id: "openCommandPalette", "aria-label": "Open search and commands", title: "Search and commands (Ctrl/⌘ K)" } });
    const reminders = element("button", { className: "suite-icon-button suite-reminder-button", text: "◌", attrs: { type: "button", id: "openReminderCenter", "aria-label": `Open reminders, ${reminderCount} active`, title: "Reminders" } });
    if (reminderCount) reminders.append(element("span", { className: "suite-notification-badge", text: String(Math.min(99, reminderCount)) }));
    group.append(command, reminders);
    return { command, reminders };
  }

  function buildTodayCenter(state, reminders) {
    qs("#todayCenter")?.remove();
    const day = state.daily[dateKey] || {};
    const dueToday = [...state.lists.tasks, ...state.lists.planner].filter((task) => !task?.done && task?.date === dateKey).length;
    const unscheduledFocus = state.lists.tasks.filter((task) => !task?.done && !task?.date).length;
    const events = state.lists.classes.map((item) => ({ item, date: eventOccurrence(item) })).filter((entry) => entry.date && daysBetween(today, entry.date) >= 0).sort((a, b) => a.date - b.date);
    const nextEvent = events[0];
    const expenses = monthExpenses(state).reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const income = state.finances.income.filter((item) => {
      const parsed = new Date(item?.date || item?.createdAt || "");
      return !Number.isNaN(parsed.getTime()) && monthKey(parsed) === monthKey(today);
    }).reduce((sum, item) => sum + Number(item?.amount || 0), 0);
    const rhythm = day.rhythm || {};
    const section = element("section", { className: "suite-today-center section", attrs: { id: "todayCenter", "aria-labelledby": "todayCenterTitle" } });
    const title = element("div", { className: "section-title suite-today-heading" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Today at a glance" }), element("h2", { text: "The parts of today that need your attention.", attrs: { id: "todayCenterTitle" } }));
    const openPalette = element("button", { className: "small-link", text: "Search everything ⌘K", attrs: { type: "button" } });
    openPalette.addEventListener("click", () => qs("#openCommandPalette")?.click());
    title.append(copy, openPalette);
    section.append(title);
    const grid = element("div", { className: "suite-today-grid" });
    const cards = [
      { label: "Tasks", value: dueToday ? `${dueToday} due today` : unscheduledFocus ? `${unscheduledFocus} focus item${unscheduledFocus === 1 ? "" : "s"}` : "Nothing urgent", note: dueToday ? "Open your agenda and choose the next step." : "Your task list has breathing room.", href: "#plannerCenter", icon: "✓" },
      { label: "Next event", value: nextEvent ? nextEvent.item.subject || "Upcoming event" : "No event scheduled", note: nextEvent ? `${formatDate(nextEvent.date)}${nextEvent.item.time ? ` · ${nextEvent.item.time}` : ""}` : "Add a class, appointment, or study block.", href: "#plannerCenter", icon: "▤" },
      { label: "Check-in", value: day.mood || "Mood not logged", note: rhythm.sleep ? `${rhythm.sleep}h sleep · ${rhythm.water || 0} water` : "A quick honest check-in is enough.", href: "#trackers", icon: "♡" },
      { label: "Money this month", value: formatMoney(income - expenses), note: `${formatMoney(income)} in · ${formatMoney(expenses)} out`, href: "#financeCenter", icon: "₵" },
      { label: "Reminders", value: reminders.length ? `${reminders.length} active` : "All clear", note: reminders[0]?.title || "Nothing needs a nudge right now.", href: "#reminderCenter", icon: "◌" }
    ];
    cards.forEach((card) => {
      const article = element("a", { className: "suite-summary-card", attrs: { href: card.href } });
      article.append(element("span", { className: "suite-summary-icon", text: card.icon }), element("small", { text: card.label }), element("strong", { text: card.value }), element("p", { text: card.note }));
      grid.append(article);
    });
    section.append(grid);
    const welcome = qs(".welcome-card");
    if (welcome) welcome.after(section);
    else qs("main.dashboard")?.prepend(section);
  }

  function createSuiteDialog() {
    if (qs("#suiteDialog")) return qs("#suiteDialog");
    const dialog = element("div", { className: "suite-dialog", attrs: { id: "suiteDialog", role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "suiteDialogTitle" } });
    const backdrop = element("button", { className: "suite-dialog-backdrop", attrs: { type: "button", "aria-label": "Close dialog" } });
    const card = element("form", { className: "suite-dialog-card", attrs: { id: "suiteDialogForm", novalidate: "" } });
    const close = element("button", { className: "suite-dialog-close", text: "×", attrs: { type: "button", "aria-label": "Close dialog" } });
    card.append(close, element("p", { className: "eyebrow", text: "Dashboard tool" }), element("h2", { attrs: { id: "suiteDialogTitle" } }), element("p", { className: "suite-dialog-description", attrs: { id: "suiteDialogDescription" } }), element("div", { className: "suite-dialog-fields", attrs: { id: "suiteDialogFields" } }), element("p", { className: "suite-dialog-error", attrs: { id: "suiteDialogError", role: "alert" } }));
    const footer = element("div", { className: "suite-dialog-footer" });
    const cancel = element("button", { className: "suite-secondary-button", text: "Cancel", attrs: { type: "button" } });
    const submit = element("button", { className: "save-button", text: "Save →", attrs: { type: "submit", id: "suiteDialogSubmit" } });
    footer.append(cancel, submit);
    card.append(footer);
    dialog.append(backdrop, card);
    document.body.append(dialog);
    [backdrop, close, cancel].forEach((button) => button.addEventListener("click", () => closeSuiteDialog()));
    document.addEventListener("keydown", (event) => {
      if (!dialog.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSuiteDialog();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = qsa('button, input, textarea, select, [tabindex]:not([tabindex="-1"])', card).filter((node) => !node.disabled && node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    return dialog;
  }

  let suiteDialogOpener = null;

  function closeSuiteDialog() {
    const dialog = qs("#suiteDialog");
    dialog?.classList.remove("open");
    dialog?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    qs("#suiteDialogForm").onsubmit = null;
    suiteDialogOpener?.focus?.();
  }

  function suiteField(labelText, control, helpText = "") {
    const label = element("label", { className: "suite-field" });
    label.append(element("span", { text: labelText }), control);
    if (helpText) label.append(element("small", { text: helpText }));
    return label;
  }

  function suiteInput(options = {}) {
    if (options.type === "textarea") {
      const node = element("textarea", { attrs: { name: options.name, rows: options.rows || 4, maxlength: options.maxlength, placeholder: options.placeholder } });
      node.value = options.value || "";
      return node;
    }
    return element("input", { attrs: { name: options.name, type: options.type || "text", value: options.value ?? "", min: options.min, max: options.max, step: options.step, maxlength: options.maxlength, placeholder: options.placeholder, required: options.required ? "" : null, autocomplete: "off" } });
  }

  function openSuiteDialog(config, opener) {
    const dialog = createSuiteDialog();
    suiteDialogOpener = opener || document.activeElement;
    qs("#suiteDialogTitle").textContent = config.title;
    qs("#suiteDialogDescription").textContent = config.description || "";
    qs("#suiteDialogError").textContent = "";
    const fields = qs("#suiteDialogFields");
    fields.replaceChildren();
    config.fields.forEach((fieldConfig) => {
      let control;
      if (fieldConfig.type === "select") {
        control = element("select", { attrs: { name: fieldConfig.name, required: fieldConfig.required ? "" : null } });
        fieldConfig.options.forEach((option) => {
          const value = typeof option === "string" ? option : option.value;
          const label = typeof option === "string" ? option : option.label;
          const node = element("option", { text: label, attrs: { value } });
          node.selected = value === fieldConfig.value;
          control.append(node);
        });
      } else control = suiteInput(fieldConfig);
      fields.append(suiteField(fieldConfig.label, control, fieldConfig.help || ""));
    });
    const form = qs("#suiteDialogForm");
    qs("#suiteDialogSubmit").textContent = config.submitText || "Save →";
    form.onsubmit = (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = Object.fromEntries(new FormData(form).entries());
      const error = config.validate?.(values) || "";
      if (error) {
        qs("#suiteDialogError").textContent = error;
        return;
      }
      config.save(values);
    };
    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => qs("input, textarea, select", fields)?.focus());
  }

  function buildReminderCenter(state, reminders) {
    qs("#reminderCenter")?.remove();
    const section = element("section", { className: "suite-reminder-center section", attrs: { id: "reminderCenter", "aria-labelledby": "reminderCenterTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Reminders & nudges" }), element("h2", { text: "Keep important things visible, not stressful.", attrs: { id: "reminderCenterTitle" } }));
    const add = element("button", { className: "small-link", text: "＋ Add reminder", attrs: { type: "button" } });
    add.addEventListener("click", () => {
      openSuiteDialog({
        title: "Add a reminder",
        description: "Save a simple local reminder. Dates are optional.",
        fields: [
          { name: "title", label: "Reminder", required: true, maxlength: 160, placeholder: "What should you remember?" },
          { name: "date", label: "Date", type: "date" },
          { name: "note", label: "Note", type: "textarea", maxlength: 500, placeholder: "Optional context" },
          { name: "section", label: "Open section", type: "select", value: "#home", options: [{ value: "#home", label: "Today" }, { value: "#plannerCenter", label: "Planner" }, { value: "#studyCenterPlus", label: "Study" }, { value: "#contentCalendar", label: "Content" }, { value: "#workCenterPlus", label: "Work" }, { value: "#connectionsCenter", label: "People" }] }
        ],
        save(values) {
          const nextState = loadState();
          nextState.suite.reminders.push({ id: createId(), title: String(values.title || "").trim().slice(0, 160), date: String(values.date || ""), note: String(values.note || "").slice(0, 500), section: String(values.section || "#home"), done: false, createdAt: new Date().toISOString() });
          closeSuiteDialog();
          saveState(nextState, "Reminder added.");
        }
      }, add);
    });
    heading.append(copy, add);
    section.append(heading);
    const summary = element("div", { className: "suite-reminder-summary" });
    const overdue = reminders.filter((item) => item.urgency === "overdue").length;
    const soon = reminders.filter((item) => item.urgency === "soon").length;
    [["Active", reminders.length], ["Needs attention", overdue], ["Coming soon", soon]].forEach(([label, value]) => {
      const card = element("article");
      card.append(element("small", { text: label }), element("strong", { text: value }));
      summary.append(card);
    });
    section.append(summary);
    const list = element("div", { className: "suite-reminder-list" });
    if (!reminders.length) list.append(element("div", { className: "suite-empty-state", text: "Nothing needs a nudge right now. You can add a personal reminder whenever it helps." }));
    else reminders.slice(0, 18).forEach((reminder) => {
      const row = element("article", { className: `suite-reminder-row urgency-${reminder.urgency}` });
      const icon = { task: "✓", manual: "◌", study: "▤", people: "♡", content: "◉" }[reminder.kind] || "◌";
      const copyNode = element("div", { className: "suite-reminder-copy" });
      copyNode.append(element("strong", { text: reminder.title }), element("span", { text: reminder.detail }), reminder.date ? element("small", { text: formatDate(reminder.date) }) : element("small", { text: "No date" }));
      const actions = element("div", { className: "suite-inline-actions" });
      actions.append(element("a", { className: "suite-mini-button", text: "Open", attrs: { href: reminder.section || "#home" } }));
      if (reminder.kind === "manual") {
        const done = element("button", { className: "suite-mini-button", text: "Done", attrs: { type: "button" } });
        done.addEventListener("click", () => {
          const nextState = loadState();
          const target = nextState.suite.reminders.find((item) => item.id === reminder.sourceId);
          if (target) target.done = true;
          saveState(nextState, "Reminder completed.");
        });
        const remove = element("button", { className: "suite-mini-button suite-danger-text", text: "Delete", attrs: { type: "button" } });
        remove.addEventListener("click", () => twoStep(remove, "Delete?", () => {
          const nextState = loadState();
          nextState.suite.reminders = nextState.suite.reminders.filter((item) => item.id !== reminder.sourceId);
          saveState(nextState, "Reminder deleted.");
        }));
        actions.append(done, remove);
      }
      row.append(element("span", { className: "suite-reminder-icon", text: icon }), copyNode, actions);
      list.append(row);
    });
    section.append(list);
    const planner = qs("#plannerCenter");
    if (planner) planner.after(section);
    else qs("#trackers")?.after(section);
  }

  function buildSearchIndex(state) {
    const items = [
      ["Today", "Dashboard home and daily summary", "#home", "section"], ["Journal", "Search and write journal entries", "#journalHistory", "section"], ["Planner", "Tasks, classes, events, and agenda", "#plannerCenter", "section"], ["Trackers", "Mood, habits, wellbeing, and rhythm", "#trackers", "section"], ["Finances", "Income, expenses, savings, and insights", "#financeCenter", "section"], ["Content", "Ideas, drafts, calendar, and publishing", "#contentCalendar", "section"], ["Study", "Assessments, study sessions, and research", "#studyCenterPlus", "section"], ["Work", "Businesses, projects, and work goals", "#workCenterPlus", "section"], ["People", "Connections and follow-up reminders", "#connectionsCenter", "section"], ["Resources", "Links, contacts, and saved references", "#resources", "section"], ["Reminders", "Active reminders and upcoming nudges", "#reminderCenter", "section"], ["System", "Backups, undo, data health, and shortcuts", "#systemCenter", "section"], ["Settings", "Personalisation and local data controls", "#settings", "section"]
    ].map(([title, detail, href, kind]) => ({ title, detail, href, kind }));
    state.journal.forEach((entry) => items.push({ title: entry.title || "Journal entry", detail: `${formatDate(new Date(entry.createdAt || Date.now()), { short: true })} · Journal`, href: "#journalHistory", kind: "journal", search: `${entry.title || ""} ${entry.body || ""} ${(entry.tags || []).join(" ")} ${entry.mood || ""}` }));
    ["tasks", "planner"].forEach((key) => state.lists[key].forEach((task) => items.push({ title: task.text || "Task", detail: `${key === "tasks" ? "Focus" : "Planner"} · ${task.date ? formatDate(task.date) : "Unscheduled"}`, href: "#plannerCenter", kind: "task", search: `${task.text || ""} ${task.category || ""} ${task.notes || ""}` })));
    [...state.lists.ideas, ...state.lists.drafts].forEach((content) => items.push({ title: content.text || "Content", detail: `${content.status || "Idea"} · ${content.platform || content.meta || "Content"}`, href: "#contentCalendar", kind: "content", search: `${content.text || ""} ${content.status || ""} ${content.platform || ""}` }));
    state.lists.people.forEach((person) => items.push({ title: person.name || "Person", detail: `${person.group || person.meta || "People"} · Follow-up`, href: "#connectionsCenter", kind: "people", search: `${person.name || ""} ${person.meta || ""} ${person.notes || ""}` }));
    state.suite.assessments.forEach((assessment) => items.push({ title: assessment.title || "Assessment", detail: `${assessment.type || "Assessment"} · ${assessment.dueDate ? formatDate(assessment.dueDate) : "No due date"}`, href: "#studyCenterPlus", kind: "study", search: `${assessment.title || ""} ${assessment.unit || ""} ${assessment.notes || ""}` }));
    state.suite.workProjects.forEach((project) => items.push({ title: project.title || "Work project", detail: `${project.client || "Personal"} · ${project.status || "Idea"}`, href: "#workCenterPlus", kind: "work", search: `${project.title || ""} ${project.client || ""} ${project.nextAction || ""}` }));
    const resources = safeParse(localStorage.getItem(RESOURCE_KEY), []);
    if (Array.isArray(resources)) resources.forEach((resource) => items.push({ title: resource.title || "Resource", detail: `${resource.category || "Personal"} · Resource`, href: "#resources", kind: "resource", search: `${resource.title || ""} ${resource.category || ""} ${resource.note || ""} ${resource.url || ""}` }));
    return items;
  }

  function createCommandPalette() {
    if (qs("#commandPalette")) return qs("#commandPalette");
    const palette = element("div", { className: "command-palette", attrs: { id: "commandPalette", role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "commandPaletteTitle" } });
    const backdrop = element("button", { className: "command-palette-backdrop", attrs: { type: "button", "aria-label": "Close search" } });
    const card = element("div", { className: "command-palette-card" });
    const heading = element("div", { className: "command-palette-heading" });
    const headingCopy = element("div");
    headingCopy.append(element("p", { className: "eyebrow", text: "Search & commands" }), element("h2", { text: "Find anything in your dashboard.", attrs: { id: "commandPaletteTitle" } }));
    const closeButton = element("button", { className: "command-close", text: "Esc", attrs: { type: "button", "aria-label": "Close search" } });
    heading.append(headingCopy, closeButton);
    const search = element("input", { className: "command-search", attrs: { id: "commandSearch", type: "search", placeholder: "Search tasks, people, journal, sections…", autocomplete: "off", "aria-label": "Search dashboard" } });
    const results = element("div", { className: "command-results", attrs: { id: "commandResults", role: "listbox" } });
    const footer = element("div", { className: "command-footer" });
    footer.append(element("span", { text: "↑↓ move" }), element("span", { text: "Enter open" }), element("span", { text: "Esc close" }));
    card.append(heading, search, results, footer);
    palette.append(backdrop, card);
    document.body.append(palette);
    let selectedIndex = 0;
    let resultItems = [];
    function render() {
      const query = search.value.trim().toLowerCase();
      resultItems = buildSearchIndex(loadState()).map((item) => {
        const haystack = `${item.title} ${item.detail} ${item.search || ""}`.toLowerCase();
        const score = !query ? (item.kind === "section" ? 3 : 1) : item.title.toLowerCase().startsWith(query) ? 6 : item.title.toLowerCase().includes(query) ? 4 : haystack.includes(query) ? 2 : 0;
        return { ...item, score };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 14);
      selectedIndex = Math.min(selectedIndex, Math.max(0, resultItems.length - 1));
      results.replaceChildren();
      if (!resultItems.length) {
        results.append(element("p", { className: "command-empty", text: "No dashboard items match that search." }));
        return;
      }
      resultItems.forEach((item, indexPosition) => {
        const button = element("button", { className: `command-result${indexPosition === selectedIndex ? " selected" : ""}`, attrs: { type: "button", role: "option", "aria-selected": String(indexPosition === selectedIndex) } });
        const icon = { section: "⌘", journal: "✎", task: "✓", content: "◉", people: "♡", study: "▤", work: "◇", resource: "↗" }[item.kind] || "⌘";
        const copyNode = element("span");
        copyNode.append(element("strong", { text: item.title }), element("small", { text: item.detail }));
        button.append(element("b", { text: icon }), copyNode, element("i", { text: "↵" }));
        button.addEventListener("click", () => openResult(item));
        button.addEventListener("mousemove", () => {
          selectedIndex = indexPosition;
          qsa(".command-result", results).forEach((node, nodeIndex) => {
            node.classList.toggle("selected", nodeIndex === selectedIndex);
            node.setAttribute("aria-selected", String(nodeIndex === selectedIndex));
          });
        });
        results.append(button);
      });
    }
    function openResult(item) {
      close();
      const target = qs(item.href);
      if (target) {
        target.hidden = false;
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.focus?.({ preventScroll: true });
      } else globalThis.location.hash = item.href;
    }
    function open(initialQuery = "") {
      search.value = initialQuery;
      selectedIndex = 0;
      palette.classList.add("open");
      palette.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      render();
      requestAnimationFrame(() => search.focus());
    }
    function close() {
      palette.classList.remove("open");
      palette.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      qs("#openCommandPalette")?.focus?.();
    }
    search.addEventListener("input", () => { selectedIndex = 0; render(); });
    search.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") { event.preventDefault(); selectedIndex = Math.min(resultItems.length - 1, selectedIndex + 1); render(); }
      else if (event.key === "ArrowUp") { event.preventDefault(); selectedIndex = Math.max(0, selectedIndex - 1); render(); }
      else if (event.key === "Enter" && resultItems[selectedIndex]) { event.preventDefault(); openResult(resultItems[selectedIndex]); }
    });
    backdrop.addEventListener("click", close);
    closeButton.addEventListener("click", close);
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        palette.classList.contains("open") ? close() : open();
      } else if (event.key === "Escape" && palette.classList.contains("open")) {
        event.preventDefault();
        close();
      }
    });
    palette.openPalette = open;
    return palette;
  }

  function buildSystemCenter() {
    qs("#systemCenter")?.remove();
    const stateRaw = localStorage.getItem(STORAGE_KEY) || "{}";
    const resourcesRaw = localStorage.getItem(RESOURCE_KEY) || "[]";
    const state = loadState();
    const history = safeParse(sessionStorage.getItem(HISTORY_KEY), []);
    const historyItems = Array.isArray(history) ? history : [];
    const backups = safeParse(localStorage.getItem(BACKUP_KEY), []);
    const backupItems = Array.isArray(backups) ? backups : [];
    const section = element("section", { className: "suite-system-center section", attrs: { id: "systemCenter", "aria-labelledby": "systemCenterTitle" } });
    const heading = element("div", { className: "section-title" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "Data & reliability" }), element("h2", { text: "Your local dashboard, with a safety net.", attrs: { id: "systemCenterTitle" } }));
    const backupNow = element("button", { className: "small-link", text: "Download backup", attrs: { type: "button" } });
    backupNow.addEventListener("click", () => {
      downloadText(`my-little-life-backup-${dateKey}.json`, JSON.stringify({ dashboard: safeParse(stateRaw, {}), resources: safeParse(resourcesRaw, []), exportedAt: new Date().toISOString() }, null, 2), "application/json");
      showToast("Current backup downloaded.");
    });
    heading.append(copy, backupNow);
    section.append(heading);
    const health = element("div", { className: "suite-health-grid" });
    [["Dashboard size", `${Math.max(1, Math.round(stateRaw.length / 1024))} KB`, stateRaw.length < 2_000_000 ? "Healthy" : "Large"], ["Saved entries", String(state.journal.length), "Journal"], ["Planned items", String(state.lists.tasks.length + state.lists.planner.length + state.lists.classes.length), "Planner"], ["Resources", String(Array.isArray(safeParse(resourcesRaw, [])) ? safeParse(resourcesRaw, []).length : 0), "Library"]].forEach(([label, value, note]) => {
      const card = element("article");
      card.append(element("small", { text: label }), element("strong", { text: value }), element("span", { text: note }));
      health.append(card);
    });
    section.append(health);
    const layout = element("div", { className: "suite-system-layout" });
    const historyCard = element("article", { className: "suite-system-card" });
    const historyHeading = element("div", { className: "suite-card-heading" });
    const historyCopy = element("div");
    historyCopy.append(element("p", { className: "eyebrow", text: "Recent changes" }), element("h3", { text: "Undo the last local update" }));
    const undo = element("button", { className: "suite-secondary-button", text: "Undo last change", attrs: { type: "button", disabled: historyItems.length ? null : "" } });
    undo.addEventListener("click", () => {
      const currentHistory = safeParse(sessionStorage.getItem(HISTORY_KEY), []);
      const entry = Array.isArray(currentHistory) ? currentHistory[0] : null;
      if (!entry) return;
      globalThis.__littleLifeHistoryRestore?.(entry);
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(currentHistory.slice(1)));
      sessionStorage.setItem(NOTICE_KEY, "Last local change undone.");
      globalThis.location.reload();
    });
    historyHeading.append(historyCopy, undo);
    historyCard.append(historyHeading);
    const historyList = element("div", { className: "suite-history-list" });
    if (!historyItems.length) historyList.append(element("p", { className: "suite-muted", text: "Changes made after this page opened will appear here." }));
    else historyItems.slice(0, 6).forEach((entry) => {
      const row = element("div");
      row.append(element("span", { text: entry.key === STORAGE_KEY ? "Dashboard" : "Resources" }), element("strong", { text: entry.action || "Updated" }), element("small", { text: new Date(entry.at).toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }) }));
      historyList.append(row);
    });
    historyCard.append(historyList);
    const backupCard = element("article", { className: "suite-system-card" });
    backupCard.append(element("p", { className: "eyebrow", text: "Automatic snapshots" }), element("h3", { text: "Restore a recent local version" }));
    const backupList = element("div", { className: "suite-backup-list" });
    if (!backupItems.length) backupList.append(element("p", { className: "suite-muted", text: "A local snapshot will be created automatically." }));
    else backupItems.forEach((backup) => {
      const row = element("div");
      const copyNode = element("span");
      copyNode.append(element("strong", { text: new Date(backup.at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) }), element("small", { text: `${Math.max(1, Math.round(Number(backup.size || 0) / 1024))} KB` }));
      const actions = element("span", { className: "suite-inline-actions" });
      const download = element("button", { className: "suite-mini-button", text: "Download", attrs: { type: "button" } });
      download.addEventListener("click", () => downloadText(`my-little-life-snapshot-${String(backup.at).slice(0, 10)}.json`, JSON.stringify({ dashboard: safeParse(backup.dashboardData, {}), resources: safeParse(backup.resourceData, []), snapshotAt: backup.at }, null, 2), "application/json"));
      const restore = element("button", { className: "suite-mini-button suite-danger-text", text: "Restore", attrs: { type: "button" } });
      restore.addEventListener("click", () => twoStep(restore, "Restore?", () => {
        historyGuard = true;
        try {
          localStorage.setItem(STORAGE_KEY, backup.dashboardData);
          localStorage.setItem(RESOURCE_KEY, backup.resourceData);
        } finally {
          historyGuard = false;
        }
        sessionStorage.setItem(NOTICE_KEY, "Local snapshot restored.");
        globalThis.location.reload();
      }));
      actions.append(download, restore);
      row.append(copyNode, actions);
      backupList.append(row);
    });
    backupCard.append(backupList);
    const shortcutCard = element("article", { className: "suite-system-card suite-shortcut-card" });
    shortcutCard.append(element("p", { className: "eyebrow", text: "Keyboard & navigation" }), element("h3", { text: "Move around with less friction" }));
    const shortcutList = element("dl");
    [["Ctrl/⌘ + K", "Search everything"], ["Escape", "Close open panels"], ["Tab / Shift+Tab", "Move through controls"], ["Enter", "Open the selected search result"]].forEach(([key, description]) => shortcutList.append(element("dt", { text: key }), element("dd", { text: description })));
    shortcutCard.append(shortcutList);
    layout.append(historyCard, backupCard, shortcutCard);
    section.append(layout);
    qs("main.dashboard")?.append(section);
  }

  function addNavigationLinks() {
    const nav = qs(".sidebar nav");
    if (!nav) return;
    const addLink = (href, icon, label, afterHref = "") => {
      let link = qs(`a[href="${href}"]`, nav);
      if (link) return link;
      link = element("a", { attrs: { href } });
      link.append(element("span", { text: icon }), document.createTextNode(` ${label}`));
      const after = afterHref ? qs(`a[href="${afterHref}"]`, nav) : null;
      if (after) after.after(link);
      else nav.append(link);
      return link;
    };
    addLink("#reminderCenter", "◌", "Reminders", "#trackers");
    addLink("#systemCenter", "⚙", "System");
  }

  function setupActiveNavigation() {
    const links = qsa(".sidebar nav a[href^='#']");
    const sections = links.map((link) => qs(link.getAttribute("href"))).filter(Boolean);
    if (!("IntersectionObserver" in globalThis) || !sections.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach((link) => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  function installPopupCleanup() {
    document.addEventListener("click", (event) => {
      const clearToday = event.target.closest("#clearToday");
      if (clearToday) {
        event.preventDefault();
        event.stopImmediatePropagation();
        twoStep(clearToday, "Click again to clear today", () => {
          const state = loadState();
          delete state.daily[dateKey];
          saveState(state, "Today cleared.");
        });
        return;
      }
      const resourceRemove = event.target.closest("#resourceList .item-remove");
      if (!resourceRemove) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      twoStep(resourceRemove, "Delete?", () => {
        let resources = safeParse(localStorage.getItem(RESOURCE_KEY), null);
        if (!Array.isArray(resources)) {
          resources = qsa("#resourceList .resource-card").map((card) => ({ id: createId(), title: qs("h3", card)?.textContent.trim() || "Resource", category: qs(".resource-category", card)?.textContent.trim() || "Personal", url: qs("a.resource-link", card)?.getAttribute("href") || "", note: qs("p", card)?.textContent.trim() || "", pinned: qs(".resource-pin-button", card)?.getAttribute("aria-pressed") === "true" }));
        }
        const card = resourceRemove.closest(".resource-card");
        const title = qs("h3", card)?.textContent.trim() || "";
        const category = qs(".resource-category", card)?.textContent.trim() || "";
        let removed = false;
        resources = resources.filter((resource) => {
          if (!removed && resource.title === title && resource.category === category) { removed = true; return false; }
          return true;
        });
        localStorage.setItem(RESOURCE_KEY, JSON.stringify(resources));
        sessionStorage.setItem(NOTICE_KEY, "Resource deleted.");
        globalThis.location.reload();
      });
    }, true);
    globalThis.confirm = () => false;
    globalThis.prompt = () => null;
  }

  function installReliabilityGuard() {
    globalThis.addEventListener("error", (event) => {
      console.error("Dashboard error:", event.error || event.message);
      showToast("One dashboard tool had a problem. Your saved data is still local.");
    });
    globalThis.addEventListener("unhandledrejection", (event) => {
      console.error("Dashboard promise error:", event.reason);
      showToast("A dashboard tool could not finish. Your saved data was not removed.");
    });
  }

  ensureStyles();
  installHistoryCapture();
  createAutomaticBackup();
  ensureAccessibilityShell();
  setupMobileNavigation();
  addNavigationLinks();
  const state = loadState();
  const reminders = derivedReminders(state);
  const topbarActions = addTopbarActions(reminders.length);
  buildTodayCenter(state, reminders);
  buildReminderCenter(state, reminders);
  buildSystemCenter();
  const palette = createCommandPalette();
  topbarActions.command?.addEventListener("click", () => palette.openPalette());
  topbarActions.reminders?.addEventListener("click", () => qs("#reminderCenter")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  setupActiveNavigation();
  installPopupCleanup();
  installReliabilityGuard();
  const notice = sessionStorage.getItem(NOTICE_KEY);
  if (notice) {
    sessionStorage.removeItem(NOTICE_KEY);
    showToast(notice);
  }
})();
