"use strict";

import { STORAGE_KEYS } from "./state-store.js";

(() => {
  if (globalThis.__littleLifeStateWriteGuardInstalled) return;
  globalThis.__littleLifeStateWriteGuardInstalled = true;

  const nativeSetItem = Storage.prototype.setItem;
  let latestDashboardState = null;
  let unloading = false;

  Storage.prototype.setItem = function setItem(key, value) {
    if (this === localStorage && key === STORAGE_KEYS.appState && !unloading) {
      latestDashboardState = String(value);
    }
    return nativeSetItem.call(this, key, value);
  };

  globalThis.addEventListener("beforeunload", () => {
    unloading = true;
  }, { capture: true });

  globalThis.addEventListener("beforeunload", () => {
    if (latestDashboardState === null) return;
    try {
      nativeSetItem.call(localStorage, STORAGE_KEYS.appState, latestDashboardState);
    } catch (error) {
      console.error("Unable to preserve the latest dashboard edit.", error);
    }
  });
})();
