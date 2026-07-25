"use strict";

import { createId, dispatch, localDateKey, qs, qsa } from "./app-core.js";
import { consumeNotice, setNotice } from "./command-state.js";
import {
  STORAGE_KEYS,
  isRecord,
  readAppState,
  readJson,
  writeAppState,
  writeJson
} from "./state-store.js";

const TRACKED_READ_KEYS = new Set([STORAGE_KEYS.appState, STORAGE_KEYS.resources]);
const todayKey = localDateKey(new Date());

function showToast(message) {
  const toast = qs("#appToast");
  if (!toast) return false;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  return true;
}

function reloadWithNotice(message) {
  setNotice(message, { suppressErrors: true });
  globalThis.location.reload();
}

function twoStep(button, confirmationText, callback) {
  if (button.dataset.armed === "true") {
    button.dataset.armed = "false";
    button.textContent = button.dataset.originalText || "Delete";
    callback();
    return;
  }

  button.dataset.originalText = button.textContent;
  button.dataset.armed = "true";
  button.textContent = confirmationText;
  clearTimeout(button.armTimer);
  button.armTimer = setTimeout(() => {
    if (!button.isConnected) return;
    button.dataset.armed = "false";
    button.textContent = button.dataset.originalText || button.textContent;
  }, 5000);
}

function clearToday() {
  const state = readAppState({});
  state.daily = isRecord(state.daily) ? state.daily : {};
  delete state.daily[todayKey];

  const saved = writeAppState(state, { suppressErrors: true });
  if (!saved) {
    showToast("Today's check-in could not be cleared in this browser.");
    return false;
  }

  reloadWithNotice("Today cleared.");
  return true;
}

function resourcesFromDom() {
  return qsa("#resourceList .resource-card").map((card) => ({
    id: createId("resource"),
    title: qs("h3", card)?.textContent.trim() || "Resource",
    category: qs(".resource-category", card)?.textContent.trim() || "Personal",
    url: qs("a.resource-link", card)?.getAttribute("href") || "",
    note: qs("p", card)?.textContent.trim() || "",
    pinned: qs(".resource-pin-button", card)?.getAttribute("aria-pressed") === "true"
  }));
}

function deleteResource(button) {
  const card = button.closest(".resource-card");
  const title = qs("h3", card)?.textContent.trim() || "";
  const category = qs(".resource-category", card)?.textContent.trim() || "";
  let resources = readJson(STORAGE_KEYS.resources, null, { validate: Array.isArray });
  if (!resources) resources = resourcesFromDom();

  let removed = false;
  const nextResources = resources.filter((resource) => {
    if (!removed && resource?.title === title && resource?.category === category) {
      removed = true;
      return false;
    }
    return true;
  });

  if (!removed) {
    showToast("That resource could not be found.");
    return false;
  }

  const saved = writeJson(STORAGE_KEYS.resources, nextResources, { suppressErrors: true });
  if (!saved) {
    showToast("The resource could not be deleted in this browser.");
    return false;
  }

  reloadWithNotice("Resource deleted.");
  return true;
}

function installTrackedReadBridge() {
  if (globalThis.__littleLifeCommandReadBridgeInstalled) return false;
  const storagePrototype = globalThis.Storage?.prototype;
  const previousGetItem = storagePrototype?.getItem;
  if (typeof previousGetItem !== "function") return false;

  storagePrototype.getItem = function getItem(key) {
    const normalizedKey = String(key);
    const value = previousGetItem.call(this, normalizedKey);
    if (this === globalThis.localStorage && TRACKED_READ_KEYS.has(normalizedKey)) {
      dispatch("mll:storage-read", {
        key: normalizedKey,
        storage: "localStorage"
      });
    }
    return value;
  };

  globalThis.__littleLifeCommandReadBridgeInstalled = true;
  return true;
}

function installActionBridge() {
  if (globalThis.__littleLifeCommandActionBridgeInstalled) return false;

  document.addEventListener("click", (event) => {
    const clearButton = event.target.closest?.("#clearToday");
    if (clearButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      twoStep(clearButton, "Click again to clear today", clearToday);
      return;
    }

    const resourceButton = event.target.closest?.("#resourceList .item-remove");
    if (!resourceButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    twoStep(resourceButton, "Delete?", () => deleteResource(resourceButton));
  }, true);

  globalThis.__littleLifeCommandActionBridgeInstalled = true;
  return true;
}

function displayPendingNotice() {
  const notice = consumeNotice();
  if (!notice) return false;
  requestAnimationFrame(() => showToast(notice));
  return true;
}

export function initializeCommandStateBridge() {
  return Object.freeze({
    actionBridgeInstalled: installActionBridge(),
    noticeDisplayed: displayPendingNotice(),
    readBridgeInstalled: installTrackedReadBridge()
  });
}

const bridgeState = initializeCommandStateBridge();
const commandStateBridge = Object.freeze({
  initializeCommandStateBridge,
  state: bridgeState
});

if (!globalThis.MyLittleLifeCommandBridge) {
  Object.defineProperty(globalThis, "MyLittleLifeCommandBridge", {
    configurable: false,
    enumerable: false,
    writable: false,
    value: commandStateBridge
  });
}

export default commandStateBridge;
