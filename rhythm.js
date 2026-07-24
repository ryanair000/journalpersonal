"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const pad = (value) => String(value).padStart(2, "0");
  const today = new Date();
  const dateKey = (date = today) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const defaultTargets = { sleepMinutes: 480, waterGlasses: 7, movementMinutes: 30 };

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
    if (qs('link[href="rhythm.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "rhythm.css" } }));
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
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    const savedTargets = state.settings.rhythmTargets && typeof state.settings.rhythmTargets === "object"
      ? state.settings.rhythmTargets
      : {};
    state.settings.rhythmTargets = {
      sleepMinutes: clampNumber(savedTargets.sleepMinutes, 240, 720, defaultTargets.sleepMinutes),
      waterGlasses: clampNumber(savedTargets.waterGlasses, 1, 20, defaultTargets.waterGlasses),
      movementMinutes: clampNumber(savedTargets.movementMinutes, 5, 180, defaultTargets.movementMinutes)
    };
    return state;
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function normalizeRhythm(value) {
    const source = value && typeof value === "object" ? value : {};
    return {
      sleepMinutes: clampNumber(source.sleepMinutes, 0, 1440, 0),
      waterGlasses: clampNumber(source.waterGlasses, 0, 30, 0),
      movementMinutes: clampNumber(source.movementMinutes, 0, 300, 0),
      updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : ""
    };
  }

  function getDay(state, key = dateKey()) {
    const existing = state.daily[key] && typeof state.daily[key] === "object" ? state.daily[key] : {};
    state.daily[key] = {
      mood: "",
      habits: [false, false, false, false],
      wellbeing: {},
      meals: {},
      feeling: "",
      gratitude: "",
      memory: "",
      quickNote: "",
      ...existing,
      rhythm: normalizeRhythm(existing.rhythm)
    };
    return state.daily[key];
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

  function saveState(state) {
    captureUnsavedFields(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function formatSleep(minutes) {
    if (!minutes) return "Not logged";
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}h${remainder ? ` ${remainder}m` : ""}`;
  }

  function percentage(value, target) {
    if (!target) return 0;
    return Math.min(100, Math.max(0, (value / target) * 100));
  }

  ensureStylesheet();

  const card = qs(".rhythm-card");
  const originalButton = qs("#editRhythm");
  if (!card || !originalButton) return;

  const editButton = originalButton.cloneNode(true);
  originalButton.replaceWith(editButton);

  const lines = qsa(".rhythm-line", card);
  const lineMap = {};
  lines.forEach((line) => {
    const label = qs("span", line)?.textContent.trim().toLowerCase();
    if (label) lineMap[label] = line;
  });

  const quickActions = element("div", { className: "rhythm-quick-actions", attrs: { "aria-label": "Quick rhythm updates" } });
  const waterQuick = element("button", { text: "+1 water", attrs: { type: "button" } });
  const movementQuick = element("button", { text: "+5 min movement", attrs: { type: "button" } });
  quickActions.append(waterQuick, movementQuick);
  editButton.before(quickActions);

  const history = element("section", { className: "rhythm-history", attrs: { "aria-labelledby": "rhythmHistoryTitle" } });
  const historyHeading = element("div", { className: "rhythm-history-heading" });
  historyHeading.append(
    element("strong", { text: "Last 7 days", attrs: { id: "rhythmHistoryTitle" } }),
    element("span", { text: "gentle progress, not perfection" })
  );
  const historySummary = element("p", { className: "rhythm-history-summary" });
  const historyGrid = element("div", { className: "rhythm-history-grid" });
  history.append(historyHeading, historySummary, historyGrid);
  editButton.after(history);

  function updateLine(line, value, target, display, label) {
    if (!line) return;
    const bar = qs("i", line);
    const output = qs("b", line);
    const progress = percentage(value, target);
    if (bar) bar.style.width = `${progress}%`;
    if (output) output.textContent = display;
    line.setAttribute("aria-label", `${label}: ${display}. ${Math.round(progress)} percent of target.`);
  }

  function sevenDayKeys() {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index));
      return { key: dateKey(date), date };
    });
  }

  function renderHistory(state) {
    historyGrid.replaceChildren();
    const entries = sevenDayKeys().map(({ key, date }) => ({ date, rhythm: normalizeRhythm(state.daily[key]?.rhythm) }));
    const logged = entries.filter(({ rhythm }) => rhythm.sleepMinutes || rhythm.waterGlasses || rhythm.movementMinutes);

    if (!logged.length) {
      historySummary.textContent = "Your weekly pattern will appear after your first check-in.";
    } else {
      const averageSleep = Math.round(logged.reduce((sum, item) => sum + item.rhythm.sleepMinutes, 0) / logged.length);
      const averageWater = Math.round((logged.reduce((sum, item) => sum + item.rhythm.waterGlasses, 0) / logged.length) * 10) / 10;
      const averageMovement = Math.round(logged.reduce((sum, item) => sum + item.rhythm.movementMinutes, 0) / logged.length);
      historySummary.textContent = `Average: ${formatSleep(averageSleep)} sleep · ${averageWater} water · ${averageMovement} min movement`;
    }

    entries.forEach(({ date, rhythm }) => {
      const item = element("article", { className: "rhythm-day" });
      const isToday = dateKey(date) === dateKey();
      item.append(element("strong", { text: isToday ? "Today" : date.toLocaleDateString("en-KE", { weekday: "short" }) }));
      if (!rhythm.sleepMinutes && !rhythm.waterGlasses && !rhythm.movementMinutes) {
        item.append(element("span", { className: "rhythm-day-empty", text: "No check-in" }));
      } else {
        item.append(
          element("span", { text: `☾ ${formatSleep(rhythm.sleepMinutes)}` }),
          element("span", { text: `◇ ${rhythm.waterGlasses} water` }),
          element("span", { text: `↗ ${rhythm.movementMinutes} min` })
        );
      }
      historyGrid.append(item);
    });
  }

  function render() {
    const state = loadState();
    const rhythm = getDay(state).rhythm;
    const targets = state.settings.rhythmTargets;
    updateLine(lineMap.sleep, rhythm.sleepMinutes, targets.sleepMinutes, formatSleep(rhythm.sleepMinutes), "Sleep");
    updateLine(lineMap.water, rhythm.waterGlasses, targets.waterGlasses, `${rhythm.waterGlasses} / ${targets.waterGlasses}`, "Water");
    updateLine(lineMap.movement, rhythm.movementMinutes, targets.movementMinutes, `${rhythm.movementMinutes} min`, "Movement");
    renderHistory(state);
  }

  function quickUpdate(kind, amount, maximum, message) {
    const state = loadState();
    const rhythm = getDay(state).rhythm;
    rhythm[kind] = Math.min(maximum, Number(rhythm[kind] || 0) + amount);
    rhythm.updatedAt = new Date().toISOString();
    saveState(state);
    render();
    showToast(message);
  }

  waterQuick.addEventListener("click", () => quickUpdate("waterGlasses", 1, 30, "Water updated."));
  movementQuick.addEventListener("click", () => quickUpdate("movementMinutes", 5, 300, "Movement updated."));

  const dialog = element("div", {
    className: "rhythm-dialog",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-hidden": "true",
      "aria-labelledby": "rhythmDialogTitle",
      "aria-describedby": "rhythmDialogDescription"
    }
  });
  const backdrop = element("button", { className: "rhythm-backdrop", attrs: { type: "button", "aria-label": "Close rhythm form" } });
  const form = element("form", { className: "rhythm-form", attrs: { novalidate: "" } });
  const closeButton = element("button", { className: "rhythm-close", text: "×", attrs: { type: "button", "aria-label": "Close rhythm form" } });
  const title = element("h2", { text: "Update body & rhythm", attrs: { id: "rhythmDialogTitle" } });
  const description = element("p", {
    className: "rhythm-description",
    text: "Use values that feel honest for today. Targets are gentle guides, not rules.",
    attrs: { id: "rhythmDialogDescription" }
  });
  const fieldGrid = element("div", { className: "rhythm-field-grid" });
  const error = element("p", { className: "rhythm-error", attrs: { role: "alert", "aria-live": "polite" } });
  const footer = element("div", { className: "rhythm-footer" });
  const cancel = element("button", { className: "rhythm-cancel", text: "Cancel", attrs: { type: "button" } });
  const submit = element("button", { className: "save-button", text: "Save check-in", attrs: { type: "submit" } });
  footer.append(cancel, submit);
  form.append(closeButton, element("p", { className: "eyebrow", text: "Daily wellbeing" }), title, description, fieldGrid, error, footer);
  dialog.append(backdrop, form);
  document.body.append(dialog);

  function field(name, label, options = {}) {
    const wrapper = element("label", { className: "rhythm-field" });
    const id = `rhythm-${name}`;
    wrapper.append(element("span", { text: label }));
    const input = element("input", {
      attrs: {
        id,
        name,
        type: options.type || "number",
        min: options.min,
        max: options.max,
        step: options.step || 1,
        inputmode: options.inputmode || "numeric",
        required: options.required ? "" : null
      }
    });
    wrapper.setAttribute("for", id);
    wrapper.append(input);
    if (options.help) wrapper.append(element("small", { text: options.help }));
    fieldGrid.append(wrapper);
    return input;
  }

  const sleepHours = field("sleepHours", "Sleep hours", { min: 0, max: 24, required: true });
  const sleepMinutes = field("sleepMinutes", "Extra sleep minutes", { min: 0, max: 59, required: true });
  const water = field("water", "Water glasses", { min: 0, max: 30, required: true });
  const movement = field("movement", "Movement minutes", { min: 0, max: 300, required: true, help: "Walking, stretching, sport, or any comfortable movement." });
  const targetSleep = field("targetSleep", "Sleep target (hours)", { min: 4, max: 12, step: 0.5, inputmode: "decimal", required: true });
  const targetWater = field("targetWater", "Water target (glasses)", { min: 1, max: 20, required: true });
  const targetMovement = field("targetMovement", "Movement target (minutes)", { min: 5, max: 180, required: true });

  let opener = null;

  function openDialog() {
    const state = loadState();
    const rhythm = getDay(state).rhythm;
    const targets = state.settings.rhythmTargets;
    sleepHours.value = String(Math.floor(rhythm.sleepMinutes / 60));
    sleepMinutes.value = String(rhythm.sleepMinutes % 60);
    water.value = String(rhythm.waterGlasses);
    movement.value = String(rhythm.movementMinutes);
    targetSleep.value = String(targets.sleepMinutes / 60);
    targetWater.value = String(targets.waterGlasses);
    targetMovement.value = String(targets.movementMinutes);
    error.textContent = "";
    opener = document.activeElement;
    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => sleepHours.focus());
  }

  function closeDialog() {
    dialog.classList.remove("open");
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    error.textContent = "";
    opener?.focus?.();
  }

  editButton.addEventListener("click", openDialog);
  backdrop.addEventListener("click", closeDialog);
  closeButton.addEventListener("click", closeDialog);
  cancel.addEventListener("click", closeDialog);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const hoursValue = Number(sleepHours.value);
    const minutesValue = Number(sleepMinutes.value);
    const waterValue = Number(water.value);
    const movementValue = Number(movement.value);
    const targetSleepValue = Number(targetSleep.value);
    const targetWaterValue = Number(targetWater.value);
    const targetMovementValue = Number(targetMovement.value);

    if ([hoursValue, minutesValue, waterValue, movementValue, targetSleepValue, targetWaterValue, targetMovementValue].some((value) => !Number.isFinite(value))) {
      error.textContent = "Enter valid numbers for each field.";
      return;
    }

    const state = loadState();
    const rhythm = getDay(state).rhythm;
    rhythm.sleepMinutes = Math.min(1440, Math.max(0, Math.round(hoursValue * 60 + minutesValue)));
    rhythm.waterGlasses = Math.min(30, Math.max(0, Math.round(waterValue)));
    rhythm.movementMinutes = Math.min(300, Math.max(0, Math.round(movementValue)));
    rhythm.updatedAt = new Date().toISOString();
    state.settings.rhythmTargets = {
      sleepMinutes: Math.round(Math.min(12, Math.max(4, targetSleepValue)) * 60),
      waterGlasses: Math.round(Math.min(20, Math.max(1, targetWaterValue))),
      movementMinutes: Math.round(Math.min(180, Math.max(5, targetMovementValue)))
    };
    saveState(state);
    closeDialog();
    render();
    showToast("Body and rhythm check-in saved.");
  });

  document.addEventListener("keydown", (event) => {
    if (!dialog.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = qsa('button, input, select, textarea, [tabindex]:not([tabindex="-1"])', form)
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

  render();
})();
