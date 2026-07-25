"use strict";

import { element, qs } from "./app-core.js";
import { commandStateDiagnostics } from "./command-state.js";
import { featureNoticeDiagnostics } from "./feature-notices.js";
import { storageDiagnostics } from "./state-store.js";

(() => {
  const registry = globalThis.MyLittleLifeModules;
  if (!registry) return;

  function ensureStyles() {
    if (qs("#moduleHealthStyles")) return;
    const style = element("style", { attrs: { id: "moduleHealthStyles" } });
    style.textContent = `
      .module-health-card{margin-top:18px;padding:20px;border:1px solid var(--line,#eadde3);border-radius:20px;background:rgba(255,255,255,.78)}
      .module-health-heading,.module-health-summary,.module-health-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .module-health-heading h3{margin:2px 0 0}.module-health-summary{margin:14px 0;padding:12px 14px;border-radius:14px;background:var(--soft-pink,#fbf1f4)}
      .module-health-summary strong{font-size:1.1rem}.module-health-list{display:grid;gap:8px;margin-top:12px}.module-health-row{display:grid;grid-template-columns:minmax(140px,1fr) auto auto;gap:10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line,#eadde3)}
      .module-health-row:last-child{border-bottom:0}.module-health-status{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}.module-health-status.ready{color:#2f7650}.module-health-status.failed{color:#a23b4a}.module-health-status.loading,.module-health-status.retrying{color:#8a682c}.module-health-status.pending{color:#81717a}
      .module-health-time{font-family:var(--mono,monospace);font-size:.78rem;color:var(--muted,#81717a)}.module-health-error{grid-column:1/-1;margin:0;font-size:.82rem;color:#a23b4a}.module-health-actions{margin-top:14px;justify-content:flex-end}.module-health-button{border:1px solid var(--line,#eadde3);border-radius:999px;background:white;padding:9px 13px;font:inherit;cursor:pointer}
      @media(max-width:640px){.module-health-row{grid-template-columns:1fr auto}.module-health-time{grid-column:1}.module-health-actions{justify-content:stretch}.module-health-button{flex:1}}
      @media(prefers-reduced-motion:reduce){.module-health-card *{scroll-behavior:auto!important}}
    `;
    document.head.append(style);
  }

  function diagnosticText() {
    const storage = storageDiagnostics();
    const commandState = commandStateDiagnostics();
    const featureNotices = featureNoticeDiagnostics();
    const pendingNotices = Object.values(featureNotices.pending).filter(Boolean).length;
    const lines = [
      "My Little Life — module diagnostics",
      `Checked: ${new Date().toISOString()}`,
      `Online: ${navigator.onLine}`,
      `Startup duration: ${registry.durationMs || 0} ms`,
      `Local storage: ${storage.available ? "available" : "unavailable"}`,
      `Local storage estimate: ${storage.sizeLabel}`,
      `Storage operations: ${storage.reads} reads | ${storage.writes} writes | ${storage.removals} removals | ${storage.errors} errors`,
      `Command state: ${commandState.historyCount} undo entries | ${commandState.backupCount} snapshots | notice ${commandState.hasNotice ? "pending" : "clear"}`,
      `Feature notices: ${featureNotices.registered.length} registered | ${pendingNotices} pending | ${featureNotices.reads} reads | ${featureNotices.writes} writes | ${featureNotices.removals} removals | ${featureNotices.errors} errors`,
      ""
    ];
    Object.entries(registry.modules).forEach(([, state]) => {
      lines.push(`${state.label} | ${state.status} | attempts ${state.attempts} | ${state.durationMs || 0} ms${state.error ? ` | ${state.error}` : ""}`);
    });
    return lines.join("\n");
  }

  async function copyDiagnostics(button, status) {
    try {
      await navigator.clipboard.writeText(diagnosticText());
      status.textContent = "Diagnostics copied.";
      button.textContent = "Copied ✓";
    } catch {
      status.textContent = "Clipboard access is unavailable. Reloading remains safe.";
    }
    setTimeout(() => {
      button.textContent = "Copy diagnostics";
      status.textContent = "";
    }, 2600);
  }

  function findHost() {
    return qs("#systemCenter") || qs("#settings") || qs("main.dashboard");
  }

  function render() {
    const host = findHost();
    if (!host) return false;
    qs("#moduleHealthCard")?.remove();

    const storage = storageDiagnostics();
    const commandState = commandStateDiagnostics();
    const featureNotices = featureNoticeDiagnostics();
    const pendingNotices = Object.values(featureNotices.pending).filter(Boolean).length;
    const card = element("article", { className: "module-health-card", attrs: { id: "moduleHealthCard", "aria-labelledby": "moduleHealthTitle" } });
    const heading = element("div", { className: "module-health-heading" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: "App reliability" }), element("h3", { text: "Module health", attrs: { id: "moduleHealthTitle" } }));
    heading.append(copy, element("span", { className: "date-pill", text: navigator.onLine ? "ONLINE" : "OFFLINE" }));

    const states = Object.values(registry.modules);
    const ready = states.filter((state) => state.status === "ready").length;
    const failed = states.filter((state) => state.status === "failed").length;
    const summary = element("div", { className: "module-health-summary" });
    const summaryCopy = element("div");
    summaryCopy.append(
      element("strong", { text: failed ? `${failed} module${failed === 1 ? "" : "s"} need attention` : "All modules loaded" }),
      element("p", { text: `${ready} of ${states.length} ready · ${registry.durationMs || 0} ms startup · ${storage.sizeLabel} local data · ${commandState.backupCount} snapshot${commandState.backupCount === 1 ? "" : "s"} · ${pendingNotices} feature notice${pendingNotices === 1 ? "" : "s"} pending` })
    );
    summary.append(summaryCopy);

    const list = element("div", { className: "module-health-list" });
    Object.entries(registry.modules).forEach(([, state]) => {
      const row = element("div", { className: "module-health-row" });
      row.append(
        element("strong", { text: state.label }),
        element("span", { className: `module-health-status ${state.status}`, text: state.status }),
        element("span", { className: "module-health-time", text: `${state.durationMs || 0} ms · ${state.attempts} attempt${state.attempts === 1 ? "" : "s"}` })
      );
      if (state.error) row.append(element("p", { className: "module-health-error", text: state.error }));
      list.append(row);
    });

    const liveStatus = element("p", { attrs: { role: "status", "aria-live": "polite" } });
    const actions = element("div", { className: "module-health-actions" });
    const copyButton = element("button", { className: "module-health-button", text: "Copy diagnostics", attrs: { type: "button" } });
    const reloadButton = element("button", { className: "module-health-button", text: failed ? "Reload modules" : "Reload app", attrs: { type: "button" } });
    copyButton.addEventListener("click", () => copyDiagnostics(copyButton, liveStatus));
    reloadButton.addEventListener("click", () => globalThis.location.reload());
    actions.append(copyButton, reloadButton);

    card.append(heading, summary, list, liveStatus, actions);
    host.append(card);
    return true;
  }

  ensureStyles();
  if (!render()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (render() || attempts > 30) clearInterval(timer);
    }, 100);
  }
  globalThis.addEventListener("online", render);
  globalThis.addEventListener("offline", render);
  globalThis.addEventListener("mll:module-status", () => requestAnimationFrame(render));
  globalThis.addEventListener("mll:modules-complete", () => requestAnimationFrame(render));
  globalThis.addEventListener("mll:storage-error", () => requestAnimationFrame(render));
  globalThis.addEventListener("mll:feature-notice", () => requestAnimationFrame(render));
  globalThis.addEventListener("mll:feature-notice-error", () => requestAnimationFrame(render));
})();
