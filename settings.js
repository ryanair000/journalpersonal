"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const RESOURCE_KEY = "myLittleLife.resources.v1";
  const MIGRATION_KEY = "myLittleLife.migrated.v2";
  const NOTICE_KEY = "myLittleLife.settingsNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const DEFAULT_HABITS = [
    "Drink some water",
    "Move my body",
    "Take my vitamins",
    "Read or revise"
  ];

  const SECTION_OPTIONS = [
    { key: "dailyCheckIn", label: "Daily mood and wellbeing", description: "Mood choices, habits, and care-for-me check-ins.", selectors: ["#trackers"], navHrefs: ["#trackers"] },
    { key: "dailyFocus", label: "Daily focus, meals, and rhythm", description: "Today's tasks, meal log, and body-rhythm overview.", selectors: [".life-grid.section"], navHrefs: ["#school"] },
    { key: "content", label: "Content corner", description: "Ideas, drafts, scheduled posts, and posted work.", selectors: ["#content"], navHrefs: ["#content"] },
    { key: "journal", label: "Journal", description: "Quick notes, full entries, search, and journal history.", selectors: ["#journal", "#journalHistory"], navHrefs: ["#journal"] },
    { key: "analytics", label: "Content analytics", description: "Weekly reach, engagement, views, and social accounts.", selectors: ["#analytics"], navHrefs: ["#analytics"] },
    { key: "overview", label: "Life overview", description: "Quick links for projects, money, and memories.", selectors: ["#money"], navHrefs: ["#money", "#memories"] },
    { key: "lifeDetails", label: "Life details", description: "Planner, finance, mental health, gratitude, and social cards.", selectors: ["#details"], navHrefs: [] },
    { key: "schoolCenter", label: "School center", description: "Timetable, units, study sessions, projects, and research.", selectors: ["#schoolHub"], navHrefs: ["#schoolHub"] },
    { key: "work", label: "Work and business", description: "Businesses, monthly goals, and work-session tracking.", selectors: ["#workHub"], navHrefs: ["#workHub"] },
    { key: "people", label: "People and relationships", description: "Your circle, connection check-ins, and relationship tools.", selectors: ["#peopleHub"], navHrefs: ["#peopleHub"] },
    { key: "resources", label: "Resources hub", description: "Saved links, contacts, notes, and useful references.", selectors: ["#resources"], navHrefs: ["#resources"] }
  ];

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

  function defaultSettings() {
    return {
      weeklyBudget: 2500,
      habitLabels: [...DEFAULT_HABITS],
      hiddenSections: [],
      density: "comfortable"
    };
  }

  function normalizeState(rawState) {
    const state = rawState && typeof rawState === "object" ? rawState : {};
    state.version = Number(state.version) || 2;
    state.profile = state.profile && typeof state.profile === "object" ? state.profile : { name: "Charry" };
    state.profile.name = String(state.profile.name || "Charry").trim().slice(0, 60) || "Charry";
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.weekly = state.weekly && typeof state.weekly === "object" ? state.weekly : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };

    const defaults = defaultSettings();
    const source = state.settings && typeof state.settings === "object" ? state.settings : {};
    const budget = Number(source.weeklyBudget);
    const allowedKeys = new Set(SECTION_OPTIONS.map((option) => option.key));
    const hiddenSections = Array.isArray(source.hiddenSections)
      ? source.hiddenSections.filter((key) => allowedKeys.has(key))
      : [];
    const habitLabels = DEFAULT_HABITS.map((fallback, index) => {
      const value = Array.isArray(source.habitLabels) ? source.habitLabels[index] : "";
      return String(value || fallback).trim().slice(0, 80) || fallback;
    });

    state.settings = {
      ...defaults,
      ...source,
      weeklyBudget: Number.isFinite(budget) && budget > 0 && budget <= 100000000 ? budget : defaults.weeklyBudget,
      habitLabels,
      hiddenSections,
      density: source.density === "compact" ? "compact" : "comfortable"
    };

    return state;
  }

  function loadState() {
    return normalizeState(safeParse(localStorage.getItem(STORAGE_KEY), {}));
  }

  function captureUnsavedFields(state) {
    const existingDay = state.daily[dateKey] && typeof state.daily[dateKey] === "object" ? state.daily[dateKey] : {};
    state.daily[dateKey] = {
      mood: "",
      habits: [false, false, false, false],
      wellbeing: {},
      meals: {},
      feeling: "",
      gratitude: "",
      memory: "",
      quickNote: "",
      ...existingDay
    };
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) state.daily[dateKey].quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) state.daily[dateKey].gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function saveState(state, options = {}) {
    const normalized = normalizeState(state);
    if (options.preserveUnsaved !== false) captureUnsavedFields(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  function isoWeekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() + 4 - day);
    const yearStart = new Date(copy.getFullYear(), 0, 1);
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `${copy.getFullYear()}-W${pad(week)}`;
  }

  function initialsFor(name) {
    const parts = String(name || "")
      .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
      .split(/\s+/)
      .filter(Boolean);
    const initials = parts.slice(0, 2).map((part) => part.charAt(0)).join("").toUpperCase();
    return initials || "♡";
  }

  function formatMoney(value) {
    return `KSh ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
  }

  function applyProfile(state) {
    const heading = qs(".topbar h1");
    if (heading) {
      heading.replaceChildren(document.createTextNode(`Hi, ${state.profile.name} `), element("span", { text: "♡" }));
    }
    const avatar = qs(".topbar .avatar");
    if (avatar) {
      avatar.textContent = initialsFor(state.profile.name);
      avatar.setAttribute("aria-label", `Open settings for ${state.profile.name}`);
      avatar.title = "Open settings";
    }
  }

  function applyHabitLabels(state) {
    qsa(".check-list label").slice(0, DEFAULT_HABITS.length).forEach((label, index) => {
      const input = qs("input", label);
      if (!input) return;
      label.replaceChildren(input, document.createTextNode(` ${state.settings.habitLabels[index]}`));
    });
  }

  function applyBudget(state) {
    const weeklyBudget = state.settings.weeklyBudget;
    const key = isoWeekKey(today);
    const week = state.weekly[key] && typeof state.weekly[key] === "object" ? state.weekly[key] : {};
    const expenses = Array.isArray(week.expenses) ? week.expenses : [];
    const total = expenses.reduce((sum, expense) => sum + Number(expense?.amount || 0), 0);
    const budgetNode = qs(".money-detail .balance-line > div:nth-child(2) strong");
    if (budgetNode) budgetNode.textContent = formatMoney(weeklyBudget);
    const spentNode = qs("#spentTotal");
    if (spentNode) spentNode.textContent = formatMoney(total);
    const progress = qs("#budgetProgress");
    if (progress) {
      progress.style.width = `${Math.min(100, Math.max(0, (total / weeklyBudget) * 100))}%`;
      progress.setAttribute("aria-label", `${Math.round((total / weeklyBudget) * 100)}% of weekly budget used`);
    }
    const settingsSummary = qs("#settingsBudgetSummary");
    if (settingsSummary) settingsSummary.textContent = `${formatMoney(total)} spent of ${formatMoney(weeklyBudget)} this week.`;
  }

  function applyVisibility(state) {
    const hidden = new Set(state.settings.hiddenSections);
    SECTION_OPTIONS.forEach((option) => {
      const isHidden = hidden.has(option.key);
      option.selectors.forEach((selector) => qsa(selector).forEach((node) => { node.hidden = isHidden; }));
      option.navHrefs.forEach((href) => qsa(`.sidebar nav a[href="${href}"]`).forEach((link) => {
        link.hidden = isHidden;
        if (isHidden) link.classList.remove("active");
      }));
    });
  }

  function applyDensity(state) {
    document.body.classList.toggle("settings-compact", state.settings.density === "compact");
  }

  function applySettings(state) {
    applyProfile(state);
    applyHabitLabels(state);
    applyBudget(state);
    applyVisibility(state);
    applyDensity(state);
  }

  function ensureStylesheet() {
    if (qs('link[href="settings.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "settings.css" } }));
  }

  function setNavigationActive(link) {
    qsa(".sidebar nav a").forEach((item) => item.classList.toggle("active", item === link));
  }

  function ensureNavigation() {
    const nav = qs(".sidebar nav");
    if (!nav) return null;
    let link = qs('.sidebar nav a[href="#settings"]');
    if (!link) {
      link = element("a", { attrs: { href: "#settings" } });
      link.append(element("span", { text: "⚙" }), document.createTextNode(" Settings"));
      nav.append(link);
    }
    link.addEventListener("click", () => setNavigationActive(link));
    return link;
  }

  function formField(labelText, control, helpText = "") {
    const label = element("label", { className: "settings-field" });
    label.append(element("span", { text: labelText }), control);
    if (helpText) label.append(element("small", { text: helpText }));
    return label;
  }

  function inputControl(options = {}) {
    return element("input", { attrs: {
      id: options.id,
      name: options.name,
      type: options.type || "text",
      value: options.value ?? "",
      min: options.min,
      max: options.max,
      step: options.step,
      maxlength: options.maxlength,
      required: options.required ? "" : null,
      autocomplete: options.autocomplete || "off",
      inputmode: options.inputmode
    } });
  }

  function actionButton(text, className = "settings-action") {
    return element("button", { className, text, attrs: { type: "button" } });
  }

  function buildSettingsSection(state) {
    qs("#settings")?.remove();
    const section = element("section", { className: "settings-section section", attrs: { id: "settings", "aria-labelledby": "settingsTitle" } });
    const heading = element("div", { className: "section-title settings-heading" });
    const headingCopy = element("div");
    headingCopy.append(
      element("p", { className: "eyebrow", text: "Make it yours" }),
      element("h2", { text: "Settings & personalisation", attrs: { id: "settingsTitle" } })
    );
    heading.append(headingCopy, element("span", { className: "settings-local-pill", text: "stored locally" }));
    section.append(heading, element("p", {
      className: "settings-intro",
      text: "Choose what your dashboard shows, rename your habits, and keep the basics matched to your real life."
    }));

    const form = element("form", { className: "settings-form", attrs: { id: "settingsForm", novalidate: "" } });
    const grid = element("div", { className: "settings-grid" });
    const profileCard = element("article", { className: "settings-card" });
    profileCard.append(element("p", { className: "eyebrow", text: "Profile & money" }), element("h3", { text: "Your dashboard basics" }));
    const nameInput = inputControl({ id: "settingsName", name: "displayName", value: state.profile.name, maxlength: 60, required: true, autocomplete: "name" });
    profileCard.append(formField("Display name", nameInput, "Used in the greeting and avatar."));
    const budgetInput = inputControl({ id: "settingsBudget", name: "weeklyBudget", type: "number", value: state.settings.weeklyBudget, min: 1, max: 100000000, step: 1, required: true, inputmode: "decimal" });
    profileCard.append(formField("Weekly budget (KSh)", budgetInput, "Updates the finance progress bar and budget comparison."));
    profileCard.append(element("p", { className: "settings-budget-summary", attrs: { id: "settingsBudgetSummary" } }));
    const densitySelect = element("select", { attrs: { id: "settingsDensity", name: "density" } });
    [
      { value: "comfortable", label: "Comfortable spacing" },
      { value: "compact", label: "Compact spacing" }
    ].forEach((option) => {
      const node = element("option", { text: option.label, attrs: { value: option.value } });
      node.selected = state.settings.density === option.value;
      densitySelect.append(node);
    });
    profileCard.append(formField("Dashboard spacing", densitySelect, "Compact mode shows more content on screen."));

    const habitsCard = element("article", { className: "settings-card" });
    habitsCard.append(element("p", { className: "eyebrow", text: "Daily habits" }), element("h3", { text: "Rename your little wins" }));
    state.settings.habitLabels.forEach((habit, index) => {
      const input = inputControl({ id: `settingsHabit${index + 1}`, name: `habit${index + 1}`, value: habit, maxlength: 80, required: true });
      habitsCard.append(formField(`Habit ${index + 1}`, input));
    });
    grid.append(profileCard, habitsCard);
    form.append(grid);

    const visibilityCard = element("article", { className: "settings-card settings-card-wide" });
    visibilityCard.append(
      element("p", { className: "eyebrow", text: "Dashboard sections" }),
      element("h3", { text: "Show only what helps" }),
      element("p", { className: "settings-card-copy", text: "Hidden sections keep their saved data. You can turn them back on at any time." })
    );
    const visibilityGrid = element("div", { className: "settings-toggle-grid" });
    SECTION_OPTIONS.forEach((option) => {
      const label = element("label", { className: "settings-toggle" });
      const checkbox = element("input", { attrs: { type: "checkbox", name: `visible-${option.key}`, value: option.key } });
      checkbox.checked = !state.settings.hiddenSections.includes(option.key);
      const copy = element("span");
      copy.append(element("strong", { text: option.label }), element("small", { text: option.description }));
      label.append(checkbox, copy);
      visibilityGrid.append(label);
    });
    visibilityCard.append(visibilityGrid);
    form.append(visibilityCard);

    const status = element("p", { className: "settings-status", attrs: { id: "settingsStatus", role: "status", "aria-live": "polite" } });
    const saveRow = element("div", { className: "settings-save-row" });
    saveRow.append(status, element("button", { className: "save-button settings-save", text: "Save settings →", attrs: { type: "submit" } }));
    form.append(saveRow);
    section.append(form);

    const dataCard = element("article", { className: "settings-card settings-data-card" });
    dataCard.append(
      element("p", { className: "eyebrow", text: "Local data" }),
      element("h3", { text: "Backup, restore, or reset" }),
      element("p", { className: "settings-card-copy", text: "Your information stays in this browser unless you export a backup." })
    );
    const dataActions = element("div", { className: "settings-data-actions" });
    const exportButton = actionButton("Export backup");
    const importButton = actionButton("Import backup");
    const clearTodayButton = actionButton("Clear today", "settings-action settings-warning");
    const resetSettingsButton = actionButton("Restore default settings", "settings-action settings-warning");
    const resetAllButton = actionButton("Reset all local data", "settings-action settings-danger");
    dataActions.append(exportButton, importButton, clearTodayButton, resetSettingsButton, resetAllButton);
    const dataStatus = element("p", { className: "settings-data-status", attrs: { role: "status", "aria-live": "polite" } });
    dataCard.append(dataActions, dataStatus);
    section.append(dataCard);
    qs("main.dashboard")?.append(section);

    function showDataStatus(message) {
      dataStatus.textContent = message;
    }

    function armButton(button, confirmationText, onConfirm) {
      if (button.dataset.armed === "true") {
        button.dataset.armed = "false";
        button.textContent = button.dataset.originalText || confirmationText;
        onConfirm();
        return;
      }
      button.dataset.originalText = button.textContent;
      button.dataset.armed = "true";
      button.textContent = confirmationText;
      showDataStatus("This action needs one more click to confirm.");
      clearTimeout(button.armTimer);
      button.armTimer = setTimeout(() => {
        button.dataset.armed = "false";
        button.textContent = button.dataset.originalText || button.textContent;
        showDataStatus("");
      }, 5000);
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const values = new FormData(form);
      const weeklyBudget = Number(values.get("weeklyBudget"));
      if (!Number.isFinite(weeklyBudget) || weeklyBudget <= 0 || weeklyBudget > 100000000) {
        status.textContent = "Enter a weekly budget between KSh 1 and KSh 100,000,000.";
        budgetInput.focus();
        return;
      }
      const nextState = loadState();
      nextState.profile.name = String(values.get("displayName") || "").trim().slice(0, 60) || "Charry";
      nextState.settings.weeklyBudget = weeklyBudget;
      nextState.settings.density = values.get("density") === "compact" ? "compact" : "comfortable";
      nextState.settings.habitLabels = DEFAULT_HABITS.map((fallback, index) => {
        const value = String(values.get(`habit${index + 1}`) || fallback).trim();
        return value.slice(0, 80) || fallback;
      });
      nextState.settings.hiddenSections = SECTION_OPTIONS.filter((option) => values.get(`visible-${option.key}`) !== option.key).map((option) => option.key);
      saveState(nextState);
      sessionStorage.setItem(NOTICE_KEY, "Settings saved.");
      globalThis.location.hash = "settings";
      globalThis.location.reload();
    });

    exportButton.addEventListener("click", () => {
      const existingExport = qs("#exportData");
      if (!existingExport) {
        showDataStatus("Backup export is unavailable on this page.");
        return;
      }
      existingExport.click();
      showDataStatus("Backup export started.");
    });

    importButton.addEventListener("click", () => {
      const existingImport = qs("#importData");
      if (!existingImport) {
        showDataStatus("Backup import is unavailable on this page.");
        return;
      }
      existingImport.click();
      showDataStatus("Choose a dashboard backup file to import.");
    });

    clearTodayButton.addEventListener("click", () => {
      armButton(clearTodayButton, "Click again to clear today", () => {
        const nextState = loadState();
        delete nextState.daily[dateKey];
        saveState(nextState, { preserveUnsaved: false });
        sessionStorage.setItem(NOTICE_KEY, "Today's check-in was cleared.");
        globalThis.location.hash = "settings";
        globalThis.location.reload();
      });
    });

    resetSettingsButton.addEventListener("click", () => {
      const nextState = loadState();
      nextState.settings = defaultSettings();
      saveState(nextState);
      sessionStorage.setItem(NOTICE_KEY, "Default settings restored.");
      globalThis.location.hash = "settings";
      globalThis.location.reload();
    });

    resetAllButton.addEventListener("click", () => {
      armButton(resetAllButton, "Click again to reset everything", () => {
        [
          STORAGE_KEY, RESOURCE_KEY, MIGRATION_KEY, "dailyMood", "mentalCheckIn", "gratitudeNote",
          "savedMemory", "quickNote", "weeklyExpenses", "contentAnalytics", "peopleNote",
          "journalEntries", "meal-Breakfast", "meal-Lunch", "meal-Dinner", "wellbeing-Prayer",
          "wellbeing-Workout", "wellbeing-Meal", "habit-0", "habit-1", "habit-2", "habit-3",
          "leridia-rebrand-0", "leridia-rebrand-1", "leridia-rebrand-2", "leridia-rebrand-3"
        ].forEach((key) => localStorage.removeItem(key));
        sessionStorage.setItem(NOTICE_KEY, "All local dashboard data was reset.");
        globalThis.location.hash = "settings";
        globalThis.location.reload();
      });
    });

    return section;
  }

  ensureStylesheet();
  const state = loadState();
  const settingsLink = ensureNavigation();
  const settingsSection = buildSettingsSection(state);
  applySettings(state);

  const avatar = qs(".topbar .avatar");
  avatar?.addEventListener("click", () => {
    settingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (settingsLink) setNavigationActive(settingsLink);
  });

  const customizeButton = qs("#money .section-title > .small-link");
  customizeButton?.addEventListener("click", () => {
    settingsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (settingsLink) setNavigationActive(settingsLink);
  });

  const notice = sessionStorage.getItem(NOTICE_KEY);
  if (notice) {
    sessionStorage.removeItem(NOTICE_KEY);
    const status = qs("#settingsStatus");
    if (status) status.textContent = notice;
    const toast = qs("#appToast");
    if (toast) {
      toast.textContent = notice;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2600);
    }
  }
})();
