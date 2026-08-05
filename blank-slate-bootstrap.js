"use strict";

(() => {
  const BLANK_SLATE_KEY = "myLittleLife.blankSlate.v1";
  const RESET_PENDING_KEY = "myLittleLife.blankSlateResetPending.v1";
  if (localStorage.getItem(BLANK_SLATE_KEY) !== "true") return;

  document.body.classList.add("mll-blank-slate");
  if (localStorage.getItem(RESET_PENDING_KEY) !== "true") return;

  const preservedKeys = new Set([
    BLANK_SLATE_KEY,
    RESET_PENDING_KEY,
    "mll.sync.meta.v1",
    "mll.sync.keyTimes.v1",
    "mll.authenticatedBefore",
    "privacyPinHash"
  ]);
  const preservedPrefixes = ["sb-", "supabase.", "mll.auth."];
  const keysToRemove = [];

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || preservedKeys.has(key) || preservedPrefixes.some((prefix) => key.startsWith(prefix))) continue;
    keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => localStorage.removeItem(key));
  localStorage.removeItem(RESET_PENDING_KEY);
})();
