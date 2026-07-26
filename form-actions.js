"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const NOTICE_KEY = "myLittleLife.formNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function isoWeekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() + 4 - day);
    const yearStart = new Date(copy.getFullYear(), 0, 1);
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `${copy.getFullYear()}-W${pad(week)}`;
  }

  const weekKey = isoWeekKey(today);

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    Object.entries(options.attrs || {}).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    });
    return node;
  }

  function ensureStylesheet() {
    if (qs('link[href="form-actions.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "form-actions.css" } }));
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function loadState() {
    const state = safeParse(localStorage.getItem(STORAGE_KEY), {});
    state.version = Number(state.version) || 2;
    state.profile = state.profile && typeof state.profile === "object" ? state.profile : { name: "Charry" };
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.weekly = state.weekly && typeof state.weekly === "object" ? state.weekly : {};
    state.analytics = state.analytics && typeof state.analytics === "object"
      ? state.analytics
      : { reach: "8,420", engagement: "6.8%", views: "12.7k" };
    state.lists = state.lists && typeof state.lists === "object" ? state.lists : {};
    [
      "tasks", "ideas", "drafts", "accounts", "planner", "social", "units", "study",
      "research", "classes", "businesses", "workGoals", "workLogs", "people", "relationshipItems"
    ].forEach((key) => {
      state.lists[key] = Array.isArray(state.lists[key]) ? state.lists[key] : [];
    });
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.project = state.project && typeof state.project === "object"
      ? state.project
      : { title: "", next: "" };
    return state;
  }

  function getDay(state) {
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
      ...existing,
      meals: existing.meals && typeof existing.meals === "object" ? existing.meals : {},
      wellbeing: existing.wellbeing && typeof existing.wellbeing === "object" ? existing.wellbeing : {}
    };
    return state.daily[dateKey];
  }

  function getWeek(state) {
    const existing = state.weekly[weekKey] && typeof state.weekly[weekKey] === "object" ? state.weekly[weekKey] : {};
    state.weekly[weekKey] = {
      ...existing,
      expenses: Array.isArray(existing.expenses) ? existing.expenses : []
    };
    return state.weekly[weekKey];
  }

  function captureUnsavedFields(state) {
    const day = getDay(state);
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) day.quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) day.gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  let pendingState = null;

  function storeState(state) {
    captureUnsavedFields(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    syncLegacyStorage(state);
    pendingState = state;
  }

  function readLegacyList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function mergeLegacyList(key, items, mapItem, identity) {
    if (!Array.isArray(items) || !items.length) return;
    const current = readLegacyList(key);
    items.map(mapItem).forEach((item) => {
      if (!current.some((existing) => identity(existing) === identity(item))) current.push(item);
    });
    localStorage.setItem(key, JSON.stringify(current));
  }

  function syncLegacyStorage(state) {
    mergeLegacyList("contentIdeas", state.lists.ideas, (item) => ({ title: item.text, detail: item.meta || "New idea", status: "idea", createdAt: dateKey }), (item) => `${item.title}|${item.createdAt}`);
    mergeLegacyList("contentIdeas", state.lists.drafts, (item) => ({ title: item.text, detail: item.meta || "New draft", status: "draft", createdAt: dateKey }), (item) => `${item.title}|${item.createdAt}`);
    mergeLegacyList("contentAccounts", state.lists.accounts, (item) => ({ platform: item.platform, username: item.username, followers: item.followers }), (item) => `${item.platform}|${item.username}`);
    mergeLegacyList("customUnits", state.lists.units, (item) => ({ code: item.code, name: item.name, lecturer: item.lecturer, year: item.year }), (item) => `${item.code}|${item.name}`);
    mergeLegacyList("schoolStudyItems", state.lists.study, (item) => ({ value: item.title, meta: item.meta || "New session", icon: "◒" }), (item) => `${item.value}|${item.meta}`);
    mergeLegacyList("schoolResearchItems", state.lists.research, (item) => ({ value: item.title, meta: item.meta || "New reference", icon: "NOTE" }), (item) => `${item.value}|${item.meta}`);
    mergeLegacyList("classEntries", state.lists.classes, (item) => ({ day: item.day, time: item.time, subject: item.subject }), (item) => `${item.day}|${item.time}|${item.subject}`);
    mergeLegacyList("personalBusinesses", state.lists.businesses, (item) => ({ name: item.name, type: item.detail, duration: "" }), (item) => item.name);
    mergeLegacyList("workGoals", state.lists.workGoals, (item) => ({ title: item.text, done: Boolean(item.done) }), (item) => item.title);
    mergeLegacyList("workLogEntries", state.lists.workLogs, (item) => ({ hours: item.hours, note: item.note || "Work session", date: item.createdAt?.slice(0, 10) || dateKey }), (item) => `${item.date}|${item.hours}|${item.note}`);
    mergeLegacyList("peopleDirectory", state.lists.people, (item) => ({ name: item.name, group: item.meta?.split(" · ")[0] || "Other", birthday: "", note: item.meta || "Keep in touch" }), (item) => item.name);
    mergeLegacyList("relationshipItems", state.lists.relationshipItems, (item) => ({ type: item.type, text: item.text }), (item) => `${item.type}|${item.text}`);
    const day = getDay(state);
    Object.entries(day.meals || {}).forEach(([meal, description]) => { if (description) localStorage.setItem(`meal-${meal}`, description); });
    if (day.memory) localStorage.setItem("savedMemory", day.memory);
    if (state.project.title || state.project.next) localStorage.setItem("schoolProjectDetails", JSON.stringify({ title: state.project.title, next: state.project.next }));
    if (state.weekly.expenses?.length) localStorage.setItem("weeklyExpenses", String(state.weekly.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)));
  }

  globalThis.addEventListener("beforeunload", () => {
    if (!pendingState) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingState));
    } catch (error) {
      console.error("Unable to preserve form changes.", error);
    }
  });

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  const savedNotice = sessionStorage.getItem(NOTICE_KEY);
  if (savedNotice) {
    sessionStorage.removeItem(NOTICE_KEY);
    setTimeout(() => showToast(savedNotice), 150);
  }

  ensureStylesheet();

  const dialog = element("div", {
    className: "action-form-dialog",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-hidden": "true",
      "aria-labelledby": "actionFormTitle",
      "aria-describedby": "actionFormDescription"
    }
  });
  const backdrop = element("button", {
    className: "action-form-backdrop",
    attrs: { type: "button", "aria-label": "Close form" }
  });
  const form = element("form", { className: "action-form-card", attrs: { novalidate: "" } });
  const closeButton = element("button", {
    className: "action-form-close",
    text: "×",
    attrs: { type: "button", "aria-label": "Close form" }
  });
  const eyebrow = element("p", { className: "eyebrow", text: "Quick add" });
  const heading = element("h2", { text: "Add item", attrs: { id: "actionFormTitle" } });
  const description = element("p", {
    className: "action-form-description",
    attrs: { id: "actionFormDescription" }
  });
  const fields = element("div", { className: "action-form-fields" });
  const errorMessage = element("p", {
    className: "action-form-error",
    attrs: { role: "alert", "aria-live": "polite" }
  });
  const footer = element("div", { className: "action-form-footer" });
  const cancelButton = element("button", {
    className: "action-form-cancel",
    text: "Cancel",
    attrs: { type: "button" }
  });
  const submitButton = element("button", {
    className: "save-button action-form-submit",
    text: "Save",
    attrs: { type: "submit" }
  });

  footer.append(cancelButton, submitButton);
  form.append(closeButton, eyebrow, heading, description, fields, errorMessage, footer);
  dialog.append(backdrop, form);
  document.body.append(dialog);

  let activeAction = null;
  let formOpener = null;

  function fieldControl(field, value) {
    const wrapper = element("label", { className: "action-form-field" });
    const label = element("span", { text: field.label });
    const id = `action-${field.name}`;
    let control;

    if (field.type === "textarea") {
      control = element("textarea", {
        attrs: {
          id,
          name: field.name,
          rows: field.rows || 4,
          maxlength: field.maxlength,
          placeholder: field.placeholder,
          required: field.required ? "" : null
        }
      });
      control.value = value || "";
    } else if (field.type === "select") {
      control = element("select", {
        attrs: { id, name: field.name, required: field.required ? "" : null }
      });
      (field.options || []).forEach((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const node = element("option", { text: optionLabel, attrs: { value: optionValue } });
        if (String(optionValue) === String(value || field.value || "")) node.selected = true;
        control.append(node);
      });
    } else {
      control = element("input", {
        attrs: {
          id,
          name: field.name,
          type: field.type || "text",
          value: value ?? field.value ?? "",
          maxlength: field.maxlength,
          placeholder: field.placeholder,
          min: field.min,
          max: field.max,
          step: field.step,
          inputmode: field.inputmode,
          autocomplete: field.autocomplete || "off",
          required: field.required ? "" : null
        }
      });
    }

    label.setAttribute("for", id);
    wrapper.append(label, control);
    if (field.help) wrapper.append(element("small", { text: field.help }));
    return wrapper;
  }

  function closeForm() {
    dialog.classList.remove("open");
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeAction = null;
    errorMessage.textContent = "";
    formOpener?.focus?.();
  }

  function openForm(action, opener) {
    activeAction = action;
    formOpener = opener || document.activeElement;
    heading.textContent = action.title;
    description.textContent = action.description || "Add the details below.";
    submitButton.textContent = action.submitLabel || "Save";
    errorMessage.textContent = "";
    fields.replaceChildren();

    const state = loadState();
    const initialValues = typeof action.values === "function" ? action.values(state) : (action.values || {});
    action.fields.forEach((field) => fields.append(fieldControl(field, initialValues[field.name])));

    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => qs("input, textarea, select", fields)?.focus());
  }

  function valuesFromForm() {
    const values = {};
    new FormData(form).forEach((value, key) => {
      values[key] = typeof value === "string" ? value.trim() : value;
    });
    return values;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeAction) return;

    if (!form.reportValidity()) return;
    const values = valuesFromForm();
    const validationMessage = activeAction.validate?.(values) || "";
    if (validationMessage) {
      errorMessage.textContent = validationMessage;
      return;
    }

    try {
      const state = loadState();
      activeAction.save(values, state);
      storeState(state);
      sessionStorage.setItem(NOTICE_KEY, activeAction.success || "Saved locally.");
      closeForm();
      globalThis.location.reload();
    } catch (error) {
      console.error("Unable to save form data.", error);
      errorMessage.textContent = "This item could not be saved. Please try again.";
    }
  });

  backdrop.addEventListener("click", closeForm);
  closeButton.addEventListener("click", closeForm);
  cancelButton.addEventListener("click", closeForm);

  document.addEventListener("keydown", (event) => {
    if (!dialog.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeForm();
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

  const actionDefinitions = [
    {
      selector: ".log-pill",
      create: (trigger) => {
        const mealName = trigger.dataset.log || "Meal";
        return {
          title: `Log ${mealName.toLowerCase()}`,
          description: "Record what you ate so today's meal tracker stays useful.",
          submitLabel: "Save meal",
          success: `${mealName} logged.`,
          fields: [{ name: "description", label: "Meal description", type: "textarea", rows: 3, maxlength: 300, required: true, placeholder: "What did you have?" }],
          values: (state) => ({ description: getDay(state).meals[mealName] || "" }),
          save: (values, state) => { getDay(state).meals[mealName] = values.description.slice(0, 300); }
        };
      }
    },
    {
      selector: "#addTask",
      create: () => ({
        title: "Add focus task",
        description: "Keep the task specific enough to act on today.",
        submitLabel: "Add task",
        success: "Focus task added.",
        fields: [{ name: "text", label: "Task", maxlength: 240, required: true, placeholder: "What needs your attention?" }],
        save: (values, state) => state.lists.tasks.push({ id: createId(), text: values.text.slice(0, 240), meta: "New focus item" })
      })
    },
    {
      selector: "#addContent, #overviewIdea, #addDraft",
      create: (trigger) => {
        const type = trigger.id === "addDraft" ? "drafts" : "ideas";
        return {
          title: type === "ideas" ? "Add content idea" : "Add content draft",
          description: type === "ideas" ? "Capture the idea before it disappears." : "Save the draft you are currently shaping.",
          submitLabel: type === "ideas" ? "Add idea" : "Add draft",
          success: type === "ideas" ? "Content idea added." : "Draft added.",
          fields: [{ name: "text", label: type === "ideas" ? "Idea" : "Draft", type: "textarea", rows: 4, maxlength: 300, required: true }],
          save: (values, state) => state.lists[type].push({
            id: createId(),
            text: values.text.slice(0, 300),
            meta: type === "ideas" ? "New idea · choose a platform" : "New draft · not scheduled"
          })
        };
      }
    },
    {
      selector: "#updateAnalytics",
      create: () => ({
        title: "Update weekly analytics",
        description: "Enter the latest figures exactly as you want them displayed.",
        submitLabel: "Update metrics",
        success: "Analytics updated.",
        fields: [
          { name: "reach", label: "Total reach", maxlength: 40, required: true },
          { name: "engagement", label: "Engagement rate", maxlength: 40, required: true, placeholder: "e.g. 6.8%" },
          { name: "views", label: "Total views", maxlength: 40, required: true }
        ],
        values: () => ({ ...safeParse(localStorage.getItem("contentAnalytics"), { reach: "", engagement: "", views: "" }) }),
        save: (values, state) => {
          state.analytics = { reach: values.reach.slice(0, 40), engagement: values.engagement.slice(0, 40), views: values.views.slice(0, 40) };
          localStorage.setItem("contentAnalytics", JSON.stringify(state.analytics));
          const history = readLegacyList("analyticsHistory");
          history.push({ ...state.analytics, date: dateKey });
          localStorage.setItem("analyticsHistory", JSON.stringify(history.slice(-8)));
        }
      })
    },
    {
      selector: "#addAccount",
      create: () => ({
        title: "Add social account",
        description: "Save the platform, handle, and current audience size.",
        submitLabel: "Add account",
        success: "Social account added.",
        fields: [
          { name: "platform", label: "Platform", maxlength: 80, required: true, placeholder: "Instagram, TikTok, YouTube..." },
          { name: "username", label: "Account name or handle", maxlength: 120, required: true },
          { name: "followers", label: "Followers or subscribers", maxlength: 40, required: true }
        ],
        save: (values, state) => state.lists.accounts.push({ id: createId(), platform: values.platform.slice(0, 80), username: values.username.slice(0, 120), followers: values.followers.slice(0, 40) })
      })
    },
    {
      selector: "#addPlanner",
      create: () => ({
        title: "Add planner task",
        description: "Add a school or work item to your planner.",
        submitLabel: "Add task",
        success: "Planner task added.",
        fields: [{ name: "text", label: "Task", maxlength: 240, required: true }],
        save: (values, state) => state.lists.planner.push({ id: createId(), text: values.text.slice(0, 240), meta: "New task" })
      })
    },
    {
      selector: "#addExpense, #overviewExpense",
      create: () => ({
        title: "Add expense",
        description: "Record the amount and what it was for.",
        submitLabel: "Save expense",
        success: "Expense added.",
        fields: [
          { name: "amount", label: "Amount (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, inputmode: "decimal", required: true },
          { name: "note", label: "Description", maxlength: 200, placeholder: "Optional" }
        ],
        validate: (values) => {
          const amount = Number(values.amount);
          return Number.isFinite(amount) && amount > 0 && amount <= 100000000 ? "" : "Enter a valid positive amount.";
        },
        save: (values, state) => getWeek(state).expenses.push({ id: createId(), amount: Number(values.amount), note: values.note.slice(0, 200), createdAt: new Date().toISOString() })
      })
    },
    {
      selector: "#addSocial, #addSocialLink",
      create: () => ({
        title: "Add personal plan",
        description: "Save a person, plan, or moment you want to remember.",
        submitLabel: "Add plan",
        success: "Personal plan added.",
        fields: [{ name: "text", label: "Plan or reminder", type: "textarea", rows: 3, maxlength: 240, required: true }],
        save: (values, state) => state.lists.social.push({ id: createId(), text: values.text.slice(0, 240), meta: "New plan" })
      })
    },
    {
      selector: "#addMemory, #overviewMemory",
      create: () => ({
        title: "Save today's memory",
        description: "Write something from today that you want to keep.",
        submitLabel: "Save memory",
        success: "Memory saved.",
        fields: [{ name: "memory", label: "Memory", type: "textarea", rows: 6, maxlength: 3000, required: true }],
        values: (state) => ({ memory: getDay(state).memory || "" }),
        save: (values, state) => { getDay(state).memory = values.memory.slice(0, 3000); }
      })
    },
    {
      selector: "#addUnit",
      create: () => ({
        title: "Add school unit",
        description: "Save the unit details for your school centre.",
        submitLabel: "Add unit",
        success: "School unit added.",
        fields: [
          { name: "code", label: "Unit code", maxlength: 30, required: true, placeholder: "e.g. PHR 308" },
          { name: "name", label: "Unit name", maxlength: 160, required: true },
          { name: "lecturer", label: "Lecturer", maxlength: 160, required: true },
          { name: "year", label: "Year or semester", maxlength: 80, required: true, value: "Year 4.3" }
        ],
        save: (values, state) => state.lists.units.push({ id: createId(), code: values.code.slice(0, 30), name: values.name.slice(0, 160), lecturer: values.lecturer.slice(0, 160), year: values.year.slice(0, 80) })
      })
    },
    {
      selector: "#addStudy, #addReading",
      create: (trigger) => {
        const reading = trigger.id === "addReading";
        return {
          title: reading ? "Add reading session" : "Add study session",
          description: "Include a day, duration, chapter, or short note.",
          submitLabel: "Add session",
          success: reading ? "Reading session added." : "Study session added.",
          fields: [
            { name: "title", label: reading ? "Reading" : "Study topic", maxlength: 240, required: true },
            { name: "meta", label: "Schedule or note", maxlength: 240, value: reading ? "New reading · add a duration" : "New session · schedule it" }
          ],
          save: (values, state) => state.lists.study.push({ id: createId(), title: values.title.slice(0, 240), meta: (values.meta || "New session").slice(0, 240), tag: reading ? "READING" : "PENDING", active: reading })
        };
      }
    },
    {
      selector: "#addResearch",
      create: () => ({
        title: "Add research resource",
        description: "Save a paper, link, note, or research question.",
        submitLabel: "Add resource",
        success: "Research resource added.",
        fields: [
          { name: "type", label: "Type", type: "select", required: true, options: ["PDF", "LINK", "NOTE"], value: "NOTE" },
          { name: "title", label: "Title or question", type: "textarea", rows: 3, maxlength: 300, required: true }
        ],
        save: (values, state) => state.lists.research.push({ id: createId(), type: values.type.slice(0, 10).toUpperCase(), title: values.title.slice(0, 300), meta: "New reference" })
      })
    },
    {
      selector: "#addProject",
      create: () => ({
        title: "Update school project",
        description: "Keep the project title and next action current.",
        submitLabel: "Save project",
        success: "Project updated.",
        fields: [
          { name: "title", label: "Project title", maxlength: 240, required: true },
          { name: "next", label: "Next action", type: "textarea", rows: 4, maxlength: 1000, required: true }
        ],
        values: (state) => ({ title: state.project.title || "", next: state.project.next || "" }),
        save: (values, state) => { state.project = { title: values.title.slice(0, 240), next: values.next.slice(0, 1000) }; }
      })
    },
    {
      selector: "#addClass",
      create: () => ({
        title: "Add timetable item",
        description: "Add a class, study block, exam, or other scheduled school item.",
        submitLabel: "Add timetable item",
        success: "Timetable item added.",
        fields: [
          { name: "day", label: "Day", type: "select", required: true, options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
          { name: "time", label: "Time", type: "time", required: true },
          { name: "subject", label: "Class or activity", maxlength: 200, required: true }
        ],
        save: (values, state) => state.lists.classes.push({ id: createId(), day: values.day.slice(0, 30), time: values.time.slice(0, 40), subject: values.subject.slice(0, 200) })
      })
    },
    {
      selector: "#addBusiness",
      create: () => ({
        title: "Add business or work",
        description: "Save what you do and how long you have been doing it.",
        submitLabel: "Add business",
        success: "Business added.",
        fields: [
          { name: "name", label: "Business or work name", maxlength: 160, required: true },
          { name: "type", label: "What do you do?", maxlength: 180, required: true },
          { name: "duration", label: "How long?", maxlength: 100, placeholder: "Optional" }
        ],
        save: (values, state) => {
          const initials = values.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NW";
          state.lists.businesses.push({ id: createId(), initials, name: values.name.slice(0, 160), detail: `${values.type.slice(0, 180)}${values.duration ? ` · ${values.duration.slice(0, 100)}` : " · New business"}`, status: "New" });
        }
      })
    },
    {
      selector: "#addWorkGoal",
      create: () => ({
        title: "Add work goal",
        description: "Write one clear result you want to achieve.",
        submitLabel: "Add goal",
        success: "Work goal added.",
        fields: [{ name: "text", label: "Goal", type: "textarea", rows: 3, maxlength: 240, required: true }],
        save: (values, state) => state.lists.workGoals.push({ id: createId(), text: values.text.slice(0, 240), done: false })
      })
    },
    {
      selector: "#addWorkLog",
      create: () => ({
        title: "Log work hours",
        description: "Add the hours worked today or during your latest session.",
        submitLabel: "Log hours",
        success: "Work hours logged.",
        fields: [{ name: "hours", label: "Hours", type: "number", min: 0.25, max: 24, step: 0.25, inputmode: "decimal", required: true }],
        validate: (values) => {
          const hours = Number(values.hours);
          return Number.isFinite(hours) && hours > 0 && hours <= 24 ? "" : "Enter work hours between 0 and 24.";
        },
        save: (values, state) => state.lists.workLogs.push({ id: createId(), hours: Number(values.hours), createdAt: new Date().toISOString() })
      })
    },
    {
      selector: "#addResource",
      create: () => ({
        title: "Add pharmacy resource",
        description: "Save a note, PDF, book, or useful link in your resource vault.",
        submitLabel: "Add resource",
        success: "Pharmacy resource added.",
        fields: [
          { name: "title", label: "Resource title", maxlength: 240, required: true },
          { name: "type", label: "Type", type: "select", options: ["PDF", "LINK", "NOTE", "BOOK"], value: "NOTE", required: true },
          { name: "note", label: "Course or note", maxlength: 240, placeholder: "e.g. Pharmacology XI" },
          { name: "link", label: "Link", type: "url", maxlength: 500, placeholder: "Optional" }
        ],
        save: (values) => {
          const resources = readLegacyList("pharmacyResources");
          resources.push({ title: values.title.slice(0, 240), type: values.type, note: values.note.slice(0, 240) || "Pharmacy reference", link: values.link.slice(0, 500) });
          localStorage.setItem("pharmacyResources", JSON.stringify(resources));
        }
      })
    },
    {
      selector: "#addExam",
      create: () => ({
        title: "Add exam date",
        description: "Keep an exam here even when the official timetable is still changing.",
        submitLabel: "Add exam",
        success: "Exam added.",
        fields: [
          { name: "code", label: "Unit code", maxlength: 30, required: true },
          { name: "name", label: "Unit or exam name", maxlength: 180, required: true },
          { name: "date", label: "Exam date", type: "date", required: true },
          { name: "time", label: "Time", type: "text", maxlength: 80, placeholder: "Optional" }
        ],
        save: (values) => {
          const exams = readLegacyList("examEntries");
          exams.push({ code: values.code, name: values.name, date: values.date, time: values.time });
          localStorage.setItem("examEntries", JSON.stringify(exams));
        }
      })
    },
    {
      selector: "#addExamPrep",
      create: () => ({
        title: "Add exam preparation plan",
        description: "Track how ready you feel for a unit or exam.",
        submitLabel: "Add prep plan",
        success: "Exam preparation plan added.",
        fields: [
          { name: "unit", label: "Unit or exam", maxlength: 180, required: true },
          { name: "code", label: "Unit code and lecturer", maxlength: 240 },
          { name: "progress", label: "Preparation progress", type: "number", min: 0, max: 100, value: 0, required: true }
        ],
        validate: (values) => Number.isFinite(Number(values.progress)) && Number(values.progress) >= 0 && Number(values.progress) <= 100 ? "" : "Use a progress value from 0 to 100.",
        save: (values) => {
          const items = readLegacyList("examPrepItems");
          items.push({ unit: values.unit, code: values.code || "Unit details to add", progress: Number(values.progress) });
          localStorage.setItem("examPrepItems", JSON.stringify(items));
        }
      })
    },
    {
      selector: "#addBusinessKpi",
      create: () => ({
        title: "Add business KPI",
        description: "Track a number that tells you whether a business is moving forward.",
        submitLabel: "Add KPI",
        success: "Business KPI added.",
        fields: [
          { name: "business", label: "Business", maxlength: 160, required: true },
          { name: "metric", label: "What are you measuring?", maxlength: 160, required: true },
          { name: "value", label: "Current value", maxlength: 80, required: true },
          { name: "note", label: "Target or note", maxlength: 240 }
        ],
        save: (values) => {
          const items = readLegacyList("businessKpis");
          items.push({ business: values.business, metric: values.metric, value: values.value, note: values.note || "Add a target" });
          localStorage.setItem("businessKpis", JSON.stringify(items));
        }
      })
    },
    {
      selector: "#addCareerTask",
      create: () => ({
        title: "Add attachment task",
        description: "Keep one practical next step for finding and preparing for attachment.",
        submitLabel: "Add task",
        success: "Attachment task added.",
        fields: [{ name: "title", label: "Task", type: "textarea", rows: 3, maxlength: 300, required: true }],
        save: (values) => {
          const items = readLegacyList("careerTasks");
          items.push({ title: values.title, done: false });
          localStorage.setItem("careerTasks", JSON.stringify(items));
        }
      })
    },
    {
      selector: "#addCustomHabit",
      create: () => ({
        title: "Create a habit",
        description: "Choose a routine that fits your real life rather than an ideal one.",
        submitLabel: "Add habit",
        success: "Habit added.",
        fields: [
          { name: "name", label: "Habit", maxlength: 160, required: true },
          { name: "frequency", label: "How often?", maxlength: 100, value: "Daily", required: true }
        ],
        save: (values) => {
          const items = readLegacyList("customHabits");
          items.push({ name: values.name, frequency: values.frequency, done: false });
          localStorage.setItem("customHabits", JSON.stringify(items));
        }
      })
    },
    {
      selector: "#addVisionCard",
      create: () => ({
        title: "Add to your vision board",
        description: "Add a dream, feeling, place, or goal you want to keep close.",
        submitLabel: "Add vision",
        success: "Vision added to your board.",
        fields: [
          { name: "title", label: "Vision", maxlength: 180, required: true },
          { name: "category", label: "Category", maxlength: 80, value: "My vision" },
          { name: "text", label: "Affirmation or detail", type: "textarea", rows: 3, maxlength: 300 }
        ],
        save: (values) => {
          const items = readLegacyList("visionItems");
          items.push({ title: values.title, category: values.category || "My vision", text: values.text || "" });
          localStorage.setItem("visionItems", JSON.stringify(items));
        }
      })
    },
    {
      selector: "#addArchiveEntry",
      create: () => ({
        title: "Add journal archive entry",
        description: "Keep a searchable record of something meaningful from your day.",
        submitLabel: "Save entry",
        success: "Journal entry archived.",
        fields: [
          { name: "title", label: "Entry title", maxlength: 180, required: true },
          { name: "detail", label: "What do you want to remember?", type: "textarea", rows: 5, maxlength: 3000 },
          { name: "tag", label: "Tag", type: "select", options: ["personal", "school", "work", "gratitude"], value: "personal" }
        ],
        save: (values) => {
          const entries = readLegacyList("archiveEntries");
          entries.unshift({ title: values.title, detail: values.detail || "", tag: values.tag, date: new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" }).toUpperCase() });
          localStorage.setItem("archiveEntries", JSON.stringify(entries));
        }
      })
    },
    {
      selector: "#addMealLog",
      create: () => ({
        title: "Log a meal",
        description: "Record nourishment without needing to make it perfect.",
        submitLabel: "Save meal",
        success: "Meal logged.",
        fields: [
          { name: "type", label: "Meal", type: "select", options: ["Breakfast", "Lunch", "Dinner", "Snack"], value: "Lunch", required: true },
          { name: "detail", label: "What did you eat?", type: "textarea", rows: 3, maxlength: 300, required: true }
        ],
        save: (values) => {
          const meals = readLegacyList("mealLogs");
          meals.push({ type: values.type, detail: values.detail, date: dateKey });
          localStorage.setItem("mealLogs", JSON.stringify(meals));
        }
      })
    },
    {
      selector: "#addCategorizedExpense",
      create: () => ({
        title: "Log a categorized expense",
        description: "Notice where your money is going, without judgment.",
        submitLabel: "Save expense",
        success: "Expense logged.",
        fields: [
          { name: "category", label: "Category", type: "select", options: ["food", "transport", "school", "personal"], value: "personal", required: true },
          { name: "amount", label: "Amount (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, required: true },
          { name: "note", label: "What was it for?", maxlength: 240 }
        ],
        validate: (values) => Number.isFinite(Number(values.amount)) && Number(values.amount) > 0 ? "Enter a positive amount." : "",
        save: (values) => {
          const amount = Number(values.amount);
          const categories = { food: 0, transport: 0, school: 0, personal: 0, other: 0 };
          Object.assign(categories, JSON.parse(localStorage.getItem("categoryExpenses") || "{}"));
          categories[values.category] = Number(categories[values.category] || 0) + amount;
          localStorage.setItem("categoryExpenses", JSON.stringify(categories));
          localStorage.setItem("weeklyExpenses", String(Number(localStorage.getItem("weeklyExpenses") || 0) + amount));
          const ledger = readLegacyList("expenseLedger");
          ledger.unshift({ id: `expense-${Date.now()}`, category: values.category, amount, note: values.note || "", date: dateKey });
          localStorage.setItem("expenseLedger", JSON.stringify(ledger));
        }
      })
    },
    {
      selector: "#addScheduleEntry",
      create: () => ({
        title: "Add timetable item",
        description: "Add a class, study block, or exam to your personal timetable.",
        submitLabel: "Add to timetable",
        success: "Timetable item added.",
        fields: [
          { name: "day", label: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], value: "Monday", required: true },
          { name: "time", label: "Time", type: "text", maxlength: 80, required: true, placeholder: "e.g. 2:00–4:00 PM" },
          { name: "title", label: "Class, study block, or exam", maxlength: 200, required: true }
        ],
        save: (values) => { const items = readLegacyList("scheduleEntries"); items.push({ day: values.day, time: values.time, title: values.title }); localStorage.setItem("scheduleEntries", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addStudyLog",
      create: () => ({
        title: "Log a study session",
        description: "Capture what you covered so your effort becomes visible.",
        submitLabel: "Save study log",
        success: "Study session logged.",
        fields: [
          { name: "topic", label: "What did you study?", maxlength: 240, required: true },
          { name: "duration", label: "How long?", maxlength: 80, placeholder: "e.g. 45 minutes" }
        ],
        save: (values) => { const items = readLegacyList("studySessions"); items.unshift({ topic: values.topic, duration: values.duration || "Focused session", date: dateKey }); localStorage.setItem("studySessions", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addPipelinePost",
      create: () => ({
        title: "Add content pipeline post",
        description: "Move a content idea into a clear stage of creation.",
        submitLabel: "Add post",
        success: "Content post added.",
        fields: [
          { name: "title", label: "Post or content title", maxlength: 240, required: true },
          { name: "platform", label: "Platform", maxlength: 80, placeholder: "Instagram, Facebook..." },
          { name: "status", label: "Stage", type: "select", options: [{ value: "0", label: "Planned" }, { value: "1", label: "Creating" }, { value: "2", label: "Scheduled" }, { value: "3", label: "Published" }], value: "0" }
        ],
        save: (values) => { const items = readLegacyList("pipelinePosts"); items.push({ id: `pipeline-${Date.now()}`, title: values.title, platform: values.platform || "Platform to add", status: Number(values.status), views: "", likes: "", comments: "" }); localStorage.setItem("pipelinePosts", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addSavingsGoal",
      create: () => ({
        title: "Add a savings goal",
        description: "Give your money a direction that feels meaningful.",
        submitLabel: "Add savings goal",
        success: "Savings goal added.",
        fields: [
          { name: "name", label: "Goal name", maxlength: 180, required: true },
          { name: "target", label: "Target amount (KSh)", type: "number", min: 1, step: 1, required: true },
          { name: "saved", label: "Already saved (KSh)", type: "number", min: 0, step: 1, value: 0 },
          { name: "note", label: "Target date or note", maxlength: 240 }
        ],
        validate: (values) => Number(values.target) > 0 ? "" : "Enter a target amount.",
        save: (values) => { const items = readLegacyList("savingsGoals"); items.push({ name: values.name, target: Number(values.target), saved: Number(values.saved || 0), note: values.note || "" }); localStorage.setItem("savingsGoals", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addDueItem",
      create: () => ({
        title: "Add a reminder",
        description: "Put an important task or deadline somewhere you will see it.",
        submitLabel: "Add reminder",
        success: "Reminder added.",
        fields: [
          { name: "date", label: "Date or label", type: "date", required: true },
          { name: "title", label: "What is due?", maxlength: 240, required: true },
          { name: "meta", label: "Category or detail", maxlength: 200 },
          { name: "when", label: "How soon?", maxlength: 80, value: "Soon" }
        ],
        save: (values) => { const items = readLegacyList("dueItems"); items.push({ date: values.date, title: values.title, meta: values.meta || "Reminder", when: values.when || "Soon" }); localStorage.setItem("dueItems", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addCalendarEvent",
      create: () => ({
        title: "Add calendar event",
        description: "Add school, work, personal, health, or relationship plans to your timeline.",
        submitLabel: "Add event",
        success: "Calendar event added.",
        fields: [
          { name: "date", label: "Date", type: "date", required: true },
          { name: "title", label: "What is happening?", maxlength: 240, required: true },
          { name: "meta", label: "Category or time", maxlength: 160 }
        ],
        save: (values) => { const items = readLegacyList("calendarEvents"); items.push({ date: values.date, title: values.title, meta: values.meta || "Personal event", color: "coral-event" }); localStorage.setItem("calendarEvents", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addRoutine",
      create: () => ({
        title: "Add a recurring routine",
        description: "Give your days a shape that supports the life you actually live.",
        submitLabel: "Add routine",
        success: "Routine added.",
        fields: [
          { name: "name", label: "Routine", maxlength: 180, required: true },
          { name: "time", label: "Time", maxlength: 80, value: "Anytime" },
          { name: "detail", label: "What does it include?", maxlength: 240 }
        ],
        save: (values) => { const items = readLegacyList("routines"); items.push({ name: values.name, time: values.time || "Anytime", detail: values.detail || "Your recurring routine" }); localStorage.setItem("routines", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addBoardProject",
      create: () => ({
        title: "Add a project",
        description: "Give a project a place, a next action, and a stage.",
        submitLabel: "Add project",
        success: "Project added to the board.",
        fields: [
          { name: "title", label: "Project name", maxlength: 200, required: true },
          { name: "meta", label: "Category and next action", maxlength: 300 },
          { name: "status", label: "Stage", type: "select", options: ["explore", "active", "done"], value: "explore" }
        ],
        save: (values) => { const items = readLegacyList("boardProjects"); items.push({ title: values.title, meta: values.meta || "New project", status: values.status }); localStorage.setItem("boardProjects", JSON.stringify(items)); }
      })
    },
    {
      selector: "#addPerson",
      create: () => ({
        title: "Add person",
        description: "Save who they are and how you want to stay connected.",
        submitLabel: "Add person",
        success: "Person added.",
        fields: [
          { name: "name", label: "Name or nickname", maxlength: 160, required: true },
          { name: "group", label: "Group", type: "select", required: true, options: ["Family", "Friend", "Relationship", "Other"] },
          { name: "note", label: "Connection note", type: "textarea", rows: 3, maxlength: 200, placeholder: "How do you want to stay connected?" }
        ],
        save: (values, state) => state.lists.people.push({ id: createId(), initial: values.name.charAt(0).toUpperCase(), tone: "peach", name: values.name.slice(0, 160), meta: `${values.group.slice(0, 100)} · ${(values.note || "Keep in touch").slice(0, 200)}`, action: "Check in →" })
      })
    },
    {
      selector: "#addMentalNoteThirty",
      create: () => ({
        title: "Add a private check-in note",
        description: "Add context to how you are feeling. This stays on this device.",
        submitLabel: "Save private note",
        success: "Private check-in note saved.",
        fields: [{ name: "text", label: "What do you want to remember?", type: "textarea", rows: 5, maxlength: 2000, required: true, placeholder: "Write what is underneath the feeling..." }],
        save: (values) => {
          const notes = readLegacyList("mentalHealthNotes");
          notes.push({ date: dateKey, text: values.text.slice(0, 2000) });
          localStorage.setItem("mentalHealthNotes", JSON.stringify(notes.slice(-60)));
        }
      })
    },
    {
      selector: "[data-tool]",
      create: (trigger) => {
        const type = trigger.dataset.tool || "Item";
        return {
          title: `Add ${type.toLowerCase()}`,
          description: "Save this item in your relationship space.",
          submitLabel: "Add item",
          success: `${type} added.`,
          fields: [{ name: "text", label: type, type: "textarea", rows: 4, maxlength: 500, required: true }],
          save: (values, state) => state.lists.relationshipItems.push({ id: createId(), type, text: values.text.slice(0, 500) })
        };
      }
    }
  ];

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const definition = actionDefinitions.find((item) => event.target.closest(item.selector));
    if (!definition) return;
    const trigger = event.target.closest(definition.selector);
    if (!trigger) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openForm(definition.create(trigger), trigger);
  }, true);

})();
