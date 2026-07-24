"use strict";

(() => {
  const startedAt = performance.now();
  const modulePlan = [
    { path: "./dashboard.js", label: "Dashboard", critical: true },
    { path: "./state-write-guard.js", label: "State protection" },
    { path: "./resource-bootstrap.js", label: "Resources" },
    { path: "./form-actions.js", label: "Forms" },
    { path: "./editing-actions.js", label: "Editing controls" },
    { path: "./settings.js", label: "Settings" },
    { path: "./rhythm.js", label: "Body and rhythm" },
    { path: "./finance.js", label: "Finance centre" },
    { path: "./journal.js", label: "Journal centre" },
    { path: "./planner.js", label: "Planner and agenda" },
    { path: "./growth-centers.js", label: "Expanded centres" },
    { path: "./command-center.js", label: "Command centre" },
    { path: "./expansion-fixes.js", label: "Integration fixes" },
    { path: "./module-health.js", label: "App health" }
  ];

  const registry = {
    startedAt,
    finishedAt: null,
    modules: {},
    failed: [],
    ready: false,
    version: 1
  };

  modulePlan.forEach((module) => {
    registry.modules[module.path] = {
      label: module.label,
      status: "pending",
      attempts: 0,
      durationMs: 0,
      error: ""
    };
  });

  globalThis.MyLittleLifeModules = registry;

  function dispatch(name, detail = {}) {
    globalThis.dispatchEvent(new CustomEvent(name, { detail }));
  }

  function updateModule(module, patch) {
    Object.assign(registry.modules[module.path], patch);
    dispatch("mll:module-status", {
      path: module.path,
      ...registry.modules[module.path]
    });
  }

  function errorMessage(error) {
    return String(error?.message || error || "Unknown module error").slice(0, 240);
  }

  function isRetryableImportError(error) {
    const message = errorMessage(error).toLowerCase();
    return /failed to fetch|network|module script|loading chunk|importing a module/.test(message);
  }

  function retryUrl(path) {
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}retry=${Date.now()}`;
  }

  async function loadModule(module) {
    const state = registry.modules[module.path];
    const moduleStartedAt = performance.now();
    state.attempts += 1;
    updateModule(module, { status: "loading", error: "" });

    try {
      await import(module.path);
      updateModule(module, {
        status: "ready",
        durationMs: Math.round(performance.now() - moduleStartedAt)
      });
      return true;
    } catch (firstError) {
      if (navigator.onLine && isRetryableImportError(firstError)) {
        state.attempts += 1;
        updateModule(module, { status: "retrying", error: errorMessage(firstError) });
        await new Promise((resolve) => setTimeout(resolve, 180));
        try {
          await import(retryUrl(module.path));
          updateModule(module, {
            status: "ready",
            durationMs: Math.round(performance.now() - moduleStartedAt),
            error: ""
          });
          return true;
        } catch (retryError) {
          updateModule(module, {
            status: "failed",
            durationMs: Math.round(performance.now() - moduleStartedAt),
            error: errorMessage(retryError)
          });
          return false;
        }
      }

      updateModule(module, {
        status: "failed",
        durationMs: Math.round(performance.now() - moduleStartedAt),
        error: errorMessage(firstError)
      });
      return false;
    }
  }

  function preloadModules() {
    modulePlan.slice(0, 6).forEach((module) => {
      const link = document.createElement("link");
      link.rel = "modulepreload";
      link.href = module.path;
      document.head.append(link);
    });
  }

  function showCriticalFailure(module) {
    document.body.replaceChildren();
    const panel = document.createElement("main");
    panel.setAttribute("role", "alert");
    panel.style.cssText = "min-height:100vh;display:grid;place-items:center;padding:24px;background:#fbf7f8;color:#4d3f47;font-family:system-ui,sans-serif";
    const card = document.createElement("section");
    card.style.cssText = "max-width:560px;padding:28px;border:1px solid #eadde3;border-radius:22px;background:white;box-shadow:0 18px 50px rgba(90,65,78,.08)";
    const heading = document.createElement("h1");
    heading.textContent = "The dashboard could not open.";
    const copy = document.createElement("p");
    copy.textContent = "Your saved browser data was not removed. Check your connection, then reload the page.";
    const details = document.createElement("p");
    const failureState = registry.modules[module.path] || { error: "Unable to finish startup" };
    details.textContent = `${module.label}: ${failureState.error || "Unable to load"}`;
    details.style.cssText = "font-size:13px;color:#806e78";
    const reload = document.createElement("button");
    reload.type = "button";
    reload.textContent = "Reload dashboard";
    reload.style.cssText = "margin-top:12px;padding:11px 16px;border:0;border-radius:999px;background:#4d3f47;color:white;font:inherit;cursor:pointer";
    reload.addEventListener("click", () => globalThis.location.reload());
    card.append(heading, copy, details, reload);
    panel.append(card);
    document.body.append(panel);
  }

  function showOptionalFailureNotice() {
    if (!registry.failed.length) return;
    const toast = document.querySelector("#appToast");
    const message = registry.failed.length === 1
      ? "One optional dashboard tool could not load. The rest of the app is available."
      : `${registry.failed.length} optional dashboard tools could not load. The rest of the app is available.`;

    if (toast) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 4200);
      return;
    }

    const notice = document.createElement("div");
    notice.setAttribute("role", "status");
    notice.textContent = message;
    notice.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:10000;max-width:360px;padding:12px 15px;border-radius:14px;background:#4d3f47;color:white;font:14px system-ui,sans-serif;box-shadow:0 12px 36px rgba(0,0,0,.18)";
    document.body.append(notice);
    setTimeout(() => notice.remove(), 5000);
  }

  async function run() {
    preloadModules();

    for (const module of modulePlan) {
      const loaded = await loadModule(module);
      if (!loaded) {
        registry.failed.push(module.path);
        if (module.critical) {
          registry.finishedAt = performance.now();
          dispatch("mll:modules-complete", { registry });
          showCriticalFailure(module);
          return;
        }
      }

      if (module.path === "./settings.js" || module.path === "./planner.js") {
        await new Promise((resolve) => requestAnimationFrame(() => resolve()));
      }
    }

    registry.finishedAt = performance.now();
    registry.ready = true;
    registry.durationMs = Math.round(registry.finishedAt - registry.startedAt);
    dispatch("mll:modules-complete", { registry });
    showOptionalFailureNotice();
  }

  run().catch((error) => {
    console.error("Unable to finish dashboard startup.", error);
    registry.finishedAt = performance.now();
    registry.failed.push("startup");
    dispatch("mll:modules-complete", { registry });
    showCriticalFailure({ path: "startup", label: "Dashboard startup" });
  });
})();
