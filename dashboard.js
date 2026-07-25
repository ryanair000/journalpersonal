"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const MIGRATION_KEY = "myLittleLife.migrated.v2";
  const WEEKLY_BUDGET = 2500;
  const today = new Date();

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  function isoWeekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() + 4 - day);
    const yearStart = new Date(copy.getFullYear(), 0, 1);
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `${copy.getFullYear()}-W${pad(week)}`;
  }

  const weekKey = isoWeekKey(today);
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function createDefaultState() {
    return {
      version: 2,
      profile: { name: "Charry" },
      daily: {},
      weekly: {},
      journal: [],
      analytics: { reach: "8,420", engagement: "6.8%", views: "12.7k" },
      lists: {
        tasks: [],
        ideas: [],
        drafts: [],
        accounts: [],
        planner: [],
        social: [],
        units: [],
        study: [],
        research: [],
        classes: [],
        businesses: [],
        workGoals: [],
        workLogs: [],
        people: [],
        relationshipItems: []
      },
      notes: { people: "", connection: "" },
      project: {
        title: "Pharmacovigilance research project",
        next: "Next: gather three journal articles and write the literature review."
      },
      checks: {
        rebrand: [false, false, false, false],
        baseWorkGoals: [false, false, false]
      }
    };
  }

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeState(saved) {
    const base = createDefaultState();
    const source = saved && typeof saved === "object" ? saved : {};
    return {
      ...base,
      ...source,
      profile: { ...base.profile, ...(source.profile || {}) },
      daily: source.daily && typeof source.daily === "object" ? source.daily : {},
      weekly: source.weekly && typeof source.weekly === "object" ? source.weekly : {},
      journal: Array.isArray(source.journal) ? source.journal : [],
      analytics: { ...base.analytics, ...(source.analytics || {}) },
      lists: Object.fromEntries(
        Object.keys(base.lists).map((key) => [key, Array.isArray(source.lists?.[key]) ? source.lists[key] : []])
      ),
      notes: { ...base.notes, ...(source.notes || {}) },
      project: { ...base.project, ...(source.project || {}) },
      checks: {
        rebrand: Array.isArray(source.checks?.rebrand) ? source.checks.rebrand.slice(0, 4) : [...base.checks.rebrand],
        baseWorkGoals: Array.isArray(source.checks?.baseWorkGoals) ? source.checks.baseWorkGoals.slice(0, 3) : [...base.checks.baseWorkGoals]
      }
    };
  }

  let state = normalizeState(safeJsonParse(localStorage.getItem(STORAGE_KEY), null));

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      console.error("Unable to save dashboard data.", error);
      showToast("Storage is unavailable in this browser.");
      return false;
    }
  }

  function getDay() {
    const fallback = {
      mood: "",
      habits: [false, false, false, false],
      wellbeing: {},
      meals: {},
      feeling: "",
      gratitude: "",
      memory: "",
      quickNote: ""
    };
    state.daily[dateKey] = {
      ...fallback,
      ...(state.daily[dateKey] || {}),
      habits: Array.isArray(state.daily[dateKey]?.habits)
        ? [...fallback.habits].map((value, index) => Boolean(state.daily[dateKey].habits[index] ?? value))
        : [...fallback.habits],
      wellbeing: { ...(state.daily[dateKey]?.wellbeing || {}) },
      meals: { ...(state.daily[dateKey]?.meals || {}) }
    };
    return state.daily[dateKey];
  }

  function getWeek() {
    state.weekly[weekKey] = {
      expenses: Array.isArray(state.weekly[weekKey]?.expenses) ? state.weekly[weekKey].expenses : []
    };
    return state.weekly[weekKey];
  }

  function migrateLegacyData() {
    if (localStorage.getItem(MIGRATION_KEY) === "true") return;

    const day = getDay();
    const week = getWeek();

    day.mood ||= localStorage.getItem("dailyMood") || "";
    day.feeling ||= localStorage.getItem("mentalCheckIn") || "";
    day.gratitude ||= localStorage.getItem("gratitudeNote") || "";
    day.memory ||= localStorage.getItem("savedMemory") || "";
    day.quickNote ||= localStorage.getItem("quickNote") || "";

    day.habits = day.habits.map((value, index) => {
      const legacy = localStorage.getItem(`habit-${index}`);
      return legacy === null ? value : legacy === "true";
    });

    ["Prayer", "Workout", "Meal"].forEach((name) => {
      const legacy = localStorage.getItem(`wellbeing-${name}`);
      if (legacy !== null && day.wellbeing[name] === undefined) day.wellbeing[name] = legacy === "true";
    });

    ["Breakfast", "Lunch", "Dinner"].forEach((name) => {
      const legacy = localStorage.getItem(`meal-${name}`);
      if (legacy && !day.meals[name]) day.meals[name] = legacy;
    });

    const legacyExpenses = Number(localStorage.getItem("weeklyExpenses"));
    if (Number.isFinite(legacyExpenses) && legacyExpenses > 0 && week.expenses.length === 0) {
      week.expenses.push({ id: createId(), amount: legacyExpenses, note: "Migrated expense total", createdAt: new Date().toISOString() });
    }

    const legacyAnalytics = safeJsonParse(localStorage.getItem("contentAnalytics"), null);
    if (legacyAnalytics && typeof legacyAnalytics === "object") {
      state.analytics = { ...state.analytics, ...legacyAnalytics };
    }

    state.notes.people ||= localStorage.getItem("peopleNote") || "";

    const legacyEntries = safeJsonParse(localStorage.getItem("journalEntries"), []);
    if (Array.isArray(legacyEntries) && state.journal.length === 0) {
      state.journal = legacyEntries
        .filter((entry) => entry && entry.title && entry.body)
        .map((entry) => ({
          id: createId(),
          title: String(entry.title),
          body: String(entry.body),
          createdAt: entry.createdAt || entry.date || new Date().toISOString()
        }));
    }

    state.checks.rebrand = state.checks.rebrand.map((value, index) => {
      const legacy = localStorage.getItem(`leridia-rebrand-${index}`);
      return legacy === null ? value : legacy === "true";
    });

    localStorage.setItem(MIGRATION_KEY, "true");
    saveState();
  }

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) node.setAttribute(name, String(value));
      });
    }
    return node;
  }

  function removeButton(label, onClick) {
    const button = element("button", {
      className: "item-remove",
      text: "×",
      attrs: { type: "button", "aria-label": label, title: label }
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  const toast = qs("#appToast");
  let toastTimer;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function flashButton(button, message, originalText, duration = 1400) {
    if (!button) return;
    const fallback = originalText || button.textContent;
    button.textContent = message;
    setTimeout(() => {
      button.textContent = fallback;
    }, duration);
  }

  function promptText(message, initialValue = "") {
    const value = globalThis.prompt(message, initialValue);
    return value?.trim() || "";
  }

  function formatDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value || "");
    return parsed.toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function setSelected(buttons, selectedValue, datasetKey) {
    buttons.forEach((button) => {
      const selected = button.dataset[datasetKey] === selectedValue;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  migrateLegacyData();
  const day = getDay();
  const week = getWeek();

  const currentDate = qs("#currentDate");
  const trackerDate = qs("#trackerDate");
  const memoryDate = qs("#memoryDate");
  if (currentDate) {
    currentDate.textContent = today.toLocaleDateString("en-KE", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  if (trackerDate) trackerDate.textContent = today.toLocaleDateString("en-KE", { month: "short", day: "numeric" }).toUpperCase();
  if (memoryDate) memoryDate.textContent = today.toLocaleDateString("en-KE", { month: "short", day: "numeric" }).toUpperCase();
  const userHeading = qs(".topbar h1");
  if (userHeading) {
    userHeading.replaceChildren(document.createTextNode(`Hi, ${state.profile.name} `), element("span", { text: "♡" }));
  }

  const modal = qs("#entryModal");
  const modalCard = qs(".modal-card", modal);
  let modalOpener = null;

  function openModal(event) {
    modalOpener = event?.currentTarget || document.activeElement;
    modal?.classList.add("open");
    modal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    qs("#entryTitle")?.focus();
  }

  function closeModal() {
    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    modalOpener?.focus?.();
  }

  qsa(".js-open-modal").forEach((button) => button.addEventListener("click", openModal));
  qsa(".js-close-modal").forEach((button) => button.addEventListener("click", closeModal));
  document.addEventListener("keydown", (event) => {
    if (!modal?.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeModal();
      return;
    }
    if (event.key === "Tab" && modalCard) {
      const focusable = qsa('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])', modalCard)
        .filter((item) => !item.disabled && item.offsetParent !== null);
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
    }
  });

  const moodButtons = qsa(".mood-row button");
  setSelected(moodButtons, day.mood, "mood");
  moodButtons.forEach((button) => button.addEventListener("click", () => {
    day.mood = button.dataset.mood || "";
    setSelected(moodButtons, day.mood, "mood");
    saveState();
  }));

  const habitInputs = qsa(".check-list input");
  const updateHabitProgress = () => {
    const completed = habitInputs.filter((input) => input.checked).length;
    const progress = qs(".habits .progress");
    if (progress) progress.textContent = `${completed} / ${habitInputs.length}`;
  };
  habitInputs.forEach((input, index) => {
    input.checked = Boolean(day.habits[index]);
    input.addEventListener("change", () => {
      day.habits[index] = input.checked;
      updateHabitProgress();
      saveState();
    });
  });
  updateHabitProgress();

  const wellbeingButtons = qsa(".wellbeing-item");
  wellbeingButtons.forEach((button) => {
    const action = button.dataset.action || "";
    const selected = Boolean(day.wellbeing[action]);
    button.classList.toggle("done", selected);
    button.setAttribute("aria-pressed", String(selected));
    const marker = qs("b", button);
    if (marker) marker.textContent = selected ? "✓" : "＋";

    button.addEventListener("click", () => {
      const next = !Boolean(day.wellbeing[action]);
      day.wellbeing[action] = next;
      button.classList.toggle("done", next);
      button.setAttribute("aria-pressed", String(next));
      if (marker) marker.textContent = next ? "✓" : "＋";
      saveState();
    });
  });

  function renderMeals() {
    let logged = 0;
    qsa(".log-pill").forEach((button) => {
      const mealName = button.dataset.log || "";
      const value = day.meals[mealName];
      const description = qs("small", button.closest(".meal-row"));
      if (value) {
        logged += 1;
        button.textContent = "✓ logged";
        button.classList.add("logged");
        if (description) description.textContent = value;
      } else {
        button.textContent = "Log";
        button.classList.remove("logged");
      }
    });
    const count = qs("#mealCount");
    if (count) count.textContent = `${logged} / 3`;
  }

  qsa(".log-pill").forEach((button) => button.addEventListener("click", () => {
    const mealName = button.dataset.log || "Meal";
    const value = promptText(`What did you have for ${mealName.toLowerCase()}?`, day.meals[mealName] || "");
    if (!value) return;
    day.meals[mealName] = value.slice(0, 300);
    renderMeals();
    saveState();
  }));
  renderMeals();

  function renderTasks() {
    const container = qs("#savedTasks");
    if (!container) return;
    container.replaceChildren();
    state.lists.tasks.forEach((task) => {
      const row = element("div", { className: "focus-task dynamic-item" });
      row.append(element("span", { className: "task-dot" }));
      const copy = element("div");
      copy.append(element("strong", { text: task.text }));
      copy.append(element("small", { text: task.meta || "New focus item" }));
      row.append(copy);
      row.append(removeButton(`Remove ${task.text}`, () => {
        state.lists.tasks = state.lists.tasks.filter((item) => item.id !== task.id);
        renderTasks();
        saveState();
      }));
      container.append(row);
    });
  }

  qs("#addTask")?.addEventListener("click", () => {
    const text = promptText("What do you need to focus on?");
    if (!text) return;
    state.lists.tasks.push({ id: createId(), text: text.slice(0, 240), meta: "New focus item" });
    renderTasks();
    saveState();
  });
  renderTasks();

  function renderContentList(type) {
    const isIdea = type === "ideas";
    const container = qs(isIdea ? "#savedIdeas" : "#savedDrafts");
    if (!container) return;
    container.replaceChildren();
    state.lists[type].forEach((item) => {
      const row = element("div", { className: "idea-item dynamic-item" });
      row.append(element("span", { text: isIdea ? "✦" : "◒" }));
      const copy = element("div");
      copy.append(element("strong", { text: item.text }));
      copy.append(element("small", { text: item.meta }));
      row.append(copy);
      row.append(removeButton(`Remove ${item.text}`, () => {
        state.lists[type] = state.lists[type].filter((entry) => entry.id !== item.id);
        renderContentList(type);
        saveState();
      }));
      container.append(row);
    });
    const count = qs(isIdea ? "#ideaCount" : "#draftCount");
    if (count) count.textContent = String((isIdea ? 2 : 1) + state.lists[type].length);
  }

  function addContent(type) {
    const text = promptText(type === "ideas" ? "What content idea do you want to add?" : "What draft are you working on?");
    if (!text) return;
    state.lists[type].push({
      id: createId(),
      text: text.slice(0, 300),
      meta: type === "ideas" ? "New idea · choose a platform" : "New draft · not scheduled"
    });
    renderContentList(type);
    saveState();
  }

  qs("#addContent")?.addEventListener("click", () => addContent("ideas"));
  qs("#overviewIdea")?.addEventListener("click", () => addContent("ideas"));
  qs("#addDraft")?.addEventListener("click", () => addContent("drafts"));
  renderContentList("ideas");
  renderContentList("drafts");

  function renderAnalytics() {
    const mapping = {
      reachMetric: state.analytics.reach,
      engagementMetric: state.analytics.engagement,
      viewsMetric: state.analytics.views
    };
    Object.entries(mapping).forEach(([id, value]) => {
      const node = qs(`#${id}`);
      if (node) node.textContent = value;
    });
  }

  qs("#updateAnalytics")?.addEventListener("click", () => {
    const reach = promptText("Total reach this week:", state.analytics.reach);
    if (!reach) return;
    const engagement = promptText("Engagement rate this week:", state.analytics.engagement);
    if (!engagement) return;
    const views = promptText("Total views this week:", state.analytics.views);
    if (!views) return;
    state.analytics = {
      reach: reach.slice(0, 40),
      engagement: engagement.slice(0, 40),
      views: views.slice(0, 40)
    };
    renderAnalytics();
    saveState();
  });
  renderAnalytics();

  function renderAccounts() {
    const container = qs("#savedAccounts");
    if (!container) return;
    container.replaceChildren();
    state.lists.accounts.forEach((account) => {
      const row = element("div", { className: "account-row dynamic-item" });
      row.append(element("span", { className: "platform-icon tiktok", text: "✦" }));
      const copy = element("div");
      copy.append(element("strong", { text: account.platform }));
      copy.append(element("small", { text: account.username }));
      row.append(copy);
      row.append(element("b", { text: account.followers }));
      row.append(removeButton(`Remove ${account.platform} account`, () => {
        state.lists.accounts = state.lists.accounts.filter((item) => item.id !== account.id);
        renderAccounts();
        saveState();
      }));
      container.append(row);
    });
  }

  qs("#addAccount")?.addEventListener("click", () => {
    const platform = promptText("Which platform is this account on?");
    if (!platform) return;
    const username = promptText("What is the account name or handle?");
    if (!username) return;
    const followers = promptText("How many followers or subscribers does it have?");
    if (!followers) return;
    state.lists.accounts.push({
      id: createId(),
      platform: platform.slice(0, 80),
      username: username.slice(0, 120),
      followers: followers.slice(0, 40)
    });
    renderAccounts();
    saveState();
  });
  renderAccounts();

  const feelButtons = qsa(".feel-row button");
  setSelected(feelButtons, day.feeling, "feel");
  feelButtons.forEach((button) => button.addEventListener("click", () => {
    day.feeling = button.dataset.feel || "";
    setSelected(feelButtons, day.feeling, "feel");
    saveState();
  }));

  const gratitudeNote = qs("#gratitudeNote");
  if (gratitudeNote) gratitudeNote.value = day.gratitude;
  qs("#saveGratitude")?.addEventListener("click", (event) => {
    day.gratitude = gratitudeNote?.value.slice(0, 5000) || "";
    saveState();
    flashButton(event.currentTarget, "Saved reflection ✓", "Save reflection →");
  });

  const quickNote = qs("#quickNote");
  if (quickNote) quickNote.value = day.quickNote;
  qs("#saveNote")?.addEventListener("click", (event) => {
    day.quickNote = quickNote?.value.slice(0, 5000) || "";
    saveState();
    flashButton(event.currentTarget, "Saved ✓", "Save note ↗");
  });

  function renderPlanner() {
    const container = qs("#savedPlanner");
    if (!container) return;
    container.replaceChildren();
    state.lists.planner.forEach((item) => {
      const row = element("p", { className: "dynamic-item" });
      row.append(element("span", { text: "□" }));
      row.append(document.createTextNode(` ${item.text} `));
      row.append(element("small", { text: item.meta || "New task" }));
      row.append(removeButton(`Remove ${item.text}`, () => {
        state.lists.planner = state.lists.planner.filter((entry) => entry.id !== item.id);
        renderPlanner();
        saveState();
      }));
      container.append(row);
    });
  }

  qs("#addPlanner")?.addEventListener("click", () => {
    const text = promptText("What school or work task should you add?");
    if (!text) return;
    state.lists.planner.push({ id: createId(), text: text.slice(0, 240), meta: "New task" });
    renderPlanner();
    saveState();
  });
  renderPlanner();

  function renderExpenses() {
    const total = week.expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const totalNode = qs("#spentTotal");
    if (totalNode) totalNode.textContent = `KSh ${total.toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
    const progress = qs("#budgetProgress");
    if (progress) progress.style.width = `${Math.min(100, Math.max(0, (total / WEEKLY_BUDGET) * 100))}%`;
  }

  function addExpense() {
    const amountText = promptText("How much did you spend?");
    if (!amountText) return;
    const amount = Number(amountText.replaceAll(",", ""));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000000) {
      showToast("Enter a valid positive expense.");
      return;
    }
    const note = promptText("What was the expense for? (optional)");
    week.expenses.push({ id: createId(), amount, note: note.slice(0, 200), createdAt: new Date().toISOString() });
    renderExpenses();
    saveState();
  }

  qs("#addExpense")?.addEventListener("click", addExpense);
  qs("#overviewExpense")?.addEventListener("click", addExpense);
  renderExpenses();

  function renderSocial() {
    const container = qs("#savedSocial");
    if (!container) return;
    container.replaceChildren();
    state.lists.social.forEach((item) => {
      const row = element("p", { className: "dynamic-item" });
      row.append(element("span", { text: "♡" }));
      row.append(document.createTextNode(` ${item.text} `));
      row.append(element("small", { text: item.meta || "New plan" }));
      row.append(removeButton(`Remove ${item.text}`, () => {
        state.lists.social = state.lists.social.filter((entry) => entry.id !== item.id);
        renderSocial();
        saveState();
      }));
      container.append(row);
    });
  }

  function addSocialItem() {
    const text = promptText("Who or what do you want to remember?");
    if (!text) return;
    state.lists.social.push({ id: createId(), text: text.slice(0, 240), meta: "New plan" });
    renderSocial();
    saveState();
  }

  qs("#addSocial")?.addEventListener("click", addSocialItem);
  qs("#addSocialLink")?.addEventListener("click", addSocialItem);
  renderSocial();

  function renderMemory() {
    const memoryText = qs("#memoryText");
    if (!memoryText) return;
    if (day.memory) {
      memoryText.textContent = day.memory;
    } else {
      memoryText.replaceChildren(
        document.createTextNode("No memory saved yet."),
        document.createElement("br"),
        document.createTextNode("Make one from today.")
      );
    }
  }

  function addMemory() {
    const memory = promptText("What do you want to remember about today?", day.memory);
    if (!memory) return;
    day.memory = memory.slice(0, 3000);
    renderMemory();
    saveState();
  }

  qs("#addMemory")?.addEventListener("click", addMemory);
  qs("#overviewMemory")?.addEventListener("click", addMemory);
  renderMemory();

  const defaultUnits = [
    ["PBCU001", "Research methods", "Dr. Mungoma Michael"],
    ["BPT4204", "Pharmacy management 3", "Dr. Solomon Karanja"],
    ["BPC4202", "Pharmaceutical Chemistry X", "Dr. Epaphrodite Twahirwa"],
    ["BPA2203", "Human pathology 3", "Dr. Jediel & Dr. Lucy Githaga"],
    ["BPL4203", "Pharmacology XI", "Dr. Samuel Wainaina"],
    ["BPC4204", "Pharmaceutical Chemistry XII", "Dr. Lucy Githaga"],
    ["BPL4105", "Pharmacology VII", "Dr. Dennis Opwoko"],
    ["BPL4201", "Pharmacology IX", "Dr. Dennis Opwoko"],
    ["BPL4205", "Clinical pharmacy IV", "Dr. Arwa Nath"],
    ["BPL5101", "Clinical pharmacy V", "Dr. Arwa Nath"],
    ["BPT3102", "Pharmaceutics 2", "Dr. Rose Obat"]
  ];

  function unitNode(unit, removable = false) {
    const row = element("div", { className: removable ? "dynamic-item" : "" });
    row.append(element("span", { text: unit.code }));
    row.append(element("strong", { text: unit.name }));
    row.append(element("small", { text: `${unit.lecturer} · ${unit.year || "Year 4.3"}` }));
    if (removable) {
      row.append(removeButton(`Remove ${unit.name}`, () => {
        state.lists.units = state.lists.units.filter((item) => item.id !== unit.id);
        renderUnits();
        saveState();
      }));
    }
    return row;
  }

  function renderUnits() {
    const container = qs("#unitList");
    if (!container) return;
    container.replaceChildren();
    defaultUnits.forEach(([code, name, lecturer]) => container.append(unitNode({ code, name, lecturer, year: "Year 4.3" })));
    state.lists.units.forEach((unit) => container.append(unitNode(unit, true)));
    const count = qs("#schoolHub .unit-count");
    if (count) count.textContent = `${defaultUnits.length + state.lists.units.length} current`;
  }

  qs("#addUnit")?.addEventListener("click", () => {
    const code = promptText("Unit code, for example PHR 308:");
    if (!code) return;
    const name = promptText("Unit name:");
    if (!name) return;
    const lecturer = promptText("Lecturer name:");
    if (!lecturer) return;
    const year = promptText("Year or semester:", "Year 4.3") || "Year 4.3";
    state.lists.units.push({
      id: createId(),
      code: code.slice(0, 30),
      name: name.slice(0, 160),
      lecturer: lecturer.slice(0, 160),
      year: year.slice(0, 80)
    });
    renderUnits();
    saveState();
  });
  renderUnits();

  const defaultStudy = [
    { title: "Pharmacology flashcards", meta: "Today · 45 min · To review", tag: "PENDING" },
    { title: "Read: autonomic drugs", meta: "Thursday · 30 min · Chapter 4", tag: "READING", active: true }
  ];

  function renderStudy() {
    const container = qs("#studyList");
    if (!container) return;
    container.replaceChildren();
    [...defaultStudy, ...state.lists.study].forEach((item, index) => {
      const removable = index >= defaultStudy.length;
      const row = element("div", { className: removable ? "dynamic-item" : "" });
      row.append(element("strong", { text: item.title }));
      row.append(element("small", { text: item.meta }));
      const tag = element("span", { className: `study-tag${item.active ? " done-study" : ""}`, text: item.tag || "PENDING" });
      row.append(tag);
      if (removable) {
        row.append(removeButton(`Remove ${item.title}`, () => {
          state.lists.study = state.lists.study.filter((entry) => entry.id !== item.id);
          renderStudy();
          saveState();
        }));
      }
      container.append(row);
    });
  }

  function addStudyItem(kind) {
    const title = promptText(kind === "reading" ? "What reading session should you add?" : "What do you need to study?");
    if (!title) return;
    const meta = promptText("Add a day, duration, or note:", kind === "reading" ? "New reading · add a duration" : "New session · schedule it");
    state.lists.study.push({
      id: createId(),
      title: title.slice(0, 240),
      meta: (meta || "New session").slice(0, 240),
      tag: kind === "reading" ? "READING" : "PENDING",
      active: kind === "reading"
    });
    renderStudy();
    saveState();
  }

  qs("#addStudy")?.addEventListener("click", () => addStudyItem("study"));
  qs("#addReading")?.addEventListener("click", () => addStudyItem("reading"));
  renderStudy();

  const defaultResearch = [
    { type: "PDF", title: "WHO pharmacovigilance guide", meta: "Reference" },
    { type: "LINK", title: "Drug interactions notes", meta: "Useful link" },
    { type: "NOTE", title: "Questions for Dr. Wanjiku", meta: "Idea" }
  ];

  function renderResearch() {
    const container = qs("#researchList");
    if (!container) return;
    container.replaceChildren();
    [...defaultResearch, ...state.lists.research].forEach((item, index) => {
      const removable = index >= defaultResearch.length;
      const row = element("p", { className: removable ? "dynamic-item" : "" });
      row.append(element("span", { text: item.type }));
      row.append(document.createTextNode(` ${item.title} `));
      row.append(element("small", { text: item.meta }));
      if (removable) {
        row.append(removeButton(`Remove ${item.title}`, () => {
          state.lists.research = state.lists.research.filter((entry) => entry.id !== item.id);
          renderResearch();
          saveState();
        }));
      }
      container.append(row);
    });
  }

  qs("#addResearch")?.addEventListener("click", () => {
    const title = promptText("Add a paper, link, note, or research question:");
    if (!title) return;
    const type = (promptText("Type: PDF, LINK, or NOTE", "NOTE") || "NOTE").toUpperCase();
    state.lists.research.push({ id: createId(), type: type.slice(0, 10), title: title.slice(0, 300), meta: "New reference" });
    renderResearch();
    saveState();
  });
  renderResearch();

  function renderProject() {
    const title = qs("#projectTitle");
    const notes = qs("#projectNotes");
    if (title) title.textContent = state.project.title;
    if (notes) notes.textContent = state.project.next;
  }

  qs("#addProject")?.addEventListener("click", () => {
    const title = promptText("What is your school project called?", state.project.title);
    if (!title) return;
    const next = promptText("What is the next action?", state.project.next);
    state.project = {
      title: title.slice(0, 240),
      next: (next || "Add your next action when you know it.").slice(0, 1000)
    };
    renderProject();
    saveState();
  });
  renderProject();

  function renderClasses() {
    const container = qs("#savedClasses");
    if (!container) return;
    container.replaceChildren();
    state.lists.classes.forEach((item) => {
      const row = element("p", { className: "dynamic-item" });
      row.append(element("span", { text: item.day }));
      row.append(element("strong", { text: item.subject }));
      row.append(element("small", { text: item.time }));
      row.append(removeButton(`Remove ${item.subject}`, () => {
        state.lists.classes = state.lists.classes.filter((entry) => entry.id !== item.id);
        renderClasses();
        saveState();
      }));
      container.append(row);
    });
  }

  qs("#addClass")?.addEventListener("click", () => {
    const dayName = promptText("Which day? (Monday-Friday)");
    if (!dayName) return;
    const time = promptText("What time?");
    if (!time) return;
    const subject = promptText("Class, study block, or exam name?");
    if (!subject) return;
    state.lists.classes.push({
      id: createId(),
      day: dayName.slice(0, 30),
      time: time.slice(0, 40),
      subject: subject.slice(0, 200)
    });
    renderClasses();
    saveState();
  });
  renderClasses();

  const defaultBusinesses = [
    { initials: "LJ", name: "Leridia Jewels", detail: "Gold jewelry · Inactive · Shop goal: 28 Jan 2027", status: "Rebrand" },
    { initials: "PM", name: "PlayMechi", detail: "Sports blog · 4 months · Monetized", status: "First paycheck" },
    { initials: "EP", name: "Exampoa", detail: "Kenyan education website · 1 month", status: "Launch + traffic" },
    { initials: "MI", name: "Medical influencing", detail: "Health & wellness · Starts at attachment", status: "Planned" }
  ];

  function businessNode(item, index, removable = false) {
    const row = element("div", { className: removable ? "dynamic-item" : "" });
    row.append(element("span", {
      className: `business-badge ${index % 2 ? "purple-badge" : "coral-badge"}`,
      text: item.initials
    }));
    const copy = element("section");
    copy.append(element("strong", { text: item.name }));
    copy.append(element("small", { text: item.detail }));
    row.append(copy);
    row.append(element("b", { text: item.status }));
    if (removable) {
      row.append(removeButton(`Remove ${item.name}`, () => {
        state.lists.businesses = state.lists.businesses.filter((entry) => entry.id !== item.id);
        renderBusinesses();
        saveState();
      }));
    }
    return row;
  }

  function renderBusinesses() {
    const container = qs("#businessList");
    if (!container) return;
    container.replaceChildren();
    defaultBusinesses.forEach((business, index) => container.append(businessNode(business, index)));
    state.lists.businesses.forEach((business, index) => container.append(businessNode(business, defaultBusinesses.length + index, true)));

    const rebrand = element("div", { className: "rebrand-plan" });
    rebrand.append(element("p", { className: "eyebrow", text: "Leridia Jewels rebrand plan" }));
    [
      "Define the new brand mood",
      "Choose colours, logo, and packaging",
      "Plan stock and launch budget",
      "Prepare for 28 January 2027 launch"
    ].forEach((labelText, index) => {
      const label = element("label");
      const input = element("input", { attrs: { type: "checkbox" } });
      input.checked = Boolean(state.checks.rebrand[index]);
      input.addEventListener("change", () => {
        state.checks.rebrand[index] = input.checked;
        saveState();
      });
      label.append(input, document.createTextNode(` ${labelText}`));
      rebrand.append(label);
    });
    container.append(rebrand);

    const count = qs("#businessCount");
    if (count) count.textContent = `${defaultBusinesses.length + state.lists.businesses.length} active`;
  }

  qs("#addBusiness")?.addEventListener("click", () => {
    const name = promptText("Business or work name:");
    if (!name) return;
    const type = promptText("What do you do there?");
    if (!type) return;
    const duration = promptText("How long have you been doing it?");
    const initials = name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NW";
    state.lists.businesses.push({
      id: createId(),
      initials,
      name: name.slice(0, 160),
      detail: `${type.slice(0, 180)}${duration ? ` · ${duration.slice(0, 100)}` : " · New business"}`,
      status: "New"
    });
    renderBusinesses();
    saveState();
  });
  renderBusinesses();

  function renderWorkGoals() {
    qsa("[data-base-goal]").forEach((input) => {
      const index = Number(input.dataset.baseGoal);
      input.checked = Boolean(state.checks.baseWorkGoals[index]);
      input.onchange = () => {
        state.checks.baseWorkGoals[index] = input.checked;
        saveState();
      };
    });

    const container = qs("#savedWorkGoals");
    if (!container) return;
    container.replaceChildren();
    state.lists.workGoals.forEach((goal) => {
      const label = element("label", { className: "dynamic-item" });
      const input = element("input", { attrs: { type: "checkbox" } });
      input.checked = Boolean(goal.done);
      input.addEventListener("change", () => {
        goal.done = input.checked;
        saveState();
      });
      label.append(input, document.createTextNode(` ${goal.text}`));
      label.append(removeButton(`Remove ${goal.text}`, () => {
        state.lists.workGoals = state.lists.workGoals.filter((entry) => entry.id !== goal.id);
        renderWorkGoals();
        saveState();
      }));
      container.append(label);
    });
  }

  qs("#addWorkGoal")?.addEventListener("click", () => {
    const text = promptText("What work goal do you want to add?");
    if (!text) return;
    state.lists.workGoals.push({ id: createId(), text: text.slice(0, 240), done: false });
    renderWorkGoals();
    saveState();
  });
  renderWorkGoals();

  function renderWorkHours() {
    const currentMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    const logged = state.lists.workLogs
      .filter((entry) => String(entry.createdAt || "").startsWith(currentMonth))
      .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const node = qs("#workHours");
    if (node) node.textContent = `${(42 + logged).toLocaleString("en-KE", { maximumFractionDigits: 1 })}h`;
  }

  qs("#addWorkLog")?.addEventListener("click", () => {
    const raw = promptText("How many hours did you work?");
    if (!raw) return;
    const hours = Number(raw);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
      showToast("Enter work hours between 0 and 24.");
      return;
    }
    state.lists.workLogs.push({ id: createId(), hours, createdAt: new Date().toISOString() });
    renderWorkHours();
    saveState();
    showToast(`Logged ${hours} hour${hours === 1 ? "" : "s"}.`);
  });
  renderWorkHours();

  const defaultPeople = [
    { initial: "F", tone: "peach", name: "Family circle", meta: "Birthdays · gifts · favours · check-ins", action: "Organize →" },
    { initial: "F", tone: "lavender", name: "Friends circle", meta: "Catch-ups · memories · plans · support", action: "Organize →" },
    { initial: "♡", tone: "sage", name: "My relationship", meta: "Couple goals · dates · gifts · shared projects", action: "Open space →" }
  ];

  function peopleNode(person, removable = false) {
    const row = element("div", { className: removable ? "dynamic-item" : "" });
    row.append(element("span", { className: `person-avatar ${person.tone || "peach"}`, text: person.initial }));
    const copy = element("section");
    copy.append(element("strong", { text: person.name }));
    copy.append(element("small", { text: person.meta }));
    row.append(copy);
    row.append(element("button", { text: person.action || "Check in →", attrs: { type: "button" } }));
    if (removable) {
      row.append(removeButton(`Remove ${person.name}`, () => {
        state.lists.people = state.lists.people.filter((entry) => entry.id !== person.id);
        renderPeople();
        saveState();
      }));
    }
    return row;
  }

  function renderPeople() {
    const container = qs("#peopleList");
    if (!container) return;
    container.replaceChildren();
    defaultPeople.forEach((person) => container.append(peopleNode(person)));
    state.lists.people.forEach((person) => container.append(peopleNode(person, true)));
  }

  qs("#addPerson")?.addEventListener("click", () => {
    const name = promptText("Name or nickname:");
    if (!name) return;
    const group = promptText("Family, friend, or relationship?");
    if (!group) return;
    const note = promptText("How do you want to stay connected?");
    state.lists.people.push({
      id: createId(),
      initial: name.charAt(0).toUpperCase(),
      tone: "peach",
      name: name.slice(0, 160),
      meta: `${group.slice(0, 100)} · ${(note || "Keep in touch").slice(0, 200)}`,
      action: "Check in →"
    });
    renderPeople();
    saveState();
  });
  renderPeople();

  qsa(".people-tab").forEach((tab) => tab.addEventListener("click", () => {
    qsa(".people-tab").forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });
  }));

  const peopleNote = qs("#peopleNote");
  if (peopleNote) peopleNote.value = state.notes.people;
  qs("#savePeopleNote")?.addEventListener("click", (event) => {
    state.notes.people = peopleNote?.value.slice(0, 5000) || "";
    saveState();
    flashButton(event.currentTarget, "Saved locally ✓", "Save local reflection →");
  });

  const connectionButtons = qsa(".connection-scale button");
  setSelected(connectionButtons, state.notes.connection, "connection");
  connectionButtons.forEach((button) => button.addEventListener("click", () => {
    state.notes.connection = button.dataset.connection || "";
    setSelected(connectionButtons, state.notes.connection, "connection");
    saveState();
  }));

  function renderRelationshipItems() {
    const container = qs("#relationshipItems");
    if (!container) return;
    container.replaceChildren();
    state.lists.relationshipItems.forEach((item) => {
      const row = element("p", { className: "dynamic-item" });
      row.append(document.createTextNode(`${item.type}: ${item.text}`));
      row.append(removeButton(`Remove ${item.type}`, () => {
        state.lists.relationshipItems = state.lists.relationshipItems.filter((entry) => entry.id !== item.id);
        renderRelationshipItems();
        saveState();
      }));
      container.append(row);
    });
  }

  qsa("[data-tool]").forEach((button) => button.addEventListener("click", () => {
    const type = button.dataset.tool || "Item";
    const text = promptText(`Add a ${type.toLowerCase()}:`);
    if (!text) return;
    state.lists.relationshipItems.push({ id: createId(), type, text: text.slice(0, 500) });
    renderRelationshipItems();
    saveState();
  }));
  renderRelationshipItems();

  function renderJournalEntries() {
    const container = qs("#journalEntries");
    if (!container) return;
    container.replaceChildren();

    if (!state.journal.length) {
      const empty = element("div", { className: "journal-empty" });
      empty.append(element("span", { text: "✦" }));
      empty.append(element("h3", { text: "Your saved entries will appear here." }));
      empty.append(element("p", { text: "Open the journal form to write your first full entry." }));
      container.append(empty);
      return;
    }

    state.journal.forEach((entry) => {
      const article = element("article", { className: "journal-entry" });
      const header = element("header");
      const copy = element("div");
      copy.append(element("p", { className: "eyebrow", text: formatDate(entry.createdAt) }));
      copy.append(element("h3", { text: entry.title }));
      header.append(copy);
      header.append(removeButton(`Delete journal entry ${entry.title}`, () => {
        if (!globalThis.confirm("Delete this journal entry? This cannot be undone.")) return;
        state.journal = state.journal.filter((item) => item.id !== entry.id);
        renderJournalEntries();
        saveState();
        showToast("Journal entry deleted.");
      }));
      article.append(header);
      article.append(element("p", { className: "journal-entry-body", text: entry.body }));
      container.append(article);
    });
  }

  qs("#entryForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = qs("#entryTitle")?.value.trim() || "";
    const body = qs("#entryBody")?.value.trim() || "";
    if (!title || !body) return;
    state.journal.unshift({
      id: createId(),
      title: title.slice(0, 120),
      body: body.slice(0, 10000),
      createdAt: new Date().toISOString()
    });
    saveState();
    renderJournalEntries();
    event.currentTarget.reset();
    closeModal();
    showToast("Journal entry saved locally.");
  });
  renderJournalEntries();

  qs("#exportData")?.addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = element("a", {
      attrs: {
        href: url,
        download: `my-little-life-backup-${dateKey}.json`
      }
    });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
  });

  qs("#clearToday")?.addEventListener("click", () => {
    if (!globalThis.confirm("Clear today's mood, habits, meals, notes, and memory? Journal entries will stay.")) return;
    delete state.daily[dateKey];
    saveState();
    globalThis.location.reload();
  });

  qsa(".sidebar nav a").forEach((link) => link.addEventListener("click", () => {
    qsa(".sidebar nav a").forEach((item) => item.classList.toggle("active", item === link));
  }));

  qs("#editRhythm")?.addEventListener("click", () => {
    showToast("Detailed sleep, water, and movement editing comes in the next feature pass.");
  });

  globalThis.addEventListener("beforeunload", () => {
    day.quickNote = quickNote?.value.slice(0, 5000) || day.quickNote;
    day.gratitude = gratitudeNote?.value.slice(0, 5000) || day.gratitude;
    state.notes.people = peopleNote?.value.slice(0, 5000) || state.notes.people;
    saveState();
  });
})();
