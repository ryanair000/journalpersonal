"use strict";

(() => {
  const source = window.EXAMPOA_CONTENT_SOURCE;
  if (!source?.calendar?.length) return;

  const STORAGE_KEY = "mllExampoaCommandV1";
  const statuses = ["Draft", "Creating", "Ready", "Scheduled", "Published"];
  const analyticsFields = ["Reach", "Views", "3-sec Views", "Likes", "Comments", "Shares", "Saves", "Link Clicks", "Sign-ups", "Purchases"];
  const resourceStages = ["Idea", "Research", "Drafting", "Review", "Ready", "Published"];
  const resourceTasks = [
    "Confirm the learner level, subject, topic and learning outcome",
    "Research the curriculum scope and save reliable references",
    "Draft the complete learner-facing resource",
    "Create answers, marking guidance or explanations where required",
    "Fact-check, proofread and review copyright permissions",
    "Format the PDF, quiz or web resource for clear mobile use",
    "Upload to the correct Exampoa library destination and test it",
    "Publish, link it to relevant campaign posts and record feedback"
  ];
  const reviewPeriods = [
    ["Week 1", "28 Jul–3 Aug"], ["Week 2", "4–10 Aug"], ["Week 3", "11–17 Aug"],
    ["Week 4", "18–24 Aug"], ["Final check", "25–26 Aug"]
  ];
  const reviewFields = ["Posts Published", "Best Hook", "Best Format", "Best Platform", "Highest-Intent Page", "What We Learned", "One Change Next Week", "Posts to Reuse / Adapt"];
  const resourceFieldDefinitions = [
    { name: "title", label: "Resource title", required: true, wide: true },
    { name: "level", label: "Class / level", required: true, placeholder: "Grade 6, Grade 9, Form 4..." },
    { name: "subject", label: "Subject", required: true },
    { name: "type", label: "Resource type", type: "select", options: ["Revision Notes", "Revision Paper", "Past Paper", "Marking Scheme", "Quiz", "Flashcards", "Study Guide", "Teacher Resource", "Prediction Practice Pack", "Other"] },
    { name: "stage", label: "Drafting stage", type: "select", options: resourceStages },
    { name: "topic", label: "Topic / unit", required: true, wide: true },
    { name: "targetDate", label: "Target completion date", type: "date" },
    { name: "answerSupport", label: "Answer support", type: "select", options: ["Not required", "Needed", "Drafting", "Ready", "Reviewed"] },
    { name: "linkedPosts", label: "Related content Post IDs", placeholder: "IG-03, WA-04...", wide: true },
    { name: "draftLink", label: "Draft file link", type: "url", placeholder: "OneDrive, Google Drive, Canva or document link", wide: true },
    { name: "publishedUrl", label: "Published Exampoa URL", type: "url", placeholder: "Add after upload", wide: true },
    { name: "outline", label: "Outline and content requirements", type: "textarea", wide: true },
    { name: "references", label: "Research, sources and accuracy notes", type: "textarea", wide: true },
    { name: "owner", label: "Owner", value: "Charry" }
  ];

  const byId = new Map(source.calendar.map((post) => [post["Post ID"], post]));
  const scriptsById = new Map(source.scripts.map((script) => [script["Post ID"], script]));
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  let activePostId = null;
  let editingResourceId = null;
  let removeResourceId = null;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        saved.posts = saved.posts && typeof saved.posts === "object" ? saved.posts : {};
        saved.resources = Array.isArray(saved.resources) ? saved.resources : [];
        saved.reviews = saved.reviews && typeof saved.reviews === "object" ? saved.reviews : {};
        return saved;
      }
    } catch { /* start safely below */ }
    return { version: 1, posts: {}, resources: [], reviews: {} };
  }

  let state = loadState();

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.mllCloudSync?.syncNow?.();
  }

  function postState(id) {
    if (!state.posts[id]) state.posts[id] = { status: byId.get(id)?.Status || "Draft", tasks: Array(7).fill(false), analytics: {}, notes: "", extraTask: "" };
    const item = state.posts[id];
    item.tasks = Array.isArray(item.tasks) ? [...item.tasks, ...Array(7).fill(false)].slice(0, 7) : Array(7).fill(false);
    item.analytics = item.analytics && typeof item.analytics === "object" ? item.analytics : {};
    return item;
  }

  function formatDate(value, options = { weekday: "short", day: "numeric", month: "short" }) {
    if (!value) return "No date";
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-KE", options).format(date);
  }

  function platformCode(platform) {
    return ({ Instagram: "IG", Facebook: "FB", TikTok: "TT", WhatsApp: "WA" })[platform] || platform.slice(0, 2).toUpperCase();
  }

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }

  function button(text, className, attrs = {}) {
    const element = node("button", className, text);
    element.type = "button";
    Object.entries(attrs).forEach(([key, value]) => element.dataset[key] = value);
    return element;
  }

  function taskLabels(post, script) {
    return [
      `Confirm the destination and tracked link: ${post.Destination || "exact page"} · ${post["UTM Campaign"] || post["Post ID"]}`,
      `Finalize the hook, script or caption: ${script?.["Hook (0–3 sec)"] || post.Hook}`,
      `Prepare every required asset: ${script?.["Asset Checklist"] || post["Production Notes"]}`,
      `Record, design and edit the ${post.Format} for ${post.Platform}`,
      "Run privacy, pricing, accuracy, copyright, caption and mobile-readability checks",
      `Schedule or publish on ${formatDate(post.Date)} at ${post["Time (EAT)"]} EAT, then respond to useful comments`,
      `Enter ${post["Primary KPI"]} and the remaining KPI results 48–72 hours after publishing`
    ];
  }

  function renderSummary() {
    const published = source.calendar.filter((post) => postState(post["Post ID"]).status === "Published").length;
    const ready = source.calendar.filter((post) => ["Ready", "Scheduled"].includes(postState(post["Post ID"]).status)).length;
    const doneTasks = source.calendar.reduce((sum, post) => sum + postState(post["Post ID"]).tasks.filter(Boolean).length, 0);
    const totalTasks = source.calendar.length * 7;
    const readyResources = state.resources.filter((item) => ["Ready", "Published"].includes(item.stage)).length;
    const values = [
      [published, "of 40 posts published", published / 40 * 100],
      [ready, "ready or scheduled", ready / 40 * 100],
      [`${doneTasks}/${totalTasks}`, "production tasks complete", doneTasks / totalTasks * 100],
      [state.resources.length, "library resources planned", state.resources.length ? readyResources / state.resources.length * 100 : 0],
      [readyResources, "resources ready or live", state.resources.length ? readyResources / state.resources.length * 100 : 0]
    ];
    const target = qs("#epcSummary");
    target.replaceChildren(...values.map(([value, label, progress]) => {
      const card = node("article", "epc-stat");
      const strong = node("strong", "", value);
      const span = node("span", "", label);
      const track = node("em");
      const fill = node("i");
      fill.style.width = `${Math.max(0, Math.min(100, progress || 0))}%`;
      track.append(fill);
      card.append(strong, span, track);
      return card;
    }));
  }

  function renderFocus() {
    const today = new Date().toISOString().slice(0, 10);
    const todayPosts = source.calendar.filter((post) => post.Date === today);
    const future = source.calendar.filter((post) => post.Date >= today && postState(post["Post ID"]).status !== "Published");
    const focusPosts = todayPosts.length ? todayPosts : future.slice(0, 2);
    const focus = qs("#epcFocus");
    focus.replaceChildren();
    const main = node("article", "epc-focus-main");
    main.append(node("p", "eyebrow", todayPosts.length ? "Today’s campaign work" : "Next campaign work"));
    main.append(node("h3", "", focusPosts.length ? `${focusPosts.length} post${focusPosts.length === 1 ? "" : "s"} need attention.` : "The campaign schedule is complete."));
    main.append(node("p", "", focusPosts.length ? "Open each production brief and work through the exact script, assets, checks and publishing task." : "Use the weekly reviews to preserve what worked and plan the next campaign."));
    const buttons = node("div", "epc-focus-posts");
    focusPosts.forEach((post) => buttons.append(button(`${post["Post ID"]} · ${post["Time (EAT)"]}`, "", { epcOpenPost: post["Post ID"] })));
    main.append(buttons);

    const next = node("article", "epc-focus-next");
    const nextIncomplete = source.calendar.find((post) => postState(post["Post ID"]).tasks.some((done) => !done));
    next.append(node("p", "eyebrow", "Best next action"));
    next.append(node("h3", "", nextIncomplete ? nextIncomplete["Topic / Title"] : "Complete the learning loop"));
    next.append(node("p", "", nextIncomplete ? taskLabels(nextIncomplete, scriptsById.get(nextIncomplete["Post ID"]))[postState(nextIncomplete["Post ID"]).tasks.findIndex((done) => !done)] : "Save the strongest hooks, formats and pages for the next month."));
    if (nextIncomplete) next.append(button("Open next brief", "epc-open-post", { epcOpenPost: nextIncomplete["Post ID"] }));
    focus.append(main, next);
  }

  function matchesDay(post, filter) {
    if (filter === "all") return true;
    if (filter === "today") return post.Date === new Date().toISOString().slice(0, 10);
    const ranges = { week1: ["2026-07-28", "2026-08-03"], week2: ["2026-08-04", "2026-08-10"], week3: ["2026-08-11", "2026-08-17"], week4: ["2026-08-18", "2026-08-24"], final: ["2026-08-25", "2026-08-26"] };
    const range = ranges[filter];
    return range ? post.Date >= range[0] && post.Date <= range[1] : true;
  }

  function postCard(post) {
    const id = post["Post ID"];
    const saved = postState(id);
    const complete = saved.tasks.filter(Boolean).length;
    const card = node("article", "epc-post-card");
    card.dataset.epcPostCard = id;
    const platform = node("span", `epc-platform ${post.Platform.toLowerCase()}`, platformCode(post.Platform));
    const copy = node("div", "epc-post-copy");
    copy.append(node("span", "", `${id} · ${post["Time (EAT)"]} EAT · ${post["Content Pillar"]}`));
    copy.append(node("strong", "", post["Topic / Title"]));
    copy.append(node("small", "", `${post.Hook} · CTA: ${post.CTA}`));
    const meter = node("div", "epc-task-meter");
    meter.append(node("span", "", `${complete}/7 tasks`));
    const track = node("i");
    const fill = node("b");
    fill.style.width = `${complete / 7 * 100}%`;
    track.append(fill);
    meter.append(track);
    copy.append(meter);

    const actions = node("div", "epc-post-actions");
    const select = node("select", "epc-status-select");
    select.dataset.epcStatus = id;
    select.setAttribute("aria-label", `Status for ${id}`);
    statuses.forEach((status) => {
      const option = node("option", "", status);
      option.value = status;
      option.selected = saved.status === status;
      select.append(option);
    });
    actions.append(select, button("Open brief", "epc-open-post", { epcOpenPost: id }));
    card.append(platform, copy, actions);
    return card;
  }

  function renderCalendar() {
    const query = qs("#epcSearch").value.trim().toLowerCase();
    const platform = qs("#epcPlatformFilter").value;
    const status = qs("#epcStatusFilter").value;
    const day = qs("#epcDayFilter").value;
    const filtered = source.calendar.filter((post) => {
      const searchable = Object.values(post).join(" ").toLowerCase();
      return (!query || searchable.includes(query)) && (platform === "all" || post.Platform === platform) && (status === "all" || postState(post["Post ID"]).status === status) && matchesDay(post, day);
    });
    const grouped = Map.groupBy ? Map.groupBy(filtered, (post) => post.Date) : filtered.reduce((map, post) => map.set(post.Date, [...(map.get(post.Date) || []), post]), new Map());
    const list = qs("#epcPostList");
    list.replaceChildren();
    if (!filtered.length) {
      list.append(node("p", "epc-empty", "No posts match these filters. Your source calendar remains safely imported."));
      return;
    }
    grouped.forEach((posts, date) => {
      const group = node("section", "epc-day-group");
      const label = node("div", "epc-day-label");
      label.append(node("strong", "", `Day ${posts[0].Day}`), node("span", "", formatDate(date)));
      const cards = node("div", "epc-day-posts");
      posts.forEach((post) => cards.append(postCard(post)));
      group.append(label, cards);
      list.append(group);
    });
  }

  function renderProduction() {
    const board = qs("#epcProductionBoard");
    board.replaceChildren();
    statuses.forEach((status) => {
      const posts = source.calendar.filter((post) => postState(post["Post ID"]).status === status);
      const column = node("section", "epc-column");
      const heading = node("div", "epc-column-head");
      heading.append(node("strong", "", status), node("span", "", posts.length));
      column.append(heading);
      posts.forEach((post) => {
        const card = button("", "epc-mini-post", { epcOpenPost: post["Post ID"] });
        card.append(node("span", "", `${post["Post ID"]} · ${formatDate(post.Date)} ${post["Time (EAT)"]}`));
        card.append(node("strong", "", post["Topic / Title"]));
        card.append(node("small", "", `${postState(post["Post ID"]).tasks.filter(Boolean).length}/7 production tasks`));
        column.append(card);
      });
      board.append(column);
    });
  }

  function detail(label, value, wide = false) {
    const wrapper = node("div", `epc-detail${wide ? " is-wide" : ""}`);
    const term = node("dt", "", label);
    const description = node("dd", "", value || "—");
    wrapper.append(term, description);
    return wrapper;
  }

  function detailLink(label, value, wide = false) {
    const wrapper = node("div", `epc-detail${wide ? " is-wide" : ""}`);
    const term = node("dt", "", label);
    const description = node("dd");
    const url = safeExternalUrl(value);
    if (url) {
      const link = node("a", "epc-source-link", "Open exact tracked page ↗");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener";
      description.append(link, node("small", "", value));
    } else {
      description.textContent = value || "—";
    }
    wrapper.append(term, description);
    return wrapper;
  }

  function analyticsInput(label, value) {
    const field = node("label", "epc-form-field");
    field.append(document.createTextNode(label));
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "1";
    input.name = `analytics-${label}`;
    input.value = value ?? 0;
    field.append(input);
    return field;
  }

  function openPost(id) {
    const post = byId.get(id);
    if (!post) return;
    const script = scriptsById.get(id) || {};
    const saved = postState(id);
    activePostId = id;
    qs("#epcPostDialogMeta").textContent = `${id} · ${post.Platform} · ${formatDate(post.Date)} at ${post["Time (EAT)"]} EAT`;
    qs("#epcPostDialogTitle").textContent = post["Topic / Title"];
    qs("#epcPostDialogSubtitle").textContent = `${post.Audience} · ${post["Content Pillar"]} · ${post["Funnel Stage"]}`;
    qs("#epcPostSaveState").textContent = "Saved";
    const body = qs("#epcPostDialogBody");
    body.replaceChildren();

    const overview = node("section", "epc-dialog-section");
    overview.append(node("h3", "", "Calendar brief"));
    const statusField = node("label", "epc-form-field");
    statusField.append(document.createTextNode("Production status"));
    const statusSelect = node("select");
    statusSelect.name = "postStatus";
    statuses.forEach((status) => { const option = node("option", "", status); option.value = status; option.selected = saved.status === status; statusSelect.append(option); });
    statusField.append(statusSelect);
    overview.append(statusField);
    const details = node("dl", "epc-detail-grid");
    [
      ["Format", post.Format], ["Audience", post.Audience], ["Content pillar", post["Content Pillar"]], ["Funnel stage", post["Funnel Stage"]],
      ["Hook", post.Hook, true], ["What the post shows", post["What the post shows"], true], ["Call to action", post.CTA, true],
      ["Destination", post.Destination], ["UTM campaign", post["UTM Campaign"]], ["Tracked link label", post["Tracked Link"]], ["Primary KPI", post["Primary KPI"]],
      ["Production notes", post["Production Notes"], true], ["Owner", post.Owner]
    ].forEach(([label, value, wide]) => details.append(detail(label, value, wide)));
    details.append(detailLink("Destination page", post["Destination URL"], true), detailLink("UTM-tracked publishing link", post["Tracked Link URL"], true));
    overview.append(details);

    const scriptSection = node("section", "epc-dialog-section");
    scriptSection.append(node("h3", "", "Full script & shot list"));
    const scriptDetails = node("dl", "epc-detail-grid");
    ["Hook (0–3 sec)", "Scene 1", "Scene 2", "Scene 3", "Scene 4 / Finish", "Voice-over / Caption", "On-screen Text", "CTA", "Asset Checklist"].forEach((label) => scriptDetails.append(detail(label, script[label], ["Voice-over / Caption", "Asset Checklist"].includes(label))));
    scriptSection.append(scriptDetails);

    const tasks = node("section", "epc-dialog-section");
    tasks.append(node("h3", "", "Seven-step production checklist"));
    const checklist = node("div", "epc-production-tasks");
    taskLabels(post, script).forEach((label, index) => {
      const row = node("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = `task-${index}`;
      input.checked = Boolean(saved.tasks[index]);
      row.append(input, document.createTextNode(label));
      checklist.append(row);
    });
    const extra = node("label", "epc-form-field");
    extra.style.marginTop = "10px";
    extra.append(document.createTextNode("Additional action or dependency"));
    const extraInput = document.createElement("input");
    extraInput.name = "extraTask";
    extraInput.value = saved.extraTask || "";
    extraInput.placeholder = "Optional custom task";
    extra.append(extraInput);
    tasks.append(checklist, extra);

    const analytics = node("section", "epc-dialog-section");
    analytics.append(node("h3", "", "Performance results · enter after 48–72 hours"));
    const grid = node("div", "epc-analytics-grid");
    analyticsFields.forEach((label) => grid.append(analyticsInput(label, saved.analytics[label])));
    ["Engagement Rate", "CTR", "Click→Signup"].forEach((label) => {
      const field = node("label", "epc-form-field");
      field.append(document.createTextNode(`${label} (%)`));
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.01";
      input.name = `analytics-${label}`;
      input.value = saved.analytics[label] ?? 0;
      field.append(input);
      grid.append(field);
    });
    const learning = node("label", "epc-form-field is-wide");
    learning.append(document.createTextNode("Learning / next test"));
    const learningInput = document.createElement("textarea");
    learningInput.name = "analytics-Learning / Next Test";
    learningInput.value = saved.analytics["Learning / Next Test"] || "";
    learning.append(learningInput);
    grid.append(learning);
    analytics.append(grid);

    const notes = node("section", "epc-dialog-section");
    notes.append(node("h3", "", "Draft notes"));
    const noteField = node("label", "epc-form-field");
    noteField.append(document.createTextNode("Caption changes, approvals, asset links or publishing notes"));
    const textarea = document.createElement("textarea");
    textarea.name = "postNotes";
    textarea.rows = 5;
    textarea.value = saved.notes || "";
    noteField.append(textarea);
    notes.append(noteField);
    body.append(overview, scriptSection, tasks, analytics, notes);
    qs("#epcPostDialog").showModal();
  }

  function savePost(event) {
    event.preventDefault();
    if (!activePostId) return;
    const form = event.currentTarget;
    const saved = postState(activePostId);
    saved.status = form.elements.postStatus.value;
    saved.tasks = Array.from({ length: 7 }, (_, index) => form.elements[`task-${index}`].checked);
    saved.extraTask = form.elements.extraTask.value.trim().slice(0, 500);
    saved.notes = form.elements.postNotes.value.trim().slice(0, 5000);
    [...analyticsFields, "Engagement Rate", "CTR", "Click→Signup"].forEach((label) => saved.analytics[label] = Number(form.elements[`analytics-${label}`].value) || 0);
    saved.analytics["Learning / Next Test"] = form.elements["analytics-Learning / Next Test"].value.trim().slice(0, 1500);
    saveState();
    qs("#epcPostSaveState").textContent = "Saved · production queue and progress updated";
    renderAll();
  }

  function createResourceField(definition, values) {
    const label = node("label", `epc-form-field${definition.wide ? " is-wide" : ""}`);
    label.append(document.createTextNode(definition.label));
    let input;
    if (definition.type === "select") {
      input = node("select");
      definition.options.forEach((value) => { const option = node("option", "", value); option.value = value; input.append(option); });
    } else if (definition.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
    } else {
      input = document.createElement("input");
      input.type = definition.type || "text";
    }
    input.name = definition.name;
    input.required = Boolean(definition.required);
    input.placeholder = definition.placeholder || "";
    input.value = values?.[definition.name] ?? definition.value ?? "";
    label.append(input);
    return label;
  }

  function openResource(id = null) {
    editingResourceId = id;
    const existing = state.resources.find((item) => item.id === id) || { stage: "Idea", answerSupport: "Not required", tasks: Array(8).fill(false), owner: "Charry" };
    qs("#epcResourceDialogTitle").textContent = id ? "Edit library resource" : "Add library resource";
    qs("#epcResourceError").textContent = "";
    const fields = qs("#epcResourceFields");
    fields.replaceChildren(...resourceFieldDefinitions.map((definition) => createResourceField(definition, existing)));
    const taskSection = node("section", "epc-dialog-section epc-form-field is-wide");
    taskSection.append(node("h3", "", "Resource completion checklist"));
    const checklist = node("div", "epc-production-tasks");
    resourceTasks.forEach((task, index) => {
      const row = node("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.name = `resourceTask-${index}`;
      input.checked = Boolean(existing.tasks?.[index]);
      row.append(input, document.createTextNode(task));
      checklist.append(row);
    });
    taskSection.append(checklist);
    fields.append(taskSection);
    qs("#epcResourceDialog").showModal();
  }

  function saveResource(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    if (!values.title?.trim() || !values.level?.trim() || !values.subject?.trim() || !values.topic?.trim()) {
      qs("#epcResourceError").textContent = "Add the title, learner level, subject and topic before saving.";
      return;
    }
    const existing = state.resources.find((item) => item.id === editingResourceId);
    const item = { ...(existing || {}), id: existing?.id || createId("resource"), createdAt: existing?.createdAt || new Date().toISOString() };
    resourceFieldDefinitions.forEach((definition) => item[definition.name] = String(values[definition.name] || "").trim().slice(0, definition.type === "textarea" ? 5000 : 800));
    item.tasks = Array.from({ length: 8 }, (_, index) => Boolean(form.elements[`resourceTask-${index}`]?.checked));
    item.updatedAt = new Date().toISOString();
    if (existing) Object.assign(existing, item); else state.resources.unshift(item);
    saveState();
    qs("#epcResourceDialog").close();
    renderAll();
  }

  function renderResourceSummary() {
    const counts = [
      [state.resources.length, "resources planned"],
      [state.resources.filter((item) => ["Research", "Drafting"].includes(item.stage)).length, "in research or drafting"],
      [state.resources.filter((item) => item.stage === "Review").length, "awaiting review"],
      [state.resources.filter((item) => ["Ready", "Published"].includes(item.stage)).length, "ready or published"]
    ];
    qs("#epcResourceSummary").replaceChildren(...counts.map(([value, label]) => {
      const card = node("article", "epc-resource-stat");
      card.append(node("strong", "", value), node("span", "", label));
      return card;
    }));
  }

  function safeExternalUrl(value) {
    try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : ""; } catch { return ""; }
  }

  function renderResources() {
    renderResourceSummary();
    const query = qs("#epcResourceSearch").value.trim().toLowerCase();
    const stage = qs("#epcResourceStatus").value;
    const items = state.resources.filter((item) => (!query || Object.values(item).join(" ").toLowerCase().includes(query)) && (stage === "all" || item.stage === stage));
    const list = qs("#epcResourceList");
    list.replaceChildren();
    if (!items.length) {
      list.append(node("p", "epc-empty", state.resources.length ? "No resource drafts match these filters." : "No resource drafts yet. Add the first Exampoa note, paper, quiz, marking scheme or study guide."));
      return;
    }
    items.forEach((item) => {
      const card = node("article", "epc-resource-card");
      const top = node("div", "epc-resource-top");
      top.append(node("span", "", `${item.stage} · ${item.type}`), node("span", "", item.targetDate ? formatDate(item.targetDate) : "No deadline"));
      card.append(top, node("h4", "", item.title), node("p", "", `${item.level} · ${item.subject} · ${item.topic}${item.linkedPosts ? ` · Posts: ${item.linkedPosts}` : ""}`));
      const completed = item.tasks?.filter(Boolean).length || 0;
      const progress = node("div", "epc-resource-progress");
      const progressText = node("div");
      progressText.append(node("span", "", `${completed}/8 workflow tasks`), node("span", "", `${Math.round(completed / 8 * 100)}%`));
      const track = node("i");
      const fill = node("b");
      fill.style.width = `${completed / 8 * 100}%`;
      track.append(fill);
      progress.append(progressText, track);
      const actions = node("div", "epc-resource-actions");
      actions.append(button("Open & update", "", { epcEditResource: item.id }));
      const draftUrl = safeExternalUrl(item.draftLink);
      if (draftUrl) { const link = node("a", "", "Open draft ↗"); link.href = draftUrl; link.target = "_blank"; link.rel = "noopener"; actions.append(link); }
      const remove = button(removeResourceId === item.id ? "Confirm remove" : "Remove", "", { epcRemoveResource: item.id });
      actions.append(remove);
      card.append(progress, actions);
      list.append(card);
    });
  }

  function renderReviews() {
    const list = qs("#epcReviewList");
    list.replaceChildren();
    reviewPeriods.forEach(([period, dates]) => {
      const saved = state.reviews[period] || {};
      const card = node("article", "epc-review-card");
      card.dataset.epcReview = period;
      const head = node("div", "epc-review-head");
      head.append(node("h4", "", period), node("span", "", dates));
      const fields = node("div", "epc-review-fields");
      reviewFields.forEach((name) => {
        const label = node("label", "", name);
        let input;
        if (["What We Learned", "One Change Next Week", "Posts to Reuse / Adapt"].includes(name)) input = document.createElement("textarea");
        else { input = document.createElement("input"); input.type = name === "Posts Published" ? "number" : "text"; if (input.type === "number") input.min = "0"; }
        input.name = name;
        input.value = saved[name] || "";
        label.append(input);
        fields.append(label);
      });
      card.append(head, fields, button("Save review", "epc-primary epc-review-save", { epcSaveReview: period }));
      list.append(card);
    });
    const rules = source.weeklyReview.filter((row) => row[0] && !["Weekly Learning Loop", "The goal is not to post blindly for 30 days. Review performance every seven days and make one controlled improvement.", "Review", "Decision rules", ...reviewPeriods.map((item) => item[0])].includes(row[0]) && row[1]);
    qs("#epcDecisionRules").replaceChildren(...rules.map((row) => {
      const card = node("div", "epc-rule");
      card.append(node("strong", "", row[0]), node("p", "", row[1]));
      return card;
    }));
  }

  function saveReview(period) {
    const card = qsa("[data-epc-review]").find((item) => item.dataset.epcReview === period);
    if (!card) return;
    const values = {};
    qsa("input, textarea", card).forEach((input) => values[input.name] = input.value.trim());
    state.reviews[period] = values;
    saveState();
    const control = card.querySelector("[data-epc-save-review]");
    if (control) { const old = control.textContent; control.textContent = "Saved ✓"; setTimeout(() => control.textContent = old, 1200); }
  }

  function openGuide(type) {
    const isStrategy = type === "strategy";
    const rows = isStrategy ? source.launchStrategy : source.platformPlaybooks;
    qs("#epcGuideEyebrow").textContent = isStrategy ? "Imported launch strategy" : "Imported production standards";
    qs("#epcGuideTitle").textContent = isStrategy ? "ExamPoa demo-first launch strategy" : "Platform playbooks & production standards";
    qs("#epcGuideIntro").textContent = isStrategy ? "The campaign direction, pillar balance, platform roles and publishing rules from your workbook." : "The exact platform formats, creative rules, recording checklist and website destinations from your workbook.";
    const body = qs("#epcGuideBody");
    body.className = "epc-guide-grid";
    body.replaceChildren(...rows.filter((row) => row.some((value) => value !== "" && value !== null)).map((row) => {
      const card = node("article", "epc-guide-row");
      const values = row.filter((value) => value !== "" && value !== null);
      card.append(node("strong", "", values[0]));
      if (values.length > 1) card.append(node("p", "", values.slice(1).join(" · ")));
      return card;
    }));
    if (isStrategy && source.sourceLinks?.length) {
      const sourceCard = node("article", "epc-guide-row epc-guide-sources");
      sourceCard.append(node("strong", "", "Workbook source links"));
      const sourceNames = source.launchStrategy.filter((row) => row[0] && row.includes("Open source")).map((row) => row[0]);
      source.sourceLinks.forEach((item, index) => {
        const url = safeExternalUrl(item.url);
        if (!url) return;
        const link = node("a", "epc-source-link", `${sourceNames[index] || `Source ${index + 1}`} ↗`);
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        sourceCard.append(link);
      });
      body.append(sourceCard);
    }
    qs("#epcGuideDialog").showModal();
  }

  function showView(view) {
    qsa("[data-epc-view]").forEach((control) => control.classList.toggle("is-active", control.dataset.epcView === view));
    qsa("[data-epc-panel]").forEach((panel) => panel.hidden = panel.dataset.epcPanel !== view);
    if (view === "production") renderProduction();
    if (view === "resources") renderResources();
    if (view === "reviews") renderReviews();
  }

  function closeDialog(name) {
    const dialog = ({ post: "#epcPostDialog", resource: "#epcResourceDialog", guide: "#epcGuideDialog" })[name];
    const element = qs(dialog);
    if (element?.open) element.close();
  }

  function renderAll() {
    renderSummary();
    renderFocus();
    renderCalendar();
    renderProduction();
    renderResources();
    renderReviews();
    addBusinessShortcut();
  }

  function addBusinessShortcut() {
    const hero = qs("#bpHero");
    if (!hero || hero.querySelector(".epc-business-shortcut") || hero.querySelector("h3")?.textContent !== "Exampoa") return;
    const shortcut = button("Open 30-day content center ↓", "epc-primary epc-business-shortcut");
    shortcut.addEventListener("click", () => {
      history.replaceState(null, "", "#exampoaContentCenter");
      qs("#exampoaContentCenter").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    qs(".bp-hero-main", hero)?.append(shortcut);
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, [data-epc-open-post]");
    if (!target) return;
    if (target.dataset.epcView) showView(target.dataset.epcView);
    if (target.dataset.epcOpenPost) openPost(target.dataset.epcOpenPost);
    if (target.dataset.epcClose) closeDialog(target.dataset.epcClose);
    if (target.dataset.epcEditResource) openResource(target.dataset.epcEditResource);
    if (target.dataset.epcRemoveResource) {
      if (removeResourceId === target.dataset.epcRemoveResource) {
        state.resources = state.resources.filter((item) => item.id !== removeResourceId);
        removeResourceId = null;
        saveState();
        renderResources();
        renderSummary();
      } else {
        removeResourceId = target.dataset.epcRemoveResource;
        renderResources();
        setTimeout(() => { removeResourceId = null; renderResources(); }, 4000);
      }
    }
    if (target.dataset.epcSaveReview) saveReview(target.dataset.epcSaveReview);
  });

  document.addEventListener("change", (event) => {
    if (event.target.dataset.epcStatus) {
      postState(event.target.dataset.epcStatus).status = event.target.value;
      saveState();
      renderAll();
    }
  });

  ["#epcSearch", "#epcPlatformFilter", "#epcStatusFilter", "#epcDayFilter"].forEach((selector) => qs(selector)?.addEventListener(selector === "#epcSearch" ? "input" : "change", renderCalendar));
  ["#epcResourceSearch", "#epcResourceStatus"].forEach((selector) => qs(selector)?.addEventListener(selector === "#epcResourceSearch" ? "input" : "change", renderResources));
  qs("#epcPostForm")?.addEventListener("submit", savePost);
  qs("#epcResourceForm")?.addEventListener("submit", saveResource);
  qs("#epcAddResource")?.addEventListener("click", () => openResource());
  qs("#epcOpenStrategy")?.addEventListener("click", () => openGuide("strategy"));
  qs("#epcOpenPlaybooks")?.addEventListener("click", () => openGuide("playbooks"));
  qsa(".epc-dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));

  const heroObserver = new MutationObserver(addBusinessShortcut);
  if (qs("#bpHero")) heroObserver.observe(qs("#bpHero"), { childList: true, subtree: true });
  saveState();
  renderAll();
})();
