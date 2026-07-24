"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const NOTICE_KEY = "myLittleLife.journalNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const JOURNAL_PROMPTS = [
    "One small moment from today I want to remember is...",
    "What felt easier than expected today?",
    "What do I need more of this week?",
    "What am I proud of handling lately?",
    "What is one kind thing I can do for myself tomorrow?",
    "What did I learn about myself today?",
    "Which part of today felt most like me?",
    "What can I release before tomorrow begins?"
  ];

  const DEFAULT_MOODS = ["Calm", "Grateful", "Hopeful", "Reflective", "Tired", "Mixed"];

  function element(tag, options = {}) {
    const node = document.createElement(tag);
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = String(options.text);
    Object.entries(options.attrs || {}).forEach(([name, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(name, String(value));
    });
    return node;
  }

  function safeParse(value, fallback) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeTags(value) {
    const source = Array.isArray(value) ? value : String(value || "").split(",");
    const seen = new Set();
    return source
      .map((tag) => String(tag || "").trim().replace(/^#/, "").slice(0, 30))
      .filter((tag) => {
        const key = tag.toLowerCase();
        if (!tag || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }

  function normalizeEntry(entry) {
    const source = entry && typeof entry === "object" ? entry : {};
    return {
      ...source,
      id: String(source.id || createId()),
      title: String(source.title || "Untitled entry").slice(0, 120),
      body: String(source.body || "").slice(0, 10000),
      createdAt: source.createdAt || source.date || new Date().toISOString(),
      updatedAt: source.updatedAt || "",
      mood: String(source.mood || "").slice(0, 40),
      tags: normalizeTags(source.tags),
      favorite: Boolean(source.favorite),
      prompt: String(source.prompt || "").slice(0, 300)
    };
  }

  function loadState() {
    const state = safeParse(localStorage.getItem(STORAGE_KEY), {});
    state.version = Number(state.version) || 2;
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.journal = Array.isArray(state.journal) ? state.journal.map(normalizeEntry) : [];
    return state;
  }

  function captureUnsavedFields(state) {
    const existing = state.daily[dateKey] && typeof state.daily[dateKey] === "object" ? state.daily[dateKey] : {};
    state.daily[dateKey] = {
      mood: "",
      habits: [false, false, false, false],
      wellbeing: {},
      meals: {},
      feeling: "",
      gratitude: "",
      memory: "",
      quickNote: "",
      ...existing
    };
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) state.daily[dateKey].quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) state.daily[dateKey].gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function saveState(state) {
    captureUnsavedFields(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function ensureStylesheet() {
    if (qs('link[href="journal-center.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "journal-center.css" } }));
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function formatDate(value, includeTime = true) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Saved entry";
    return parsed.toLocaleString("en-KE", includeTime
      ? { dateStyle: "medium", timeStyle: "short" }
      : { dateStyle: "medium" });
  }

  function wordCount(value) {
    const words = String(value || "").trim().match(/\S+/g);
    return words ? words.length : 0;
  }

  function downloadText(filename, text, type = "text/plain") {
    const blob = new Blob([text], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = element("a", { attrs: { href: url, download: filename } });
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function safeFilename(value) {
    return String(value || "journal-entry")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "journal-entry";
  }

  ensureStylesheet();

  const historySection = qs("#journalHistory");
  const entriesContainer = qs("#journalEntries");
  const entryForm = qs("#entryForm");
  const entryModal = qs("#entryModal");
  if (!historySection || !entriesContainer || !entryForm || !entryModal) return;

  let activePrompt = "";
  let selectedPromptIndex = Math.floor(Math.random() * JOURNAL_PROMPTS.length);
  const filters = { query: "", tag: "", mood: "", sort: "newest", favoritesOnly: false };

  function closeEntryModal() {
    entryModal.classList.remove("open");
    entryModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function enhanceEntryForm() {
    if (!qs("#entryMood", entryForm)) {
      const saveButton = qs('button[type="submit"]', entryForm);
      const moodLabel = element("label", { className: "form-label", text: "Mood", attrs: { for: "entryMood" } });
      const moodSelect = element("select", { className: "journal-modal-select", attrs: { id: "entryMood", name: "entryMood" } });
      moodSelect.append(element("option", { text: "No mood selected", attrs: { value: "" } }));
      DEFAULT_MOODS.forEach((mood) => moodSelect.append(element("option", { text: mood, attrs: { value: mood } })));
      const tagLabel = element("label", { className: "form-label", text: "Tags", attrs: { for: "entryTags" } });
      const tagInput = element("input", {
        className: "journal-modal-input",
        attrs: { id: "entryTags", name: "entryTags", type: "text", maxlength: "200", placeholder: "school, gratitude, plans" }
      });
      const tagHelp = element("small", { className: "journal-field-help", text: "Up to six comma-separated tags." });
      saveButton?.before(moodLabel, moodSelect, tagLabel, tagInput, tagHelp);
    }

    entryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!entryForm.reportValidity()) return;
      const title = qs("#entryTitle")?.value.trim() || "";
      const body = qs("#entryBody")?.value.trim() || "";
      if (!title || !body) return;
      const state = loadState();
      state.journal.unshift(normalizeEntry({
        id: createId(),
        title,
        body,
        mood: qs("#entryMood")?.value || "",
        tags: normalizeTags(qs("#entryTags")?.value || ""),
        favorite: false,
        prompt: activePrompt,
        createdAt: new Date().toISOString()
      }));
      saveState(state);
      entryForm.reset();
      activePrompt = "";
      closeEntryModal();
      renderJournalCenter();
      showToast("Journal entry saved locally.");
    }, { capture: true });
  }

  const editDialog = element("div", {
    className: "journal-edit-dialog",
    attrs: { role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "journalEditTitle" }
  });
  const editBackdrop = element("button", { className: "journal-edit-backdrop", attrs: { type: "button", "aria-label": "Close journal editor" } });
  const editForm = element("form", { className: "journal-edit-card", attrs: { novalidate: "" } });
  const editClose = element("button", { className: "journal-edit-close", text: "×", attrs: { type: "button", "aria-label": "Close journal editor" } });
  const editHeading = element("h2", { text: "Edit journal entry", attrs: { id: "journalEditTitle" } });
  const editDescription = element("p", { className: "journal-edit-description", text: "Update the entry while keeping its original saved date." });
  const editFields = element("div", { className: "journal-edit-fields" });
  const editError = element("p", { className: "journal-edit-error", attrs: { role: "alert", "aria-live": "polite" } });
  const editFooter = element("div", { className: "journal-edit-footer" });
  const editCancel = element("button", { className: "journal-edit-cancel", text: "Cancel", attrs: { type: "button" } });
  const editSave = element("button", { className: "save-button", text: "Save changes →", attrs: { type: "submit" } });
  editFooter.append(editCancel, editSave);
  editForm.append(editClose, element("p", { className: "eyebrow", text: "Private writing" }), editHeading, editDescription, editFields, editError, editFooter);
  editDialog.append(editBackdrop, editForm);
  document.body.append(editDialog);

  let editingId = "";
  let editOpener = null;

  function journalField(labelText, control, help = "") {
    const label = element("label", { className: "journal-edit-field" });
    label.append(element("span", { text: labelText }), control);
    if (help) label.append(element("small", { text: help }));
    return label;
  }

  function closeEditor() {
    editDialog.classList.remove("open");
    editDialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    editingId = "";
    editError.textContent = "";
    editOpener?.focus?.();
  }

  function openEditor(entry, opener) {
    editingId = entry.id;
    editOpener = opener || document.activeElement;
    editFields.replaceChildren();
    const title = element("input", { attrs: { name: "title", type: "text", value: entry.title, maxlength: "120", required: "" } });
    const body = element("textarea", { attrs: { name: "body", rows: "10", maxlength: "10000", required: "" } });
    body.value = entry.body;
    const mood = element("select", { attrs: { name: "mood" } });
    const moods = ["", ...new Set([...DEFAULT_MOODS, entry.mood].filter(Boolean))];
    moods.forEach((value) => {
      const option = element("option", { text: value || "No mood selected", attrs: { value } });
      option.selected = value === entry.mood;
      mood.append(option);
    });
    const tags = element("input", { attrs: { name: "tags", type: "text", value: entry.tags.join(", "), maxlength: "200" } });
    editFields.append(
      journalField("Title", title),
      journalField("Entry", body),
      journalField("Mood", mood),
      journalField("Tags", tags, "Up to six comma-separated tags.")
    );
    editDialog.classList.add("open");
    editDialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => title.focus());
  }

  editBackdrop.addEventListener("click", closeEditor);
  editClose.addEventListener("click", closeEditor);
  editCancel.addEventListener("click", closeEditor);
  editForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!editingId || !editForm.reportValidity()) return;
    const values = new FormData(editForm);
    const state = loadState();
    const entry = state.journal.find((item) => item.id === editingId);
    if (!entry) {
      editError.textContent = "This journal entry could not be found.";
      return;
    }
    entry.title = String(values.get("title") || "").trim().slice(0, 120);
    entry.body = String(values.get("body") || "").trim().slice(0, 10000);
    entry.mood = String(values.get("mood") || "").slice(0, 40);
    entry.tags = normalizeTags(values.get("tags") || "");
    entry.updatedAt = new Date().toISOString();
    saveState(state);
    closeEditor();
    renderJournalCenter();
    showToast("Journal entry updated.");
  });

  document.addEventListener("keydown", (event) => {
    if (!editDialog.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = qsa('button, input, textarea, select, [tabindex]:not([tabindex="-1"])', editForm)
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
  });

  function openPrompt(prompt) {
    activePrompt = prompt;
    const title = qs("#entryTitle");
    const body = qs("#entryBody");
    if (title && !title.value.trim()) title.value = "A moment to reflect";
    if (body) body.value = prompt;
    const opener = qs(".js-open-modal");
    opener?.click();
    requestAnimationFrame(() => {
      body?.focus();
      if (body) body.selectionStart = body.selectionEnd = body.value.length;
    });
  }

  function twoStepDelete(button, onDelete) {
    if (button.dataset.confirming === "true") {
      onDelete();
      return;
    }
    button.dataset.confirming = "true";
    button.textContent = "Delete?";
    button.classList.add("confirming");
    setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.confirming = "false";
      button.textContent = "×";
      button.classList.remove("confirming");
    }, 3500);
  }

  function iconButton(text, label, onClick, className = "") {
    const button = element("button", {
      className: `journal-entry-action ${className}`.trim(),
      text,
      attrs: { type: "button", "aria-label": label, title: label }
    });
    button.addEventListener("click", () => onClick(button));
    return button;
  }

  function filteredEntries(state) {
    const query = filters.query.toLowerCase();
    const result = state.journal.filter((entry) => {
      const matchesQuery = !query || [entry.title, entry.body, entry.mood, entry.tags.join(" ")].join(" ").toLowerCase().includes(query);
      const matchesTag = !filters.tag || entry.tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase());
      const matchesMood = !filters.mood || entry.mood === filters.mood;
      const matchesFavorite = !filters.favoritesOnly || entry.favorite;
      return matchesQuery && matchesTag && matchesMood && matchesFavorite;
    });
    result.sort((a, b) => {
      if (filters.sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      if (filters.sort === "updated") return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    return result;
  }

  function renderStats(state, container) {
    const totalWords = state.journal.reduce((sum, entry) => sum + wordCount(entry.body), 0);
    const monthKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    const thisMonth = state.journal.filter((entry) => String(entry.createdAt || "").startsWith(monthKey)).length;
    const favorites = state.journal.filter((entry) => entry.favorite).length;
    const stats = [
      [state.journal.length, "Entries"],
      [totalWords.toLocaleString("en-KE"), "Words"],
      [favorites, "Favourites"],
      [thisMonth, "This month"]
    ];
    container.replaceChildren();
    stats.forEach(([value, label]) => {
      const card = element("article", { className: "journal-stat" });
      card.append(element("strong", { text: value }), element("span", { text: label }));
      container.append(card);
    });
  }

  function exportEntry(entry) {
    const lines = [
      entry.title,
      "=".repeat(Math.min(80, entry.title.length || 1)),
      `Saved: ${formatDate(entry.createdAt)}`,
      entry.updatedAt ? `Updated: ${formatDate(entry.updatedAt)}` : "",
      entry.mood ? `Mood: ${entry.mood}` : "",
      entry.tags.length ? `Tags: ${entry.tags.map((tag) => `#${tag}`).join(" ")}` : "",
      entry.prompt ? `Prompt: ${entry.prompt}` : "",
      "",
      entry.body,
      ""
    ].filter((line, index) => line !== "" || index >= 6);
    downloadText(`${safeFilename(entry.title)}.txt`, lines.join("\n"));
  }

  function exportJournal(state) {
    const entries = [...state.journal].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const markdown = [
      "# My journal",
      "",
      `Exported ${formatDate(new Date().toISOString())}`,
      "",
      ...entries.flatMap((entry) => [
        `## ${entry.title}`,
        "",
        `*${formatDate(entry.createdAt)}${entry.mood ? ` · ${entry.mood}` : ""}*`,
        entry.tags.length ? `\n${entry.tags.map((tag) => `#${tag}`).join(" ")}\n` : "",
        entry.body,
        "",
        "---",
        ""
      ])
    ].join("\n");
    downloadText(`my-journal-${dateKey}.md`, markdown, "text/markdown");
    showToast("Journal export downloaded.");
  }

  function exportBackup() {
    const state = loadState();
    downloadText(`my-little-life-backup-${dateKey}.json`, JSON.stringify(state, null, 2), "application/json");
    showToast("Backup downloaded.");
  }

  function renderEntry(entry) {
    const article = element("article", { className: `journal-entry journal-center-entry${entry.favorite ? " is-favourite" : ""}` });
    const header = element("header", { className: "journal-center-entry-head" });
    const copy = element("div");
    const date = entry.updatedAt
      ? `${formatDate(entry.createdAt, false)} · edited ${formatDate(entry.updatedAt, false)}`
      : formatDate(entry.createdAt, false);
    copy.append(element("p", { className: "eyebrow", text: date }), element("h3", { text: entry.title }));
    const controls = element("div", { className: "journal-entry-controls" });
    controls.append(
      iconButton(entry.favorite ? "♥" : "♡", entry.favorite ? "Remove from favourites" : "Add to favourites", () => {
        const state = loadState();
        const target = state.journal.find((item) => item.id === entry.id);
        if (!target) return;
        target.favorite = !target.favorite;
        saveState(state);
        renderJournalCenter();
      }, entry.favorite ? "is-active" : ""),
      iconButton("✎", `Edit ${entry.title}`, (button) => openEditor(entry, button)),
      iconButton("↓", `Export ${entry.title}`, () => exportEntry(entry)),
      iconButton("×", `Delete ${entry.title}`, (button) => twoStepDelete(button, () => {
        const state = loadState();
        state.journal = state.journal.filter((item) => item.id !== entry.id);
        saveState(state);
        renderJournalCenter();
        showToast("Journal entry deleted.");
      }), "journal-delete")
    );
    header.append(copy, controls);
    article.append(header);

    const metadata = element("div", { className: "journal-entry-meta" });
    if (entry.mood) metadata.append(element("span", { className: "journal-mood-chip", text: entry.mood }));
    entry.tags.forEach((tag) => metadata.append(element("button", {
      className: "journal-tag-chip",
      text: `#${tag}`,
      attrs: { type: "button", "aria-label": `Filter by ${tag}` }
    })));
    metadata.append(element("span", { className: "journal-word-count", text: `${wordCount(entry.body)} words` }));
    qsa(".journal-tag-chip", metadata).forEach((button, index) => button.addEventListener("click", () => {
      filters.tag = entry.tags[index];
      renderJournalCenter();
    }));
    article.append(metadata);

    const body = element("p", { className: "journal-entry-body journal-center-body", text: entry.body });
    article.append(body);
    if (entry.body.length > 520 || wordCount(entry.body) > 90) {
      body.classList.add("is-collapsed");
      const toggle = element("button", { className: "journal-read-toggle", text: "Read more", attrs: { type: "button" } });
      toggle.addEventListener("click", () => {
        const collapsed = body.classList.toggle("is-collapsed");
        toggle.textContent = collapsed ? "Read more" : "Show less";
      });
      article.append(toggle);
    }
    if (entry.prompt) article.append(element("p", { className: "journal-used-prompt", text: `Prompt: ${entry.prompt}` }));
    return article;
  }

  function buildShell() {
    const oldHeading = qs(".journal-history-heading", historySection);
    const oldExport = qs("#exportData");
    const oldClear = qs("#clearToday");
    oldExport?.remove();
    oldClear?.remove();
    oldHeading?.remove();

    const heading = element("div", { className: "section-title journal-center-heading" });
    const headingCopy = element("div");
    headingCopy.append(element("p", { className: "eyebrow", text: "Saved writing" }), element("h2", { text: "Your journal centre", attrs: { id: "journalHistoryTitle" } }));
    const toolbar = element("div", { className: "journal-center-actions" });
    const newEntry = element("button", { className: "small-link", text: "＋ New entry", attrs: { type: "button" } });
    const exportJournalButton = element("button", { className: "small-link", text: "Export journal", attrs: { type: "button" } });
    const exportBackupButton = element("button", { className: "small-link", text: "Export backup", attrs: { type: "button", id: "exportData" } });
    newEntry.addEventListener("click", () => {
      activePrompt = "";
      qs(".js-open-modal")?.click();
    });
    exportJournalButton.addEventListener("click", () => exportJournal(loadState()));
    exportBackupButton.addEventListener("click", exportBackup);
    toolbar.append(newEntry, exportJournalButton, exportBackupButton);
    heading.append(headingCopy, toolbar);

    const stats = element("div", { className: "journal-stats", attrs: { id: "journalStats" } });
    const promptPanel = element("article", { className: "journal-prompt-panel" });
    const promptCopy = element("div");
    promptCopy.append(element("p", { className: "eyebrow", text: "A gentle prompt" }), element("p", { className: "journal-center-prompt", attrs: { id: "journalCenterPrompt" } }));
    const promptActions = element("div", { className: "journal-prompt-actions" });
    const shufflePrompt = element("button", { className: "small-link", text: "Shuffle prompt", attrs: { type: "button" } });
    const usePrompt = element("button", { className: "save-button journal-use-prompt", text: "Write with this →", attrs: { type: "button" } });
    shufflePrompt.addEventListener("click", () => {
      selectedPromptIndex = (selectedPromptIndex + 1 + Math.floor(Math.random() * (JOURNAL_PROMPTS.length - 1))) % JOURNAL_PROMPTS.length;
      qs("#journalCenterPrompt").textContent = JOURNAL_PROMPTS[selectedPromptIndex];
      const existingPrompt = qs(".prompt-question");
      if (existingPrompt) existingPrompt.textContent = JOURNAL_PROMPTS[selectedPromptIndex];
    });
    usePrompt.addEventListener("click", () => openPrompt(JOURNAL_PROMPTS[selectedPromptIndex]));
    promptActions.append(shufflePrompt, usePrompt);
    promptPanel.append(promptCopy, promptActions);

    const filterBar = element("div", { className: "journal-filter-bar" });
    const search = element("input", { attrs: { type: "search", id: "journalSearch", placeholder: "Search titles, writing, moods, or tags", "aria-label": "Search journal entries" } });
    const tag = element("select", { attrs: { id: "journalTagFilter", "aria-label": "Filter journal by tag" } });
    const mood = element("select", { attrs: { id: "journalMoodFilter", "aria-label": "Filter journal by mood" } });
    const sort = element("select", { attrs: { id: "journalSort", "aria-label": "Sort journal entries" } });
    [
      ["newest", "Newest first"],
      ["oldest", "Oldest first"],
      ["updated", "Recently edited"],
      ["title", "Title A–Z"]
    ].forEach(([value, label]) => sort.append(element("option", { text: label, attrs: { value } })));
    const favorites = element("button", { className: "journal-favourite-filter", text: "♡ Favourites", attrs: { type: "button", "aria-pressed": "false" } });
    search.addEventListener("input", () => { filters.query = search.value.trim(); renderEntriesOnly(); });
    tag.addEventListener("change", () => { filters.tag = tag.value; renderEntriesOnly(); });
    mood.addEventListener("change", () => { filters.mood = mood.value; renderEntriesOnly(); });
    sort.addEventListener("change", () => { filters.sort = sort.value; renderEntriesOnly(); });
    favorites.addEventListener("click", () => {
      filters.favoritesOnly = !filters.favoritesOnly;
      favorites.classList.toggle("is-active", filters.favoritesOnly);
      favorites.setAttribute("aria-pressed", String(filters.favoritesOnly));
      favorites.textContent = filters.favoritesOnly ? "♥ Favourites" : "♡ Favourites";
      renderEntriesOnly();
    });
    filterBar.append(search, tag, mood, sort, favorites);

    entriesContainer.before(heading, stats, promptPanel, filterBar);
  }

  function updateFilterOptions(state) {
    const tagSelect = qs("#journalTagFilter");
    const moodSelect = qs("#journalMoodFilter");
    if (tagSelect) {
      const tags = [...new Set(state.journal.flatMap((entry) => entry.tags).map((tag) => tag.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      tagSelect.replaceChildren(element("option", { text: "All tags", attrs: { value: "" } }));
      tags.forEach((tag) => tagSelect.append(element("option", { text: `#${tag}`, attrs: { value: tag } })));
      if (tags.some((tag) => tag.toLowerCase() === filters.tag.toLowerCase())) tagSelect.value = filters.tag;
      else filters.tag = "";
    }
    if (moodSelect) {
      const moods = [...new Set(state.journal.map((entry) => entry.mood).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      moodSelect.replaceChildren(element("option", { text: "All moods", attrs: { value: "" } }));
      moods.forEach((mood) => moodSelect.append(element("option", { text: mood, attrs: { value: mood } })));
      if (moods.includes(filters.mood)) moodSelect.value = filters.mood;
      else filters.mood = "";
    }
    const search = qs("#journalSearch");
    const sort = qs("#journalSort");
    if (search && search.value !== filters.query) search.value = filters.query;
    if (sort) sort.value = filters.sort;
  }

  function renderEntriesOnly() {
    const state = loadState();
    updateFilterOptions(state);
    const results = filteredEntries(state);
    entriesContainer.replaceChildren();
    entriesContainer.setAttribute("aria-live", "polite");
    if (!results.length) {
      const empty = element("div", { className: "journal-empty journal-center-empty" });
      empty.append(
        element("span", { text: "✦" }),
        element("h3", { text: state.journal.length ? "No entries match these filters." : "Your saved entries will appear here." }),
        element("p", { text: state.journal.length ? "Try another search, tag, or mood." : "Write your first full entry whenever you are ready." })
      );
      entriesContainer.append(empty);
      return;
    }
    results.forEach((entry) => entriesContainer.append(renderEntry(entry)));
  }

  function renderJournalCenter() {
    const state = loadState();
    renderStats(state, qs("#journalStats"));
    const prompt = qs("#journalCenterPrompt");
    if (prompt) prompt.textContent = JOURNAL_PROMPTS[selectedPromptIndex];
    const existingPrompt = qs(".prompt-question");
    if (existingPrompt) existingPrompt.textContent = JOURNAL_PROMPTS[selectedPromptIndex];
    renderEntriesOnly();
  }

  enhanceEntryForm();
  buildShell();
  renderJournalCenter();

  const savedNotice = sessionStorage.getItem(NOTICE_KEY);
  if (savedNotice) {
    sessionStorage.removeItem(NOTICE_KEY);
    setTimeout(() => showToast(savedNotice), 120);
  }
})();
