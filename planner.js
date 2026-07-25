"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const NOTICE_KEY = "myLittleLife.plannerNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = (date = today) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const todayKey = dateKey(today);
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const PRIORITIES = ["High", "Medium", "Low"];
  const TASK_CATEGORIES = ["School", "Work", "Personal", "Errand", "Other"];

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    Object.entries(options.attrs || {}).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    });
    return node;
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  }

  function normalizeTime(value) {
    return /^\d{2}:\d{2}$/.test(String(value || "")) ? String(value) : "";
  }

  function normalizeState(rawState) {
    const state = rawState && typeof rawState === "object" ? rawState : {};
    state.version = Number(state.version) || 2;
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.lists = state.lists && typeof state.lists === "object" ? state.lists : {};
    ["tasks", "planner", "classes"].forEach((key) => {
      state.lists[key] = Array.isArray(state.lists[key]) ? state.lists[key] : [];
    });

    ["tasks", "planner"].forEach((key) => {
      state.lists[key] = state.lists[key].map((item) => ({
        ...item,
        id: item?.id || createId(),
        text: String(item?.text || "Untitled task").slice(0, 240),
        date: normalizeDate(item?.date),
        time: normalizeTime(item?.time),
        priority: PRIORITIES.includes(item?.priority) ? item.priority : "Medium",
        category: TASK_CATEGORIES.includes(item?.category) ? item.category : (key === "tasks" ? "Personal" : "School"),
        notes: String(item?.notes || "").slice(0, 1200),
        done: Boolean(item?.done)
      }));
    });

    state.lists.classes = state.lists.classes.map((item) => ({
      ...item,
      id: item?.id || createId(),
      subject: String(item?.subject || "Untitled event").slice(0, 200),
      date: normalizeDate(item?.date),
      time: normalizeTime(item?.time) || String(item?.time || "").slice(0, 40),
      endTime: normalizeTime(item?.endTime),
      day: String(item?.day || "").slice(0, 30),
      location: String(item?.location || "").slice(0, 160),
      notes: String(item?.notes || "").slice(0, 1200),
      recurring: item?.recurring === undefined ? !normalizeDate(item?.date) : Boolean(item.recurring)
    }));

    state.plannerSettings = state.plannerSettings && typeof state.plannerSettings === "object"
      ? state.plannerSettings
      : {};
    state.plannerSettings.hidden = Boolean(state.plannerSettings.hidden);
    return state;
  }

  function loadState() {
    return normalizeState(safeParse(localStorage.getItem(STORAGE_KEY), {}));
  }

  function captureUnsavedFields(state) {
    const existing = state.daily[todayKey] && typeof state.daily[todayKey] === "object" ? state.daily[todayKey] : {};
    state.daily[todayKey] = {
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
    if (quickNote) state.daily[todayKey].quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) state.daily[todayKey].gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function saveState(state, notice = "Planner updated.") {
    const normalized = normalizeState(state);
    captureUnsavedFields(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    sessionStorage.setItem(NOTICE_KEY, notice);
    globalThis.location.hash = "plannerCenter";
    globalThis.location.reload();
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  const savedNotice = sessionStorage.getItem(NOTICE_KEY);
  if (savedNotice) {
    sessionStorage.removeItem(NOTICE_KEY);
    setTimeout(() => showToast(savedNotice), 180);
  }

  function ensureStylesheet() {
    if (qs('link[href="planner.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "planner.css" } }));
  }

  function parseLocalDate(key) {
    if (!normalizeDate(key)) return null;
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function dateLabel(key, options = {}) {
    const parsed = parseLocalDate(key);
    if (!parsed) return "Unscheduled";
    return parsed.toLocaleDateString("en-KE", options.long
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : { weekday: "short", day: "numeric", month: "short" });
  }

  function weekdayName(key) {
    const parsed = parseLocalDate(key);
    return parsed ? parsed.toLocaleDateString("en-KE", { weekday: "long" }) : "";
  }

  function classOccursOn(item, key) {
    if (!key) return false;
    if (!item.recurring) return item.date === key;
    if (item.date && key < item.date) return false;
    const expectedDay = item.day || (item.date ? weekdayName(item.date) : "");
    return Boolean(expectedDay) && weekdayName(key).toLowerCase() === expectedDay.toLowerCase();
  }

  function taskMeta(item) {
    const bits = [];
    bits.push(item.date ? dateLabel(item.date) : "Unscheduled");
    if (item.time) bits.push(item.time);
    bits.push(item.priority || "Medium");
    return bits.join(" · ");
  }

  function nextOccurrences(state, days = 14) {
    const occurrences = [];
    for (let offset = 0; offset < days; offset += 1) {
      const key = dateKey(addDays(today, offset));
      state.lists.tasks.forEach((item) => {
        if (item.date === key) occurrences.push({ kind: "task", source: "tasks", item, date: key });
      });
      state.lists.planner.forEach((item) => {
        if (item.date === key) occurrences.push({ kind: "task", source: "planner", item, date: key });
      });
      state.lists.classes.forEach((item) => {
        if (classOccursOn(item, key)) occurrences.push({ kind: "event", source: "classes", item, date: key });
      });
    }
    return occurrences.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare) return dateCompare;
      return String(a.item.time || "99:99").localeCompare(String(b.item.time || "99:99"));
    });
  }

  function selectedDayItems(state, key) {
    return [
      ...state.lists.tasks.filter((item) => item.date === key).map((item) => ({ kind: "task", source: "tasks", item, date: key })),
      ...state.lists.planner.filter((item) => item.date === key).map((item) => ({ kind: "task", source: "planner", item, date: key })),
      ...state.lists.classes.filter((item) => classOccursOn(item, key)).map((item) => ({ kind: "event", source: "classes", item, date: key }))
    ];
  }

  function priorityRank(value) {
    return { High: 0, Medium: 1, Low: 2 }[value] ?? 3;
  }

  function sortItems(items) {
    return items.sort((a, b) => {
      const timeCompare = String(a.item.time || "99:99").localeCompare(String(b.item.time || "99:99"));
      if (timeCompare) return timeCompare;
      const priorityCompare = priorityRank(a.item.priority) - priorityRank(b.item.priority);
      if (priorityCompare) return priorityCompare;
      const aTitle = a.kind === "event" ? a.item.subject : a.item.text;
      const bTitle = b.kind === "event" ? b.item.subject : b.item.text;
      return aTitle.localeCompare(bTitle);
    });
  }

  function iconButton(text, label, onClick, className = "") {
    const button = element("button", {
      className: `planner-icon-button ${className}`.trim(),
      text,
      attrs: { type: "button", "aria-label": label, title: label }
    });
    button.addEventListener("click", () => onClick(button));
    return button;
  }

  function twoStepDelete(button, onDelete) {
    if (button.dataset.confirming === "true") {
      onDelete();
      return;
    }
    button.dataset.confirming = "true";
    button.textContent = "Delete?";
    button.classList.add("confirming");
    setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.confirming = "false";
      button.textContent = "×";
      button.classList.remove("confirming");
    }, 3500);
  }

  ensureStylesheet();
  const state = loadState();
  let selectedDate = todayKey;
  let currentSearch = "";
  let currentType = "all";
  let currentPriority = "all";

  const dialog = element("div", {
    className: "planner-dialog",
    attrs: { role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "plannerDialogTitle" }
  });
  const backdrop = element("button", { className: "planner-backdrop", attrs: { type: "button", "aria-label": "Close planner form" } });
  const form = element("form", { className: "planner-dialog-card", attrs: { novalidate: "" } });
  const closeButton = element("button", { className: "planner-dialog-close", text: "×", attrs: { type: "button", "aria-label": "Close form" } });
  const eyebrow = element("p", { className: "eyebrow", text: "Planner" });
  const dialogTitle = element("h2", { text: "Add item", attrs: { id: "plannerDialogTitle" } });
  const dialogDescription = element("p", { className: "planner-dialog-description" });
  const dialogFields = element("div", { className: "planner-dialog-fields" });
  const dialogError = element("p", { className: "planner-dialog-error", attrs: { role: "alert", "aria-live": "polite" } });
  const dialogFooter = element("div", { className: "planner-dialog-footer" });
  const cancelButton = element("button", { className: "planner-dialog-cancel", text: "Cancel", attrs: { type: "button" } });
  const submitButton = element("button", { className: "save-button", text: "Save", attrs: { type: "submit" } });
  dialogFooter.append(cancelButton, submitButton);
  form.append(closeButton, eyebrow, dialogTitle, dialogDescription, dialogFields, dialogError, dialogFooter);
  dialog.append(backdrop, form);
  document.body.append(dialog);

  let activeEditor = null;
  let dialogOpener = null;

  function field(labelText, control, help = "") {
    const wrapper = element("label", { className: "planner-field" });
    wrapper.append(element("span", { text: labelText }), control);
    if (help) wrapper.append(element("small", { text: help }));
    return wrapper;
  }

  function input(options = {}) {
    return element("input", { attrs: {
      name: options.name,
      type: options.type || "text",
      value: options.value ?? "",
      maxlength: options.maxlength,
      min: options.min,
      max: options.max,
      step: options.step,
      placeholder: options.placeholder,
      required: options.required ? "" : null,
      autocomplete: "off"
    } });
  }

  function select(name, options, value) {
    const control = element("select", { attrs: { name } });
    options.forEach((option) => {
      const optionValue = typeof option === "string" ? option : option.value;
      const optionLabel = typeof option === "string" ? option : option.label;
      const node = element("option", { text: optionLabel, attrs: { value: optionValue } });
      node.selected = String(optionValue) === String(value ?? "");
      control.append(node);
    });
    return control;
  }

  function textarea(name, value, placeholder = "") {
    const control = element("textarea", { attrs: { name, rows: 4, maxlength: 1200, placeholder } });
    control.value = value || "";
    return control;
  }

  function closeDialog() {
    dialog.classList.remove("open");
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    dialogError.textContent = "";
    activeEditor = null;
    dialogOpener?.focus?.();
  }

  function openTaskDialog(opener, source = "planner", item = null) {
    dialogOpener = opener || document.activeElement;
    activeEditor = { kind: "task", source, id: item?.id || null };
    dialogTitle.textContent = item ? "Edit task" : "Add task";
    dialogDescription.textContent = "Give the task a date when it belongs on your agenda, or leave it unscheduled for later.";
    submitButton.textContent = item ? "Save changes" : "Add task";
    dialogError.textContent = "";
    dialogFields.replaceChildren();

    const titleInput = input({ name: "title", value: item?.text || "", maxlength: 240, required: true, placeholder: "What needs to happen?" });
    const sourceSelect = select("source", [
      { value: "tasks", label: "Today's focus" },
      { value: "planner", label: "Planner task" }
    ], source);
    const dateInput = input({ name: "date", type: "date", value: item?.date || selectedDate });
    const timeInput = input({ name: "time", type: "time", value: item?.time || "" });
    const prioritySelect = select("priority", PRIORITIES, item?.priority || "Medium");
    const categorySelect = select("category", TASK_CATEGORIES, item?.category || (source === "tasks" ? "Personal" : "School"));
    const notesInput = textarea("notes", item?.notes || "", "Optional details, steps, or context");

    dialogFields.append(
      field("Task", titleInput),
      field("Where it belongs", sourceSelect),
      field("Date", dateInput, "Leave blank to keep it in Unscheduled."),
      field("Time", timeInput),
      field("Priority", prioritySelect),
      field("Category", categorySelect),
      field("Notes", notesInput)
    );

    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => titleInput.focus());
  }

  function openEventDialog(opener, item = null) {
    dialogOpener = opener || document.activeElement;
    activeEditor = { kind: "event", id: item?.id || null };
    dialogTitle.textContent = item ? "Edit class or event" : "Add class or event";
    dialogDescription.textContent = "Use a one-time date or repeat the event weekly from the selected date.";
    submitButton.textContent = item ? "Save changes" : "Add event";
    dialogError.textContent = "";
    dialogFields.replaceChildren();

    const subjectInput = input({ name: "subject", value: item?.subject || "", maxlength: 200, required: true, placeholder: "Class, study block, exam, or appointment" });
    const dateInput = input({ name: "date", type: "date", value: item?.date || selectedDate, required: true });
    const timeInput = input({ name: "time", type: "time", value: normalizeTime(item?.time) });
    const endInput = input({ name: "endTime", type: "time", value: item?.endTime || "" });
    const locationInput = input({ name: "location", value: item?.location || "", maxlength: 160, placeholder: "Room, campus, online..." });
    const repeatSelect = select("repeat", [
      { value: "once", label: "One time" },
      { value: "weekly", label: "Repeat every week" }
    ], item?.recurring ? "weekly" : "once");
    const notesInput = textarea("notes", item?.notes || "", "Optional preparation notes");

    dialogFields.append(
      field("Title", subjectInput),
      field("Date", dateInput),
      field("Start time", timeInput),
      field("End time", endInput),
      field("Location", locationInput),
      field("Repeat", repeatSelect),
      field("Notes", notesInput)
    );

    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => subjectInput.focus());
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeEditor || !form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const nextState = loadState();

    if (activeEditor.kind === "task") {
      const title = String(values.title || "").trim();
      if (!title) {
        dialogError.textContent = "Enter a task.";
        return;
      }
      const destination = values.source === "tasks" ? "tasks" : "planner";
      let existing = null;
      if (activeEditor.id) {
        ["tasks", "planner"].some((key) => {
          const index = nextState.lists[key].findIndex((entry) => entry.id === activeEditor.id);
          if (index < 0) return false;
          [existing] = nextState.lists[key].splice(index, 1);
          return true;
        });
      }
      const task = {
        ...(existing || {}),
        id: existing?.id || createId(),
        text: title.slice(0, 240),
        date: normalizeDate(values.date),
        time: normalizeTime(values.time),
        priority: PRIORITIES.includes(values.priority) ? values.priority : "Medium",
        category: TASK_CATEGORIES.includes(values.category) ? values.category : "Other",
        notes: String(values.notes || "").slice(0, 1200),
        done: Boolean(existing?.done)
      };
      task.meta = taskMeta(task);
      nextState.lists[destination].push(task);
      const wasEditing = Boolean(activeEditor.id);
      closeDialog();
      saveState(nextState, wasEditing ? "Task updated." : "Task added.");
      return;
    }

    const subject = String(values.subject || "").trim();
    const date = normalizeDate(values.date);
    if (!subject || !date) {
      dialogError.textContent = "Enter a title and date.";
      return;
    }
    const index = activeEditor.id ? nextState.lists.classes.findIndex((entry) => entry.id === activeEditor.id) : -1;
    const existing = index >= 0 ? nextState.lists.classes[index] : null;
    const classItem = {
      ...(existing || {}),
      id: existing?.id || createId(),
      subject: subject.slice(0, 200),
      date,
      day: weekdayName(date),
      time: normalizeTime(values.time),
      endTime: normalizeTime(values.endTime),
      location: String(values.location || "").slice(0, 160),
      recurring: values.repeat === "weekly",
      notes: String(values.notes || "").slice(0, 1200)
    };
    if (index >= 0) nextState.lists.classes[index] = classItem;
    else nextState.lists.classes.push(classItem);
    const wasEditing = Boolean(activeEditor.id);
    closeDialog();
    saveState(nextState, wasEditing ? "Event updated." : "Event added.");
  });

  backdrop.addEventListener("click", closeDialog);
  closeButton.addEventListener("click", closeDialog);
  cancelButton.addEventListener("click", closeDialog);
  document.addEventListener("keydown", (event) => {
    if (!dialog.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = qsa('button, input, textarea, select, [tabindex]:not([tabindex="-1"])', form)
      .filter((node) => !node.disabled && node.offsetParent !== null);
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

  function retargetExistingAddButton(selector, newId, handler) {
    const button = qs(selector);
    if (!button) return;
    button.id = newId;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      handler(button);
    }, { capture: true });
  }

  retargetExistingAddButton("#addTask", "plannerQuickAddTask", (button) => openTaskDialog(button, "tasks"));
  retargetExistingAddButton("#addPlanner", "plannerQuickAddPlanner", (button) => openTaskDialog(button, "planner"));
  retargetExistingAddButton("#addClass", "plannerQuickAddClass", (button) => openEventDialog(button));

  const section = element("section", { className: "planner-center section", attrs: { id: "plannerCenter", "aria-labelledby": "plannerCenterTitle" } });
  const heading = element("div", { className: "section-title planner-center-heading" });
  const headingCopy = element("div");
  headingCopy.append(
    element("p", { className: "eyebrow", text: "Planner & agenda" }),
    element("h2", { text: "See what belongs where.", attrs: { id: "plannerCenterTitle" } })
  );
  const headingActions = element("div", { className: "planner-heading-actions" });
  const exportButton = element("button", { className: "small-link", text: "Export 7 days", attrs: { type: "button" } });
  const addEventButton = element("button", { className: "small-link", text: "＋ Event", attrs: { type: "button" } });
  const addTaskButton = element("button", { className: "save-button planner-primary-action", text: "＋ Task", attrs: { type: "button" } });
  headingActions.append(exportButton, addEventButton, addTaskButton);
  heading.append(headingCopy, headingActions);
  section.append(heading, element("p", {
    className: "planner-intro",
    text: "Bring focus tasks, school or work plans, and timetable entries into one calm seven-day view. Unscheduled items stay available until you are ready to place them."
  }));

  const stats = element("div", { className: "planner-stats" });
  [["plannerDueToday", "Due today"], ["plannerUpcoming", "Next 7 days"], ["plannerOverdue", "Overdue"], ["plannerCompleted", "Completed"]].forEach(([id, label]) => {
    const card = element("article", { className: "planner-stat" });
    card.append(element("strong", { attrs: { id }, text: "0" }), element("span", { text: label }));
    stats.append(card);
  });
  section.append(stats);

  const layout = element("div", { className: "planner-center-layout" });
  const mainCard = element("article", { className: "planner-main-card" });
  const weekStrip = element("div", { className: "planner-week-strip", attrs: { role: "tablist", "aria-label": "Choose agenda day" } });
  const toolbar = element("div", { className: "planner-toolbar" });
  const searchInput = element("input", { className: "planner-search", attrs: { type: "search", placeholder: "Search this day", "aria-label": "Search agenda" } });
  const typeSelect = select("plannerTypeFilter", [
    { value: "all", label: "All items" },
    { value: "tasks", label: "Tasks" },
    { value: "events", label: "Classes & events" },
    { value: "completed", label: "Completed" }
  ], "all");
  typeSelect.className = "planner-filter-select";
  const prioritySelect = select("plannerPriorityFilter", [
    { value: "all", label: "All priorities" },
    ...PRIORITIES.map((priority) => ({ value: priority, label: `${priority} priority` }))
  ], "all");
  prioritySelect.className = "planner-filter-select";
  toolbar.append(searchInput, typeSelect, prioritySelect);
  const agendaHeading = element("div", { className: "planner-agenda-heading" });
  agendaHeading.append(element("div", { attrs: { id: "plannerSelectedDate" } }), element("span", { attrs: { id: "plannerResultCount" } }));
  const agendaList = element("div", { className: "planner-agenda-list", attrs: { id: "plannerAgendaList", "aria-live": "polite" } });
  mainCard.append(weekStrip, toolbar, agendaHeading, agendaList);

  const side = element("aside", { className: "planner-side" });
  const upcomingCard = element("article", { className: "planner-side-card" });
  upcomingCard.append(element("p", { className: "eyebrow", text: "Next up" }), element("h3", { text: "Coming soon" }));
  const upcomingList = element("div", { className: "planner-mini-list", attrs: { id: "plannerUpcomingList" } });
  upcomingCard.append(upcomingList);
  const unscheduledCard = element("article", { className: "planner-side-card" });
  unscheduledCard.append(element("p", { className: "eyebrow", text: "Not placed yet" }), element("h3", { text: "Unscheduled" }));
  const unscheduledList = element("div", { className: "planner-mini-list", attrs: { id: "plannerUnscheduledList" } });
  unscheduledCard.append(unscheduledList);
  side.append(upcomingCard, unscheduledCard);
  layout.append(mainCard, side);
  section.append(layout);

  const insertionPoint = qs("#schoolHub") || qs("#details") || qs("footer.footer");
  if (insertionPoint) insertionPoint.before(section);
  else qs("main.dashboard")?.append(section);

  const schoolWorkLink = qs('.sidebar nav a[href="#school"]');
  if (schoolWorkLink) {
    schoolWorkLink.setAttribute("href", "#plannerCenter");
    const icon = qs("span", schoolWorkLink)?.textContent || "▤";
    schoolWorkLink.replaceChildren(element("span", { text: icon }), document.createTextNode(" Planner & agenda"));
  }

  function updateStats() {
    const allTasks = [...state.lists.tasks, ...state.lists.planner];
    const nextWeekEnd = dateKey(addDays(today, 6));
    const values = {
      plannerDueToday: allTasks.filter((item) => !item.done && item.date === todayKey).length,
      plannerUpcoming: allTasks.filter((item) => !item.done && item.date && item.date >= todayKey && item.date <= nextWeekEnd).length,
      plannerOverdue: allTasks.filter((item) => !item.done && item.date && item.date < todayKey).length,
      plannerCompleted: allTasks.filter((item) => item.done).length
    };
    Object.entries(values).forEach(([id, value]) => {
      const node = qs(`#${id}`);
      if (node) node.textContent = String(value);
    });
  }

  function renderWeekStrip() {
    weekStrip.replaceChildren();
    for (let offset = 0; offset < 7; offset += 1) {
      const day = addDays(today, offset);
      const key = dateKey(day);
      const count = selectedDayItems(state, key).filter((entry) => entry.kind === "event" || !entry.item.done).length;
      const button = element("button", {
        className: `planner-day-button${key === selectedDate ? " active" : ""}`,
        attrs: { type: "button", role: "tab", "aria-selected": String(key === selectedDate) }
      });
      button.append(
        element("small", { text: day.toLocaleDateString("en-KE", { weekday: "short" }) }),
        element("strong", { text: String(day.getDate()) }),
        element("span", { text: count ? String(count) : "·" })
      );
      button.addEventListener("click", () => {
        selectedDate = key;
        renderWeekStrip();
        renderAgenda();
      });
      weekStrip.append(button);
    }
  }

  const itemTitle = (entry) => entry.kind === "event" ? entry.item.subject : entry.item.text;
  const itemSearchText = (entry) => [itemTitle(entry), entry.item.notes, entry.item.category, entry.item.location, entry.item.priority, entry.item.day].join(" ").toLowerCase();

  function matchesFilters(entry) {
    if (currentSearch && !itemSearchText(entry).includes(currentSearch)) return false;
    if (currentType === "tasks" && entry.kind !== "task") return false;
    if (currentType === "events" && entry.kind !== "event") return false;
    if (currentType === "completed" && (entry.kind !== "task" || !entry.item.done)) return false;
    if (currentPriority !== "all" && (entry.kind !== "task" || entry.item.priority !== currentPriority)) return false;
    return true;
  }

  function removeItem(entry) {
    const nextState = loadState();
    nextState.lists[entry.source] = nextState.lists[entry.source].filter((item) => item.id !== entry.item.id);
    saveState(nextState, entry.kind === "event" ? "Event deleted." : "Task deleted.");
  }

  function duplicateItem(entry) {
    const nextState = loadState();
    if (entry.kind === "task") {
      nextState.lists[entry.source].push({ ...entry.item, id: createId(), text: `Copy of ${entry.item.text}`.slice(0, 240), done: false });
    } else {
      nextState.lists.classes.push({ ...entry.item, id: createId(), subject: `Copy of ${entry.item.subject}`.slice(0, 200), recurring: false, date: selectedDate, day: weekdayName(selectedDate) });
    }
    saveState(nextState, "Item duplicated.");
  }

  function agendaRow(entry) {
    const item = entry.item;
    const row = element("article", { className: `planner-agenda-item ${entry.kind}${item.done ? " done" : ""}` });
    const marker = element("span", { className: `planner-item-marker ${entry.kind}`, text: entry.kind === "event" ? "◇" : (item.done ? "✓" : "○") });
    const copy = element("div", { className: "planner-item-copy" });
    copy.append(element("strong", { text: itemTitle(entry) }));
    const meta = element("div", { className: "planner-item-meta" });
    if (item.time) meta.append(element("span", { text: item.endTime ? `${item.time}–${item.endTime}` : item.time }));
    meta.append(element("span", { text: entry.kind === "event" ? (item.location || (item.recurring ? "Weekly event" : "Event")) : `${item.category} · ${item.priority}` }));
    copy.append(meta);
    if (item.notes) copy.append(element("p", { text: item.notes }));

    const badges = element("div", { className: "planner-item-badges" });
    if (entry.kind === "task") {
      badges.append(element("span", { className: `planner-priority priority-${item.priority.toLowerCase()}`, text: item.priority }));
      badges.append(element("span", { text: entry.source === "tasks" ? "Focus" : "Planner" }));
    } else if (item.recurring) badges.append(element("span", { text: "Weekly" }));

    const actions = element("div", { className: "planner-item-actions" });
    if (entry.kind === "task") {
      actions.append(iconButton(item.done ? "↺" : "✓", item.done ? "Restore task" : "Complete task", () => {
        const nextState = loadState();
        const target = nextState.lists[entry.source].find((candidate) => candidate.id === item.id);
        if (!target) return;
        target.done = !target.done;
        saveState(nextState, target.done ? "Task completed." : "Task restored.");
      }, item.done ? "restore" : "complete"));
    }
    actions.append(
      iconButton("✎", `Edit ${itemTitle(entry)}`, (button) => entry.kind === "event" ? openEventDialog(button, item) : openTaskDialog(button, entry.source, item), "edit"),
      iconButton("⧉", `Duplicate ${itemTitle(entry)}`, () => duplicateItem(entry), "duplicate"),
      iconButton("×", `Delete ${itemTitle(entry)}`, (button) => twoStepDelete(button, () => removeItem(entry)), "delete")
    );
    row.append(marker, copy, badges, actions);
    return row;
  }

  function renderAgenda() {
    const selectedLabel = qs("#plannerSelectedDate");
    if (selectedLabel) {
      selectedLabel.replaceChildren(
        element("p", { className: "eyebrow", text: selectedDate === todayKey ? "Today" : "Selected day" }),
        element("h3", { text: dateLabel(selectedDate, { long: true }) })
      );
    }
    const items = sortItems(selectedDayItems(state, selectedDate)).filter(matchesFilters);
    agendaList.replaceChildren();
    const countNode = qs("#plannerResultCount");
    if (countNode) countNode.textContent = `${items.length} item${items.length === 1 ? "" : "s"}`;
    if (!items.length) {
      const empty = element("div", { className: "planner-empty" });
      empty.append(element("span", { text: "✦" }), element("h3", { text: "This day has room." }), element("p", { text: "Add a task or event, or choose another day." }));
      agendaList.append(empty);
      return;
    }
    items.forEach((entry) => agendaList.append(agendaRow(entry)));
  }

  function miniRow(entry, actionLabel = "Open") {
    const row = element("button", { className: "planner-mini-row", attrs: { type: "button" } });
    const copy = element("span");
    copy.append(element("strong", { text: itemTitle(entry) }), element("small", { text: `${dateLabel(entry.date)}${entry.item.time ? ` · ${entry.item.time}` : ""}` }));
    row.append(copy, element("b", { text: actionLabel }));
    row.addEventListener("click", () => {
      selectedDate = entry.date || todayKey;
      renderWeekStrip();
      renderAgenda();
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return row;
  }

  function renderSideLists() {
    upcomingList.replaceChildren();
    const upcoming = nextOccurrences(state, 14).filter((entry) => entry.kind === "event" || !entry.item.done).slice(0, 6);
    if (!upcoming.length) upcomingList.append(element("p", { className: "planner-side-empty", text: "Nothing scheduled in the next two weeks." }));
    else upcoming.forEach((entry) => upcomingList.append(miniRow(entry)));

    unscheduledList.replaceChildren();
    const unscheduled = [
      ...state.lists.tasks.map((item) => ({ kind: "task", source: "tasks", item, date: "" })),
      ...state.lists.planner.map((item) => ({ kind: "task", source: "planner", item, date: "" }))
    ].filter((entry) => !entry.item.date && !entry.item.done).slice(0, 8);
    if (!unscheduled.length) unscheduledList.append(element("p", { className: "planner-side-empty", text: "Every open task has a place." }));
    else unscheduled.forEach((entry) => {
      const row = element("button", { className: "planner-mini-row", attrs: { type: "button" } });
      const copy = element("span");
      copy.append(element("strong", { text: entry.item.text }), element("small", { text: `${entry.item.category} · ${entry.item.priority}` }));
      row.append(copy, element("b", { text: "Schedule" }));
      row.addEventListener("click", () => openTaskDialog(row, entry.source, entry.item));
      unscheduledList.append(row);
    });
  }

  function exportWeek() {
    const occurrences = nextOccurrences(state, 7);
    if (!occurrences.length) {
      showToast("There are no dated items to export this week.");
      return;
    }
    const escapeIcs = (value) => String(value || "").replaceAll("\\", "\\\\").replaceAll(";", "\\;").replaceAll(",", "\\,").replaceAll("\n", "\\n");
    const compactDate = (key) => key.replaceAll("-", "");
    const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//My Little Life//Planner//EN", "CALSCALE:GREGORIAN"];
    occurrences.forEach((entry) => {
      const item = entry.item;
      lines.push("BEGIN:VEVENT", `UID:${item.id}-${entry.date}@my-little-life`);
      if (normalizeTime(item.time)) {
        const start = `${compactDate(entry.date)}T${item.time.replace(":", "")}00`;
        const endTime = item.endTime || (() => {
          const [hour, minute] = item.time.split(":").map(Number);
          return `${pad((hour + 1) % 24)}:${pad(minute)}`;
        })();
        lines.push(`DTSTART:${start}`, `DTEND:${compactDate(entry.date)}T${endTime.replace(":", "")}00`);
      } else lines.push(`DTSTART;VALUE=DATE:${compactDate(entry.date)}`);
      lines.push(`SUMMARY:${escapeIcs(itemTitle(entry))}`);
      const description = entry.kind === "event" ? item.notes : `${item.category} · ${item.priority}${item.notes ? `\n${item.notes}` : ""}`;
      if (description) lines.push(`DESCRIPTION:${escapeIcs(description)}`);
      if (item.location) lines.push(`LOCATION:${escapeIcs(item.location)}`);
      lines.push("END:VEVENT");
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = element("a", { attrs: { href: url, download: `my-little-life-agenda-${todayKey}.ics` } });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Seven-day agenda exported.");
  }

  addTaskButton.addEventListener("click", () => openTaskDialog(addTaskButton, "planner"));
  addEventButton.addEventListener("click", () => openEventDialog(addEventButton));
  exportButton.addEventListener("click", exportWeek);
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim().toLowerCase();
    renderAgenda();
  });
  typeSelect.addEventListener("change", () => {
    currentType = typeSelect.value;
    renderAgenda();
  });
  prioritySelect.addEventListener("change", () => {
    currentPriority = prioritySelect.value;
    renderAgenda();
  });

  function injectSettingsToggle() {
    const grid = qs("#settings .settings-toggle-grid");
    if (!grid || qs('[data-planner-visibility="true"]', grid)) return;
    const label = element("label", { className: "settings-toggle", attrs: { "data-planner-visibility": "true" } });
    const checkbox = element("input", { attrs: { type: "checkbox" } });
    checkbox.checked = !state.plannerSettings.hidden;
    const copy = element("span");
    copy.append(element("strong", { text: "Planner & agenda" }), element("small", { text: "Combined tasks, timetable events, and seven-day agenda." }));
    label.append(checkbox, copy);
    checkbox.addEventListener("change", () => {
      const nextState = loadState();
      nextState.plannerSettings.hidden = !checkbox.checked;
      saveState(nextState, checkbox.checked ? "Planner centre shown." : "Planner centre hidden.");
    });
    grid.append(label);
  }

  section.hidden = state.plannerSettings.hidden;
  if (schoolWorkLink) schoolWorkLink.hidden = state.plannerSettings.hidden;
  updateStats();
  renderWeekStrip();
  renderAgenda();
  renderSideLists();
  injectSettingsToggle();
})();