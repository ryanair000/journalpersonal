"use strict";

import { dispatch, errorMessage, formatBytes, safeJsonParse } from "./app-core.js";

export const STORAGE_KEYS = Object.freeze({
  appState: "myLittleLife.app.v2",
  resources: "myLittleLife.resources.v1",
  migration: "myLittleLife.migrated.v2",
  settingsNotice: "myLittleLife.settingsNotice"
});

const metrics = {
  reads: 0,
  writes: 0,
  removals: 0,
  errors: 0,
  lastError: ""
};

function storageLabel(storage) {
  if (storage === globalThis.localStorage) return "localStorage";
  if (storage === globalThis.sessionStorage) return "sessionStorage";
  return "storage";
}

function reportError(operation, key, storage, error) {
  const message = errorMessage(error);
  metrics.errors += 1;
  metrics.lastError = message;
  dispatch("mll:storage-error", {
    operation,
    key: String(key || ""),
    storage: storageLabel(storage),
    error: message
  });
}

function reportChange(operation, key, storage) {
  dispatch("mll:storage-change", {
    operation,
    key: String(key || ""),
    storage: storageLabel(storage)
  });
}

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readRaw(key, options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const fallback = options.fallback ?? null;
  try {
    metrics.reads += 1;
    const value = storage.getItem(String(key));
    return value === null ? fallback : value;
  } catch (error) {
    reportError("read", key, storage, error);
    return fallback;
  }
}

export function readJson(key, fallback, options = {}) {
  const raw = readRaw(key, { storage: options.storage, fallback: null });
  if (raw === null) return fallback;
  const parsed = safeJsonParse(raw, fallback);
  if (typeof options.validate === "function" && !options.validate(parsed)) {
    return fallback;
  }
  return parsed;
}

export function writeRaw(key, value, options = {}) {
  const storage = options.storage || globalThis.localStorage;
  try {
    storage.setItem(String(key), String(value));
    metrics.writes += 1;
    if (options.notify !== false) reportChange("write", key, storage);
    return true;
  } catch (error) {
    reportError("write", key, storage, error);
    if (options.suppressErrors) return false;
    throw error;
  }
}

export function writeJson(key, value, options = {}) {
  return writeRaw(key, JSON.stringify(value), options);
}

export function removeKey(key, options = {}) {
  const storage = options.storage || globalThis.localStorage;
  try {
    storage.removeItem(String(key));
    metrics.removals += 1;
    if (options.notify !== false) reportChange("remove", key, storage);
    return true;
  } catch (error) {
    reportError("remove", key, storage, error);
    if (options.suppressErrors) return false;
    throw error;
  }
}

export function removeKeys(keys, options = {}) {
  let success = true;
  for (const key of keys) {
    if (!removeKey(key, options)) success = false;
  }
  return success;
}

export function readAppState(fallback = {}) {
  return readJson(STORAGE_KEYS.appState, fallback, { validate: isRecord });
}

export function writeAppState(state, options = {}) {
  if (!isRecord(state)) throw new TypeError("Dashboard state must be an object.");
  return writeJson(STORAGE_KEYS.appState, state, options);
}

export function storageDiagnostics(storage = globalThis.localStorage) {
  let available = false;
  let itemCount = 0;
  let bytes = null;

  try {
    itemCount = storage.length;
    let characters = 0;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || "";
      characters += key.length + String(storage.getItem(key) || "").length;
    }
    bytes = characters * 2;
    available = true;
  } catch (error) {
    reportError("diagnostics", "", storage, error);
  }

  return Object.freeze({
    available,
    bytes,
    itemCount,
    sizeLabel: bytes === null ? "Unavailable" : formatBytes(bytes),
    reads: metrics.reads,
    writes: metrics.writes,
    removals: metrics.removals,
    errors: metrics.errors,
    lastError: metrics.lastError
  });
}

const stateStore = Object.freeze({
  STORAGE_KEYS,
  isRecord,
  readAppState,
  readJson,
  readRaw,
  removeKey,
  removeKeys,
  storageDiagnostics,
  writeAppState,
  writeJson,
  writeRaw
});

if (!globalThis.MyLittleLifeState) {
  Object.defineProperty(globalThis, "MyLittleLifeState", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: stateStore
  });
}

export default stateStore;
