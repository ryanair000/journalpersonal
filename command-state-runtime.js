"use strict";

import { createId } from "./app-core.js";
import { STORAGE_KEYS } from "./state-store.js";
import {
  createAutomaticSnapshot,
  readHistory,
  writeHistory
} from "./command-state.js";

const TRACKED_KEYS = new Set([STORAGE_KEYS.appState, STORAGE_KEYS.resources]);
let historyGuard = false;

function recordHistory(key, previousValue, nextValue, action) {
  const normalizedKey = String(key || "");
  if (historyGuard || !TRACKED_KEYS.has(normalizedKey) || previousValue === nextValue) {
    return false;
  }

  const history = readHistory();
  history.unshift({
    id: createId("history"),
    key: normalizedKey,
    previousValue,
    nextValue,
    action,
    at: new Date().toISOString()
  });

  historyGuard = true;
  try {
    return writeHistory(history, { suppressErrors: true, notify: false });
  } finally {
    historyGuard = false;
  }
}

export function installCommandHistoryCapture() {
  if (globalThis.__littleLifeHistoryCaptureInstalled) return false;

  const StorageType = globalThis.Storage;
  const storagePrototype = StorageType?.prototype;
  const previousSetItem = storagePrototype?.setItem;
  const previousRemoveItem = storagePrototype?.removeItem;

  if (typeof previousSetItem !== "function" || typeof previousRemoveItem !== "function") {
    return false;
  }

  storagePrototype.setItem = function setItem(key, value) {
    const normalizedKey = String(key);
    const previousValue = this === globalThis.localStorage
      ? this.getItem(normalizedKey)
      : null;
    const result = previousSetItem.call(this, normalizedKey, value);

    if (this === globalThis.localStorage) {
      recordHistory(normalizedKey, previousValue, String(value), "Updated");
    }
    return result;
  };

  storagePrototype.removeItem = function removeItem(key) {
    const normalizedKey = String(key);
    const previousValue = this === globalThis.localStorage
      ? this.getItem(normalizedKey)
      : null;
    const result = previousRemoveItem.call(this, normalizedKey);

    if (this === globalThis.localStorage) {
      recordHistory(normalizedKey, previousValue, null, "Removed");
    }
    return result;
  };

  globalThis.__littleLifeHistoryRestore = (entry) => {
    const key = String(entry?.key || "");
    if (!TRACKED_KEYS.has(key)) return false;
    if (entry?.previousValue !== null && typeof entry?.previousValue !== "string") {
      return false;
    }

    historyGuard = true;
    try {
      if (entry.previousValue === null) {
        previousRemoveItem.call(globalThis.localStorage, key);
      } else {
        previousSetItem.call(globalThis.localStorage, key, entry.previousValue);
      }
      return true;
    } finally {
      historyGuard = false;
    }
  };

  globalThis.__littleLifeHistoryCaptureInstalled = true;
  return true;
}

export function initializeCommandStateRuntime() {
  const historyInstalled = installCommandHistoryCapture();
  const snapshot = createAutomaticSnapshot();

  return Object.freeze({
    historyInstalled,
    snapshot
  });
}

const runtimeState = initializeCommandStateRuntime();
const commandRuntime = Object.freeze({
  installCommandHistoryCapture,
  initializeCommandStateRuntime,
  state: runtimeState
});

if (!globalThis.MyLittleLifeCommandRuntime) {
  Object.defineProperty(globalThis, "MyLittleLifeCommandRuntime", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: commandRuntime
  });
}

export default commandRuntime;
