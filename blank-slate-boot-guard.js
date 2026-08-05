"use strict";

(() => {
  const BLANK_SLATE_KEY = "myLittleLife.blankSlate.v1";
  if (localStorage.getItem(BLANK_SLATE_KEY) !== "true") return;

  const preservedKeys = new Set([
    BLANK_SLATE_KEY,
    "myLittleLife.blankSlateResetPending.v1",
    "mll.sync.meta.v1",
    "mll.sync.keyTimes.v1",
    "mll.authenticatedBefore",
    "privacyPinHash"
  ]);
  const preservedPrefixes = ["sb-", "supabase.", "mll.auth."];
  const nativeSetItem = Storage.prototype.setItem;
  const nativeRemoveItem = Storage.prototype.removeItem;

  window.__mllBlankBootNative = { setItem: nativeSetItem, removeItem: nativeRemoveItem };
  window.__mllBlankBootLocked = true;

  Storage.prototype.setItem = function guardedBlankBootSetItem(key, value) {
    const name = String(key || "");
    const isPreserved = preservedKeys.has(name) || preservedPrefixes.some((prefix) => name.startsWith(prefix));
    if (this === localStorage && window.__mllBlankBootLocked && !isPreserved) return;
    return nativeSetItem.call(this, key, value);
  };

  window.addEventListener("load", () => {
    window.setTimeout(() => { window.__mllBlankBootLocked = false; }, 0);
  }, { once: true });
})();
