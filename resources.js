"use strict";

(() => {
  const DASHBOARD_KEY = "myLittleLife.app.v2";
  const RESOURCE_KEY = "myLittleLife.resources.v1";
  const MAX_BACKUP_SIZE = 5 * 1024 * 1024;

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const starterResources = [
    {
      id: "starter-pubmed",
      title: "PubMed",
      category: "Study",
      url: "https://pubmed.ncbi.nlm.nih.gov/",
      note: "Search biomedical, pharmacy, and life-sciences literature.",
      pinned: true
    },
    {
      id: "starter-scholar",
      title: "Google Scholar",
      category: "Study",
      url: "https://scholar.google.com/",
      note: "Find academic papers, books, citations, and theses.",
      pinned: true
    },
    {
      id: "starter-zotero",
      title: "Zotero",
      category: "Study",
      url: "https://www.zotero.org/",
      note: "Collect, organize, annotate, and cite research sources.",
      pinned: false
    },
    {
      id: "starter-who",
      title: "WHO health topics",
      category: "Wellbeing",
      url: "https://www.who.int/health-topics",
      note: "Official public-health guidance and topic resources.",
      pinned: false
    },
    {
      id: "starter-budget",
      title: "Weekly money check",
      category: "Money",
      url: "#finance",
      note: "Review this week's spending and budget.",
      pinned: true
    },
    {
      id: "starter-work",
      title: "Work and business planner",
      category: "Career",
      url: "#workHub",
      note: "Keep goals, projects, and work logs together.",
      pinned: false
    },
    {
      id: "starter-support",
      title: "Trusted support contacts",
      category: "Personal",
      url: "",
      note: "Add phone numbers, emails, or campus support contacts you may need quickly.",
      pinned: true
    }
  ];

  function safeJsonParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  }

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) node.setAttribute(name, String(value));
      });
    }
    return node;
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  function normalizeResourceUrl(value) {
    const input = String(value || "").trim();
    if (!input) return "";
    if (input.startsWith("#")) return input;

    try {
      const parsed = new URL(input, globalThis.location.href);
      if (!["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) return "";
      return parsed.href;
    } catch {
      return "";
    }
  }

  function normalizeResource(resource) {
    if (!resource || typeof resource !== "object") return null;
    const title = String(resource.title || "").trim();
    const categories = ["Study", "Wellbeing", "Money", "Career", "Personal"];
    const category = categories.includes(resource.category) ? resource.category : "Personal";
    if (!title) return null;

    return {
      id: String(resource.id || createId()),
      title: title.slice(0, 120),
      category,
      url: normalizeResourceUrl(resource.url),
      note: String(resource.note || "").trim().slice(0, 500),
      pinned: Boolean(resource.pinned)
    };
  }

  function loadResources() {
    const stored = safeJsonParse(localStorage.getItem(RESOURCE_KEY), null);
    if (!Array.isArray(stored)) return starterResources.map((item) => ({ ...item }));
    return stored.map(normalizeResource).filter(Boolean);
  }

  let resources = loadResources();

  function saveResources() {
    try {
      localStorage.setItem(RESOURCE_KEY, JSON.stringify(resources));
      return true;
    } catch (error) {
      console.error("Unable to save resources.", error);
      showToast("Resources could not be saved in this browser.");
      return false;
    }
  }

  function removeButton(label, onClick) {
    const button = element("button", {
      className: "item-remove",
      text: "×",
      attrs: { type: "button", "aria-label": label, title: label }
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  let activeResourceFilter = "All";

  function renderResources() {
    const container = qs("#resourceList");
    if (!container) return;
    container.replaceChildren();

    const query = (qs("#resourceSearch")?.value || "").trim().toLowerCase();
    const items = resources
      .filter((resource) => activeResourceFilter === "All" || resource.category === activeResourceFilter)
      .filter((resource) => {
        if (!query) return true;
        return [resource.title, resource.category, resource.note, resource.url]
          .some((value) => String(value || "").toLowerCase().includes(query));
      })
      .sort((first, second) => Number(Boolean(second.pinned)) - Number(Boolean(first.pinned)) || first.title.localeCompare(second.title));

    if (!items.length) {
      const empty = element("div", { className: "resource-empty" });
      empty.append(element("span", { text: "⌘" }));
      empty.append(element("h3", { text: "No resources match this view." }));
      empty.append(element("p", { text: "Try another category or save a new link, contact, or note." }));
      container.append(empty);
      return;
    }

    items.forEach((resource) => {
      const article = element("article", { className: "resource-card" });
      const header = element("header");
      const category = element("span", {
        className: `resource-category category-${resource.category.toLowerCase()}`,
        text: resource.category
      });
      const actions = element("div", { className: "resource-actions" });

      const pin = element("button", {
        className: `resource-pin-button${resource.pinned ? " selected" : ""}`,
        text: resource.pinned ? "★" : "☆",
        attrs: {
          type: "button",
          "aria-label": resource.pinned ? `Unpin ${resource.title}` : `Pin ${resource.title}`,
          "aria-pressed": String(Boolean(resource.pinned)),
          title: resource.pinned ? "Unpin resource" : "Pin resource"
        }
      });
      pin.addEventListener("click", () => {
        resource.pinned = !resource.pinned;
        saveResources();
        renderResources();
      });

      actions.append(pin);
      actions.append(removeButton(`Remove ${resource.title}`, () => {
        if (!globalThis.confirm(`Remove ${resource.title}?`)) return;
        resources = resources.filter((item) => item.id !== resource.id);
        saveResources();
        renderResources();
        showToast("Resource removed.");
      }));

      header.append(category, actions);
      article.append(header);
      article.append(element("h3", { text: resource.title }));
      if (resource.note) article.append(element("p", { text: resource.note }));

      const safeUrl = normalizeResourceUrl(resource.url);
      if (safeUrl) {
        const internal = safeUrl.startsWith("#") ||
          safeUrl.startsWith(`${globalThis.location.origin}${globalThis.location.pathname}#`);
        const link = element("a", {
          className: "resource-link",
          text: internal ? "Open section →" : "Open resource ↗",
          attrs: { href: safeUrl }
        });

        if (!internal && safeUrl.startsWith("http")) {
          link.setAttribute("target", "_blank");
          link.setAttribute("rel", "noopener noreferrer");
        }
        article.append(link);
      } else {
        article.append(element("span", {
          className: "resource-note-only",
          text: "Saved note or contact"
        }));
      }

      container.append(article);
    });
  }

  qsa("[data-resource-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeResourceFilter = button.dataset.resourceFilter || "All";
      qsa("[data-resource-filter]").forEach((item) => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderResources();
    });
  });
  qs("#resourceSearch")?.addEventListener("input", renderResources);

  const resourceModal = qs("#resourceModal");
  const resourceModalCard = qs(".modal-card", resourceModal);
  let resourceModalOpener = null;

  function openResourceModal(event) {
    resourceModalOpener = event?.currentTarget || document.activeElement;
    resourceModal?.classList.add("open");
    resourceModal?.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    qs("#resourceTitle")?.focus();
  }

  function closeResourceModal() {
    resourceModal?.classList.remove("open");
    resourceModal?.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    resourceModalOpener?.focus?.();
  }

  qs("#addResource")?.addEventListener("click", openResourceModal);
  qsa(".js-close-resource-modal").forEach((button) => {
    button.addEventListener("click", closeResourceModal);
  });

  document.addEventListener("keydown", (event) => {
    if (!resourceModal?.classList.contains("open")) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeResourceModal();
      return;
    }

    if (event.key !== "Tab" || !resourceModalCard) return;
    const focusable = qsa(
      'button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])',
      resourceModalCard
    ).filter((item) => !item.disabled && item.offsetParent !== null);

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
  });

  qs("#resourceForm")?.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = qs("#resourceTitle")?.value.trim() || "";
    const category = qs("#resourceCategory")?.value || "Personal";
    const rawUrl = qs("#resourceUrl")?.value.trim() || "";
    const note = qs("#resourceNote")?.value.trim() || "";
    const pinned = Boolean(qs("#resourcePinned")?.checked);

    if (!title) return;
    const url = normalizeResourceUrl(rawUrl);
    if (rawUrl && !url) {
      showToast("Use a safe https://, mailto:, tel:, or #section link.");
      qs("#resourceUrl")?.focus();
      return;
    }

    resources.push({
      id: createId(),
      title: title.slice(0, 120),
      category,
      url,
      note: note.slice(0, 500),
      pinned
    });
    saveResources();
    renderResources();
    event.currentTarget.reset();
    closeResourceModal();
    showToast("Resource saved locally.");
  });

  function filterJournalEntries() {
    const container = qs("#journalEntries");
    if (!container) return;

    const query = (qs("#journalSearch")?.value || "").trim().toLowerCase();
    qsa(".journal-search-empty", container).forEach((node) => node.remove());

    const entries = qsa(".journal-entry", container);
    let visibleCount = 0;

    entries.forEach((entry) => {
      const matches = !query || entry.textContent.toLowerCase().includes(query);
      entry.hidden = !matches;
      if (matches) visibleCount += 1;
    });

    if (query && entries.length && visibleCount === 0) {
      const empty = element("div", { className: "journal-empty journal-search-empty" });
      empty.append(element("span", { text: "✦" }));
      empty.append(element("h3", { text: "No journal entries match your search." }));
      empty.append(element("p", { text: "Try another word or clear the search." }));
      container.append(empty);
    }
  }

  qs("#journalSearch")?.addEventListener("input", filterJournalEntries);
  const journalContainer = qs("#journalEntries");
  if (journalContainer) {
    new MutationObserver(filterJournalEntries).observe(journalContainer, { childList: true });
  }

  function downloadBackup() {
    const dashboard = safeJsonParse(localStorage.getItem(DASHBOARD_KEY), null);
    const backup = {
      format: "my-little-life-backup",
      version: 3,
      exportedAt: new Date().toISOString(),
      dashboard,
      resources
    };

    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = element("a", {
      attrs: {
        href: url,
        download: `my-little-life-backup-${date}.json`
      }
    });

    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Backup downloaded.");
  }

  qs("#exportData")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    downloadBackup();
  }, true);

  qs("#importData")?.addEventListener("click", () => qs("#importFile")?.click());
  qs("#importFile")?.addEventListener("change", async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (file.size > MAX_BACKUP_SIZE) {
      showToast("That backup is too large.");
      event.currentTarget.value = "";
      return;
    }

    try {
      const parsed = safeJsonParse(await file.text(), null);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid backup");
      }

      const dashboard = parsed.format === "my-little-life-backup"
        ? parsed.dashboard
        : parsed;
      const importedResources = parsed.format === "my-little-life-backup"
        ? parsed.resources
        : null;

      if (!dashboard || typeof dashboard !== "object" || Array.isArray(dashboard)) {
        throw new Error("Missing dashboard data");
      }

      if (!globalThis.confirm("Replace the current dashboard data with this backup?")) {
        event.currentTarget.value = "";
        return;
      }

      localStorage.setItem(DASHBOARD_KEY, JSON.stringify(dashboard));
      if (Array.isArray(importedResources)) {
        resources = importedResources.map(normalizeResource).filter(Boolean);
        localStorage.setItem(RESOURCE_KEY, JSON.stringify(resources));
      }

      showToast("Backup imported. Reloading...");
      setTimeout(() => globalThis.location.reload(), 500);
    } catch (error) {
      console.error("Unable to import backup.", error);
      showToast("This file is not a valid dashboard backup.");
    } finally {
      event.currentTarget.value = "";
    }
  });

  renderResources();
  filterJournalEntries();
})();
