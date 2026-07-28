"use strict";

(() => {
  const STORAGE_KEY = "mllBusinessPlannerV1";
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

  const starterBusinesses = [
    {
      id: "exampoa",
      initials: "EP",
      name: "Exampoa",
      type: "Kenyan education and revision website",
      status: "Active",
      phase: "Launch preparation",
      targetDate: "",
      objective: "Launch publicly, attract useful traffic and begin earning revenue.",
      description: "Revision materials for Grade 1–12 learners, including KCSE preparation resources.",
      notes: "Keep the first launch simple: a clear homepage, easy class navigation, useful starter resources and working analytics.",
      tasks: [
        { id: "ep-task-1", title: "Confirm the first subjects and classes to launch", dueDate: "", priority: "High", detail: "Choose a focused starter library before expanding.", done: false },
        { id: "ep-task-2", title: "Prepare and upload the first revision-material collection", dueDate: "", priority: "High", detail: "Check titles, files, answers and class labels.", done: false },
        { id: "ep-task-3", title: "Check the website on phone and laptop", dueDate: "", priority: "High", detail: "Test navigation, downloads, forms and readability.", done: false },
        { id: "ep-task-4", title: "Create the public launch announcement", dueDate: "", priority: "Medium", detail: "Write one clear message for learners, parents and teachers.", done: false },
        { id: "ep-task-5", title: "Set up traffic and revenue tracking", dueDate: "", priority: "Medium", detail: "Record visitors, downloads, returning users and income.", done: false }
      ],
      goals: [
        { id: "ep-goal-1", title: "Launch the Exampoa website publicly", targetDate: "", progress: 20 },
        { id: "ep-goal-2", title: "Reach the first 100 useful website visits", targetDate: "", progress: 0 },
        { id: "ep-goal-3", title: "Earn the first website revenue", targetDate: "", progress: 0 }
      ],
      sessions: [],
      kpis: [
        { id: "ep-kpi-1", metric: "Website visitors", value: 0, target: 100, unit: "visits" },
        { id: "ep-kpi-2", metric: "Revision resources live", value: 0, target: 20, unit: "resources" },
        { id: "ep-kpi-3", metric: "Revenue", value: 0, target: 1, unit: "KSh" }
      ]
    },
    {
      id: "playmechi",
      initials: "PM",
      name: "PlayMechi",
      type: "Monetized sports blog on Facebook",
      status: "Active",
      phase: "Audience and earnings growth",
      targetDate: "",
      objective: "Post consistently and earn the first monetization paycheck.",
      description: "A sports-content page building reach, consistency and monetized performance.",
      notes: "Build around repeatable content formats so school weeks do not break consistency.",
      tasks: [
        { id: "pm-task-1", title: "Choose three repeatable weekly sports formats", dueDate: "", priority: "High", detail: "For example: match preview, result recap and player story.", done: false },
        { id: "pm-task-2", title: "Create a seven-post content buffer", dueDate: "", priority: "High", detail: "Prepare captions and visuals before scheduling.", done: false },
        { id: "pm-task-3", title: "Review monetization and payout requirements", dueDate: "", priority: "Medium", detail: "Record the remaining threshold and required account details.", done: false },
        { id: "pm-task-4", title: "Review the best post every Sunday", dueDate: "", priority: "Low", detail: "Note topic, format, reach and engagement.", done: false }
      ],
      goals: [
        { id: "pm-goal-1", title: "Earn the first PlayMechi paycheck", targetDate: "", progress: 10 },
        { id: "pm-goal-2", title: "Publish consistently for four weeks", targetDate: "", progress: 0 }
      ],
      sessions: [],
      kpis: [
        { id: "pm-kpi-1", metric: "Posts this month", value: 12, target: 20, unit: "posts" },
        { id: "pm-kpi-2", metric: "Monthly earnings", value: 0, target: 1, unit: "KSh" },
        { id: "pm-kpi-3", metric: "Average reach", value: 0, target: 1000, unit: "people" }
      ]
    },
    {
      id: "leridia",
      initials: "LJ",
      name: "Leridia Jewels",
      type: "Gold-jewelry business",
      status: "Paused",
      phase: "Rebrand planning",
      targetDate: "2027-01-28",
      objective: "Rebrand, prepare stock and open the shop by 28 January 2027.",
      description: "A soft-luxury jewelry brand preparing its identity, suppliers, stock and launch plan.",
      notes: "The rebrand should feel polished and recognizable while keeping startup stock and packaging realistic.",
      tasks: [
        { id: "lj-task-1", title: "Define the new brand mood and ideal customer", dueDate: "", priority: "High", detail: "Write the feelings, style and customer promise.", done: false },
        { id: "lj-task-2", title: "Choose colours, logo direction and packaging", dueDate: "", priority: "High", detail: "Create one consistent visual system.", done: false },
        { id: "lj-task-3", title: "Shortlist jewelry suppliers and compare samples", dueDate: "", priority: "High", detail: "Compare quality, minimum order, timing and price.", done: false },
        { id: "lj-task-4", title: "Build the stock and launch budget", dueDate: "", priority: "Medium", detail: "Include products, packaging, photography and delivery.", done: false },
        { id: "lj-task-5", title: "Prepare launch photos and sales channels", dueDate: "2027-01-14", priority: "Medium", detail: "Leave two weeks for final launch checks.", done: false }
      ],
      goals: [
        { id: "lj-goal-1", title: "Complete the Leridia rebrand", targetDate: "2026-10-31", progress: 0 },
        { id: "lj-goal-2", title: "Have launch stock ready", targetDate: "2026-12-31", progress: 0 },
        { id: "lj-goal-3", title: "Open the shop", targetDate: "2027-01-28", progress: 0 }
      ],
      sessions: [],
      kpis: [
        { id: "lj-kpi-1", metric: "Stock items ready", value: 0, target: 30, unit: "items" },
        { id: "lj-kpi-2", metric: "Launch budget saved", value: 0, target: 100, unit: "%" },
        { id: "lj-kpi-3", metric: "Suppliers approved", value: 0, target: 2, unit: "suppliers" }
      ]
    },
    {
      id: "medical-influencing",
      initials: "MI",
      name: "Medical Influencing",
      type: "Health and wellness creator brand",
      status: "Planned",
      phase: "Foundation before attachment",
      targetDate: "",
      objective: "Build an ethical health-and-wellness platform when attachment begins.",
      description: "Accessible, responsible content shaped by a pharmacy background and real attachment learning.",
      notes: "Keep professional boundaries clear. Share educational information, cite reliable sources and never present personal content as individual medical advice.",
      tasks: [
        { id: "mi-task-1", title: "Define the audience and three content pillars", dueDate: "", priority: "High", detail: "Choose who the page helps and what it covers repeatedly.", done: false },
        { id: "mi-task-2", title: "Write an ethics and privacy checklist", dueDate: "", priority: "High", detail: "Protect patient privacy and separate education from medical advice.", done: false },
        { id: "mi-task-3", title: "Choose the page name, bio and visual direction", dueDate: "", priority: "Medium", detail: "Keep it trustworthy, warm and easy to recognize.", done: false },
        { id: "mi-task-4", title: "Build a bank of ten evidence-based content ideas", dueDate: "", priority: "Medium", detail: "Save a source beside every health claim.", done: false }
      ],
      goals: [
        { id: "mi-goal-1", title: "Prepare the creator foundation before attachment", targetDate: "", progress: 0 },
        { id: "mi-goal-2", title: "Publish the first five evidence-based posts", targetDate: "", progress: 0 }
      ],
      sessions: [],
      kpis: [
        { id: "mi-kpi-1", metric: "Evidence-based ideas ready", value: 0, target: 10, unit: "ideas" },
        { id: "mi-kpi-2", metric: "Posts published", value: 0, target: 5, unit: "posts" },
        { id: "mi-kpi-3", metric: "Sources saved", value: 0, target: 20, unit: "sources" }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Array.isArray(saved.businesses) && saved.businesses.length) {
        saved.capacity = Number(saved.capacity) > 0 ? Number(saved.capacity) : 8;
        saved.activeId = saved.businesses.some((item) => item.id === saved.activeId) ? saved.activeId : saved.businesses[0].id;
        saved.businesses.forEach((business) => {
          business.tasks = Array.isArray(business.tasks) ? business.tasks : [];
          business.goals = Array.isArray(business.goals) ? business.goals : [];
          business.sessions = Array.isArray(business.sessions) ? business.sessions : [];
          business.kpis = Array.isArray(business.kpis) ? business.kpis : [];
          business.notes = typeof business.notes === "string" ? business.notes : "";
        });
        return saved;
      }
    } catch {
      // A safe starter state is created below when older saved data is malformed.
    }
    return { version: 1, activeId: "exampoa", capacity: 8, businesses: clone(starterBusinesses) };
  }

  let state = loadState();
  let taskFilter = "all";
  let dialogConfig = null;
  let noteTimer = null;

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function activeBusiness() {
    return state.businesses.find((item) => item.id === state.activeId) || state.businesses[0];
  }

  function formatDate(value) {
    if (!value) return "No date set";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  function monthHours(business) {
    return business.sessions
      .filter((item) => String(item.date || "").startsWith(currentMonth))
      .reduce((sum, item) => sum + Number(item.minutes || 0), 0) / 60;
  }

  function allMonthHours() {
    return state.businesses.reduce((sum, business) => sum + monthHours(business), 0);
  }

  function completion(business) {
    const taskScore = business.tasks.length ? business.tasks.filter((item) => item.done).length / business.tasks.length * 100 : 0;
    const goalScore = business.goals.length ? business.goals.reduce((sum, item) => sum + Number(item.progress || 0), 0) / business.goals.length : 0;
    if (!business.tasks.length) return Math.round(goalScore);
    if (!business.goals.length) return Math.round(taskScore);
    return Math.round(taskScore * .55 + goalScore * .45);
  }

  function initials(name) {
    return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "BP";
  }

  function makeButton(text, className, attrs = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = text;
    Object.entries(attrs).forEach(([key, value]) => button.dataset[key] = value);
    return button;
  }

  function renderTabs() {
    const tabs = qs("#bpTabs");
    if (!tabs) return;
    tabs.replaceChildren();
    state.businesses.forEach((business) => {
      const button = makeButton(business.name, `bp-tab${business.id === state.activeId ? " is-active" : ""}`, { bpBusiness: business.id });
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(business.id === state.activeId));
      tabs.append(button);
    });
  }

  function renderHero() {
    const business = activeBusiness();
    const progress = completion(business);
    const hero = qs("#bpHero");
    if (!hero) return;
    hero.replaceChildren();

    const main = document.createElement("div");
    main.className = "bp-hero-main";
    const title = document.createElement("div");
    title.className = "bp-hero-title";
    const badge = document.createElement("span");
    badge.className = "bp-hero-badge";
    badge.textContent = business.initials || initials(business.name);
    const heading = document.createElement("h3");
    heading.textContent = business.name;
    title.append(badge, heading);
    const description = document.createElement("p");
    description.textContent = business.description || business.type;
    const meta = document.createElement("div");
    meta.className = "bp-hero-meta";
    [business.status, business.phase, business.targetDate ? `Target ${formatDate(business.targetDate)}` : "Flexible target date"].forEach((value) => {
      const pill = document.createElement("span");
      pill.className = "bp-pill";
      pill.textContent = value;
      meta.append(pill);
    });
    main.append(title, description, meta);

    const objective = document.createElement("div");
    objective.className = "bp-objective";
    const label = document.createElement("span");
    label.textContent = "Main objective";
    const strong = document.createElement("strong");
    strong.textContent = business.objective || "Set a clear result for this business.";
    const track = document.createElement("div");
    track.className = "bp-progress-track";
    const fill = document.createElement("i");
    fill.style.width = `${progress}%`;
    track.append(fill);
    const progressLabel = document.createElement("small");
    progressLabel.textContent = `${progress}% overall progress`;
    progressLabel.style.marginTop = "9px";
    objective.append(label, strong, track, progressLabel);
    hero.append(main, objective);
  }

  function renderSummary() {
    const business = activeBusiness();
    const open = business.tasks.filter((item) => !item.done).length;
    const complete = business.tasks.filter((item) => item.done).length;
    const hours = monthHours(business);
    const summary = qs("#bpSummary");
    if (!summary) return;
    const values = [
      [open, "open tasks"],
      [complete, "tasks completed"],
      [`${hours.toLocaleString("en-KE", { maximumFractionDigits: 1 })}h`, "logged this month"],
      [business.goals.length, "goals & milestones"]
    ];
    summary.replaceChildren(...values.map(([value, label]) => {
      const card = document.createElement("article");
      card.className = "bp-stat";
      const strong = document.createElement("strong");
      strong.textContent = String(value);
      const span = document.createElement("span");
      span.textContent = label;
      card.append(strong, span);
      return card;
    }));
  }

  function rowActions(kind, id) {
    const actions = document.createElement("div");
    actions.className = "bp-row-actions";
    const edit = makeButton("✎", "bp-icon-button", { bpEdit: kind, bpId: id });
    edit.setAttribute("aria-label", `Edit ${kind}`);
    const remove = makeButton("×", "bp-icon-button", { bpDelete: kind, bpId: id });
    remove.setAttribute("aria-label", `Delete ${kind}`);
    actions.append(edit, remove);
    return actions;
  }

  function emptyMessage(text) {
    const empty = document.createElement("p");
    empty.className = "bp-empty";
    empty.textContent = text;
    return empty;
  }

  function renderTasks() {
    const business = activeBusiness();
    const list = qs("#bpTaskList");
    if (!list) return;
    qsa("[data-bp-task-filter]").forEach((button) => button.classList.toggle("is-active", button.dataset.bpTaskFilter === taskFilter));
    const tasks = business.tasks.filter((item) => taskFilter === "all" || (taskFilter === "done" ? item.done : !item.done));
    list.replaceChildren();
    if (!tasks.length) {
      list.append(emptyMessage(taskFilter === "all" ? "No tasks yet. Add the first clear next step." : `No ${taskFilter} tasks in this business.`));
      return;
    }
    tasks.forEach((item) => {
      const row = document.createElement("div");
      row.className = `bp-row${item.done ? " is-done" : ""}`;
      const main = document.createElement("div");
      main.className = "bp-row-main";
      const check = document.createElement("input");
      check.type = "checkbox";
      check.className = "bp-check";
      check.checked = Boolean(item.done);
      check.dataset.bpCheckTask = item.id;
      check.setAttribute("aria-label", `Mark ${item.title} complete`);
      const copy = document.createElement("div");
      copy.className = "bp-row-copy";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("small");
      detail.textContent = `${item.dueDate ? `Due ${formatDate(item.dueDate)}` : "No deadline"}${item.detail ? ` · ${item.detail}` : ""}`;
      const priority = document.createElement("span");
      priority.className = `bp-priority ${String(item.priority || "Medium").toLowerCase()}`;
      priority.textContent = `${item.priority || "Medium"} priority`;
      copy.append(title, detail, priority);
      main.append(check, copy);
      row.append(main, rowActions("task", item.id));
      list.append(row);
    });
  }

  function renderGoals() {
    const list = qs("#bpGoalList");
    if (!list) return;
    const goals = activeBusiness().goals;
    list.replaceChildren();
    if (!goals.length) {
      list.append(emptyMessage("No goals yet. Add a measurable result or milestone."));
      return;
    }
    goals.forEach((item) => {
      const row = document.createElement("div");
      row.className = "bp-row";
      const copy = document.createElement("div");
      copy.className = "bp-row-copy";
      const title = document.createElement("strong");
      title.textContent = item.title;
      const detail = document.createElement("small");
      detail.textContent = item.targetDate ? `Target ${formatDate(item.targetDate)}` : "Flexible target date";
      copy.append(title, detail);
      const actions = rowActions("goal", item.id);
      const progress = document.createElement("div");
      progress.className = "bp-goal-progress";
      const track = document.createElement("div");
      track.className = "bp-goal-track";
      const fill = document.createElement("i");
      fill.style.width = `${Math.max(0, Math.min(100, Number(item.progress || 0)))}%`;
      track.append(fill);
      const amount = document.createElement("span");
      amount.textContent = `${Number(item.progress || 0)}%`;
      progress.append(track, amount);
      row.append(copy, actions, progress);
      list.append(row);
    });
  }

  function renderSessions() {
    const list = qs("#bpSessionList");
    if (!list) return;
    const sessions = [...activeBusiness().sessions].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    list.replaceChildren();
    if (!sessions.length) {
      list.append(emptyMessage("No work sessions logged yet. Your first focused block will appear here."));
      return;
    }
    sessions.slice(0, 8).forEach((item) => {
      const row = document.createElement("div");
      row.className = "bp-row";
      const copy = document.createElement("div");
      copy.className = "bp-row-copy";
      const title = document.createElement("strong");
      title.textContent = item.focus;
      const detail = document.createElement("small");
      detail.textContent = `${formatDate(item.date)} · ${Number(item.minutes)} min${item.result ? ` · ${item.result}` : ""}`;
      copy.append(title, detail);
      row.append(copy, rowActions("session", item.id));
      list.append(row);
    });
  }

  function renderKpis() {
    const list = qs("#bpKpiList");
    if (!list) return;
    const kpis = activeBusiness().kpis;
    list.replaceChildren();
    if (!kpis.length) {
      list.append(emptyMessage("No metrics yet. Track a number that shows real progress."));
      return;
    }
    kpis.forEach((item) => {
      const row = document.createElement("div");
      row.className = "bp-row";
      const copy = document.createElement("div");
      copy.className = "bp-row-copy";
      const title = document.createElement("strong");
      const unitPrefix = String(item.unit).toLowerCase() === "ksh" ? "KSh " : "";
      const unitSuffix = String(item.unit).toLowerCase() === "ksh" ? "" : ` ${item.unit || ""}`;
      title.textContent = `${unitPrefix}${Number(item.value || 0).toLocaleString()}${unitSuffix}`;
      const detail = document.createElement("small");
      detail.textContent = `${item.metric} · Target ${unitPrefix}${Number(item.target || 0).toLocaleString()}${unitSuffix}`;
      copy.append(title, detail);
      row.append(copy, rowActions("kpi", item.id));
      list.append(row);
    });
  }

  function renderNotes() {
    const notes = qs("#bpNotes");
    if (notes) notes.value = activeBusiness().notes || "";
    const stateLabel = qs("#bpNoteState");
    if (stateLabel) stateLabel.textContent = "Saved";
  }

  function renderCapacity() {
    const hours = allMonthHours();
    const capacity = Number(state.capacity || 8);
    const percent = Math.min(100, Math.round(hours / Math.max(capacity, 1) * 100));
    const target = qs("#bpCapacity");
    if (!target) return;
    target.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = `${hours.toLocaleString("en-KE", { maximumFractionDigits: 1 })}h of ${capacity}h`;
    const track = document.createElement("div");
    track.className = "bp-capacity-track";
    const fill = document.createElement("i");
    fill.style.width = `${percent}%`;
    track.append(fill);
    const small = document.createElement("small");
    small.textContent = `${percent}% of your monthly business capacity logged`;
    target.append(strong, track, small);
  }

  function renderBusinessList() {
    const list = qs("#businessList");
    if (!list) return;
    list.replaceChildren();
    state.businesses.forEach((business, index) => {
      const row = document.createElement("div");
      row.className = `bp-business-row${business.id === state.activeId ? " is-active" : ""}`;
      const badge = document.createElement("span");
      badge.className = `business-badge ${index % 2 ? "purple-badge" : "coral-badge"}`;
      badge.textContent = business.initials || initials(business.name);
      const copy = document.createElement("section");
      const name = document.createElement("strong");
      name.textContent = business.name;
      const detail = document.createElement("small");
      detail.textContent = `${business.phase} · ${completion(business)}% progress`;
      copy.append(name, detail);
      const open = makeButton("Open planner", "business-open-planner", { bpBusiness: business.id, bpScroll: "true" });
      row.append(badge, copy, open);
      list.append(row);
    });
    const count = qs("#workHub .business-card .unit-count");
    if (count) count.textContent = `${state.businesses.filter((item) => String(item.status).toLowerCase() === "active").length} active`;
  }

  function renderLegacySnapshot() {
    const business = activeBusiness();
    const rows = qsa("#workHub .work-metric-row strong");
    if (rows[0]) rows[0].textContent = `${monthHours(business).toLocaleString("en-KE", { maximumFractionDigits: 1 })}h`;
    const revenue = business.kpis.find((item) => /revenue|earning|income/i.test(item.metric));
    if (rows[1]) rows[1].textContent = revenue ? `KSh ${Number(revenue.value || 0).toLocaleString()}` : "KSh 0";
    if (rows[2]) rows[2].textContent = String(business.tasks.filter((item) => item.done).length).padStart(2, "0");

    const goals = qs("#workGoalList");
    if (goals) {
      goals.replaceChildren();
      business.goals.slice(0, 4).forEach((goal) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Number(goal.progress || 0) >= 100;
        checkbox.dataset.bpLegacyGoal = goal.id;
        label.append(checkbox, document.createTextNode(` ${goal.title}`));
        goals.append(label);
      });
    }
  }

  function renderBusinessKpiOverview() {
    const list = qs("#businessKpiList");
    if (!list) return;
    list.replaceChildren();
    state.businesses.forEach((business) => {
      const item = business.kpis[0];
      const card = document.createElement("article");
      const eyebrow = document.createElement("p");
      eyebrow.className = "eyebrow";
      eyebrow.textContent = business.name;
      const value = document.createElement("strong");
      value.textContent = item ? Number(item.value || 0).toLocaleString() : "—";
      const metric = document.createElement("small");
      metric.textContent = item?.metric || "Add a metric";
      const target = document.createElement("span");
      target.textContent = item ? `Target: ${Number(item.target || 0).toLocaleString()} ${item.unit || ""}` : business.phase;
      card.append(eyebrow, value, metric, target);
      card.tabIndex = 0;
      card.dataset.bpBusiness = business.id;
      card.dataset.bpScroll = "true";
      list.append(card);
    });
  }

  function renderAll() {
    renderTabs();
    renderHero();
    renderSummary();
    renderTasks();
    renderGoals();
    renderSessions();
    renderKpis();
    renderNotes();
    renderCapacity();
    renderBusinessList();
    renderLegacySnapshot();
    renderBusinessKpiOverview();
  }

  const fieldSets = {
    task: {
      title: "Add a task",
      description: "Give this business one clear next step.",
      submit: "Save task",
      fields: [
        { name: "title", label: "Task", required: true, wide: true, maxlength: 240 },
        { name: "dueDate", label: "Due date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: ["High", "Medium", "Low"], value: "Medium" },
        { name: "detail", label: "Notes or expected result", type: "textarea", wide: true, maxlength: 600 }
      ]
    },
    goal: {
      title: "Add a goal or milestone",
      description: "Define the result, target date and current progress.",
      submit: "Save goal",
      fields: [
        { name: "title", label: "Goal or milestone", required: true, wide: true, maxlength: 240 },
        { name: "targetDate", label: "Target date", type: "date" },
        { name: "progress", label: "Progress (%)", type: "number", min: 0, max: 100, value: 0, required: true }
      ]
    },
    session: {
      title: "Log a work session",
      description: "Record where your business time went and what moved forward.",
      submit: "Log session",
      fields: [
        { name: "date", label: "Date", type: "date", value: today, required: true },
        { name: "minutes", label: "Duration (minutes)", type: "number", min: 5, max: 720, value: 60, required: true },
        { name: "focus", label: "What did you work on?", required: true, wide: true, maxlength: 240 },
        { name: "result", label: "Result or next action", type: "textarea", wide: true, maxlength: 600 }
      ]
    },
    kpi: {
      title: "Add a performance metric",
      description: "Track one number that tells you whether this venture is moving.",
      submit: "Save metric",
      fields: [
        { name: "metric", label: "Metric", required: true, wide: true, maxlength: 160 },
        { name: "value", label: "Current value", type: "number", min: 0, value: 0, required: true },
        { name: "target", label: "Target value", type: "number", min: 0, value: 1, required: true },
        { name: "unit", label: "Unit", wide: true, maxlength: 80, placeholder: "visits, posts, KSh, resources..." }
      ]
    }
  };

  function createField(config, value) {
    const label = document.createElement("label");
    label.className = `bp-field${config.wide ? " is-wide" : ""}`;
    label.append(document.createTextNode(config.label));
    let input;
    if (config.type === "select") {
      input = document.createElement("select");
      config.options.forEach((optionValue) => {
        const option = document.createElement("option");
        option.value = optionValue;
        option.textContent = optionValue;
        input.append(option);
      });
    } else if (config.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else {
      input = document.createElement("input");
      input.type = config.type || "text";
    }
    input.name = config.name;
    if (config.required) input.required = true;
    if (config.min !== undefined) input.min = String(config.min);
    if (config.max !== undefined) input.max = String(config.max);
    if (config.maxlength) input.maxLength = config.maxlength;
    if (config.placeholder) input.placeholder = config.placeholder;
    input.value = value ?? config.value ?? "";
    label.append(input);
    return label;
  }

  function openDialog(config) {
    dialogConfig = config;
    qs("#bpDialogTitle").textContent = config.title;
    qs("#bpDialogDescription").textContent = config.description || "";
    qs("#bpDialogSubmit").textContent = config.submit || "Save";
    qs("#bpFormError").textContent = "";
    const fields = qs("#bpFormFields");
    fields.replaceChildren(...(config.fields || []).map((field) => createField(field, config.values?.[field.name])));
    const dialog = qs("#bpDialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    requestAnimationFrame(() => qs("input, textarea, select", fields)?.focus());
  }

  function closeDialog() {
    const dialog = qs("#bpDialog");
    if (dialog.open && typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    dialogConfig = null;
  }

  function valuesFromForm() {
    return Object.fromEntries(new FormData(qs("#bpForm")).entries());
  }

  function normalize(kind, values, existing = {}) {
    if (kind === "task") return { ...existing, id: existing.id || createId("task"), title: values.title.trim(), dueDate: values.dueDate, priority: values.priority, detail: values.detail.trim(), done: Boolean(existing.done) };
    if (kind === "goal") return { ...existing, id: existing.id || createId("goal"), title: values.title.trim(), targetDate: values.targetDate, progress: Math.max(0, Math.min(100, Number(values.progress))) };
    if (kind === "session") return { ...existing, id: existing.id || createId("session"), date: values.date, minutes: Number(values.minutes), focus: values.focus.trim(), result: values.result.trim() };
    if (kind === "kpi") return { ...existing, id: existing.id || createId("kpi"), metric: values.metric.trim(), value: Number(values.value), target: Number(values.target), unit: values.unit.trim() };
    return existing;
  }

  function validate(kind, values) {
    if (["task", "goal"].includes(kind) && !values.title?.trim()) return "Add a title before saving.";
    if (kind === "session") {
      if (!values.focus?.trim()) return "Add what you worked on.";
      const minutes = Number(values.minutes);
      if (!Number.isFinite(minutes) || minutes < 5 || minutes > 720) return "Enter a session between 5 and 720 minutes.";
    }
    if (kind === "goal" && (!Number.isFinite(Number(values.progress)) || Number(values.progress) < 0 || Number(values.progress) > 100)) return "Progress must be between 0 and 100%.";
    if (kind === "kpi") {
      if (!values.metric?.trim()) return "Add the name of the metric.";
      if (![values.value, values.target].every((value) => Number.isFinite(Number(value)) && Number(value) >= 0)) return "Metric values must be zero or more.";
    }
    return "";
  }

  function openItemDialog(kind, item = null) {
    const setup = fieldSets[kind];
    openDialog({
      ...setup,
      title: item ? `Edit ${kind}` : setup.title,
      values: item || {},
      onSubmit(values) {
        const error = validate(kind, values);
        if (error) return error;
        const business = activeBusiness();
        const collection = kind === "session" ? "sessions" : kind === "kpi" ? "kpis" : `${kind}s`;
        if (item) {
          const index = business[collection].findIndex((entry) => entry.id === item.id);
          if (index >= 0) business[collection][index] = normalize(kind, values, item);
        } else {
          business[collection].push(normalize(kind, values));
        }
        saveState();
        renderAll();
        return "";
      }
    });
  }

  function openProfileDialog() {
    const business = activeBusiness();
    openDialog({
      title: "Edit business details",
      description: "Keep this page aligned with the current phase and outcome you are working toward.",
      submit: "Save business",
      values: business,
      fields: [
        { name: "name", label: "Business name", required: true, maxlength: 160 },
        { name: "type", label: "Business type", required: true, maxlength: 180 },
        { name: "status", label: "Status", type: "select", options: ["Active", "Paused", "Planned", "Completed"] },
        { name: "phase", label: "Current phase", required: true, maxlength: 160 },
        { name: "targetDate", label: "Main target date", type: "date" },
        { name: "objective", label: "Main objective", required: true, wide: true, maxlength: 300 },
        { name: "description", label: "Business overview", type: "textarea", wide: true, maxlength: 800 }
      ],
      onSubmit(values) {
        if (!values.name.trim() || !values.type.trim() || !values.phase.trim() || !values.objective.trim()) return "Complete the required business details.";
        Object.assign(business, {
          name: values.name.trim(),
          initials: initials(values.name),
          type: values.type.trim(),
          status: values.status,
          phase: values.phase.trim(),
          targetDate: values.targetDate,
          objective: values.objective.trim(),
          description: values.description.trim()
        });
        saveState();
        renderAll();
        return "";
      }
    });
  }

  function openAddBusinessDialog() {
    openDialog({
      title: "Create a business planner",
      description: "Add another venture and it will receive its own tasks, goals, sessions, metrics and notes page.",
      submit: "Create planner",
      fields: [
        { name: "name", label: "Business name", required: true, maxlength: 160 },
        { name: "type", label: "Business type", required: true, maxlength: 180 },
        { name: "status", label: "Status", type: "select", options: ["Active", "Paused", "Planned"] },
        { name: "phase", label: "Current phase", required: true, maxlength: 160 },
        { name: "targetDate", label: "Main target date", type: "date" },
        { name: "objective", label: "Main objective", required: true, wide: true, maxlength: 300 },
        { name: "description", label: "Business overview", type: "textarea", wide: true, maxlength: 800 }
      ],
      onSubmit(values) {
        if (!values.name.trim() || !values.type.trim() || !values.phase.trim() || !values.objective.trim()) return "Complete the required business details.";
        const id = createId("business");
        state.businesses.push({
          id,
          initials: initials(values.name),
          name: values.name.trim(),
          type: values.type.trim(),
          status: values.status,
          phase: values.phase.trim(),
          targetDate: values.targetDate,
          objective: values.objective.trim(),
          description: values.description.trim(),
          notes: "",
          tasks: [], goals: [], sessions: [], kpis: []
        });
        state.activeId = id;
        saveState();
        renderAll();
        return "";
      }
    });
  }

  function openCapacityDialog() {
    openDialog({
      title: "Set business-work capacity",
      description: "Choose a realistic monthly limit while exam revision remains your main priority.",
      submit: "Save capacity",
      values: { capacity: state.capacity },
      fields: [{ name: "capacity", label: "Business hours available this month", type: "number", min: 1, max: 200, required: true }],
      onSubmit(values) {
        const amount = Number(values.capacity);
        if (!Number.isFinite(amount) || amount < 1 || amount > 200) return "Choose between 1 and 200 hours.";
        state.capacity = amount;
        saveState();
        renderCapacity();
        return "";
      }
    });
  }

  function openDeleteDialog(kind, id) {
    const business = activeBusiness();
    const collection = kind === "session" ? "sessions" : kind === "kpi" ? "kpis" : `${kind}s`;
    const item = business[collection].find((entry) => entry.id === id);
    if (!item) return;
    openDialog({
      title: `Remove this ${kind}?`,
      description: item.title || item.focus || item.metric || "This saved item will be removed from this business planner.",
      submit: "Remove item",
      fields: [],
      onSubmit() {
        business[collection] = business[collection].filter((entry) => entry.id !== id);
        saveState();
        renderAll();
        return "";
      }
    });
  }

  function replaceLegacyButton(selector, newId, text, handler) {
    const original = qs(selector);
    if (!original || original.dataset.bpReplaced === "true") return;
    const replacement = original.cloneNode(true);
    replacement.id = newId;
    replacement.dataset.bpReplaced = "true";
    replacement.textContent = text;
    original.replaceWith(replacement);
    replacement.addEventListener("click", handler);
  }

  function wireLegacyControls() {
    replaceLegacyButton("#addBusiness", "bpAddBusiness", "＋ Add business planner", openAddBusinessDialog);
    replaceLegacyButton("#addWorkGoal", "bpQuickGoal", "＋", () => openItemDialog("goal"));
    replaceLegacyButton("#addWorkLog", "bpQuickSession", "＋ Log work session", () => openItemDialog("session"));
    replaceLegacyButton("#addBusinessKpi", "bpQuickKpi", "＋ Add metric", () => {
      openItemDialog("kpi");
      qs("#businessStudio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    replaceLegacyButton("#editWorkMetrics", "bpEditSnapshot", "View selected business", () => qs("#businessStudio")?.scrollIntoView({ behavior: "smooth", block: "start" }));

    qsa("#workHub button").forEach((button) => {
      if (button.textContent.trim() !== "Set weekly capacity" || button.dataset.bpReplaced === "true") return;
      const replacement = button.cloneNode(true);
      replacement.textContent = "Set monthly capacity";
      replacement.dataset.bpReplaced = "true";
      button.replaceWith(replacement);
      replacement.addEventListener("click", openCapacityDialog);
    });
  }

  function selectBusiness(id, shouldScroll) {
    if (!state.businesses.some((business) => business.id === id)) return;
    state.activeId = id;
    taskFilter = "all";
    saveState();
    renderAll();
    if (shouldScroll) {
      history.replaceState(null, "", "#businessStudio");
      qs("#businessStudio")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-bp-business]");
    if (!target) return;
    if (target.dataset.bpBusiness) {
      selectBusiness(target.dataset.bpBusiness, target.dataset.bpScroll === "true");
      return;
    }
    if (target.dataset.bpAction) openItemDialog(target.dataset.bpAction);
    if (target.dataset.bpTaskFilter) {
      taskFilter = target.dataset.bpTaskFilter;
      qsa("[data-bp-task-filter]").forEach((button) => button.classList.toggle("is-active", button.dataset.bpTaskFilter === taskFilter));
      renderTasks();
    }
    if (target.dataset.bpEdit && target.dataset.bpId) {
      const kind = target.dataset.bpEdit;
      const collection = kind === "session" ? "sessions" : kind === "kpi" ? "kpis" : `${kind}s`;
      const item = activeBusiness()[collection].find((entry) => entry.id === target.dataset.bpId);
      if (item) openItemDialog(kind, item);
    }
    if (target.dataset.bpDelete && target.dataset.bpId) openDeleteDialog(target.dataset.bpDelete, target.dataset.bpId);
  });

  document.addEventListener("change", (event) => {
    const taskId = event.target.dataset?.bpCheckTask;
    if (taskId) {
      const task = activeBusiness().tasks.find((item) => item.id === taskId);
      if (task) task.done = event.target.checked;
      saveState();
      renderAll();
    }
    const goalId = event.target.dataset?.bpLegacyGoal;
    if (goalId) {
      const goal = activeBusiness().goals.find((item) => item.id === goalId);
      if (goal) goal.progress = event.target.checked ? 100 : 0;
      saveState();
      renderAll();
    }
  });

  qs("#bpEditProfile")?.addEventListener("click", openProfileDialog);
  qs("#bpSetCapacity")?.addEventListener("click", openCapacityDialog);
  qs("#bpDialogClose")?.addEventListener("click", closeDialog);
  qs("#bpDialogCancel")?.addEventListener("click", closeDialog);
  qs("#bpDialog")?.addEventListener("click", (event) => { if (event.target === qs("#bpDialog")) closeDialog(); });
  qs("#bpForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!dialogConfig?.onSubmit) return;
    const error = dialogConfig.onSubmit(valuesFromForm());
    if (error) {
      qs("#bpFormError").textContent = error;
      return;
    }
    closeDialog();
  });

  qs("#bpNotes")?.addEventListener("input", () => {
    const label = qs("#bpNoteState");
    if (label) label.textContent = "Saving…";
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      activeBusiness().notes = qs("#bpNotes").value.slice(0, 5000);
      saveState();
      if (label) label.textContent = "Saved";
    }, 450);
  });

  qs("#bpSaveNotes")?.addEventListener("click", () => {
    clearTimeout(noteTimer);
    activeBusiness().notes = qs("#bpNotes").value.slice(0, 5000);
    saveState();
    qs("#bpNoteState").textContent = "Saved";
  });

  const workObserver = new MutationObserver(() => wireLegacyControls());
  if (qs("#workHub")) workObserver.observe(qs("#workHub"), { childList: true, subtree: true });

  wireLegacyControls();
  saveState();
  renderAll();
  window.setTimeout(wireLegacyControls, 150);
})();
