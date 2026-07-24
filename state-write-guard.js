"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const nativeSetItem = Storage.prototype.setItem;
  let latestDashboardState = null;
  let unloading = false;

  Storage.prototype.setItem = function setItem(key, value) {
    if (this === localStorage && key === STORAGE_KEY && !unloading) {
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
      nativeSetItem.call(localStorage, STORAGE_KEY, latestDashboardState);
    } catch (error) {
      console.error("Unable to preserve the latest dashboard edit.", error);
    }
  });
})();
