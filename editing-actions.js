"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const NOTICE_KEY = "myLittleLife.manageNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  function isoWeekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() + 4 - day);
    const yearStart = new Date(copy.getFullYear(), 0, 1);
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `${copy.getFullYear()}-W${pad(week)}`;
  }

  const weekKey = isoWeekKey(today);
  const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

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

  function loadState() {
    const state = safeParse(localStorage.getItem(STORAGE_KEY), {});
    state.version = Number(state.version) || 2;
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.weekly = state.weekly && typeof state.weekly === "object" ? state.weekly : {};
    state.journal = Array.isArray(state.journal) ? state.journal : [];
    state.lists = state.lists && typeof state.lists === "object" ? state.lists : {};
    [
      "tasks", "ideas", "drafts", "accounts", "planner", "social", "units", "study",
      "research", "classes", "businesses", "workGoals", "workLogs", "people",
      "relationshipItems"
    ].forEach((key) => {
      state.lists[key] = Array.isArray(state.lists[key]) ? state.lists[key] : [];
    });
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : {};
    return state;
  }

  function captureUnsavedFields(state) {
    const existing = state.daily[dateKey] && typeof state.daily[dateKey] === "object"
      ? state.daily[dateKey]
      : {};
    state.daily[dateKey] = existing;
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) existing.quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) existing.gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function storeState(state, message, reload = true) {
    captureUnsavedFields(state);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (message) sessionStorage.setItem(NOTICE_KEY, message);
    if (reload) globalThis.location.reload();
  }

  function showToast(message) {
    const toast = qs("#appToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2500);
  }

  const savedNotice = sessionStorage.getItem(NOTICE_KEY);
  if (savedNotice) {
    sessionStorage.removeItem(NOTICE_KEY);
    setTimeout(() => showToast(savedNotice), 180);
  }

  if (!qs('link[href="editing-actions.css"]')) {
    document.head.append(element("link", {
      attrs: { rel: "stylesheet", href: "editing-actions.css" }
    }));
  }

  const dialog = element("div", {
    className: "manage-dialog",
    attrs: {
      role: "dialog",
      "aria-modal": "true",
      "aria-hidden": "true",
      "aria-labelledby": "manageDialogTitle",
      "aria-describedby": "manageDialogDescription"
    }
  });
  const backdrop = element("button", {
    className: "manage-backdrop",
    attrs: { type: "button", "aria-label": "Close editor" }
  });
  const form = element("form", { className: "manage-card", attrs: { novalidate: "" } });
  const closeButton = element("button", {
    className: "manage-close",
    text: "×",
    attrs: { type: "button", "aria-label": "Close editor" }
  });
  const eyebrow = element("p", { className: "eyebrow", text: "Edit saved item" });
  const title = element("h2", { attrs: { id: "manageDialogTitle" }, text: "Edit item" });
  const description = element("p", {
    className: "manage-description",
    attrs: { id: "manageDialogDescription" }
  });
  const fields = element("div", { className: "manage-fields" });
  const errorMessage = element("p", {
    className: "manage-error",
    attrs: { role: "alert", "aria-live": "polite" }
  });
  const footer = element("div", { className: "manage-footer" });
  const cancelButton = element("button", {
    className: "manage-cancel",
    text: "Cancel",
    attrs: { type: "button" }
  });
  const submitButton = element("button", {
    className: "save-button manage-submit",
    text: "Save changes",
    attrs: { type: "submit" }
  });

  footer.append(cancelButton, submitButton);
  form.append(closeButton, eyebrow, title, description, fields, errorMessage, footer);
  dialog.append(backdrop, form);
  document.body.append(dialog);

  let activeEditor = null;
  let opener = null;

  function fieldControl(field, value) {
    const wrapper = element("label", { className: "manage-field" });
    const fieldId = `manage-${field.name}`;
    wrapper.setAttribute("for", fieldId);
    wrapper.append(element("span", { text: field.label }));
    let control;

    if (field.type === "textarea") {
      control = element("textarea", {
        attrs: {
          id: fieldId,
          name: field.name,
          rows: field.rows || 4,
          maxlength: field.maxlength,
          placeholder: field.placeholder,
          required: field.required ? "" : null
        }
      });
      control.value = value || "";
    } else if (field.type === "select") {
      control = element("select", {
        attrs: { id: fieldId, name: field.name, required: field.required ? "" : null }
      });
      (field.options || []).forEach((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : option.label;
        const optionNode = element("option", {
          text: optionLabel,
          attrs: { value: optionValue }
        });
        if (String(optionValue) === String(value ?? field.value ?? "")) optionNode.selected = true;
        control.append(optionNode);
      });
    } else {
      control = element("input", {
        attrs: {
          id: fieldId,
          name: field.name,
          type: field.type || "text",
          value: value ?? field.value ?? "",
          maxlength: field.maxlength,
          placeholder: field.placeholder,
          min: field.min,
          max: field.max,
          step: field.step,
          required: field.required ? "" : null,
          autocomplete: "off"
        }
      });
    }

    wrapper.append(control);
    if (field.help) wrapper.append(element("small", { text: field.help }));
    return wrapper;
  }

  function closeEditor() {
    dialog.classList.remove("open");
    dialog.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    activeEditor = null;
    errorMessage.textContent = "";
    opener?.focus?.();
  }

  function openEditor(config, trigger) {
    activeEditor = config;
    opener = trigger || document.activeElement;
    title.textContent = config.title || "Edit item";
    description.textContent = config.description || "Update the saved details below.";
    submitButton.textContent = config.submitLabel || "Save changes";
    fields.replaceChildren();
    errorMessage.textContent = "";
    const values = config.values || {};
    config.fields.forEach((field) => {
      fields.append(fieldControl(field, values[field.name]));
    });
    dialog.classList.add("open");
    dialog.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => qs("input, textarea, select", fields)?.focus());
  }

  function valuesFromForm() {
    const values = {};
    new FormData(form).forEach((value, key) => {
      values[key] = typeof value === "string" ? value.trim() : value;
    });
    return values;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!activeEditor || !form.reportValidity()) return;
    const values = valuesFromForm();
    const validationMessage = activeEditor.validate?.(values) || "";
    if (validationMessage) {
      errorMessage.textContent = validationMessage;
      return;
    }

    try {
      const state = loadState();
      const successMessage = activeEditor.success || "Changes saved.";
      activeEditor.save(values, state);
      closeEditor();
      storeState(state, successMessage);
    } catch (error) {
      console.error("Unable to save edited item.", error);
      errorMessage.textContent = "The changes could not be saved. Please try again.";
    }
  });

  backdrop.addEventListener("click", closeEditor);
  closeButton.addEventListener("click", closeEditor);
  cancelButton.addEventListener("click", closeEditor);

  document.addEventListener("keydown", (event) => {
    if (!dialog.classList.contains("open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditor();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = qsa('button, input, textarea, select, [tabindex]:not([tabindex="-1"])', form)
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

  function iconButton(text, label, onClick, className = "") {
    const button = element("button", {
      className: `manage-action ${className}`.trim(),
      text,
      attrs: { type: "button", "aria-label": label, title: label }
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(button);
    });
    return button;
  }

  function moveItem(listKey, index, direction) {
    const state = loadState();
    const list = state.lists[listKey];
    const nextIndex = index + direction;
    if (!list[index] || nextIndex < 0 || nextIndex >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(nextIndex, 0, item);
    storeState(state, "Item reordered.");
  }

  function toggleDone(listKey, itemId) {
    const state = loadState();
    const item = state.lists[listKey].find((entry) => entry.id === itemId);
    if (!item) return;
    item.done = !Boolean(item.done);
    storeState(state, item.done ? "Marked complete." : "Marked active.");
  }

  function managementControls(listKey, item, index, editConfig, options = {}) {
    const controls = element("span", { className: "manage-controls" });

    if (options.completable) {
      controls.append(iconButton(
        item.done ? "↺" : "✓",
        item.done ? "Mark as active" : "Mark complete",
        () => toggleDone(listKey, item.id),
        item.done ? "is-complete" : ""
      ));
    }

    const up = iconButton("↑", "Move up", () => moveItem(listKey, index, -1));
    const down = iconButton("↓", "Move down", () => moveItem(listKey, index, 1));
    up.disabled = index === 0;
    down.disabled = index === loadState().lists[listKey].length - 1;

    controls.append(up, down);
    controls.append(iconButton("✎", `Edit ${options.label || "item"}`, (button) => {
      openEditor(editConfig(item), button);
    }, "manage-edit"));
    return controls;
  }

  const editorDefinitions = {
    tasks: (item) => ({
      title: "Edit focus task",
      fields: [
        { name: "text", label: "Task", maxlength: 240, required: true },
        { name: "meta", label: "Details", maxlength: 160, placeholder: "Time, context, or note" }
      ],
      values: { text: item.text || "", meta: item.meta || "" },
      success: "Focus task updated.",
      save: (values, state) => {
        const target = state.lists.tasks.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Task missing");
        target.text = values.text.slice(0, 240);
        target.meta = (values.meta || "New focus item").slice(0, 160);
      }
    }),
    planner: (item) => ({
      title: "Edit planner task",
      fields: [
        { name: "text", label: "Task", maxlength: 240, required: true },
        { name: "meta", label: "Schedule or note", maxlength: 160 }
      ],
      values: { text: item.text || "", meta: item.meta || "" },
      success: "Planner task updated.",
      save: (values, state) => {
        const target = state.lists.planner.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Planner item missing");
        target.text = values.text.slice(0, 240);
        target.meta = (values.meta || "New task").slice(0, 160);
      }
    }),
    social: (item) => ({
      title: "Edit personal plan",
      fields: [
        { name: "text", label: "Plan or reminder", type: "textarea", rows: 3, maxlength: 240, required: true },
        { name: "meta", label: "Timing or note", maxlength: 160 }
      ],
      values: { text: item.text || "", meta: item.meta || "" },
      success: "Personal plan updated.",
      save: (values, state) => {
        const target = state.lists.social.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Personal plan missing");
        target.text = values.text.slice(0, 240);
        target.meta = (values.meta || "New plan").slice(0, 160);
      }
    }),
    accounts: (item) => ({
      title: "Edit social account",
      fields: [
        { name: "platform", label: "Platform", maxlength: 80, required: true },
        { name: "username", label: "Account name or handle", maxlength: 120, required: true },
        { name: "followers", label: "Followers or subscribers", maxlength: 40, required: true }
      ],
      values: item,
      success: "Social account updated.",
      save: (values, state) => {
        const target = state.lists.accounts.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Account missing");
        target.platform = values.platform.slice(0, 80);
        target.username = values.username.slice(0, 120);
        target.followers = values.followers.slice(0, 40);
      }
    }),
    units: (item) => ({
      title: "Edit school unit",
      fields: [
        { name: "code", label: "Unit code", maxlength: 30, required: true },
        { name: "name", label: "Unit name", maxlength: 160, required: true },
        { name: "lecturer", label: "Lecturer", maxlength: 160, required: true },
        { name: "year", label: "Year or semester", maxlength: 80, required: true }
      ],
      values: item,
      success: "School unit updated.",
      save: (values, state) => {
        const target = state.lists.units.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Unit missing");
        target.code = values.code.slice(0, 30);
        target.name = values.name.slice(0, 160);
        target.lecturer = values.lecturer.slice(0, 160);
        target.year = values.year.slice(0, 80);
      }
    }),
    study: (item) => ({
      title: "Edit study session",
      fields: [
        { name: "title", label: "Study topic", maxlength: 240, required: true },
        { name: "meta", label: "Schedule or note", maxlength: 240 },
        { name: "tag", label: "Status", type: "select", options: ["PENDING", "READING", "DONE"] }
      ],
      values: item,
      success: "Study session updated.",
      save: (values, state) => {
        const target = state.lists.study.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Study item missing");
        target.title = values.title.slice(0, 240);
        target.meta = (values.meta || "New session").slice(0, 240);
        target.tag = values.tag.slice(0, 20);
        target.active = values.tag === "READING" || values.tag === "DONE";
      }
    }),
    research: (item) => ({
      title: "Edit research resource",
      fields: [
        { name: "type", label: "Type", type: "select", options: ["PDF", "LINK", "NOTE"] },
        { name: "title", label: "Title or question", type: "textarea", rows: 3, maxlength: 300, required: true },
        { name: "meta", label: "Note", maxlength: 160 }
      ],
      values: item,
      success: "Research resource updated.",
      save: (values, state) => {
        const target = state.lists.research.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Research item missing");
        target.type = values.type.slice(0, 10).toUpperCase();
        target.title = values.title.slice(0, 300);
        target.meta = (values.meta || "New reference").slice(0, 160);
      }
    }),
    classes: (item) => ({
      title: "Edit timetable item",
      fields: [
        { name: "day", label: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
        { name: "time", label: "Time", type: "time", required: true },
        { name: "subject", label: "Class, study block, or exam", maxlength: 200, required: true }
      ],
      values: item,
      success: "Timetable item updated.",
      save: (values, state) => {
        const target = state.lists.classes.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Class missing");
        target.day = values.day.slice(0, 30);
        target.time = values.time.slice(0, 40);
        target.subject = values.subject.slice(0, 200);
      }
    }),
    businesses: (item) => ({
      title: "Edit business",
      fields: [
        { name: "name", label: "Business or work name", maxlength: 160, required: true },
        { name: "detail", label: "What you do", type: "textarea", rows: 3, maxlength: 280, required: true },
        { name: "status", label: "Current focus", maxlength: 100 }
      ],
      values: item,
      success: "Business updated.",
      save: (values, state) => {
        const target = state.lists.businesses.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Business missing");
        target.name = values.name.slice(0, 160);
        target.detail = values.detail.slice(0, 280);
        target.status = (values.status || "Active").slice(0, 100);
        target.initials = values.name.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/)
          .filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "NW";
      }
    }),
    workGoals: (item) => ({
      title: "Edit work goal",
      fields: [{ name: "text", label: "Goal", maxlength: 240, required: true }],
      values: item,
      success: "Work goal updated.",
      save: (values, state) => {
        const target = state.lists.workGoals.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Goal missing");
        target.text = values.text.slice(0, 240);
      }
    }),
    people: (item) => ({
      title: "Edit person",
      fields: [
        { name: "name", label: "Name or nickname", maxlength: 160, required: true },
        { name: "meta", label: "Group and connection note", type: "textarea", rows: 3, maxlength: 300 },
        { name: "action", label: "Action label", maxlength: 80 }
      ],
      values: item,
      success: "Person updated.",
      save: (values, state) => {
        const target = state.lists.people.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Person missing");
        target.name = values.name.slice(0, 160);
        target.meta = (values.meta || "Keep in touch").slice(0, 300);
        target.action = (values.action || "Check in →").slice(0, 80);
        target.initial = values.name.charAt(0).toUpperCase();
      }
    }),
    relationshipItems: (item) => ({
      title: "Edit relationship item",
      fields: [
        { name: "type", label: "Type", maxlength: 80, required: true },
        { name: "text", label: "Details", type: "textarea", rows: 4, maxlength: 500, required: true }
      ],
      values: item,
      success: "Relationship item updated.",
      save: (values, state) => {
        const target = state.lists.relationshipItems.find((entry) => entry.id === item.id);
        if (!target) throw new Error("Relationship item missing");
        target.type = values.type.slice(0, 80);
        target.text = values.text.slice(0, 500);
      }
    })
  };

  function decorateStandardList(listKey, containerId, options = {}) {
    const container = qs(`#${containerId}`);
    if (!container) return;
    const state = loadState();
    const rows = qsa(":scope > .dynamic-item", container);
    rows.forEach((row, index) => {
      const item = state.lists[listKey][index];
      if (!item || row.dataset.managed === "true") return;
      row.dataset.managed = "true";
      row.classList.toggle("managed-complete", Boolean(item.done));
      row.append(managementControls(
        listKey,
        item,
        index,
        editorDefinitions[listKey],
        { completable: Boolean(options.completable), label: options.label }
      ));
    });
  }

  function contentEditor(listKey, item) {
    return {
      title: "Edit content item",
      description: "Update the copy and choose where this content belongs.",
      fields: [
        { name: "text", label: "Content idea or draft", type: "textarea", rows: 4, maxlength: 300, required: true },
        { name: "meta", label: "Platform, due date, or note", maxlength: 180 },
        {
          name: "status",
          label: "Status",
          type: "select",
          options: ["Idea", "In progress", "Scheduled", "Posted"]
        }
      ],
      values: {
        text: item.text || "",
        meta: item.meta || "",
        status: item.status || (listKey === "ideas" ? "Idea" : "In progress")
      },
      success: "Content item updated.",
      save: (values, state) => {
        const currentList = state.lists[listKey];
        const index = currentList.findIndex((entry) => entry.id === item.id);
        if (index < 0) throw new Error("Content item missing");
        const [target] = currentList.splice(index, 1);
        target.text = values.text.slice(0, 300);
        target.meta = (values.meta || "No details yet").slice(0, 180);
        target.status = values.status;
        const destination = values.status === "Idea" ? state.lists.ideas : state.lists.drafts;
        destination.push(target);
      }
    };
  }

  function decorateContent() {
    const state = loadState();
    const ideaRows = qsa("#savedIdeas > .dynamic-item");
    const draftRows = qsa("#savedDrafts > .dynamic-item");
    const postedBoard = qs(".posted-board");
    let postedContainer = qs("#savedPosted");

    if (postedBoard && !postedContainer) {
      postedContainer = element("div", { attrs: { id: "savedPosted" } });
      const empty = qs(".empty-board", postedBoard);
      if (empty) empty.before(postedContainer);
      else postedBoard.append(postedContainer);
    }

    ideaRows.forEach((row, index) => {
      const item = state.lists.ideas[index];
      if (!item || row.dataset.managed === "true") return;
      row.dataset.managed = "true";
      item.status ||= "Idea";
      const badge = element("span", { className: "content-status-badge", text: item.status });
      row.append(badge);
      row.append(managementControls("ideas", item, index, (entry) => contentEditor("ideas", entry), { label: "content idea" }));
    });

    let postedCount = 0;
    draftRows.forEach((row, index) => {
      const item = state.lists.drafts[index];
      if (!item || row.dataset.managed === "true") return;
      row.dataset.managed = "true";
      item.status ||= "In progress";
      const badge = element("span", {
        className: `content-status-badge status-${item.status.toLowerCase().replaceAll(" ", "-")}`,
        text: item.status
      });
      row.append(badge);
      row.append(managementControls("drafts", item, index, (entry) => contentEditor("drafts", entry), { label: "content item" }));
      if (item.status === "Posted" && postedContainer) {
        postedContainer.append(row);
        postedCount += 1;
      }
    });

    if (postedBoard) {
      const headingCount = qs(".board-heading span:last-child", postedBoard);
      if (headingCount) headingCount.textContent = String(postedCount);
      const empty = qs(".empty-board", postedBoard);
      if (empty) empty.hidden = postedCount > 0;
    }
  }

  function decorateJournal() {
    const state = loadState();
    const entries = qsa("#journalEntries > .journal-entry");
    entries.forEach((article, index) => {
      const item = state.journal[index];
      const header = qs("header", article);
      if (!item || !header || article.dataset.managed === "true") return;
      article.dataset.managed = "true";
      const edit = iconButton("✎", `Edit journal entry ${item.title}`, (button) => {
        openEditor({
          title: "Edit journal entry",
          fields: [
            { name: "title", label: "Title", maxlength: 120, required: true },
            { name: "body", label: "Entry", type: "textarea", rows: 10, maxlength: 10000, required: true }
          ],
          values: item,
          success: "Journal entry updated.",
          save: (values, nextState) => {
            const target = nextState.journal.find((entry) => entry.id === item.id);
            if (!target) throw new Error("Journal entry missing");
            target.title = values.title.slice(0, 120);
            target.body = values.body.slice(0, 10000);
          }
        }, button);
      }, "manage-edit");
      header.append(edit);
    });
  }

  function formatDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Saved expense";
    return parsed.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
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
    }, 3000);
  }

  function renderExpenseHistory() {
    const finance = qs("#finance");
    if (!finance || qs("#expenseHistory")) return;

    const state = loadState();
    state.weekly[weekKey] = state.weekly[weekKey] && typeof state.weekly[weekKey] === "object"
      ? state.weekly[weekKey]
      : { expenses: [] };
    const expenses = Array.isArray(state.weekly[weekKey].expenses) ? state.weekly[weekKey].expenses : [];

    const section = element("section", {
      className: "expense-history",
      attrs: { id: "expenseHistory", "aria-labelledby": "expenseHistoryTitle" }
    });
    const heading = element("div", { className: "expense-history-heading" });
    heading.append(element("strong", { attrs: { id: "expenseHistoryTitle" }, text: "This week's expenses" }));
    heading.append(element("span", { text: `${expenses.length} item${expenses.length === 1 ? "" : "s"}` }));
    section.append(heading);

    if (!expenses.length) {
      section.append(element("p", {
        className: "expense-history-empty",
        text: "No expenses recorded yet. Use the plus button to add one."
      }));
      finance.append(section);
      return;
    }

    expenses.slice().reverse().forEach((expense) => {
      const row = element("article", { className: "expense-row" });
      const copy = element("div", { className: "expense-copy" });
      copy.append(element("strong", {
        text: `KSh ${Number(expense.amount || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`
      }));
      copy.append(element("span", { text: expense.note || "Uncategorised expense" }));
      copy.append(element("small", { text: `${expense.category || "Other"} · ${formatDate(expense.createdAt)}` }));

      const controls = element("span", { className: "manage-controls expense-controls" });
      controls.append(iconButton("✎", "Edit expense", (button) => {
        openEditor({
          title: "Edit expense",
          fields: [
            { name: "amount", label: "Amount (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, required: true },
            { name: "note", label: "Description", maxlength: 200 },
            {
              name: "category",
              label: "Category",
              type: "select",
              options: ["Food", "Transport", "School", "Health", "Home", "Subscriptions", "Personal", "Other"]
            }
          ],
          values: {
            amount: expense.amount,
            note: expense.note || "",
            category: expense.category || "Other"
          },
          validate: (values) => {
            const amount = Number(values.amount);
            return Number.isFinite(amount) && amount > 0 && amount <= 100000000
              ? ""
              : "Enter a valid positive amount.";
          },
          success: "Expense updated.",
          save: (values, nextState) => {
            const week = nextState.weekly[weekKey];
            const target = week?.expenses?.find((entry) => entry.id === expense.id);
            if (!target) throw new Error("Expense missing");
            target.amount = Number(values.amount);
            target.note = values.note.slice(0, 200);
            target.category = values.category;
          }
        }, button);
      }, "manage-edit"));

      const deleteButton = iconButton("×", "Delete expense", (button) => {
        twoStepDelete(button, () => {
          const nextState = loadState();
          const week = nextState.weekly[weekKey];
          if (!week || !Array.isArray(week.expenses)) return;
          week.expenses = week.expenses.filter((entry) => entry.id !== expense.id);
          storeState(nextState, "Expense deleted.");
        });
      }, "manage-delete");

      controls.append(deleteButton);
      row.append(copy, controls);
      section.append(row);
    });

    finance.append(section);
  }

  decorateStandardList("tasks", "savedTasks", { completable: true, label: "focus task" });
  decorateStandardList("planner", "savedPlanner", { completable: true, label: "planner task" });
  decorateStandardList("social", "savedSocial", { completable: true, label: "personal plan" });
  decorateStandardList("accounts", "savedAccounts", { label: "social account" });
  decorateStandardList("units", "unitList", { label: "school unit" });
  decorateStandardList("study", "studyList", { label: "study session" });
  decorateStandardList("research", "researchList", { label: "research resource" });
  decorateStandardList("classes", "savedClasses", { label: "timetable item" });
  decorateStandardList("businesses", "businessList", { label: "business" });
  decorateStandardList("workGoals", "savedWorkGoals", { label: "work goal" });
  decorateStandardList("people", "peopleList", { label: "person" });
  decorateStandardList("relationshipItems", "relationshipItems", { label: "relationship item" });
  decorateContent();
  decorateJournal();
  renderExpenseHistory();
})();
