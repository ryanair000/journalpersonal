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
    pendingState = state;
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
        values: (state) => ({ ...state.analytics }),
        save: (values, state) => { state.analytics = { reach: values.reach.slice(0, 40), engagement: values.engagement.slice(0, 40), views: values.views.slice(0, 40) }; }
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

  globalThis.prompt = () => null;
})();
