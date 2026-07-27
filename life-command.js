"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.lifeCommand.v1";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const pad = (value) => String(value).padStart(2, "0");
  const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const today = dateKey();
  const month = today.slice(0, 7);
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const number = (value) => Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const money = (value, currency = "KSh") => `${currency} ${Math.round(number(value)).toLocaleString("en-KE")}`;
  const safeArray = (value) => Array.isArray(value) ? value : [];

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; }
    catch { return fallback; }
  }

  function normalize(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    return {
      version: 1,
      captures: safeArray(source.captures),
      reviews: safeArray(source.reviews),
      priorities: safeArray(source.priorities),
      ...source
    };
  }

  let state = normalize(read(STORAGE_KEY, null));
  let modalType = "task";
  let modalMode = "capture";
  let modalOpener = null;

  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function saveState() { write(STORAGE_KEY, state); }
  function parseDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? new Date(`${value}T12:00:00`) : null; }
  function daysFromToday(value) {
    const date = parseDate(value);
    if (!date) return null;
    const base = parseDate(today);
    return Math.round((date - base) / 86400000);
  }
  function formatDate(value, options = { day: "numeric", month: "short" }) {
    const date = parseDate(value);
    return date ? date.toLocaleDateString("en-KE", options) : "No date";
  }
  function weekStartKey() {
    const date = new Date();
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);
    return dateKey(date);
  }
  function thisWeek(items, field = "date") { const start = weekStartKey(); return safeArray(items).filter((item) => String(item?.[field] || item?.createdAt || "").slice(0, 10) >= start); }
  function currentSettings() {
    return { name: "Charry", course: "Pharmacy", year: "4.3", totalUnits: 134, completedUnits: 76, currency: "KSh", ...read("dashboardSettings", {}) };
  }

  function collect() {
    const settings = currentSettings();
    const events = safeArray(read("calendarEvents", [])).filter((item) => item?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const exams = safeArray(read("examEntries", [])).filter((item) => item?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const attachments = safeArray(read("attachmentApplications", []));
    const studies = safeArray(read("schoolStudyItems", []));
    const studySessions = safeArray(read("studySessions", []));
    const journal = safeArray(read("journalEntries", []));
    const memories = safeArray(read("memoryEntries", []));
    const moods = read("moodHistory", {});
    const workouts = safeArray(read("workoutHistory", []));
    const meals = safeArray(read("mealLogs", []));
    const prayers = safeArray(read("prayerHistory", []));
    const people = safeArray(read("peopleCheckins", []));
    const tasks = safeArray(read("captureTasks", []));
    const goals = qsa("#quarterGoals input, #monthGoals input, #workGoalList input");
    const completedGoals = goals.filter((input) => input.checked).length;
    const habitInputs = qsa(".check-list input, #customHabitList input");
    const habitsDone = habitInputs.filter((input) => input.checked).length;
    const categoryExpenses = read("categoryExpenses", {});
    const ledger = safeArray(read("expenseLedger", []));
    const expenseTotal = ledger.length
      ? ledger.filter((item) => String(item.date || item.createdAt || "").startsWith(month)).reduce((sum, item) => sum + number(item.amount), 0)
      : Object.values(categoryExpenses || {}).reduce((sum, value) => sum + number(value), 0);
    const savings = safeArray(read("savingsGoals", []));
    const savingsSaved = savings.reduce((sum, item) => sum + number(item.saved), 0);
    const savingsTarget = savings.reduce((sum, item) => sum + number(item.target), 0);
    const creator = globalThis.MyLittleLifeCreator?.getState?.() || { posts: [], accounts: [], revenue: [], reviews: [] };
    const upcoming = [
      ...events.map((item) => ({ ...item, kind: "Calendar", label: item.title })),
      ...exams.map((item) => ({ ...item, kind: "Exam", label: `${item.code || "Exam"} · ${item.name || "Exam"}` }))
    ].filter((item) => daysFromToday(item.date) !== null && daysFromToday(item.date) >= 0).sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return {
      settings, events, exams, attachments, studies, studySessions, journal, memories, moods, workouts, meals, prayers,
      people, tasks, goals, completedGoals, habitsDone, habitTotal: habitInputs.length, expenseTotal, savingsSaved,
      savingsTarget, creator, upcoming, todayEvents: events.filter((item) => item.date === today),
      todayTasks: tasks.filter((item) => !item.done && (!item.date || item.date === today)),
      overdueTasks: tasks.filter((item) => !item.done && item.date && item.date < today)
    };
  }

  function attentionItems(data) {
    const items = [];
    const nextExam = data.exams.find((item) => daysFromToday(item.date) >= 0);
    const prep = safeArray(read("examPrepItems", []));
    if (nextExam) {
      const readiness = prep.find((item) => String(item.code || "").toUpperCase().includes(String(nextExam.code || "").toUpperCase()));
      if (daysFromToday(nextExam.date) <= 21 && number(readiness?.progress) < 60) items.push({ tone: "urgent", text: `${nextExam.code || "Exam"} is ${daysFromToday(nextExam.date)} days away`, action: "Plan a focused revision block", href: "#examPrep" });
    }
    if (data.overdueTasks.length) items.push({ tone: "urgent", text: `${data.overdueTasks.length} task${data.overdueTasks.length === 1 ? " is" : "s are"} overdue`, action: "Reschedule or complete the next one", href: "#planner" });
    const weekday = new Date().getDay();
    const attachmentToday = data.attachments.some((item) => String(item.updatedAt || item.createdAt || item.date || "").slice(0, 10) === today);
    if ([2, 4].includes(weekday) && !attachmentToday) items.push({ tone: "focus", text: "Protected attachment-search day", action: "Research or follow up with one facility", href: "#attachmentApplications" });
    if (!data.moods[today]) items.push({ tone: "gentle", text: "Today's mood is not logged", action: "Take a ten-second check-in", href: "#trackers" });
    const currentWeekReview = state.reviews.some((item) => String(item.week || "") >= weekStartKey());
    if (!currentWeekReview && [0, 6].includes(weekday)) items.push({ tone: "gentle", text: "Your weekly reset is ready", action: "Turn this week into a clearer next week", href: "#lifeInsights" });
    const dueContent = safeArray(data.creator.posts).filter((post) => post.status !== "Published" && post.publishDate && post.publishDate <= today);
    if (dueContent.length) items.push({ tone: "focus", text: `${dueContent.length} content item${dueContent.length === 1 ? "" : "s"} due`, action: "Publish, reschedule, or simplify", href: "#content" });
    if (!items.length) items.push({ tone: "clear", text: "Nothing urgent is pulling at you", action: "Choose one meaningful next step", href: "#lifeOverview" });
    return items.slice(0, 4);
  }

  function progressPercent(value, total) { return Math.max(0, Math.min(100, total ? Math.round(value / total * 100) : 0)); }
  function nextAction(data, attention) {
    const priority = attention.find((item) => item.tone === "urgent") || attention[0];
    if (priority?.tone !== "clear") return { title: priority.action, detail: priority.text, href: priority.href, label: "Recommended now" };
    if (!data.todayTasks.length) return { title: "Choose your three priorities", detail: "A calm day works better when everything is not equally important.", href: "#lifeOverview", label: "Create direction" };
    return { title: data.todayTasks[0].title || "Start your next task", detail: data.todayTasks[0].detail || "One focused step is enough.", href: "#planner", label: "Next best action" };
  }

  function overviewCard(label, title, body, footer, tone) {
    return `<article class="life-pillar-card ${tone}"><p class="eyebrow">${esc(label)}</p><h3>${esc(title)}</h3><p>${esc(body)}</p><footer>${footer}</footer></article>`;
  }

  function renderOverview() {
    const data = collect();
    const attention = attentionItems(data);
    const next = data.upcoming[0];
    const degreePercent = progressPercent(number(data.settings.completedUnits), number(data.settings.totalUnits));
    const todaySummary = data.todayEvents.length || data.todayTasks.length
      ? `${data.todayEvents.length} event${data.todayEvents.length === 1 ? "" : "s"} · ${data.todayTasks.length} open task${data.todayTasks.length === 1 ? "" : "s"}`
      : "A clear day with room to choose intentionally";
    const nextTitle = next ? next.label : "Nothing scheduled yet";
    const nextDays = next ? daysFromToday(next.date) : null;
    const nextBody = next ? `${formatDate(next.date)}${next.time ? ` · ${next.time}` : ""} · ${nextDays === 0 ? "today" : `in ${nextDays} day${nextDays === 1 ? "" : "s"}`}` : "Add an event, exam, or study block when you are ready.";
    const main = qs("main.dashboard");
    if (!main) return;
    let section = qs("#lifeOverview");
    if (!section) {
      section = document.createElement("section");
      section.id = "lifeOverview";
      section.className = "life-overview section";
      const welcome = qs(".welcome-card", main);
      if (welcome) welcome.before(section); else main.prepend(section);
    }
    const attentionMarkup = attention.map((item) => `<a class="life-attention-line ${item.tone}" href="${item.href}"><span></span><b>${esc(item.text)}</b><small>${esc(item.action)}</small></a>`).join("");
    section.innerHTML = `
      <div class="life-overview-head">
        <div><p class="eyebrow">Your life, clearly</p><h2>Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, ${esc(data.settings.name)}.</h2><p>See what matters now, then move into the details only when you need them.</p></div>
        <div class="life-overview-actions"><button type="button" class="life-secondary" data-life-action="review">Weekly reset</button><button type="button" class="life-primary" data-life-action="capture">＋ Quick add</button></div>
      </div>
      <div class="life-pillar-grid">
        ${overviewCard("Now", data.moods[today] || localStorage.getItem("dailyMood") || "Your day is waiting", todaySummary, `<button type="button" data-life-action="capture" data-life-type="mood">Check in</button><span>${new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "short" })}</span>`, "now")}
        ${overviewCard("Next", nextTitle, nextBody, `<a href="${next?.kind === "Exam" ? "#examTracker" : "#calendar"}">Open schedule →</a><span>${next?.kind || "Calendar"}</span>`, "next")}
        ${overviewCard("Progress", `${data.settings.completedUnits} of ${data.settings.totalUnits} units`, `${degreePercent}% of your BPharm degree recorded as complete.`, `<div class="life-inline-progress"><i style="width:${degreePercent}%"></i></div><span>${Math.max(0, number(data.settings.totalUnits) - number(data.settings.completedUnits))} remaining</span>`, "progress")}
        <article class="life-pillar-card attention"><p class="eyebrow">Needs attention</p><div class="life-attention-list">${attentionMarkup}</div></article>
      </div>
      ${renderNextAction(nextAction(data, attention))}
      <div class="life-category-heading"><div><p class="eyebrow">Category overview</p><h3>Every part of your life, one level deep.</h3></div><a href="#lifeInsights">See patterns →</a></div>
      <div class="life-category-grid">${renderCategories(data)}</div>`;
    bindOverviewActions(section);
  }

  function renderNextAction(action) {
    return `<article class="life-next-action"><span class="life-next-icon">✦</span><div><p class="eyebrow">${esc(action.label)}</p><h3>${esc(action.title)}</h3><p>${esc(action.detail)}</p></div><a href="${action.href}">Go there →</a></article>`;
  }

  function categoryCard(icon, label, status, note, href, value, tone = "rose") {
    return `<a class="life-category-card ${tone}" href="${href}"><span class="life-category-icon">${icon}</span><div><p>${esc(label)}</p><strong>${esc(status)}</strong><small>${esc(note)}</small></div><b>${esc(value)}</b></a>`;
  }

  function renderCategories(data) {
    const published = safeArray(data.creator.posts).filter((post) => post.status === "Published").length;
    const activeWork = safeArray(read("personalBusinesses", [])).length || 4;
    const moodWeek = Object.keys(data.moods || {}).filter((key) => key >= weekStartKey()).length;
    const prayersWeek = thisWeek(data.prayers).filter((item) => item.completed).length;
    const monthPeople = data.people.filter((item) => String(item.date || item.createdAt || today).startsWith(month)).length;
    return [
      categoryCard("✎", "Journal", data.journal.length ? `${data.journal.length} saved entries` : "Ready for your first entry", data.memories.length ? `${data.memories.length} memories kept` : "Thoughts, gratitude and memories", "#journalArchive", String(data.journal.length), "rose"),
      categoryCard("♡", "Wellness", data.moods[today] || "Check in gently", `${moodWeek} mood check-ins this week · ${thisWeek(data.workouts).length} workouts`, "#trackers", `${moodWeek}/7`, "lilac"),
      categoryCard("✧", "Faith", prayersWeek ? `${prayersWeek} reflections this week` : "Make a quiet moment", "Prayer, gratitude and spiritual notes", "#trackers", String(prayersWeek), "gold"),
      categoryCard("▤", "School", `${data.settings.completedUnits}/${data.settings.totalUnits} units`, data.upcoming.find((item) => item.kind === "Exam")?.label || `${data.studies.length} study items saved`, "#schoolHub", `${progressPercent(data.settings.completedUnits, data.settings.totalUnits)}%`, "purple"),
      categoryCard("◇", "Work", `${activeWork} business spaces`, `${data.attachments.length} attachment facilities tracked`, "#workHub", String(data.attachments.length), "sage"),
      categoryCard("◉", "Content", `${safeArray(data.creator.posts).length} content items`, `${published} published · ${safeArray(data.creator.accounts).length || 4} brands`, "#content", String(published), "rose"),
      categoryCard("₵", "Money", `${money(data.expenseTotal, data.settings.currency)} this month`, data.savingsTarget ? `${money(data.savingsSaved, data.settings.currency)} saved toward goals` : "Add a savings target when useful", "#financeBreakdown", data.savingsTarget ? `${progressPercent(data.savingsSaved, data.savingsTarget)}%` : "—", "gold"),
      categoryCard("♡", "People", `${data.people.length} saved check-ins`, monthPeople ? `${monthPeople} connection moments this month` : "Family, friends and relationships", "#peopleHub", String(monthPeople), "lilac"),
      categoryCard("✦", "Vision", `${data.completedGoals}/${data.goals.length || 0} goals checked`, "Vision board, projects and milestones", "#visionBoard", data.goals.length ? `${progressPercent(data.completedGoals, data.goals.length)}%` : "—", "sage")
    ].join("");
  }

  function bindOverviewActions(root) {
    qsa("[data-life-action='capture']", root).forEach((button) => button.addEventListener("click", () => openCapture(button.dataset.lifeType || "task", button)));
    qs("[data-life-action='review']", root)?.addEventListener("click", (event) => openReview(event.currentTarget));
  }

  const captureTypes = [
    ["task", "Task"], ["journal", "Journal"], ["mood", "Mood"], ["study", "Study"], ["expense", "Expense"],
    ["prayer", "Prayer"], ["meal", "Meal"], ["workout", "Workout"], ["people", "People"], ["event", "Event"], ["memory", "Memory"], ["content", "Content"]
  ];

  function input(name, label, options = {}) {
    const required = options.required ? " required" : "";
    const full = options.full ? " full" : "";
    if (options.type === "textarea") return `<label class="life-field${full}"><span>${esc(label)}</span><textarea name="${name}" maxlength="${options.maxlength || 1200}" placeholder="${esc(options.placeholder || "")}"${required}>${esc(options.value || "")}</textarea></label>`;
    if (options.type === "select") return `<label class="life-field${full}"><span>${esc(label)}</span><select name="${name}"${required}>${options.options.map((option) => `<option value="${esc(typeof option === "string" ? option : option.value)}">${esc(typeof option === "string" ? option : option.label)}</option>`).join("")}</select></label>`;
    return `<label class="life-field${full}"><span>${esc(label)}</span><input name="${name}" type="${options.type || "text"}" value="${esc(options.value || "")}" placeholder="${esc(options.placeholder || "")}"${options.min !== undefined ? ` min="${options.min}"` : ""}${options.max !== undefined ? ` max="${options.max}"` : ""}${required}></label>`;
  }

  function captureFields(type) {
    const commonTitle = input("title", type === "expense" ? "What was it for?" : type === "people" ? "Who or what should you remember?" : "Title", { required: true, full: true, placeholder: "Keep it short and specific" });
    const fields = {
      task: commonTitle + input("date", "Due date", { type: "date", value: today }) + input("area", "Area", { type: "select", options: ["School", "Work", "Personal", "Health", "Relationship"] }) + input("detail", "Next step", { type: "textarea", full: true, placeholder: "What does done look like?" }),
      journal: commonTitle + input("detail", "Entry", { type: "textarea", full: true, required: true, placeholder: "Write whatever feels true…" }),
      mood: input("mood", "Right now, I feel", { type: "select", options: ["Radiant", "Good", "Okay", "Low", "Overwhelmed"] }) + input("energy", "Energy", { type: "select", options: ["1 · Empty", "2 · Low", "3 · Steady", "4 · Good", "5 · Full"] }) + input("detail", "What may be influencing this?", { type: "textarea", full: true, placeholder: "Sleep, school, money, people, food…" }),
      study: commonTitle + input("unit", "Unit", { placeholder: "e.g. BPL4203" }) + input("method", "Method", { type: "select", options: ["Reading", "Past papers", "Summary", "Active recall"] }) + input("duration", "Minutes", { type: "number", min: 1, max: 600, value: "45" }) + input("date", "Study date", { type: "date", value: today }),
      expense: commonTitle + input("amount", "Amount (KSh)", { type: "number", min: 1, required: true }) + input("category", "Category", { type: "select", options: ["Food", "Transport", "School", "Personal", "Relationship", "Business", "Content", "Other"] }) + input("scope", "Budget", { type: "select", options: ["Personal", "Business"] }),
      prayer: input("title", "Prayer or intention", { required: true, full: true, placeholder: "What are you carrying?" }) + input("status", "Status", { type: "select", options: ["Reflected", "Completed", "Ongoing"] }) + input("detail", "Private note", { type: "textarea", full: true }),
      meal: input("mealType", "Meal", { type: "select", options: ["Breakfast", "Lunch", "Dinner", "Snack"] }) + input("title", "What did you eat?", { required: true, full: true }) + input("detail", "How did it feel?", { placeholder: "Energy, symptoms, satisfaction…", full: true }),
      workout: input("title", "Movement", { required: true, full: true, placeholder: "Walk, gym, stretch…" }) + input("duration", "Minutes", { type: "number", min: 1, max: 600 }) + input("detail", "How did it feel?", { full: true }),
      people: commonTitle + input("group", "Circle", { type: "select", options: ["Family", "Friends", "Relationship"] }) + input("date", "Follow-up date", { type: "date" }) + input("detail", "Context", { type: "textarea", full: true, placeholder: "Birthday, gift, promise, conversation…" }),
      event: commonTitle + input("date", "Date", { type: "date", value: today, required: true }) + input("time", "Time", { type: "time" }) + input("area", "Category", { type: "select", options: ["School", "Work", "Personal", "Health", "Relationship"] }),
      memory: commonTitle + input("detail", "Memory", { type: "textarea", full: true, required: true, placeholder: "What made this worth keeping?" }) + input("people", "People", { full: true, placeholder: "Optional names" }),
      content: commonTitle + input("accountId", "Brand", { type: "select", options: (globalThis.MyLittleLifeCreator?.getState?.().accounts || []).map((account) => ({ value: account.id, label: account.name })) }) + input("platform", "Platform", { type: "select", options: ["Facebook", "Instagram", "TikTok", "YouTube", "Website", "Blog"] }) + input("detail", "Angle or next step", { type: "textarea", full: true })
    };
    return fields[type] || fields.task;
  }

  function ensureModal() {
    if (qs("#lifeCaptureModal")) return;
    const modal = document.createElement("div");
    modal.id = "lifeCaptureModal";
    modal.className = "life-modal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `<button class="life-modal-backdrop" type="button" data-life-close aria-label="Close"></button><form class="life-modal-card" id="lifeCaptureForm" role="dialog" aria-modal="true" aria-labelledby="lifeModalTitle"><button class="life-modal-close" type="button" data-life-close aria-label="Close">×</button><p class="eyebrow">Universal quick add</p><h2 id="lifeModalTitle">Capture it once.</h2><p class="life-modal-intro">Choose the area and save it directly to the right part of your dashboard.</p><div class="life-type-strip" id="lifeTypeStrip">${captureTypes.map(([value, label]) => `<button type="button" data-life-capture-type="${value}">${label}</button>`).join("")}</div><div class="life-modal-fields" id="lifeModalFields"></div><p class="life-form-error" id="lifeFormError" role="alert"></p><div class="life-modal-footer"><button type="button" class="life-secondary" data-life-close>Cancel</button><button type="submit" class="life-primary">Save to my dashboard</button></div></form>`;
    document.body.append(modal);
    qsa("[data-life-close]", modal).forEach((button) => button.addEventListener("click", closeCapture));
    qs("#lifeTypeStrip", modal).addEventListener("click", (event) => { const button = event.target.closest("[data-life-capture-type]"); if (button) setCaptureType(button.dataset.lifeCaptureType); });
    qs("#lifeCaptureForm", modal).addEventListener("submit", (event) => { if (modalMode === "capture") saveCapture(event); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && modal.classList.contains("open")) closeCapture(); });
  }

  function setCaptureType(type) {
    modalType = captureTypes.some(([value]) => value === type) ? type : "task";
    const strip = qs("#lifeTypeStrip");
    if (strip && !qs("[data-life-capture-type]", strip)) strip.innerHTML = captureTypes.map(([value, label]) => `<button type="button" data-life-capture-type="${value}">${label}</button>`).join("");
    qsa("[data-life-capture-type]").forEach((button) => button.classList.toggle("active", button.dataset.lifeCaptureType === modalType));
    qs("#lifeModalFields").innerHTML = captureFields(modalType);
    qs("#lifeFormError").textContent = "";
  }

  function openCapture(type = "task", opener = null) {
    ensureModal(); modalMode = "capture"; restoreCaptureSubmit(); modalOpener = opener || document.activeElement; setCaptureType(type);
    qs(".life-modal-intro").textContent = "Choose the area and save it directly to the right part of your dashboard.";
    const modal = qs("#lifeCaptureModal"); modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("life-modal-open");
    requestAnimationFrame(() => qs("input, textarea, select", qs("#lifeModalFields"))?.focus());
  }
  function closeCapture() {
    const modal = qs("#lifeCaptureModal"); modal?.classList.remove("open"); modal?.setAttribute("aria-hidden", "true"); document.body.classList.remove("life-modal-open"); modalOpener?.focus?.();
  }

  function append(key, item, limit = 200) { const items = safeArray(read(key, [])); items.push(item); write(key, items.slice(-limit)); return items; }
  function saveCapture(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const values = Object.fromEntries(new FormData(form).entries());
    const title = String(values.title || values.mood || values.mealType || modalType).trim();
    const createdAt = new Date().toISOString();
    const record = { id: uid(), type: modalType, title, detail: String(values.detail || "").trim(), date: String(values.date || today), createdAt };
    try {
      if (modalType === "journal") append("journalEntries", { title, body: record.detail, createdAt });
      if (modalType === "task") append("captureTasks", { title, detail: record.detail, date: record.date, category: values.area, done: false, createdAt });
      if (modalType === "mood") {
        localStorage.setItem("dailyMood", values.mood); const moods = read("moodHistory", {}); moods[today] = values.mood; write("moodHistory", moods);
        append("mentalHealthHistory", { date: today, feeling: values.mood, energy: String(values.energy || "").slice(0, 1), note: record.detail });
      }
      if (modalType === "study") append("schoolStudyItems", { value: title, meta: `${values.unit || "General"} · ${values.method} · ${values.duration || 45} min`, date: record.date, icon: "◒" });
      if (modalType === "expense") {
        const amount = number(values.amount); if (amount <= 0) throw new Error("Add an amount greater than zero.");
        const category = String(values.category || "Personal").toLowerCase();
        append("expenseLedger", { category, amount, note: title, scope: values.scope || "Personal", date: today, createdAt });
        const totals = read("categoryExpenses", {}); const legacyCategory = ["food", "transport", "school", "personal"].includes(category) ? category : "personal"; totals[legacyCategory] = number(totals[legacyCategory]) + amount; write("categoryExpenses", totals);
        localStorage.setItem("weeklyExpenses", String(number(localStorage.getItem("weeklyExpenses")) + amount));
      }
      if (modalType === "prayer") append("prayerHistory", { date: today, completed: values.status === "Completed", status: values.status, title, note: record.detail });
      if (modalType === "meal") append("mealLogs", { date: today, type: values.mealType, detail: title, note: record.detail });
      if (modalType === "workout") append("workoutHistory", { date: today, activity: title, duration: values.duration ? `${values.duration} min` : "", note: record.detail });
      if (modalType === "people") append("peopleCheckins", { group: String(values.group || "Friends").toLowerCase(), title, detail: record.detail || (values.date ? `Follow up ${values.date}` : "Check in soon"), date: values.date || "", createdAt });
      if (modalType === "event") append("calendarEvents", { date: values.date, title, meta: `${values.area || "Personal"}${values.time ? ` · ${values.time}` : ""}`, color: "coral-event" });
      if (modalType === "memory") { append("memoryEntries", { title, body: record.detail, people: values.people || "", date: today, createdAt }); localStorage.setItem("savedMemory", title); }
      if (modalType === "content") {
        const saved = globalThis.MyLittleLifeCreator?.quickAddIdea?.({ title, accountId: values.accountId, platform: values.platform, notes: record.detail });
        if (!saved) append("contentIdeas", { title, detail: record.detail, accountId: values.accountId, platform: values.platform, status: "idea", createdAt });
      }
      state.captures.unshift(record); state.captures = state.captures.slice(0, 300); saveState(); closeCapture(); syncVisibleDetails(modalType, values, record); renderAll(); toast(`${captureTypes.find(([value]) => value === modalType)?.[1] || "Item"} saved.`);
    } catch (error) { qs("#lifeFormError").textContent = error?.message || "Please check the entry and try again."; }
  }

  function syncVisibleDetails(type, values, record) {
    if (type === "mood") { qsa("[data-mood]").forEach((button) => button.classList.toggle("selected", button.dataset.mood === values.mood)); }
    if (type === "task") qs("#plannerList")?.insertAdjacentHTML("beforeend", `<p><span>□</span> ${esc(record.title)} <small>${esc(record.detail || record.date)}</small></p>`);
    if (type === "study") qs("#studyList")?.insertAdjacentHTML("beforeend", `<div><strong>${esc(record.title)}</strong><small>${esc(values.unit || "General")} · ${esc(values.method)} · ${esc(values.duration || 45)} min</small><span class="study-tag">PENDING</span></div>`);
    if (type === "people") qs("#peopleCheckinList")?.insertAdjacentHTML("beforeend", `<div data-person-group="${esc(String(values.group).toLowerCase())}"><strong>${esc(record.title)}</strong><small>${esc(record.detail || "Check in soon")}</small><span>${esc(values.group)}</span></div>`);
  }

  function toast(message) {
    let node = qs("#lifeToast"); if (!node) { node = document.createElement("div"); node.id = "lifeToast"; node.className = "life-toast"; node.setAttribute("role", "status"); document.body.append(node); }
    node.textContent = message; node.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => node.classList.remove("show"), 2600);
  }

  function insightCards(data) {
    const moodWeek = Object.entries(data.moods || {}).filter(([key]) => key >= weekStartKey()).map(([, value]) => value);
    const moodScores = { Radiant: 5, Good: 4, Okay: 3, Low: 2, Overwhelmed: 1 };
    const moodAverage = moodWeek.length ? moodWeek.reduce((sum, value) => sum + (moodScores[value] || 0), 0) / moodWeek.length : 0;
    const workoutWeek = thisWeek(data.workouts).length;
    const mealWeek = thisWeek(data.meals).length;
    const studyWeek = thisWeek(data.studies).length + thisWeek(data.studySessions).length;
    const peopleWeek = thisWeek(data.people, "createdAt").length;
    const creatorWeek = safeArray(data.creator.posts).filter((post) => String(post.publishDate || post.createdAt || "").slice(0, 10) >= weekStartKey()).length;
    const publishedWeek = safeArray(data.creator.posts).filter((post) => post.status === "Published" && String(post.publishDate || post.updatedAt || "").slice(0, 10) >= weekStartKey()).length;
    const expenseByCategory = safeArray(read("expenseLedger", [])).filter((item) => String(item.date || item.createdAt || "").startsWith(month)).reduce((map, item) => { const key = item.category || "other"; map[key] = (map[key] || 0) + number(item.amount); return map; }, {});
    const topExpense = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
    const cards = [
      { icon: "♡", area: "Wellness", title: moodWeek.length ? `${moodAverage.toFixed(1)} / 5 average mood` : "No mood pattern yet", detail: `${moodWeek.length} check-ins · ${workoutWeek} workouts · ${mealWeek} meals logged`, action: moodWeek.length < 3 ? "Add a few gentle check-ins before drawing conclusions." : "Notice what happened on your highest-energy day.", href: "#trackers" },
      { icon: "▤", area: "School", title: `${studyWeek} study records this week`, detail: data.upcoming.find((item) => item.kind === "Exam") ? `Next: ${data.upcoming.find((item) => item.kind === "Exam").label}` : "No upcoming exam date is saved.", action: studyWeek ? "Repeat the study method that felt most effective." : "Schedule one reading, recall, summary, or past-paper block.", href: "#schoolHub" },
      { icon: "◇", area: "Career & work", title: `${data.attachments.length} attachment facilities`, detail: `${data.attachments.filter((item) => ["Applied", "Follow-up", "Interview", "Accepted"].includes(item.status)).length} have moved beyond research`, action: [2, 4].includes(new Date().getDay()) ? "Use today's protected search block for one application or follow-up." : "Prepare the next application before Tuesday or Thursday.", href: "#attachmentApplications" },
      { icon: "◉", area: "Content", title: `${creatorWeek} content items touched this week`, detail: `${publishedWeek} published across ${safeArray(data.creator.accounts).length || 4} brands`, action: publishedWeek ? "Open analytics and record what the audience taught you." : "Move one useful idea into creation instead of adding more ideas.", href: "#content" },
      { icon: "₵", area: "Money", title: `${money(data.expenseTotal, data.settings.currency)} logged this month`, detail: topExpense ? `${topExpense[0]} is the largest category at ${money(topExpense[1], data.settings.currency)}` : "No category pattern yet.", action: topExpense ? "Check whether that category still matches your priorities." : "Log spending as it happens so the monthly picture becomes useful.", href: "#financeBreakdown" },
      { icon: "♡", area: "People", title: `${peopleWeek} check-ins this week`, detail: `${data.people.length} connection reminders saved`, action: peopleWeek ? "Keep the relationship that felt nourishing visible." : "Choose one thoughtful check-in, not a long social to-do list.", href: "#peopleHub" }
    ];
    return cards.map((card) => `<article class="life-insight-card"><span>${card.icon}</span><div><p class="eyebrow">${esc(card.area)}</p><h3>${esc(card.title)}</h3><p>${esc(card.detail)}</p><small>${esc(card.action)}</small><a href="${card.href}">Open details →</a></div></article>`).join("");
  }

  function renderInsights() {
    const data = collect();
    let section = qs("#lifeInsights");
    if (!section) {
      section = document.createElement("section"); section.id = "lifeInsights"; section.className = "life-insights section";
      const monthly = qs("#monthlySummary"); if (monthly) monthly.before(section); else qs("main.dashboard")?.append(section);
    }
    const latest = state.reviews[0];
    section.innerHTML = `<div class="life-insights-head"><div><p class="eyebrow">Patterns, not pressure</p><h2>What your week is teaching you.</h2><p>These summaries use only information you have actually logged.</p></div><button class="life-primary" type="button" data-life-action="review">＋ Weekly reset</button></div><div class="life-insights-grid">${insightCards(data)}</div><article class="life-review-summary"><div><p class="eyebrow">Latest weekly reset</p><h3>${latest ? esc(`Week ending ${formatDate(latest.week, { day: "numeric", month: "short", year: "numeric" })}`) : "Turn experience into a smarter next week."}</h3><p>${latest ? esc(latest.proud || "Review saved.") : "Capture one win, one difficulty, three priorities, and one promise to yourself."}</p></div>${latest ? `<div class="life-review-priorities"><span>Next priorities</span>${safeArray(latest.priorities).map((item) => `<b>${esc(item)}</b>`).join("")}<small>${esc(latest.promise || "")}</small></div>` : ""}<button type="button" class="life-secondary" data-life-action="review">${latest ? "Update review" : "Start review"}</button></article>`;
    qsa("[data-life-action='review']", section).forEach((button) => button.addEventListener("click", () => openReview(button)));
  }

  function openReview(opener) {
    ensureModal(); modalMode = "review"; modalOpener = opener || document.activeElement;
    const modal = qs("#lifeCaptureModal"); const latest = state.reviews[0] || {};
    qs("#lifeModalTitle").textContent = "Turn this week into a clearer next week.";
    qs(".life-modal-intro", modal).textContent = "Keep it honest and short. The purpose is a useful next action, not a perfect report.";
    qs("#lifeTypeStrip").innerHTML = "<span class='life-review-label'>Weekly life review</span>";
    qs("#lifeModalFields").innerHTML = input("week", "Week ending", { type: "date", value: today, required: true }) + input("proud", "What are you proud of?", { type: "textarea", full: true, required: true, value: latest.proud || "" }) + input("heavy", "What felt heavy?", { type: "textarea", full: true, value: latest.heavy || "" }) + input("priorities", "Three priorities for next week", { type: "textarea", full: true, required: true, placeholder: "One per line", value: safeArray(latest.priorities).join("\n") }) + input("promise", "One gentle promise to yourself", { full: true, value: latest.promise || "" });
    qs("#lifeFormError").textContent = "";
    const form = qs("#lifeCaptureForm"); form.onsubmit = (event) => {
      event.preventDefault(); if (!form.reportValidity()) return; const values = Object.fromEntries(new FormData(form).entries());
      const review = { id: uid(), week: values.week, proud: values.proud.trim(), heavy: values.heavy.trim(), priorities: values.priorities.split(/\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 3), promise: values.promise.trim(), createdAt: new Date().toISOString() };
      state.reviews.unshift(review); state.reviews = state.reviews.slice(0, 52); saveState(); closeCapture(); ensureModal(); renderAll(); toast("Weekly reset saved.");
    };
    modal.classList.add("open"); modal.setAttribute("aria-hidden", "false"); document.body.classList.add("life-modal-open"); requestAnimationFrame(() => qs("input, textarea", qs("#lifeModalFields"))?.focus());
  }

  function restoreCaptureSubmit() { const form = qs("#lifeCaptureForm"); if (form) form.onsubmit = null; }

  function rebuildNavigation() {
    const nav = qs(".sidebar nav"); if (!nav || nav.dataset.lifeReady) return; nav.dataset.lifeReady = "true";
    const primary = [
      ["#home", "⌂", "Today"], ["#journalArchive", "✎", "Journal"], ["#trackers", "♡", "Wellness"], ["#schoolHub", "▤", "School"],
      ["#workHub", "◇", "Work"], ["#content", "◉", "Content"], ["#financeBreakdown", "₵", "Money"], ["#peopleHub", "♡", "People"],
      ["#calendar", "▦", "Calendar"], ["#visionBoard", "✧", "Vision"], ["#lifeInsights", "↗", "Insights"]
    ];
    const more = [["#examTracker", "◇", "Exams"], ["#customHabits", "♡", "Habits"], ["#routines", "↻", "Routines"], ["#projectBoard", "◇", "Projects"], ["#resourceVault", "▧", "Library"], ["#dashboardSearch", "⌕", "Search"], ["#dataManagement", "⚙", "Data & settings"]];
    nav.innerHTML = `<div class="life-nav-main">${primary.map(([href, icon, label], index) => `<a class="${index === 0 ? "active" : ""}" href="${href}"><span>${icon}</span>${label}</a>`).join("")}</div><button class="life-more-toggle" type="button" aria-expanded="false"><span>•••</span> More tools <b>⌄</b></button><div class="life-nav-more" hidden>${more.map(([href, icon, label]) => `<a href="${href}"><span>${icon}</span>${label}</a>`).join("")}<button type="button" data-life-settings><span>⚙</span> Customize</button></div>`;
    qs(".life-more-toggle", nav).addEventListener("click", (event) => { const open = event.currentTarget.getAttribute("aria-expanded") !== "true"; event.currentTarget.setAttribute("aria-expanded", String(open)); qs(".life-nav-more", nav).hidden = !open; });
    qs("[data-life-settings]", nav).addEventListener("click", () => qs("#openSettings")?.click());
    qsa("a", nav).forEach((link) => link.addEventListener("click", () => { qsa("a", nav).forEach((item) => item.classList.remove("active")); link.classList.add("active"); document.body.classList.remove("life-mobile-menu-open"); document.documentElement.classList.remove("life-mobile-menu-open"); }));
  }

  function buildMobileNav() {
    if (qs("#lifeMobileNav")) return;
    const nav = document.createElement("nav"); nav.id = "lifeMobileNav"; nav.className = "life-mobile-nav"; nav.setAttribute("aria-label", "Mobile dashboard navigation");
    nav.innerHTML = `<a href="#home"><span>⌂</span>Today</a><a href="#calendar"><span>▦</span>Calendar</a><button type="button" data-life-mobile-add aria-label="Quick add"><span>＋</span></button><a href="#lifeInsights"><span>↗</span>Insights</a><button type="button" data-life-mobile-more><span>•••</span>More</button>`;
    document.body.append(nav);
    nav.addEventListener("click", (event) => {
      const link = event.target.closest("a");
      if (link) { document.body.classList.remove("life-mobile-menu-open"); document.documentElement.classList.remove("life-mobile-menu-open"); return; }
      const add = event.target.closest("[data-life-mobile-add]");
      if (add) { restoreCaptureSubmit(); openCapture("task", add); return; }
      const more = event.target.closest("[data-life-mobile-more]");
      if (!more) return;
      event.stopPropagation();
      const opening = !document.body.classList.contains("life-mobile-menu-open");
      document.body.classList.toggle("life-mobile-menu-open", opening);
      document.documentElement.classList.toggle("life-mobile-menu-open", opening);
      more.setAttribute("aria-expanded", String(opening));
      const morePanel = qs(".life-nav-more"); if (morePanel && opening) morePanel.hidden = false;
      qs(".life-more-toggle")?.setAttribute("aria-expanded", String(opening));
    });
  }

  function updateHeader() {
    const settings = currentSettings();
    const eyebrow = qs(".topbar .eyebrow"); if (eyebrow) eyebrow.textContent = new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const title = qs(".topbar h1"); if (title) title.innerHTML = `Hi, ${esc(settings.name)} <span>♡</span>`;
  }

  function renderAll() { renderOverview(); renderInsights(); }

  document.body.classList.add("life-command-upgraded");
  rebuildNavigation(); buildMobileNav(); ensureModal(); updateHeader(); renderAll();
  document.addEventListener("click", (event) => {
    const quick = event.target.closest("[data-life-quick]"); if (quick) { restoreCaptureSubmit(); openCapture(quick.dataset.lifeQuick || "task", quick); }
  });
  globalThis.addEventListener("storage", (event) => { if (event.key !== STORAGE_KEY) { state = normalize(read(STORAGE_KEY, null)); renderAll(); } });
  globalThis.MyLittleLifeCommand = Object.freeze({ render: renderAll, openCapture: (type = "task") => { restoreCaptureSubmit(); openCapture(type); }, getState: () => structuredClone(state) });
})();
