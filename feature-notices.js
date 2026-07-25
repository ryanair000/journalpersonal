"use strict";

import { dispatch, errorMessage } from "./app-core.js";

export const FEATURE_NOTICE_KEYS = Object.freeze({
  finance: "myLittleLife.financeNotice",
  journal: "myLittleLife.journalNotice",
  planner: "myLittleLife.plannerNotice"
});

const KEY_TO_FEATURE = new Map(Object.entries(FEATURE_NOTICE_KEYS).map(([feature, key]) => [key, feature]));
const registeredFeatures = new Set();
const metrics = { reads: 0, writes: 0, removals: 0, errors: 0, lastError: "" };
let installed = false;
let capturedGetItem = null;
let capturedSetItem = null;
let capturedRemoveItem = null;

function normalizeFeature(feature) {
  const normalized = String(feature || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(FEATURE_NOTICE_KEYS, normalized) ? normalized : "";
}

function featureForKey(key) {
  const feature = KEY_TO_FEATURE.get(String(key || ""));
  return feature && registeredFeatures.has(feature) ? feature : "";
}

function report(operation, feature, key) {
  dispatch("mll:feature-notice", { operation, feature, key, storage: "sessionStorage" });
}

function reportError(operation, feature, key, error) {
  const message = errorMessage(error);
  metrics.errors += 1;
  metrics.lastError = message;
  dispatch("mll:feature-notice-error", { operation, feature, key, storage: "sessionStorage", error: message });
}

function storageReady() {
  return Boolean(globalThis.sessionStorage && typeof capturedGetItem === "function" && typeof capturedSetItem === "function" && typeof capturedRemoveItem === "function");
}

function readCaptured(key, options = {}) {
  const feature = KEY_TO_FEATURE.get(key) || "";
  try {
    if (!storageReady()) return options.fallback ?? null;
    metrics.reads += 1;
    const value = capturedGetItem.call(globalThis.sessionStorage, key);
    if (options.notify !== false && feature) report("read", feature, key);
    return value === null ? (options.fallback ?? null) : value;
  } catch (error) {
    reportError("read", feature, key, error);
    return options.fallback ?? null;
  }
}

function writeCaptured(key, value, options = {}) {
  const feature = KEY_TO_FEATURE.get(key) || "";
  try {
    if (!storageReady()) return false;
    capturedSetItem.call(globalThis.sessionStorage, key, String(value));
    metrics.writes += 1;
    if (options.notify !== false && feature) report("write", feature, key);
    return true;
  } catch (error) {
    reportError("write", feature, key, error);
    if (options.suppressErrors) return false;
    throw error;
  }
}

function removeCaptured(key, options = {}) {
  const feature = KEY_TO_FEATURE.get(key) || "";
  try {
    if (!storageReady()) return false;
    capturedRemoveItem.call(globalThis.sessionStorage, key);
    metrics.removals += 1;
    if (options.notify !== false && feature) report("remove", feature, key);
    return true;
  } catch (error) {
    reportError("remove", feature, key, error);
    if (options.suppressErrors) return false;
    throw error;
  }
}

export function installFeatureNoticeBridge() {
  if (installed) return true;
  const storagePrototype = globalThis.Storage?.prototype;
  if (!storagePrototype) return false;
  capturedGetItem = storagePrototype.getItem;
  capturedSetItem = storagePrototype.setItem;
  capturedRemoveItem = storagePrototype.removeItem;
  if (![capturedGetItem, capturedSetItem, capturedRemoveItem].every((method) => typeof method === "function")) return false;

  storagePrototype.getItem = function getItem(key) {
    const normalizedKey = String(key);
    const feature = this === globalThis.sessionStorage ? featureForKey(normalizedKey) : "";
    return feature ? readCaptured(normalizedKey) : capturedGetItem.call(this, normalizedKey);
  };
  storagePrototype.setItem = function setItem(key, value) {
    const normalizedKey = String(key);
    const feature = this === globalThis.sessionStorage ? featureForKey(normalizedKey) : "";
    return feature ? writeCaptured(normalizedKey, value) : capturedSetItem.call(this, normalizedKey, value);
  };
  storagePrototype.removeItem = function removeItem(key) {
    const normalizedKey = String(key);
    const feature = this === globalThis.sessionStorage ? featureForKey(normalizedKey) : "";
    return feature ? removeCaptured(normalizedKey) : capturedRemoveItem.call(this, normalizedKey);
  };
  installed = true;
  globalThis.__littleLifeFeatureNoticeBridgeInstalled = true;
  return true;
}

export function registerFeatureNotice(feature) {
  const normalized = normalizeFeature(feature);
  if (!normalized) return false;
  registeredFeatures.add(normalized);
  installFeatureNoticeBridge();
  return true;
}

export function setFeatureNotice(feature, message, options = {}) {
  const normalized = normalizeFeature(feature);
  if (!normalized) return false;
  registerFeatureNotice(normalized);
  const key = FEATURE_NOTICE_KEYS[normalized];
  const text = String(message || "").trim().slice(0, 240);
  return text ? writeCaptured(key, text, options) : removeCaptured(key, options);
}

export function peekFeatureNotice(feature) {
  const normalized = normalizeFeature(feature);
  if (!normalized) return "";
  registerFeatureNotice(normalized);
  return readCaptured(FEATURE_NOTICE_KEYS[normalized], { fallback: "" });
}

export function consumeFeatureNotice(feature) {
  const normalized = normalizeFeature(feature);
  if (!normalized) return "";
  registerFeatureNotice(normalized);
  const key = FEATURE_NOTICE_KEYS[normalized];
  const notice = readCaptured(key, { fallback: "" });
  if (notice) removeCaptured(key, { suppressErrors: true });
  return notice;
}

export function featureNoticeDiagnostics() {
  const pending = {};
  for (const feature of Object.keys(FEATURE_NOTICE_KEYS)) {
    const key = FEATURE_NOTICE_KEYS[feature];
    pending[feature] = registeredFeatures.has(feature) && Boolean(readCaptured(key, { fallback: "", notify: false }));
  }
  return Object.freeze({
    registered: Object.freeze([...registeredFeatures]),
    pending: Object.freeze(pending),
    reads: metrics.reads,
    writes: metrics.writes,
    removals: metrics.removals,
    errors: metrics.errors,
    lastError: metrics.lastError
  });
}

registerFeatureNotice("finance");
registerFeatureNotice("journal");

const featureNotices = Object.freeze({ FEATURE_NOTICE_KEYS, consumeFeatureNotice, featureNoticeDiagnostics, installFeatureNoticeBridge, peekFeatureNotice, registerFeatureNotice, setFeatureNotice });
if (!globalThis.MyLittleLifeFeatureNotices) {
  Object.defineProperty(globalThis, "MyLittleLifeFeatureNotices", { configurable: false, enumerable: false, writable: false, value: featureNotices });
}
export default featureNotices;
