"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.app.v2";
  const NOTICE_KEY = "myLittleLife.financeNotice";
  const today = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const currentMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const EXPENSE_CATEGORIES = ["Food", "Transport", "School", "Health", "Home", "Subscriptions", "Personal", "Other"];
  const INCOME_CATEGORIES = ["Work", "Business", "Allowance", "Gift", "Refund", "Other"];

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

  function normalizeState(rawState) {
    const state = rawState && typeof rawState === "object" ? rawState : {};
    state.version = Number(state.version) || 2;
    state.daily = state.daily && typeof state.daily === "object" ? state.daily : {};
    state.weekly = state.weekly && typeof state.weekly === "object" ? state.weekly : {};
    state.notes = state.notes && typeof state.notes === "object" ? state.notes : { people: "", connection: "" };
    state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
    state.finances = state.finances && typeof state.finances === "object" ? state.finances : {};
    state.finances.incomes = Array.isArray(state.finances.incomes) ? state.finances.incomes : [];
    state.finances.savingsGoals = Array.isArray(state.finances.savingsGoals) ? state.finances.savingsGoals : [];
    state.finances.hidden = Boolean(state.finances.hidden);

    Object.keys(state.weekly).forEach((key) => {
      const week = state.weekly[key] && typeof state.weekly[key] === "object" ? state.weekly[key] : {};
      week.expenses = Array.isArray(week.expenses) ? week.expenses : [];
      state.weekly[key] = week;
    });
    return state;
  }

  function loadState() {
    return normalizeState(safeParse(localStorage.getItem(STORAGE_KEY), {}));
  }

  function captureUnsavedFields(state) {
    const dateKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const existing = state.daily[dateKey] && typeof state.daily[dateKey] === "object" ? state.daily[dateKey] : {};
    state.daily[dateKey] = { ...existing };
    const quickNote = qs("#quickNote");
    const gratitude = qs("#gratitudeNote");
    const peopleNote = qs("#peopleNote");
    if (quickNote) state.daily[dateKey].quickNote = quickNote.value.slice(0, 5000);
    if (gratitude) state.daily[dateKey].gratitude = gratitude.value.slice(0, 5000);
    if (peopleNote) state.notes.people = peopleNote.value.slice(0, 5000);
  }

  function saveState(state, notice = "Finance item saved.") {
    const normalized = normalizeState(state);
    captureUnsavedFields(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    sessionStorage.setItem(NOTICE_KEY, notice);
    globalThis.location.hash = "financeCenter";
    globalThis.location.reload();
  }

  function ensureStylesheet() {
    if (qs('link[href="finance.css"]')) return;
    document.head.append(element("link", { attrs: { rel: "stylesheet", href: "finance.css" } }));
  }

  function formatMoney(value) {
    return `KSh ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
  }

  function dateInputValue(value) {
    const parsed = value ? new Date(value) : today;
    const date = Number.isNaN(parsed.getTime()) ? today : parsed;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function parseDateInput(value) {
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function isoWeekKey(date) {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() + 4 - day);
    const yearStart = new Date(copy.getFullYear(), 0, 1);
    const week = Math.ceil((((copy - yearStart) / 86400000) + 1) / 7);
    return `${copy.getFullYear()}-W${pad(week)}`;
  }

  function weekStartFromKey(key) {
    const match = /^(\d{4})-W(\d{2})$/.exec(String(key));
    if (!match) return new Date();
    const year = Number(match[1]);
    const week = Number(match[2]);
    const jan4 = new Date(year, 0, 4, 12);
    const jan4Day = jan4.getDay() || 7;
    const monday = new Date(jan4);
    monday.setDate(jan4.getDate() - jan4Day + 1 + (week - 1) * 7);
    return monday;
  }

  function transactionDate(item, fallbackWeekKey = "") {
    const parsed = item?.createdAt ? new Date(item.createdAt) : weekStartFromKey(fallbackWeekKey);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
  }

  function formatDate(value) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date unavailable";
    return parsed.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  }

  function allExpenses(state) {
    return Object.entries(state.weekly).flatMap(([weekKey, week]) => {
      const expenses = Array.isArray(week?.expenses) ? week.expenses : [];
      return expenses.map((expense) => {
        const date = transactionDate(expense, weekKey);
        return {
          type: "expense",
          id: expense.id,
          amount: Number(expense.amount || 0),
          title: expense.note || "Expense",
          category: expense.category || "Other",
          createdAt: expense.createdAt || date.toISOString(),
          date,
          weekKey
        };
      });
    });
  }

  function allIncomes(state) {
    return state.finances.incomes.map((income) => {
      const date = transactionDate(income);
      return {
        type: "income",
        id: income.id,
        amount: Number(income.amount || 0),
        title: income.source || "Income",
        note: income.note || "",
        category: income.category || "Other",
        createdAt: income.createdAt || date.toISOString(),
        date
      };
    });
  }

  function transactionsForMonth(state, selectedMonth) {
    return [...allExpenses(state), ...allIncomes(state)]
      .filter((entry) => monthKey(entry.date) === selectedMonth)
      .sort((a, b) => b.date - a.date);
  }

  function monthLabel(value) {
    const parsed = new Date(`${value}-01T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
  }

  function monthSequence(count = 6) {
    return Array.from({ length: count }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (count - 1 - index), 1, 12);
      return { key: monthKey(date), label: date.toLocaleDateString("en-KE", { month: "short" }) };
    });
  }

  function categoryTotals(entries) {
    const totals = new Map();
    entries.filter((entry) => entry.type === "expense").forEach((entry) => {
      totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]);
  }

  function notifySavedNotice() {
    const notice = sessionStorage.getItem(NOTICE_KEY);
    if (!notice) return;
    sessionStorage.removeItem(NOTICE_KEY);
    const toast = qs("#appToast");
    if (!toast) return;
    setTimeout(() => {
      toast.textContent = notice;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2600);
    }, 120);
  }

  function buildDialog() {
    const dialog = element("div", {
      className: "finance-dialog",
      attrs: { role: "dialog", "aria-modal": "true", "aria-hidden": "true", "aria-labelledby": "financeDialogTitle" }
    });
    const backdrop = element("button", { className: "finance-backdrop", attrs: { type: "button", "aria-label": "Close finance form" } });
    const form = element("form", { className: "finance-dialog-card", attrs: { novalidate: "" } });
    const close = element("button", { className: "finance-dialog-close", text: "×", attrs: { type: "button", "aria-label": "Close finance form" } });
    const eyebrow = element("p", { className: "eyebrow", text: "Money check-in" });
    const title = element("h2", { attrs: { id: "financeDialogTitle" } });
    const description = element("p", { className: "finance-dialog-description" });
    const fields = element("div", { className: "finance-dialog-fields" });
    const error = element("p", { className: "finance-dialog-error", attrs: { role: "alert", "aria-live": "polite" } });
    const footer = element("div", { className: "finance-dialog-footer" });
    const cancel = element("button", { className: "finance-dialog-cancel", text: "Cancel", attrs: { type: "button" } });
    const submit = element("button", { className: "save-button", text: "Save", attrs: { type: "submit" } });
    footer.append(cancel, submit);
    form.append(close, eyebrow, title, description, fields, error, footer);
    dialog.append(backdrop, form);
    document.body.append(dialog);

    let activeConfig = null;
    let opener = null;

    function closeDialog() {
      dialog.classList.remove("open");
      dialog.setAttribute("aria-hidden", "true");
      document.body.classList.remove("modal-open");
      activeConfig = null;
      error.textContent = "";
      opener?.focus?.();
    }

    function fieldControl(field, value) {
      const wrapper = element("label", { className: "finance-dialog-field" });
      const label = element("span", { text: field.label });
      const id = `finance-${field.name}`;
      let control;
      if (field.type === "textarea") {
        control = element("textarea", { attrs: { id, name: field.name, rows: field.rows || 3, maxlength: field.maxlength, required: field.required ? "" : null, placeholder: field.placeholder } });
        control.value = value ?? field.value ?? "";
      } else if (field.type === "select") {
        control = element("select", { attrs: { id, name: field.name, required: field.required ? "" : null } });
        (field.options || []).forEach((option) => {
          const node = element("option", { text: option, attrs: { value: option } });
          node.selected = String(option) === String(value ?? field.value ?? "");
          control.append(node);
        });
      } else {
        control = element("input", { attrs: {
          id,
          name: field.name,
          type: field.type || "text",
          value: value ?? field.value ?? "",
          min: field.min,
          max: field.max,
          step: field.step,
          maxlength: field.maxlength,
          required: field.required ? "" : null,
          placeholder: field.placeholder,
          inputmode: field.inputmode || null,
          autocomplete: "off"
        } });
      }
      label.setAttribute("for", id);
      wrapper.append(label, control);
      if (field.help) wrapper.append(element("small", { text: field.help }));
      return wrapper;
    }

    function open(config, source) {
      activeConfig = config;
      opener = source || document.activeElement;
      title.textContent = config.title;
      description.textContent = config.description || "Add the details below.";
      submit.textContent = config.submitLabel || "Save";
      fields.replaceChildren();
      const state = loadState();
      const values = typeof config.values === "function" ? config.values(state) : (config.values || {});
      config.fields.forEach((field) => fields.append(fieldControl(field, values[field.name])));
      error.textContent = "";
      dialog.classList.add("open");
      dialog.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");
      requestAnimationFrame(() => qs("input, textarea, select", fields)?.focus());
    }

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!activeConfig || !form.reportValidity()) return;
      const values = {};
      new FormData(form).forEach((value, key) => { values[key] = typeof value === "string" ? value.trim() : value; });
      const message = activeConfig.validate?.(values) || "";
      if (message) {
        error.textContent = message;
        return;
      }
      try {
        const state = loadState();
        activeConfig.save(values, state);
        saveState(state, activeConfig.success || "Finance item saved.");
      } catch (saveError) {
        console.error("Unable to save finance item.", saveError);
        error.textContent = "This item could not be saved. Please try again.";
      }
    });

    [backdrop, close, cancel].forEach((button) => button.addEventListener("click", closeDialog));
    document.addEventListener("keydown", (event) => {
      if (!dialog.classList.contains("open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
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

    return { open };
  }

  function validateAmount(values) {
    const amount = Number(values.amount);
    return Number.isFinite(amount) && amount > 0 && amount <= 100000000 ? "" : "Enter a valid positive amount.";
  }

  function twoStepDelete(button, onConfirm) {
    if (button.dataset.armed === "true") {
      onConfirm();
      return;
    }
    button.dataset.armed = "true";
    button.dataset.original = button.textContent;
    button.textContent = "Delete?";
    setTimeout(() => {
      if (!button.isConnected) return;
      button.dataset.armed = "false";
      button.textContent = button.dataset.original || "Delete";
    }, 3500);
  }

  ensureStylesheet();
  notifySavedNotice();
  const dialog = buildDialog();
  let selectedMonth = currentMonth;
  let transactionFilter = "all";

  function addIncomeConfig(existing = null) {
    return {
      title: existing ? "Edit income" : "Add income",
      description: "Record money received so monthly totals stay accurate.",
      submitLabel: existing ? "Update income" : "Save income",
      success: existing ? "Income updated." : "Income added.",
      fields: [
        { name: "amount", label: "Amount (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, required: true, inputmode: "decimal" },
        { name: "source", label: "Source", maxlength: 120, required: true, placeholder: "Work, allowance, client payment..." },
        { name: "category", label: "Category", type: "select", options: INCOME_CATEGORIES, value: "Other" },
        { name: "date", label: "Date received", type: "date", required: true, value: dateInputValue() },
        { name: "note", label: "Note", type: "textarea", rows: 3, maxlength: 300, placeholder: "Optional" }
      ],
      values: existing ? {
        amount: existing.amount,
        source: existing.source || "",
        category: existing.category || "Other",
        date: dateInputValue(existing.createdAt),
        note: existing.note || ""
      } : {},
      validate: validateAmount,
      save: (values, state) => {
        const record = {
          id: existing?.id || createId(),
          amount: Number(values.amount),
          source: values.source.slice(0, 120),
          category: values.category,
          createdAt: parseDateInput(values.date).toISOString(),
          note: values.note.slice(0, 300)
        };
        if (existing) {
          const index = state.finances.incomes.findIndex((item) => item.id === existing.id);
          if (index < 0) throw new Error("Income missing");
          state.finances.incomes[index] = record;
        } else {
          state.finances.incomes.push(record);
        }
      }
    };
  }

  function addExpenseConfig(existing = null) {
    return {
      title: existing ? "Edit expense" : "Add expense",
      description: "Record spending honestly. This is for awareness, not judgment.",
      submitLabel: existing ? "Update expense" : "Save expense",
      success: existing ? "Expense updated." : "Expense added.",
      fields: [
        { name: "amount", label: "Amount (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, required: true, inputmode: "decimal" },
        { name: "note", label: "Description", maxlength: 200, required: true, placeholder: "What was it for?" },
        { name: "category", label: "Category", type: "select", options: EXPENSE_CATEGORIES, value: "Other" },
        { name: "date", label: "Date spent", type: "date", required: true, value: dateInputValue() }
      ],
      values: existing ? {
        amount: existing.amount,
        note: existing.note || existing.title || "",
        category: existing.category || "Other",
        date: dateInputValue(existing.createdAt)
      } : {},
      validate: validateAmount,
      save: (values, state) => {
        const date = parseDateInput(values.date);
        const targetWeek = isoWeekKey(date);
        state.weekly[targetWeek] = state.weekly[targetWeek] && typeof state.weekly[targetWeek] === "object" ? state.weekly[targetWeek] : { expenses: [] };
        state.weekly[targetWeek].expenses = Array.isArray(state.weekly[targetWeek].expenses) ? state.weekly[targetWeek].expenses : [];
        if (existing) {
          const oldWeek = state.weekly[existing.weekKey];
          if (!oldWeek || !Array.isArray(oldWeek.expenses)) throw new Error("Expense missing");
          const index = oldWeek.expenses.findIndex((item) => item.id === existing.id);
          if (index < 0) throw new Error("Expense missing");
          oldWeek.expenses.splice(index, 1);
        }
        state.weekly[targetWeek].expenses.push({
          id: existing?.id || createId(),
          amount: Number(values.amount),
          note: values.note.slice(0, 200),
          category: values.category,
          createdAt: date.toISOString()
        });
      }
    };
  }

  function savingsGoalConfig(existing = null) {
    return {
      title: existing ? "Edit savings goal" : "Add savings goal",
      description: "Set a target that supports something meaningful to you.",
      submitLabel: existing ? "Update goal" : "Save goal",
      success: existing ? "Savings goal updated." : "Savings goal added.",
      fields: [
        { name: "name", label: "Goal name", maxlength: 120, required: true, placeholder: "Laptop, school fees, emergency fund..." },
        { name: "target", label: "Target amount (KSh)", type: "number", min: 1, max: 100000000, step: 1, required: true, inputmode: "decimal" },
        { name: "saved", label: "Currently saved (KSh)", type: "number", min: 0, max: 100000000, step: 1, required: true, inputmode: "decimal", value: 0 },
        { name: "dueDate", label: "Target date", type: "date", help: "Optional" }
      ],
      values: existing ? {
        name: existing.name || "",
        target: existing.target || 0,
        saved: existing.saved || 0,
        dueDate: existing.dueDate || ""
      } : {},
      validate: (values) => {
        const target = Number(values.target);
        const saved = Number(values.saved);
        if (!Number.isFinite(target) || target <= 0 || target > 100000000) return "Enter a valid target amount.";
        if (!Number.isFinite(saved) || saved < 0 || saved > 100000000) return "Enter a valid saved amount.";
        return "";
      },
      save: (values, state) => {
        const record = {
          id: existing?.id || createId(),
          name: values.name.slice(0, 120),
          target: Number(values.target),
          saved: Number(values.saved),
          dueDate: values.dueDate || ""
        };
        if (existing) {
          const index = state.finances.savingsGoals.findIndex((item) => item.id === existing.id);
          if (index < 0) throw new Error("Savings goal missing");
          state.finances.savingsGoals[index] = record;
        } else {
          state.finances.savingsGoals.push(record);
        }
      }
    };
  }

  function contributionConfig(goal) {
    return {
      title: "Add to savings goal",
      description: `Record progress toward ${goal.name}.`,
      submitLabel: "Add contribution",
      success: "Savings contribution added.",
      fields: [{ name: "amount", label: "Contribution (KSh)", type: "number", min: 0.01, max: 100000000, step: 0.01, required: true, inputmode: "decimal" }],
      validate: validateAmount,
      save: (values, state) => {
        const target = state.finances.savingsGoals.find((item) => item.id === goal.id);
        if (!target) throw new Error("Savings goal missing");
        target.saved = Number(target.saved || 0) + Number(values.amount);
      }
    };
  }

  function actionButton(label, onClick, className = "finance-action") {
    const button = element("button", { className, text: label, attrs: { type: "button" } });
    button.addEventListener("click", () => onClick(button));
    return button;
  }

  function buildFinanceCenter() {
    qs("#financeCenter")?.remove();
    const state = loadState();
    const section = element("section", {
      className: "finance-center section",
      attrs: { id: "financeCenter", "aria-labelledby": "financeCenterTitle" }
    });
    section.hidden = state.finances.hidden;

    const heading = element("div", { className: "section-title finance-center-heading" });
    const headingCopy = element("div");
    headingCopy.append(
      element("p", { className: "eyebrow", text: "Money centre" }),
      element("h2", { text: "Know where your money is going.", attrs: { id: "financeCenterTitle" } })
    );
    const headingActions = element("div", { className: "finance-heading-actions" });
    const monthPicker = element("input", { attrs: { type: "month", value: selectedMonth, "aria-label": "Choose finance month" } });
    monthPicker.addEventListener("change", () => {
      selectedMonth = monthPicker.value || currentMonth;
      renderFinanceContents(section);
    });
    headingActions.append(monthPicker);
    heading.append(headingCopy, headingActions);
    section.append(heading, element("p", {
      className: "finance-intro",
      text: "Track income, spending, and savings without shame. These numbers are information, not a grade."
    }));

    const controls = element("div", { className: "finance-primary-actions" });
    controls.append(
      actionButton("＋ Add income", (button) => dialog.open(addIncomeConfig(), button), "save-button finance-primary"),
      actionButton("＋ Add expense", (button) => dialog.open(addExpenseConfig(), button)),
      actionButton("＋ Add savings goal", (button) => dialog.open(savingsGoalConfig(), button))
    );
    section.append(controls);

    const contents = element("div", { attrs: { id: "financeCenterContents" } });
    section.append(contents);
    const details = qs("#details");
    if (details) details.after(section);
    else qs("main.dashboard")?.append(section);

    const nav = qsa('.sidebar nav a').find((link) => link.getAttribute("href") === "#money");
    if (nav) {
      nav.setAttribute("href", "#financeCenter");
      nav.addEventListener("click", () => qsa(".sidebar nav a").forEach((link) => link.classList.toggle("active", link === nav)));
      nav.hidden = state.finances.hidden;
    }

    addSettingsVisibilityToggle(state, section, nav);
    renderFinanceContents(section);
  }

  function renderFinanceContents(section) {
    const contents = qs("#financeCenterContents", section);
    if (!contents) return;
    const state = loadState();
    const transactions = transactionsForMonth(state, selectedMonth);
    const income = transactions.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0);
    const spent = transactions.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0);
    const saved = state.finances.savingsGoals.reduce((sum, goal) => sum + Number(goal.saved || 0), 0);
    const target = state.finances.savingsGoals.reduce((sum, goal) => sum + Number(goal.target || 0), 0);
    contents.replaceChildren();

    const summary = element("div", { className: "finance-summary-grid" });
    [
      ["Income", income, "Money received this month"],
      ["Spent", spent, "Recorded expenses this month"],
      ["Balance", income - spent, "Income minus recorded spending"],
      ["Saved", saved, target ? `${Math.round((saved / target) * 100)}% of all goals` : "No savings goals yet"]
    ].forEach(([label, value, note]) => {
      const card = element("article", { className: "finance-summary-card" });
      card.append(element("p", { className: "eyebrow", text: label }), element("strong", { text: formatMoney(value) }), element("small", { text: note }));
      summary.append(card);
    });
    contents.append(summary);

    const insightGrid = element("div", { className: "finance-insight-grid" });
    insightGrid.append(renderCashflowChart(state), renderCategoryBreakdown(transactions), renderSavingsGoals(state));
    contents.append(insightGrid, renderTransactionHistory(state, transactions));
  }

  function renderCashflowChart(state) {
    const card = element("article", { className: "finance-panel finance-cashflow" });
    card.append(element("p", { className: "eyebrow", text: "Six-month view" }), element("h3", { text: "Income and spending" }));
    const months = monthSequence(6).map((month) => {
      const entries = transactionsForMonth(state, month.key);
      return {
        ...month,
        income: entries.filter((entry) => entry.type === "income").reduce((sum, entry) => sum + entry.amount, 0),
        spent: entries.filter((entry) => entry.type === "expense").reduce((sum, entry) => sum + entry.amount, 0)
      };
    });
    const max = Math.max(1, ...months.flatMap((month) => [month.income, month.spent]));
    const chart = element("div", { className: "finance-bars", attrs: { role: "img", "aria-label": "Six-month income and expense comparison" } });
    months.forEach((month) => {
      const group = element("div", { className: "finance-bar-group" });
      const bars = element("div", { className: "finance-bar-pair" });
      const incomeBar = element("i", { className: "income-bar", attrs: { title: `${month.label} income ${formatMoney(month.income)}` } });
      const expenseBar = element("i", { className: "expense-bar", attrs: { title: `${month.label} spending ${formatMoney(month.spent)}` } });
      incomeBar.style.height = `${Math.max(3, (month.income / max) * 100)}%`;
      expenseBar.style.height = `${Math.max(3, (month.spent / max) * 100)}%`;
      bars.append(incomeBar, expenseBar);
      group.append(bars, element("span", { text: month.label }));
      chart.append(group);
    });
    const legend = element("div", { className: "finance-legend" });
    legend.append(element("span", { text: "● Income" }), element("span", { text: "● Spending" }));
    card.append(chart, legend);
    return card;
  }

  function renderCategoryBreakdown(transactions) {
    const card = element("article", { className: "finance-panel" });
    card.append(element("p", { className: "eyebrow", text: monthLabel(selectedMonth) }), element("h3", { text: "Spending by category" }));
    const totals = categoryTotals(transactions);
    if (!totals.length) {
      card.append(element("p", { className: "finance-empty", text: "No expenses recorded for this month yet." }));
      return card;
    }
    const max = totals[0][1] || 1;
    const list = element("div", { className: "finance-category-list" });
    totals.forEach(([category, amount]) => {
      const row = element("div", { className: "finance-category-row" });
      const copy = element("div");
      copy.append(element("strong", { text: category }), element("span", { text: formatMoney(amount) }));
      const bar = element("div", { className: "finance-category-bar" });
      const fill = element("i");
      fill.style.width = `${Math.max(4, (amount / max) * 100)}%`;
      bar.append(fill);
      row.append(copy, bar);
      list.append(row);
    });
    card.append(list);
    return card;
  }

  function renderSavingsGoals(state) {
    const card = element("article", { className: "finance-panel finance-goals-panel" });
    card.append(element("p", { className: "eyebrow", text: "Savings" }), element("h3", { text: "Goals that matter to you" }));
    if (!state.finances.savingsGoals.length) {
      card.append(element("p", { className: "finance-empty", text: "Add a savings goal when there is something you want to plan for." }));
      return card;
    }
    const list = element("div", { className: "finance-goal-list" });
    state.finances.savingsGoals.forEach((goal) => {
      const target = Math.max(1, Number(goal.target || 0));
      const saved = Math.max(0, Number(goal.saved || 0));
      const percent = Math.min(100, (saved / target) * 100);
      const item = element("article", { className: "finance-goal" });
      const top = element("div", { className: "finance-goal-top" });
      const copy = element("div");
      copy.append(element("strong", { text: goal.name }), element("small", { text: goal.dueDate ? `Target ${formatDate(`${goal.dueDate}T12:00:00`)}` : "No target date" }));
      const actions = element("span", { className: "finance-row-actions" });
      actions.append(
        actionButton("＋", (button) => dialog.open(contributionConfig(goal), button), "finance-icon-action"),
        actionButton("✎", (button) => dialog.open(savingsGoalConfig(goal), button), "finance-icon-action"),
        actionButton("×", (button) => twoStepDelete(button, () => {
          const nextState = loadState();
          nextState.finances.savingsGoals = nextState.finances.savingsGoals.filter((item) => item.id !== goal.id);
          saveState(nextState, "Savings goal deleted.");
        }), "finance-icon-action finance-delete-action")
      );
      top.append(copy, actions);
      const amounts = element("div", { className: "finance-goal-amounts" });
      amounts.append(element("span", { text: `${formatMoney(saved)} saved` }), element("span", { text: `${formatMoney(target)} target` }));
      const progress = element("div", { className: "finance-goal-progress" });
      const fill = element("i");
      fill.style.width = `${percent}%`;
      progress.append(fill);
      item.append(top, amounts, progress);
      list.append(item);
    });
    card.append(list);
    return card;
  }

  function renderTransactionHistory(state, transactions) {
    const panel = element("article", { className: "finance-panel finance-transactions" });
    const heading = element("div", { className: "finance-transaction-heading" });
    const copy = element("div");
    copy.append(element("p", { className: "eyebrow", text: monthLabel(selectedMonth) }), element("h3", { text: "Transaction history" }));
    const filter = element("select", { attrs: { "aria-label": "Filter transactions" } });
    [["all", "All"], ["income", "Income"], ["expense", "Expenses"]].forEach(([value, label]) => {
      const option = element("option", { text: label, attrs: { value } });
      option.selected = transactionFilter === value;
      filter.append(option);
    });
    filter.addEventListener("change", () => {
      transactionFilter = filter.value;
      renderFinanceContents(qs("#financeCenter"));
    });
    heading.append(copy, filter);
    panel.append(heading);

    const visible = transactions.filter((entry) => transactionFilter === "all" || entry.type === transactionFilter);
    if (!visible.length) {
      panel.append(element("p", { className: "finance-empty", text: "No matching transactions for this month." }));
      return panel;
    }
    const list = element("div", { className: "finance-transaction-list" });
    visible.forEach((entry) => {
      const row = element("article", { className: `finance-transaction-row ${entry.type}` });
      const mark = element("span", { className: "finance-transaction-mark", text: entry.type === "income" ? "+" : "−" });
      const details = element("div", { className: "finance-transaction-copy" });
      details.append(element("strong", { text: entry.title }), element("small", { text: `${entry.category} · ${formatDate(entry.createdAt)}` }));
      const amount = element("b", { text: `${entry.type === "income" ? "+" : "−"}${formatMoney(entry.amount)}` });
      const actions = element("span", { className: "finance-row-actions" });
      actions.append(actionButton("✎", (button) => {
        if (entry.type === "income") {
          const income = state.finances.incomes.find((item) => item.id === entry.id);
          if (income) dialog.open(addIncomeConfig(income), button);
        } else {
          const expense = { ...entry, note: entry.title };
          dialog.open(addExpenseConfig(expense), button);
        }
      }, "finance-icon-action"));
      actions.append(actionButton("×", (button) => twoStepDelete(button, () => {
        const nextState = loadState();
        if (entry.type === "income") {
          nextState.finances.incomes = nextState.finances.incomes.filter((item) => item.id !== entry.id);
        } else {
          const week = nextState.weekly[entry.weekKey];
          if (week && Array.isArray(week.expenses)) week.expenses = week.expenses.filter((item) => item.id !== entry.id);
        }
        saveState(nextState, `${entry.type === "income" ? "Income" : "Expense"} deleted.`);
      }), "finance-icon-action finance-delete-action"));
      row.append(mark, details, amount, actions);
      list.append(row);
    });
    panel.append(list);
    return panel;
  }

  function addSettingsVisibilityToggle(state, section, nav) {
    const grid = qs("#settings .settings-toggle-grid");
    const form = qs("#settingsForm");
    if (!grid || !form || qs('input[name="visible-financeCenter"]', grid)) return;
    const label = element("label", { className: "settings-toggle" });
    const checkbox = element("input", { attrs: { type: "checkbox", name: "visible-financeCenter", value: "financeCenter" } });
    checkbox.checked = !state.finances.hidden;
    const copy = element("span");
    copy.append(element("strong", { text: "Finance centre" }), element("small", { text: "Income, spending, monthly summaries, and savings goals." }));
    label.append(checkbox, copy);
    grid.append(label);

    form.addEventListener("submit", () => {
      const nextState = loadState();
      nextState.finances.hidden = !checkbox.checked;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    }, { capture: true });

    checkbox.addEventListener("change", () => {
      section.hidden = !checkbox.checked;
      if (nav) nav.hidden = !checkbox.checked;
    });
  }

  buildFinanceCenter();
})();
