"use strict";

import { createId, safeJsonParse } from "./app-core.js";
import {
  STORAGE_KEYS,
  isRecord,
  readJson,
  readRaw,
  removeKey,
  writeJson,
  writeJsonBatch,
  writeRaw
} from "./state-store.js";

export const COMMAND_KEYS = Object.freeze({
  history: "myLittleLife.changeHistory.v1",
  backups: "myLittleLife.autoBackups.v1",
  notice: "myLittleLife.commandNotice"
});

const HISTORY_LIMIT = 20;
const BACKUP_LIMIT = 5;
const DASHBOARD_SIZE_LIMIT = 2_000_000;
const RESOURCE_SIZE_LIMIT = 750_000;
const SNAPSHOT_DEDUPLICATION_WINDOW = 6 * 60 * 60 * 1000;
const TRACKED_KEYS = new Set([STORAGE_KEYS.appState, STORAGE_KEYS.resources]);

function isHistoryEntry(value) {
  return isRecord(value) &&
    TRACKED_KEYS.has(String(value.key || "")) &&
    (value.previousValue === null || typeof value.previousValue === "string") &&
    (value.nextValue === null || typeof value.nextValue === "string");
}

function normalizeHistory(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isHistoryEntry)
    .map((entry) => ({
      id: String(entry.id || createId("history")),
      key: String(entry.key),
      previousValue: entry.previousValue,
      nextValue: entry.nextValue,
      action: String(entry.action || "Updated").slice(0, 40),
      at: typeof entry.at === "string" ? entry.at : new Date().toISOString()
    }))
    .slice(0, HISTORY_LIMIT);
}

function normalizeBackup(value) {
  if (!isRecord(value)) return null;
  if (typeof value.dashboardData !== "string" || typeof value.resourceData !== "string") return null;
  return {
    id: String(value.id || createId("snapshot")),
    at: typeof value.at === "string" ? value.at : new Date().toISOString(),
    dashboardData: value.dashboardData,
    resourceData: value.resourceData,
    size: Number.isFinite(Number(value.size))
      ? Number(value.size)
      : value.dashboardData.length + value.resourceData.length
  };
}

function normalizeBackups(value) {
  if (!Array.isArray(value)) return [];
  return value.map(normalizeBackup).filter(Boolean).slice(0, BACKUP_LIMIT);
}

export function readHistory() {
  return normalizeHistory(readJson(COMMAND_KEYS.history, [], {
    storage: globalThis.sessionStorage,
    validate: Array.isArray
  }));
}

export function writeHistory(history, options = {}) {
  return writeJson(COMMAND_KEYS.history, normalizeHistory(history), {
    storage: globalThis.sessionStorage,
    suppressErrors: options.suppressErrors === true,
    notify: options.notify
  });
}

export function readBackups() {
  return normalizeBackups(readJson(COMMAND_KEYS.backups, [], {
    validate: Array.isArray
  }));
}

export function writeBackups(backups, options = {}) {
  return writeJson(COMMAND_KEYS.backups, normalizeBackups(backups), {
    suppressErrors: options.suppressErrors === true,
    notify: options.notify
  });
}

export function setNotice(message, options = {}) {
  const text = String(message || "").trim().slice(0, 240);
  if (!text) return removeKey(COMMAND_KEYS.notice, {
    storage: globalThis.sessionStorage,
    suppressErrors: options.suppressErrors === true,
    notify: options.notify
  });
  return writeRaw(COMMAND_KEYS.notice, text, {
    storage: globalThis.sessionStorage,
    suppressErrors: options.suppressErrors === true,
    notify: options.notify
  });
}

export function peekNotice() {
  return readRaw(COMMAND_KEYS.notice, {
    storage: globalThis.sessionStorage,
    fallback: ""
  });
}

export function consumeNotice() {
  const notice = peekNotice();
  if (notice) {
    removeKey(COMMAND_KEYS.notice, {
      storage: globalThis.sessionStorage,
      suppressErrors: true
    });
  }
  return notice;
}

export function createAutomaticSnapshot(options = {}) {
  const dashboardData = readRaw(STORAGE_KEYS.appState, { fallback: "{}" });
  const resourceData = readRaw(STORAGE_KEYS.resources, { fallback: "[]" });

  if (dashboardData.length > DASHBOARD_SIZE_LIMIT || resourceData.length > RESOURCE_SIZE_LIMIT) {
    return Object.freeze({ created: false, reason: "size-limit" });
  }

  const backups = readBackups();
  const latest = backups[0];
  const same = latest?.dashboardData === dashboardData && latest?.resourceData === resourceData;
  const latestTime = latest?.at ? new Date(latest.at).getTime() : Number.NaN;
  const recent = Number.isFinite(latestTime) &&
    Date.now() - latestTime < SNAPSHOT_DEDUPLICATION_WINDOW;

  if (same && recent && options.force !== true) {
    return Object.freeze({ created: false, reason: "unchanged", snapshot: latest });
  }

  const snapshot = {
    id: createId("snapshot"),
    at: new Date().toISOString(),
    dashboardData,
    resourceData,
    size: dashboardData.length + resourceData.length
  };
  const saved = writeBackups([snapshot, ...backups], {
    suppressErrors: true
  });

  return Object.freeze({
    created: saved,
    reason: saved ? "created" : "storage-error",
    snapshot: saved ? snapshot : null
  });
}

export function restoreSnapshot(snapshot, options = {}) {
  const normalized = normalizeBackup(snapshot);
  if (!normalized) return false;

  const dashboard = safeJsonParse(normalized.dashboardData, null);
  const resources = safeJsonParse(normalized.resourceData, null);
  if (!isRecord(dashboard) || !Array.isArray(resources)) return false;

  const restored = writeJsonBatch([
    [STORAGE_KEYS.appState, dashboard],
    [STORAGE_KEYS.resources, resources]
  ], {
    suppressErrors: true
  });

  if (restored && options.notice !== false) {
    setNotice(options.notice || "Local snapshot restored.", { suppressErrors: true });
  }
  return restored;
}

export function commandStateDiagnostics() {
  const history = readHistory();
  const backups = readBackups();
  const notice = peekNotice();
  return Object.freeze({
    historyCount: history.length,
    backupCount: backups.length,
    hasNotice: Boolean(notice),
    newestHistoryAt: history[0]?.at || "",
    newestBackupAt: backups[0]?.at || ""
  });
}

const commandState = Object.freeze({
  COMMAND_KEYS,
  commandStateDiagnostics,
  consumeNotice,
  createAutomaticSnapshot,
  peekNotice,
  readBackups,
  readHistory,
  restoreSnapshot,
  setNotice,
  writeBackups,
  writeHistory
});

if (!globalThis.MyLittleLifeCommandState) {
  Object.defineProperty(globalThis, "MyLittleLifeCommandState", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: commandState
  });
}

export default commandState;
