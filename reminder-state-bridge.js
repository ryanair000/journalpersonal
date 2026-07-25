"use strict";

import { createId, localDateKey, qs, qsa } from "./app-core.js";
import { setNotice } from "./command-state.js";
import { isRecord, readAppState, writeAppState } from "./state-store.js";

const REMINDER_DIALOG_TITLE = "Add a reminder";
const DELETE_CONFIRMATION_TEXT = "Delete?";
const CONFIRMATION_WINDOW_MS = 5000;

function ensureReminderState(rawState) {
  const state = isRecord(rawState) ? rawState : {};
  state.daily = isRecord(state.daily) ? state.daily : {};
  state.notes = isRecord(state.notes) ? state.notes : { people: "", connection: "" };
  state.suite = isRecord(state.suite) ? state.suite : {};
  state.suite.reminders = Array.isArray(state.suite.reminders) ? state.suite.reminders : [];
  return state;
}

function captureUnsavedFields(state) {
  const key = localDateKey();
  const existing = isRecord(state.daily[key]) ? state.daily[key] : {};
  state.daily[key] = {
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
  if (quickNote) state.daily[key].quickNote = quickNote.value.slice(0, 5000);
  if (gratitude) state.daily[key].gratitude = gratitude.value.slice(0, 5000);
  if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
}

function parseReminderDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function normalizeReminderDraft(values = {}) {
  return {
    id: createId("reminder"),
    title: String(values.title || "").trim().slice(0, 160),
    date: String(values.date || ""),
    note: String(values.note || "").slice(0, 500),
    section: String(values.section || "#home"),
    done: false,
    createdAt: new Date().toISOString()
  };
}

export function sortedActiveManualReminders(rawState) {
  const state = ensureReminderState(rawState);
  return state.suite.reminders
    .map((reminder, sourceIndex) => ({ reminder, sourceIndex }))
    .filter(({ reminder }) => isRecord(reminder) && !reminder.done)
    .sort((first, second) => {
      const firstTime = parseReminderDate(first.reminder.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const secondTime = parseReminderDate(second.reminder.date)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return firstTime - secondTime ||
        String(first.reminder.title || "Reminder").localeCompare(String(second.reminder.title || "Reminder")) ||
        first.sourceIndex - second.sourceIndex;
    });
}

function manualReminderRows() {
  return qsa("#reminderCenter .suite-reminder-row")
    .filter((row) => Boolean(qs("button.suite-danger-text", row)));
}

function reminderForRow(row, state) {
  const index = manualReminderRows().indexOf(row);
  if (index < 0) return null;
  return sortedActiveManualReminders(state)[index] || null;
}

function showFailure(message) {
  const dialogError = qs("#suiteDialogError");
  if (dialogError) {
    dialogError.textContent = message;
    return;
  }
  const toast = qs("#appToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function persistReminderState(state, message) {
  captureUnsavedFields(state);
  const saved = writeAppState(state, { suppressErrors: true });
  if (!saved) {
    showFailure("The reminder could not be saved in this browser.");
    return false;
  }
  setNotice(message, { suppressErrors: true });
  globalThis.location.reload();
  return true;
}

function handleReminderSubmit(event) {
  const form = event.target?.closest?.("#suiteDialogForm");
  if (!form) return;
  const title = qs("#suiteDialogTitle")?.textContent.trim() || "";
  if (title !== REMINDER_DIALOG_TITLE) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  if (!form.reportValidity()) return;

  const values = Object.fromEntries(new FormData(form).entries());
  const reminder = normalizeReminderDraft(values);
  if (!reminder.title) {
    showFailure("Enter a reminder.");
    return;
  }

  const state = ensureReminderState(readAppState({}));
  state.suite.reminders.push(reminder);
  persistReminderState(state, "Reminder added.");
}

function armDeleteButton(button, callback) {
  if (button.dataset.armed === "true") {
    button.dataset.armed = "false";
    button.textContent = button.dataset.originalText || "Delete";
    callback();
    return;
  }

  button.dataset.originalText = button.textContent;
  button.dataset.armed = "true";
  button.textContent = DELETE_CONFIRMATION_TEXT;
  clearTimeout(button.armTimer);
  button.armTimer = setTimeout(() => {
    if (!button.isConnected) return;
    button.dataset.armed = "false";
    button.textContent = button.dataset.originalText || "Delete";
  }, CONFIRMATION_WINDOW_MS);
}

function handleReminderAction(event) {
  const button = event.target?.closest?.("#reminderCenter .suite-reminder-row button");
  if (!button) return;

  const isDelete = button.classList.contains("suite-danger-text");
  const isDone = !isDelete && button.textContent.trim() === "Done";
  if (!isDelete && !isDone) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const state = ensureReminderState(readAppState({}));
  const row = button.closest(".suite-reminder-row");
  const target = reminderForRow(row, state);
  if (!target) {
    showFailure("That reminder could not be found. Reload and try again.");
    return;
  }

  if (isDone) {
    state.suite.reminders[target.sourceIndex].done = true;
    persistReminderState(state, "Reminder completed.");
    return;
  }

  armDeleteButton(button, () => {
    state.suite.reminders.splice(target.sourceIndex, 1);
    persistReminderState(state, "Reminder deleted.");
  });
}

export function installReminderStateBridge() {
  if (globalThis.__littleLifeReminderStateBridgeInstalled) return false;
  if (!globalThis.document?.addEventListener) return false;

  document.addEventListener("submit", handleReminderSubmit, true);
  document.addEventListener("click", handleReminderAction, true);
  globalThis.__littleLifeReminderStateBridgeInstalled = true;
  return true;
}

const installed = installReminderStateBridge();

export default Object.freeze({
  installed,
  installReminderStateBridge,
  normalizeReminderDraft,
  sortedActiveManualReminders
});
