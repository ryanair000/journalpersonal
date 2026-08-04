"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.dailyPlanner.v1";
  const COMPLETION_KEY = "myLittleLife.scheduleCompletions.v1";
  const NOTIFIED_KEY = "myLittleLife.scheduleNotified.v1";
  const BLANK_SLATE_KEY = "myLittleLife.blankSlate.v1";
  let blankSlateSyncTimer = null;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = () => dateKey(new Date());
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const safeArray = (value) => Array.isArray(value) ? value : [];

  function read(key, fallback = []) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("mll:data-changed", { detail: { source: "daily-planner", keys: [key] } }));
  }

  function parseDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00`) : null;
  }

  function addDays(value, count) {
    const date = parseDate(value) || new Date();
    date.setDate(date.getDate() + count);
    return dateKey(date);
  }

  function formatDay(value, long = false) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-KE", long ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" }) : value;
  }

  function normalizeTime(value) {
    const match = String(value || "").match(/(?:^|\s)(\d{1,2}):(\d{2})/);
    return match ? `${pad(match[1])}:${match[2]}` : "";
  }

  function plannerState() {
    const state = read(STORAGE_KEY, { version: 1, items: [] });
    return { version: 1, items: safeArray(state.items) };
  }

  function savePlanner(state) { write(STORAGE_KEY, state); }

  function syncPlannerCalendar(item) {
    const events = safeArray(read("calendarEvents", [])).filter((event) => event.sourcePlannerId !== item.id);
    const end = addDays(item.date, 60);
    for (let cursor = item.date; cursor <= end; cursor = addDays(cursor, 1)) {
      if (!occursOn(item, cursor)) continue;
      events.push({
        date: cursor,
        title: item.title,
        time: item.time,
        meta: [item.category, item.time && item.endTime ? `${item.time}–${item.endTime}` : item.time, item.detail].filter(Boolean).join(" · "),
        color: item.category === "study" ? "purple-event" : item.category === "work" || item.category === "content" ? "green-event" : "coral-event",
        sourcePlannerId: item.id
      });
      if (!item.repeat || item.repeat === "none") break;
    }
    write("calendarEvents", events);
  }

  function removePlannerCalendar(id) {
    write("calendarEvents", safeArray(read("calendarEvents", [])).filter((event) => event.sourcePlannerId !== id));
  }

  function occursOn(item, date) {
    if (item.date === date) return true;
    const current = parseDate(date);
    const start = parseDate(item.date);
    if (!current || !start || current < start || !item.repeat || item.repeat === "none") return false;
    const day = current.getDay();
    if (item.repeat === "daily") return true;
    if (item.repeat === "weekdays") return day >= 1 && day <= 5;
    if (item.repeat === "weekly") return day === start.getDay();
    return false;
  }

  function sourceDone(source, id, date, fallback = false) {
    if (source === "focus") return Boolean(read("mllFocusPlanV1", []).find((item) => item.id === id)?.done);
    if (source === "planner") {
      const item = plannerState().items.find((entry) => entry.id === id);
      return item?.repeat && item.repeat !== "none" ? safeArray(item.doneDates).includes(date) : Boolean(item?.done);
    }
    if (source === "due") return Boolean(read("dueItems", [])[Number(id)]?.done);
    if (source === "capture") return Boolean(read("captureTasks", [])[Number(id)]?.done);
    return Boolean(read(COMPLETION_KEY, {})[`${source}:${id}:${date}`] ?? fallback);
  }

  function setSourceDone(item, checked) {
    if (item.source === "focus") {
      const items = read("mllFocusPlanV1", []);
      const target = items.find((entry) => entry.id === item.sourceId);
      if (target) target.done = checked;
      write("mllFocusPlanV1", items);
      return;
    }
    if (item.source === "planner") {
      const state = plannerState();
      const target = state.items.find((entry) => entry.id === item.sourceId);
      if (!target) return;
      if (target.repeat && target.repeat !== "none") {
        target.doneDates = safeArray(target.doneDates).filter((value) => value !== item.date);
        if (checked) target.doneDates.push(item.date);
      } else target.done = checked;
      savePlanner(state);
      return;
    }
    if (item.source === "due" || item.source === "capture") {
      const key = item.source === "due" ? "dueItems" : "captureTasks";
      const items = read(key, []);
      if (items[Number(item.sourceId)]) items[Number(item.sourceId)].done = checked;
      write(key, items);
      return;
    }
    const completions = read(COMPLETION_KEY, {});
    completions[`${item.source}:${item.sourceId}:${item.date}`] = checked;
    write(COMPLETION_KEY, completions);
  }

  function collectItems(from, to) {
    const results = [];
    const push = (item) => {
      if (!item.date || item.date < from || item.date > to || !item.title) return;
      item.done = sourceDone(item.source, item.sourceId, item.date, item.done);
      results.push(item);
    };

    safeArray(read("mllFocusPlanV1", [])).forEach((block) => push({
      source: "focus", sourceId: block.id, date: block.date, time: block.start || "", endTime: block.end || "",
      title: [block.code, block.title].filter(Boolean).join(" · "), detail: block.detail || "Planned focus block",
      category: block.type || "study", reminder: 10, editable: false, done: block.done
    }));

    const state = plannerState();
    for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
      state.items.filter((item) => occursOn(item, cursor)).forEach((item) => push({ ...item, source: "planner", sourceId: item.id, date: cursor, editable: true }));
    }

    safeArray(read("dueItems", [])).forEach((item, index) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(item.date || ""))) return;
      push({ source: "due", sourceId: String(index), date: item.date, time: normalizeTime(item.when), title: item.title, detail: item.meta || "Reminder", category: "task", reminder: 30, editable: false, done: item.done });
    });

    safeArray(read("captureTasks", [])).forEach((item, index) => push({
      source: "capture", sourceId: String(index), date: item.date || today(), time: normalizeTime(item.detail), title: item.title,
      detail: item.detail || "Task", category: item.category || "task", reminder: 30, editable: false, done: item.done
    }));

    const focusFingerprints = new Set(results.filter((item) => item.source === "focus").map((item) => `${item.date}|${item.title.toLowerCase()}`));
    safeArray(read("calendarEvents", [])).forEach((event, index) => {
      const title = String(event.title || "");
      if (focusFingerprints.has(`${event.date}|${title.toLowerCase()}`) || /revision plan/i.test(String(event.meta || ""))) return;
      push({ source: "calendar", sourceId: String(index), date: event.date, time: normalizeTime(event.time || event.meta), title, detail: event.meta || "Calendar", category: /exam/i.test(`${title} ${event.meta}`) ? "exam" : "event", reminder: 30, editable: false });
    });

    safeArray(read("examEntries", [])).forEach((exam, index) => push({
      source: "exam", sourceId: String(index), date: exam.date, time: normalizeTime(exam.time), title: `Exam · ${exam.code || exam.name}`,
      detail: [exam.name, exam.venue, exam.time].filter(Boolean).join(" · "), category: "exam", reminder: 1440, editable: false
    }));

    const unique = new Map();
    results.forEach((item) => {
      const normalizedTitle = item.title.toLowerCase().replace(/^(study|work|attachment|business|review|exam)\s*·\s*/, "");
      const key = `${item.date}|${item.time}|${normalizedTitle}`;
      if (!unique.has(key)) unique.set(key, item);
    });
    return [...unique.values()].sort((left, right) => `${left.date} ${left.time || "23:59"}`.localeCompare(`${right.date} ${right.time || "23:59"}`));
  }

  function relativeLabel(item) {
    const eventDate = new Date(`${item.date}T${item.time || "23:59"}:00`);
    const minutes = Math.round((eventDate - new Date()) / 60000);
    if (item.done) return "Completed";
    if (minutes < -15) return "Overdue";
    if (minutes <= 0) return "Due now";
    if (minutes < 60) return `In ${minutes} min`;
    if (minutes < 1440) return `In ${Math.round(minutes / 60)} hr`;
    const days = Math.ceil(minutes / 1440);
    return `In ${days} day${days === 1 ? "" : "s"}`;
  }

  function itemMarkup(item) {
    const status = relativeLabel(item);
    return `<div class="mll-schedule-row${item.done ? " is-done" : ""}${status === "Overdue" ? " is-overdue" : ""}" data-mll-item-source="${esc(item.source)}" data-mll-item-id="${esc(item.sourceId)}" data-mll-item-date="${esc(item.date)}">
      <label class="mll-check" aria-label="Mark ${esc(item.title)} complete"><input type="checkbox" ${item.done ? "checked" : ""}><span></span></label>
      <time class="mll-row-time">${esc(item.time || "Anytime")}</time>
      <div class="mll-row-copy"><strong>${esc(item.title)}</strong><small>${esc(item.endTime ? `${item.time}–${item.endTime} · ${item.detail || status}` : item.detail || status)}</small></div>
      <span class="mll-category-pill ${esc(String(item.category || "task").toLowerCase())}">${esc(item.category || "Task")}</span>
      ${item.editable ? `<button class="mll-row-menu" type="button" aria-label="Edit ${esc(item.title)}">•••</button>` : "<span></span>"}
    </div>`;
  }

  function dayGroupMarkup(date, items) {
    const done = items.filter((item) => item.done).length;
    return `<div class="mll-day-group"><div class="mll-day-label"><strong>${esc(date === today() ? "Today" : formatDay(date, true))}</strong><span>${done}/${items.length} done</span></div>${items.map(itemMarkup).join("")}</div>`;
  }

  function notificationLabel() {
    if (!("Notification" in window)) return "Device alerts unavailable";
    if (Notification.permission === "granted") return "Device alerts enabled";
    if (Notification.permission === "denied") return "Alerts blocked in browser";
    return "Enable device alerts";
  }

  function ensureHome() {
    const main = qs("main.dashboard");
    if (!main || qs("#simpleHome")) return;
    const section = document.createElement("section");
    section.id = "simpleHome";
    section.className = "mll-today section";
    qs(".topbar", main)?.after(section);
  }

  let windowMode = "today";

  function renderHome() {
    const section = qs("#simpleHome");
    if (!section) return;
    const start = today();
    const end = windowMode === "today" ? start : addDays(start, 6);
    const items = collectItems(start, end);
    const todayItems = collectItems(start, start);
    const openToday = todayItems.filter((item) => !item.done);
    const doneToday = todayItems.filter((item) => item.done).length;
    const next = items.find((item) => !item.done);
    const completion = todayItems.length ? Math.round(doneToday / todayItems.length * 100) : 0;
    const groups = [...new Set(items.map((item) => item.date))].map((date) => dayGroupMarkup(date, items.filter((item) => item.date === date))).join("");
    const dateText = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" });

    section.innerHTML = `<div class="mll-today-head"><div><p class="eyebrow">${esc(dateText)}</p><h2>Your day, clearly.</h2><p>Only your schedule, reminders, and next important actions live here.</p></div><div class="mll-today-actions"><button class="mll-button secondary" type="button" data-mll-add="task">+ Add task</button><button class="mll-button" type="button" data-mll-add="schedule">+ Add to schedule</button></div></div>
      <div class="mll-summary-strip">
        <div class="mll-summary-item"><span class="mll-summary-icon">○</span><div class="mll-summary-copy"><strong>${openToday.length} left today</strong><small>${todayItems.length ? `${doneToday} already completed` : "Your schedule is clear"}</small></div></div>
        <div class="mll-summary-item"><span class="mll-summary-icon">→</span><div class="mll-summary-copy"><strong>${esc(next?.title || "Nothing urgent")}</strong><small>${next ? `${formatDay(next.date)} · ${next.time || "Anytime"}` : "Keep the day spacious"}</small></div></div>
        <div class="mll-summary-item"><span class="mll-summary-icon">✓</span><div class="mll-summary-copy"><strong>${completion}% complete</strong><small>Based on today's plan</small></div></div>
      </div>
      <div class="mll-today-grid">
        <article class="mll-panel"><header class="mll-panel-head"><div><p class="eyebrow">Schedule</p><h3>${windowMode === "today" ? "Today’s plan" : "Next seven days"}</h3></div><div class="mll-panel-actions"><div class="mll-window-toggle"><button type="button" data-mll-window="today" class="${windowMode === "today" ? "active" : ""}">Today</button><button type="button" data-mll-window="week" class="${windowMode === "week" ? "active" : ""}">7 days</button></div><button class="mll-icon-button" type="button" data-mll-add="schedule" aria-label="Add to schedule">+</button></div></header><div class="mll-schedule-list">${groups || `<div class="mll-empty"><strong>Nothing planned here yet.</strong><span>Add a task or schedule block when you are ready.</span></div>`}</div></article>
        <aside class="mll-side-stack">
          <article class="mll-panel mll-side-panel"><p class="eyebrow">Next reminder</p><h3>${next ? relativeLabel(next) : "You are clear"}</h3>${next ? `<span class="mll-reminder-time">${esc(formatDay(next.date))} · ${esc(next.time || "Anytime")}</span><strong class="mll-next-title">${esc(next.title)}</strong><small class="mll-next-detail">${esc(next.detail || next.category)}</small>` : `<small class="mll-next-detail">Add a time and reminder to a task to see it here.</small>`}<button class="mll-button secondary mll-notify-button" type="button" data-mll-notifications>${esc(notificationLabel())}</button><p class="mll-alert-note">In-app reminders always appear here. Device alerts work while the dashboard is open.</p></article>
          <article class="mll-panel mll-side-panel"><p class="eyebrow">Today’s progress</p><div class="mll-progress-ring-row"><div class="mll-progress-ring" style="--value:${completion}"><strong>${completion}%</strong></div><div class="mll-progress-copy"><strong>${doneToday} of ${todayItems.length} completed</strong><small>Check off each block as you finish it. Your progress saves automatically.</small></div></div></article>
          <article class="mll-panel mll-side-panel"><p class="eyebrow">Open a workspace</p><h3>Go to the details.</h3><div class="mll-quick-links"><a href="#schoolHub">School</a><a href="#workHub">Work</a><a href="#exampoaContentCenter">Exampoa</a><a href="#calendar">Calendar</a></div></article>
        </aside>
      </div>`;
  }

  function ensureDialog() {
    if (qs("#mllPlannerDialog")) return;
    const dialog = document.createElement("dialog");
    dialog.id = "mllPlannerDialog";
    dialog.className = "mll-planner-dialog";
    dialog.innerHTML = `<form class="mll-planner-form" id="mllPlannerForm"><div class="mll-dialog-head"><div><p class="eyebrow">Daily planner</p><h2 id="mllPlannerTitle">Add to schedule</h2></div><button class="mll-icon-button" type="button" data-mll-close aria-label="Close">×</button></div><div class="mll-form-grid">
      <label class="full">Task or schedule title<input name="title" maxlength="180" required placeholder="What needs your attention?"></label>
      <label>Category<select name="category"><option value="study">Study</option><option value="work">Work</option><option value="content">Content</option><option value="attachment">Attachment</option><option value="personal">Personal</option><option value="appointment">Appointment</option></select></label>
      <label>Date<input name="date" type="date" required></label>
      <label>Start time<input name="time" type="time"></label><label>End time<input name="endTime" type="time"></label>
      <label>Repeat<select name="repeat"><option value="none">Does not repeat</option><option value="daily">Every day</option><option value="weekdays">Weekdays</option><option value="weekly">Every week</option></select></label>
      <label>Remind me<select name="reminder"><option value="0">At the start time</option><option value="10">10 minutes before</option><option value="30" selected>30 minutes before</option><option value="60">1 hour before</option><option value="1440">1 day before</option><option value="-1">No reminder</option></select></label>
      <label class="full">Notes<textarea name="detail" maxlength="600" placeholder="Unit, goal, venue, or what done looks like"></textarea></label>
      </div><div class="mll-dialog-actions"><button class="mll-button secondary danger" type="button" data-mll-delete hidden>Delete</button><button class="mll-button secondary" type="button" data-mll-close>Cancel</button><button class="mll-button" type="submit">Save</button></div></form>`;
    document.body.append(dialog);
    qsa("[data-mll-close]", dialog).forEach((button) => button.addEventListener("click", () => dialog.close()));
    qs("#mllPlannerForm", dialog).addEventListener("submit", saveDialog);
    qs("[data-mll-delete]", dialog).addEventListener("click", deleteDialogItem);
  }

  let editingId = null;

  function openDialog(type = "schedule", item = null) {
    ensureDialog();
    const dialog = qs("#mllPlannerDialog");
    const form = qs("#mllPlannerForm");
    editingId = item?.sourceId || null;
    form.reset();
    form.elements.date.value = item?.date || today();
    form.elements.category.value = item?.category || (type === "task" ? "personal" : "study");
    form.elements.reminder.value = String(item?.reminder ?? 30);
    form.elements.repeat.value = item?.repeat || "none";
    form.elements.title.value = item?.title || "";
    form.elements.time.value = item?.time || "";
    form.elements.endTime.value = item?.endTime || "";
    form.elements.detail.value = item?.detail || "";
    qs("#mllPlannerTitle").textContent = editingId ? "Edit plan" : type === "task" ? "Add a task" : "Add to schedule";
    qs("[data-mll-delete]", dialog).hidden = !editingId;
    dialog.showModal();
    requestAnimationFrame(() => form.elements.title.focus());
  }

  function saveDialog(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const state = plannerState();
    const existing = state.items.find((item) => item.id === editingId);
    const item = {
      id: existing?.id || uid(), title: String(values.title).trim(), category: values.category, date: values.date,
      time: values.time, endTime: values.endTime, repeat: values.repeat, reminder: Number(values.reminder),
      detail: String(values.detail || "").trim(), done: existing?.done || false, doneDates: safeArray(existing?.doneDates), createdAt: existing?.createdAt || new Date().toISOString()
    };
    if (existing) Object.assign(existing, item); else state.items.push(item);
    savePlanner(state);
    syncPlannerCalendar(item);
    qs("#mllPlannerDialog").close();
    renderHome();
  }

  function deleteDialogItem() {
    if (!editingId || !confirm("Delete this plan from your schedule?")) return;
    const state = plannerState();
    state.items = state.items.filter((item) => item.id !== editingId);
    savePlanner(state);
    removePlannerCalendar(editingId);
    qs("#mllPlannerDialog").close();
    renderHome();
  }

  async function enableNotifications(button) {
    if (!("Notification" in window)) { button.textContent = "Device alerts unavailable"; return; }
    if (Notification.permission === "default") await Notification.requestPermission();
    button.textContent = notificationLabel();
    checkNotifications();
  }

  function checkNotifications() {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const now = new Date();
    const items = collectItems(today(), today()).filter((item) => !item.done && item.time && Number(item.reminder) >= 0);
    const notified = read(NOTIFIED_KEY, {});
    let changed = false;
    items.forEach((item) => {
      const eventTime = new Date(`${item.date}T${item.time}:00`);
      const alertTime = new Date(eventTime.getTime() - Number(item.reminder || 0) * 60000);
      const key = `${item.source}:${item.sourceId}:${item.date}:${item.time}`;
      if (now >= alertTime && now <= new Date(eventTime.getTime() + 15 * 60000) && !notified[key]) {
        new Notification("My Little Life reminder", { body: `${item.time} · ${item.title}`, tag: key });
        notified[key] = new Date().toISOString();
        changed = true;
      }
    });
    if (changed) write(NOTIFIED_KEY, notified);
  }

  function replaceNavigation() {
    const nav = qs(".sidebar nav");
    if (!nav) return;
    const links = [
      ["home", "⌂", "Today"], ["calendar", "□", "Calendar"], ["schoolHub", "▤", "School"],
      ["workHub", "◇", "Work"], ["exampoaContentCenter", "◉", "Content"], ["journal", "✎", "Journal"],
      ["trackers", "♡", "Wellness"], ["financeBreakdown", "₵", "Money"], ["peopleHub", "♧", "People"], ["resourceVault", "▧", "Resources"]
    ];
    nav.innerHTML = links.map(([id, icon, label]) => `<a href="#${id}" data-mll-nav="${id}"><span>${icon}</span>${label}</a>`).join("");
    let mobile = qs("#mllSimpleMobileNav");
    if (!mobile) {
      mobile = document.createElement("nav");
      mobile.id = "mllSimpleMobileNav";
      mobile.setAttribute("aria-label", "Mobile dashboard navigation");
      document.body.append(mobile);
    }
    mobile.innerHTML = nav.innerHTML;
  }

  function topSection(target) {
    const main = qs("main.dashboard");
    let node = target;
    while (node && node.parentElement !== main) node = node.parentElement;
    return node?.tagName === "SECTION" ? node : null;
  }

  function route() {
    const requested = location.hash.slice(1) || "home";
    const aliases = { home: "simpleHome", school: "schoolHub", money: "financeBreakdown", autoStudyPlanner: "focusPlan" };
    const id = aliases[requested] || requested;
    const target = qs(`#${CSS.escape(id)}`);
    const active = id === "simpleHome" ? target : topSection(target);
    qsa("main.dashboard > section").forEach((section) => section.classList.toggle("mll-active-section", section === active));
    document.body.classList.toggle("mll-home-view", id === "simpleHome");
    qsa(".sidebar nav a, #mllSimpleMobileNav a").forEach((link) => link.classList.toggle("active", link.dataset.mllNav === requested || (link.dataset.mllNav === "home" && id === "simpleHome")));
    if (!active && requested !== "home") { location.hash = "home"; return; }
    if (id === "simpleHome") renderHome();
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  }

  function itemFromRow(row) {
    const date = row.dataset.mllItemDate;
    return collectItems(date, date).find((item) => item.source === row.dataset.mllItemSource && String(item.sourceId) === row.dataset.mllItemId && item.date === date);
  }

  function bindEvents() {
    document.addEventListener("click", (event) => {
      const add = event.target.closest("[data-mll-add]");
      if (add) { openDialog(add.dataset.mllAdd); return; }
      const windowButton = event.target.closest("[data-mll-window]");
      if (windowButton) { windowMode = windowButton.dataset.mllWindow; renderHome(); return; }
      const menu = event.target.closest(".mll-row-menu");
      if (menu) { const item = itemFromRow(menu.closest(".mll-schedule-row")); if (item) openDialog("schedule", item); return; }
      const notify = event.target.closest("[data-mll-notifications]");
      if (notify) enableNotifications(notify);
    });
    document.addEventListener("change", (event) => {
      const checkbox = event.target.closest(".mll-schedule-row input[type='checkbox']");
      if (!checkbox) return;
      const item = itemFromRow(checkbox.closest(".mll-schedule-row"));
      if (!item) return;
      setSourceDone(item, checkbox.checked);
      renderHome();
    });
    window.addEventListener("hashchange", route);
    window.addEventListener("mll:data-changed", (event) => {
      if (event.detail?.source === "daily-planner") return;
      if (localStorage.getItem(BLANK_SLATE_KEY) === "true") applyBlankSlate();
      if ((location.hash.slice(1) || "home") === "home") renderHome();
    });
  }

  const blankSectionNames = {
    trackers: "wellness trackers", content: "content workspace", journal: "journal", analytics: "analytics",
    accountInsights: "account insights", details: "life details", journalArchive: "journal archive", mealLog: "meal log",
    financeBreakdown: "money records", studyTools: "study tools", focusPlan: "study plan", examPrep: "exam preparation",
    businessKpis: "business analytics", peopleDetails: "relationship records", contentPipeline: "content pipeline",
    resourceVault: "resource library", careerTracker: "career planner", savingsGoals: "savings goals", dueSoon: "reminders",
    mealHistory: "meal history", moodHistory: "mood history", calendar: "calendar", quickCapture: "quick capture",
    weeklyReview: "weekly review", schoolHub: "school center", workHub: "work planner", businessStudio: "business studio",
    exampoaContentCenter: "content calendar", peopleHub: "people records", visionBoard: "vision board", goalsHub: "goals",
    customHabits: "habits", routines: "routines", examTracker: "exam tracker", projectBoard: "projects",
    lifeInsights: "life insights", monthlySummary: "monthly summary", dashboardSearch: "search records"
  };

  function purgeBlankSlateRecords() {
    const keys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      const fallbackRecord = key && !["mll.sync.meta.v1", "mll.sync.keyTimes.v1", "mll.authenticatedBefore", "privacyPinHash"].includes(key) && !["sb-", "supabase.", "mll.auth."].some((prefix) => key.startsWith(prefix));
      if (key !== BLANK_SLATE_KEY && (window.mllRecordsSafety?.isRecordKey?.(key) ?? fallbackRecord)) keys.push(key);
    }
    if (!keys.length) return;
    const remove = () => keys.forEach((key) => localStorage.removeItem(key));
    if (window.mllRecordsSafety?.runWithoutSnapshots) window.mllRecordsSafety.runWithoutSnapshots(remove);
    else remove();
    window.clearTimeout(blankSlateSyncTimer);
    blankSlateSyncTimer = window.setTimeout(() => window.mllCloudSync?.syncNow?.().catch(() => {}), 250);
  }

  function applyBlankSlate() {
    if (localStorage.getItem(BLANK_SLATE_KEY) !== "true") return;
    document.body.classList.add("mll-blank-slate");
    purgeBlankSlateRecords();
    const main = qs("main.dashboard");
    qsa(":scope > section", main).forEach((section) => {
      if (["simpleHome", "dataManagement"].includes(section.id)) return;
      section.dataset.mllBlank = "true";
      if (qs(":scope > .mll-blank-card", section)) return;
      const label = blankSectionNames[section.id] || "dashboard area";
      const card = document.createElement("div");
      card.className = "mll-blank-card";
      const icon = document.createElement("span");
      icon.textContent = "○";
      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = label;
      const heading = document.createElement("h2");
      heading.textContent = `Ready for your new ${label}.`;
      const copy = document.createElement("p");
      copy.textContent = "This area is empty. Your new information will be added here when you provide it.";
      card.append(icon, eyebrow, heading, copy);
      section.append(card);
    });
    const greeting = qs(".topbar h1");
    if (greeting) greeting.textContent = "Welcome ♡";
    const avatar = qs(".topbar .avatar");
    if (avatar) avatar.textContent = "♡";
    ["settingName", "settingCourse", "settingYear", "settingTotalUnits", "settingCompletedUnits", "settingStudyMethods"].forEach((id) => {
      const field = qs(`#${id}`);
      if (field) field.value = "";
    });
  }

  function init() {
    const localBlankTest = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).has("mllBlankTest");
    if (localBlankTest) localStorage.setItem(BLANK_SLATE_KEY, "true");
    document.body.classList.add("mll-focus-shell");
    replaceNavigation();
    ensureHome();
    ensureDialog();
    bindEvents();
    applyBlankSlate();
    route();
    window.addEventListener("load", () => {
      applyBlankSlate();
      if ((location.hash.slice(1) || "home") === "home") renderHome();
    });
    checkNotifications();
    window.setInterval(checkNotifications, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
