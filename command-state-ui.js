"use strict";

import { element, qs, qsa } from "./app-core.js";
import {
  currentBackupPayload,
  readBackups,
  readHistory,
  restoreSnapshot,
  snapshotPayload,
  undoLatestHistory
} from "./command-state.js";

(() => {
  const center = qs("#systemCenter");
  if (!center || center.dataset.commandStateControls === "ready") return;

  function announce(message) {
    const live = qs("#suiteLiveRegion");
    if (!live) return;
    live.textContent = "";
    requestAnimationFrame(() => {
      live.textContent = message;
    });
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = element("a", { attrs: { href: url, download: filename } });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function replaceButton(button, handler) {
    if (!button) return null;
    const replacement = button.cloneNode(true);
    button.replaceWith(replacement);
    replacement.addEventListener("click", handler);
    return replacement;
  }

  function armButton(button, confirmationText, onConfirm) {
    if (button.dataset.armed === "true") {
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalText || button.textContent;
      onConfirm();
      return;
    }

    button.dataset.originalText = button.textContent;
    button.dataset.armed = "true";
    button.textContent = confirmationText;
    announce("Click the button again to confirm.");
    clearTimeout(button.armTimer);
    button.armTimer = setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.armed = "false";
      button.textContent = button.dataset.originalText || button.textContent;
    }, 5000);
  }

  function findCard(title) {
    return qsa(".suite-system-card", center)
      .find((card) => qs("h3", card)?.textContent.trim() === title) || null;
  }

  const backupNow = qs(".section-title .small-link", center);
  replaceButton(backupNow, () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`my-little-life-backup-${date}.json`, currentBackupPayload());
    announce("Current backup downloaded.");
  });

  const historyCard = findCard("Undo the last local update");
  const history = readHistory();
  const undoButton = replaceButton(qs(".suite-secondary-button", historyCard), () => {
    if (!undoLatestHistory()) {
      announce("There is no local change available to undo.");
      return;
    }
    globalThis.location.reload();
  });
  if (undoButton) undoButton.disabled = history.length === 0;

  const backupCard = findCard("Restore a recent local version");
  const backups = readBackups();
  qsa(".suite-backup-list > div", backupCard).forEach((row, index) => {
    const snapshot = backups[index];
    if (!snapshot) return;

    const buttons = qsa("button", row);
    const downloadButton = buttons.find((button) => button.textContent.trim() === "Download");
    replaceButton(downloadButton, () => {
      const payload = snapshotPayload(snapshot);
      if (!payload) {
        announce("This local snapshot is unavailable.");
        return;
      }
      downloadJson(`my-little-life-snapshot-${String(snapshot.at).slice(0, 10)}.json`, payload);
      announce("Snapshot downloaded.");
    });

    const restoreButton = buttons.find((button) => button.textContent.trim() === "Restore");
    const replacement = replaceButton(restoreButton, () => {
      armButton(replacement, "Restore?", () => {
        if (!restoreSnapshot(snapshot)) {
          announce("The local snapshot could not be restored.");
          return;
        }
        globalThis.location.reload();
      });
    });
  });

  center.dataset.commandStateControls = "ready";
})();
