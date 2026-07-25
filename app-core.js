"use strict";

const DEFAULT_ID_PREFIX = "mll";

export function qs(selector, root = globalThis.document) {
  return root?.querySelector?.(selector) ?? null;
}

export function qsa(selector, root = globalThis.document) {
  return root?.querySelectorAll ? [...root.querySelectorAll(selector)] : [];
}

export function element(tag, options = {}) {
  const documentRef = options.document || globalThis.document;
  if (!documentRef?.createElement) {
    throw new Error("A document is required to create DOM elements.");
  }

  const node = documentRef.createElement(tag);
  if (options.className) node.className = options.className;
  if (options.text !== undefined) node.textContent = String(options.text);

  Object.entries(options.attrs || {}).forEach(([name, value]) => {
    if (value !== undefined && value !== null) {
      node.setAttribute(name, String(value));
    }
  });

  return node;
}

export function safeJsonParse(value, fallback) {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function clampNumber(value, minimum, maximum, fallback = minimum) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(maximum, Math.max(minimum, numericValue));
}

export function pad(value, length = 2) {
  return String(value).padStart(length, "0");
}

export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function createId(prefix = DEFAULT_ID_PREFIX) {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId || `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function dispatch(name, detail = {}, target = globalThis) {
  if (!target?.dispatchEvent || typeof globalThis.CustomEvent !== "function") {
    return false;
  }
  target.dispatchEvent(new CustomEvent(name, { detail }));
  return true;
}

export function errorMessage(error, maximumLength = 240) {
  return String(error?.message || error || "Unknown error").slice(0, maximumLength);
}

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(milliseconds) || 0)));
}

export function nextFrame() {
  return new Promise((resolve) => {
    const schedule = globalThis.requestAnimationFrame || ((callback) => setTimeout(callback, 0));
    schedule(() => resolve());
  });
}

export function localStorageBytes(storage = globalThis.localStorage) {
  try {
    let characters = 0;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index) || "";
      characters += key.length + String(storage.getItem(key) || "").length;
    }
    return characters * 2;
  } catch {
    return null;
  }
}

export function formatBytes(bytes) {
  const value = Math.max(0, Number(bytes) || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

export function localStorageSizeLabel(storage = globalThis.localStorage) {
  const bytes = localStorageBytes(storage);
  return bytes === null ? "Unavailable" : formatBytes(bytes);
}

const core = Object.freeze({
  clampNumber,
  createId,
  dispatch,
  element,
  errorMessage,
  formatBytes,
  localDateKey,
  localStorageBytes,
  localStorageSizeLabel,
  nextFrame,
  pad,
  qs,
  qsa,
  safeJsonParse,
  sleep
});

if (!globalThis.MyLittleLifeCore) {
  Object.defineProperty(globalThis, "MyLittleLifeCore", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: core
  });
}

export default core;
