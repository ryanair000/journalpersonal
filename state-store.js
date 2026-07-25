"use strict";

import { dispatch, errorMessage, formatBytes, safeJsonParse } from "./app-core.js";

export const STORAGE_KEYS = Object.freeze({
  appState: "myLittleLife.app.v2",
  resources: "myLittleLife.resources.v1",
  migration: "myLittleLife.migrated.v2",
  settingsNotice: "myLittleLife.settingsNotice"
});

const storagePrototype = globalThis.Storage?.prototype;
const nativeGetItem = storagePrototype?.getItem;
const nativeKey = storagePrototype?.key;

const metrics = {
  reads: 0,
  writes: 0,
  removals: 0,
  errors: 0,
  rollbacks: 0,
  lastError: ""
};

function isBrowserStorage(storage) {
  try {
    return storage === globalThis.localStorage || storage === globalThis.sessionStorage;
  } catch {
    return false;
  }
}

function storageGetItem(storage, key) {
  if (isBrowserStorage(storage) && typeof nativeGetItem === "function") {
    return nativeGetItem.call(storage, String(key));
  }
  return storage.getItem(String(key));
}

function storageKey(storage, index) {
  if (isBrowserStorage(storage) && typeof nativeKey === "function") {
    return nativeKey.call(storage, index);
  }
  return storage.key(index);
}

function storageLabel(storage) {
  try {
    if (storage === globalThis.localStorage) return "localStorage";
    if (storage === globalThis.sessionStorage) return "sessionStorage";
  } catch {
    // Storage access may be blocked by the browser.
  }
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

function reportRead(key, storage) {
  dispatch("mll:storage-read", {
    key: String(key || ""),
    storage: storageLabel(storage)
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
    const value = storageGetItem(storage, key);
    if (options.notify !== false) reportRead(key, storage);
    return value === null ? fallback : value;
  } catch (error) {
    reportError("read", key, storage, error);
    return fallback;
  }
}

export function readJson(key, fallback, options = {}) {
  const raw = readRaw(key, {
    storage: options.storage,
    fallback: null,
    notify: options.notify
  });
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

export function writeJsonBatch(entries, options = {}) {
  const storage = options.storage || globalThis.localStorage;
  const pairs = Array.isArray(entries) ? entries : Object.entries(entries || {});
  if (!pairs.length) return true;

  const prepared = pairs.map(([key, value]) => [String(key), JSON.stringify(value)]);
  const previous = new Map();

  try {
    for (const [key] of prepared) previous.set(key, storageGetItem(storage, key));
    for (const [key, value] of prepared) storage.setItem(key, value);
    metrics.writes += prepared.length;
    if (options.notify !== false) {
      for (const [key] of prepared) reportChange("write", key, storage);
    }
    return true;
  } catch (error) {
    let rollbackFailed = false;
    for (const [key, value] of previous) {
      try {
        if (value === null) storage.removeItem(key);
        else storage.setItem(key, value);
      } catch (rollbackError) {
        rollbackFailed = true;
        reportError("rollback", key, storage, rollbackError);
      }
    }
    metrics.rollbacks += 1;
    reportError(rollbackFailed ? "batch-write-partial-rollback" : "batch-write", prepared.map(([key]) => key).join(","), storage, error);
    if (options.suppressErrors) return false;
    throw error;
  }
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
      const key = storageKey(storage, index) || "";
      characters += key.length + String(storageGetItem(storage, key) || "").length;
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
    rollbacks: metrics.rollbacks,
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
  writeJsonBatch,
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
