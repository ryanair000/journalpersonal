"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const RESOURCE_KEY = "myLittleLife.resources.v1";
  const TIMER_KEY = "myLittleLife.studyTimer.v1";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function installPatchStyles() {
    if (qs("#expansionPatchStyles")) return;
    const style = document.createElement("style");
    style.id = "expansionPatchStyles";
    style.textContent = ".suite-nav-open .suite-mobile-nav-toggle{position:relative;z-index:1901}";
    document.head.append(style);
  }

  function resourceSnapshotFromDom() {
    return qsa("#resourceList .resource-card").map((card) => ({
      id: createId(),
      title: qs("h3", card)?.textContent.trim() || "Resource",
      category: qs(".resource-category", card)?.textContent.trim() || "Personal",
      url: qs("a.resource-link", card)?.getAttribute("href") || "",
      note: qs("p", card)?.textContent.trim() || "",
      pinned: qs(".resource-pin-button", card)?.getAttribute("aria-pressed") === "true"
    }));
  }

  function initialiseResourceBaseline() {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const list = qs("#resourceList");
      if (!list || !list.children.length) {
        if (attempts > 50) clearInterval(timer);
        return;
      }
      if (localStorage.getItem(RESOURCE_KEY) === null) {
        const resources = resourceSnapshotFromDom();
        if (resources.length) localStorage.setItem(RESOURCE_KEY, JSON.stringify(resources));
      }
      const state = safeParse(localStorage.getItem(STORAGE_KEY), {});
      const hidden = Array.isArray(state?.suite?.hiddenCenters) && state.suite.hiddenCenters.includes("resourceOrganizer");
      const organizer = qs("#resourceOrganizer");
      if (organizer) organizer.hidden = hidden;
      if (organizer || attempts > 50) clearInterval(timer);
    }, 80);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("#studyTimerStart");
    const display = qs("#studyTimerDisplay");
    if (!button || display?.textContent.trim() !== "00:00") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const stored = safeParse(sessionStorage.getItem(TIMER_KEY), {});
    const duration = Number(stored.duration) > 0 ? Number(stored.duration) : 25 * 60;
    sessionStorage.setItem(TIMER_KEY, JSON.stringify({ duration, remaining: duration, running: true, startedAt: Date.now() }));
    globalThis.location.reload();
  }, true);

  document.addEventListener("click", (event) => {
    if (!document.body.classList.contains("suite-nav-open")) return;
    if (event.target.closest(".sidebar") || event.target.closest("#mobileNavToggle")) return;
    qs("#mobileNavToggle")?.click();
  });

  document.addEventListener("keydown", (event) => {
    const palette = qs("#commandPalette.open");
    if (!palette || event.key !== "Tab") return;
    const focusable = qsa('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])', palette)
      .filter((node) => !node.disabled && node.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, true);

  function refreshActiveNavigation() {
    const links = qsa(".sidebar nav a[href^='#']");
    const pairs = links.map((link) => ({ link, section: qs(link.getAttribute("href")) })).filter((pair) => pair.section);
    if (!("IntersectionObserver" in globalThis) || !pairs.length) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      pairs.forEach(({ link, section }) => {
        const active = section === visible.target;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0.05, 0.25, 0.5] });
    pairs.forEach(({ section }) => observer.observe(section));
  }

  function applyHiddenNavigation() {
    const state = safeParse(localStorage.getItem(STORAGE_KEY), {});
    const hidden = Array.isArray(state?.suite?.hiddenCenters) ? state.suite.hiddenCenters : [];
    const mappings = {
      reminderCenter: "#reminderCenter",
      studyCenterPlus: "#studyCenterPlus",
      contentCalendar: "#contentCalendar",
      workCenterPlus: "#workCenterPlus",
      connectionsCenter: "#connectionsCenter",
      systemCenter: "#systemCenter"
    };
    Object.entries(mappings).forEach(([id, href]) => {
      const link = qs(`.sidebar nav a[href="${href}"]`);
      if (link) link.hidden = hidden.includes(id);
    });
  }

  installPatchStyles();
  initialiseResourceBaseline();
  setTimeout(() => {
    applyHiddenNavigation();
    refreshActiveNavigation();
  }, 350);
})();
