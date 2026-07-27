"use strict";

(() => {
  const STORAGE_KEY = "myLittleLife.creatorCenter.v1";
  const ACTIVE_ACCOUNT_KEY = "myLittleLife.creatorAccount.active";
  const STATUS_ORDER = ["Idea", "Creating", "Scheduled", "Published"];
  const PLATFORM_OPTIONS = ["Facebook", "Instagram", "TikTok", "YouTube", "Website", "Blog", "Other"];
  const FORMAT_OPTIONS = ["Post", "Reel", "Short video", "Long video", "Carousel", "Article", "Story", "Email", "Resource"];
  const GOAL_OPTIONS = ["Awareness", "Engagement", "Community", "Traffic", "Conversion", "Revenue"];
  const ACCOUNT_DEFAULTS = [
    {
      id: "playmechi", name: "PlayMechi", phase: "Monetized · active", accent: "#c96888",
      goal: "Earn the first platform paycheck and build a loyal sports community.", platforms: ["Facebook"],
      pillars: ["Sports news", "Match recaps", "Opinions", "Player stories"], weeklyTarget: 5, revenueGoal: 5000, handle: ""
    },
    {
      id: "exampoa", name: "Exampoa", phase: "Launch phase", accent: "#8f7ac1",
      goal: "Launch publicly, grow search traffic and turn revision resources into revenue.", platforms: ["Website", "Facebook"],
      pillars: ["Revision tips", "Past papers", "KCSE", "Subject guides"], weeklyTarget: 3, revenueGoal: 10000, handle: ""
    },
    {
      id: "medical-influencing", name: "Medical Influencing", phase: "Planned · attachment", accent: "#6f9b82",
      goal: "Build a trusted pharmacy, health and wellness presence during attachment.", platforms: ["Instagram", "TikTok", "YouTube"],
      pillars: ["Pharmacy life", "Attachment journey", "Health education", "Wellness"], weeklyTarget: 2, revenueGoal: 0, handle: ""
    },
    {
      id: "leridia-jewels", name: "Leridia Jewels", phase: "Rebrand · launch 28 Jan 2027", accent: "#b38a4d",
      goal: "Rebrand, prepare stock and build demand before the January 2027 shop launch.", platforms: ["Instagram", "TikTok"],
      pillars: ["Rebrand", "Jewelry education", "Styling", "Behind the scenes", "Launch"], weeklyTarget: 2, revenueGoal: 25000, handle: ""
    }
  ];

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const uid = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const todayKey = () => localDateKey(new Date());
  const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const parseDate = (value) => value ? new Date(`${value}T12:00:00`) : null;
  const number = (value) => Number(String(value ?? "").replace(/[^0-9.-]/g, "")) || 0;
  const money = (value) => `KSh ${Math.round(number(value)).toLocaleString("en-KE")}`;
  const formatNumber = (value) => number(value).toLocaleString("en-KE", { maximumFractionDigits: 1 });
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const dateLabel = (value, options = { day: "numeric", month: "short" }) => {
    const date = parseDate(value);
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("en-KE", options) : "No date";
  };
  const weekStart = (date) => {
    const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const day = copy.getDay() || 7;
    copy.setDate(copy.getDate() - day + 1);
    return copy;
  };
  const safeArray = (value) => Array.isArray(value) ? value : [];

  function defaultState() {
    return {
      version: 1,
      accounts: ACCOUNT_DEFAULTS.map((account) => ({ ...account, platforms: [...account.platforms], pillars: [...account.pillars] })),
      posts: [], assets: [], revenue: [], webMetrics: [], reviews: [],
      calendarView: "week", calendarDate: todayKey(), activeTab: "today", migrated: false
    };
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return value ?? fallback;
    } catch { return fallback; }
  }

  function normalize(raw) {
    const base = defaultState();
    const source = raw && typeof raw === "object" ? raw : {};
    const savedAccounts = safeArray(source.accounts);
    const accounts = ACCOUNT_DEFAULTS.map((fallback) => {
      const saved = savedAccounts.find((account) => account.id === fallback.id) || {};
      return { ...fallback, ...saved, platforms: safeArray(saved.platforms).length ? saved.platforms : [...fallback.platforms], pillars: safeArray(saved.pillars).length ? saved.pillars : [...fallback.pillars] };
    });
    savedAccounts.filter((account) => account?.id && !accounts.some((item) => item.id === account.id)).forEach((account) => accounts.push(account));
    return {
      ...base, ...source, accounts,
      posts: safeArray(source.posts), assets: safeArray(source.assets), revenue: safeArray(source.revenue),
      webMetrics: safeArray(source.webMetrics), reviews: safeArray(source.reviews)
    };
  }

  let state = normalize(readJson(STORAGE_KEY, null));
  let activeAccount = localStorage.getItem(ACTIVE_ACCOUNT_KEY) || "all";
  let modalSubmit = null;

  function migrateLegacy() {
    if (state.migrated) return;
    const migrated = [];
    const oldPosts = readJson("pipelinePosts", []);
    safeArray(oldPosts).forEach((post) => {
      const title = String(post?.title || "").trim();
      if (!title) return;
      migrated.push({
        id: post.id || uid(), title, accountId: "playmechi", platform: post.platform || "Facebook",
        status: STATUS_ORDER[Number(post.status)] || "Idea", format: "Post", pillar: "", campaign: "",
        publishDate: post.publishedAt || "", publishTime: "", goal: "Awareness", hook: "", cta: "", notes: "",
        repurpose: [], metrics: { views: number(post.views), likes: number(post.likes), comments: number(post.comments) },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      });
    });
    const app = readJson("myLittleLife.app.v2", {});
    [
      ...safeArray(app?.lists?.ideas).map((item) => ({ ...item, fallbackStatus: "Idea" })),
      ...safeArray(app?.lists?.drafts).map((item) => ({ ...item, fallbackStatus: "Creating" }))
    ].forEach((item) => {
      const title = String(item.text || item.title || "").trim();
      if (!title || migrated.some((post) => post.title.toLowerCase() === title.toLowerCase())) return;
      migrated.push({ id: item.id || uid(), title, accountId: "playmechi", platform: item.platform || "Facebook", status: item.status || item.fallbackStatus, format: "Post", pillar: "", campaign: "", publishDate: item.publishDate || "", publishTime: "", goal: "Awareness", hook: "", cta: "", notes: item.notes || "", repurpose: [], metrics: {}, createdAt: item.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    });
    state.posts.push(...migrated);
    state.migrated = true;
    save(false);
  }

  function save(showMessage = true, message = "Saved. Your creator workspace will sync with your account.") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (showMessage) toast(message);
  }

  function accountById(id) {
    return state.accounts.find((account) => account.id === id) || state.accounts[0];
  }

  function visiblePosts() {
    return activeAccount === "all" ? state.posts : state.posts.filter((post) => post.accountId === activeAccount);
  }

  function thisWeekPosts(posts = visiblePosts()) {
    const start = weekStart(new Date());
    const end = new Date(start); end.setDate(end.getDate() + 7);
    return posts.filter((post) => {
      const date = parseDate(post.publishDate);
      return date && date >= start && date < end;
    });
  }

  function interactions(post) {
    const metrics = post.metrics || {};
    return number(metrics.likes) + number(metrics.comments) + number(metrics.shares) + number(metrics.saves);
  }

  function rawScore(post) {
    const metric = post.metrics || {};
    const goal = String(post.goal || "Awareness").toLowerCase();
    if (goal === "engagement") return interactions(post) * 4 + number(metric.retention) * 10;
    if (goal === "community") return number(metric.comments) * 7 + number(metric.shares) * 5 + number(metric.saves) * 4;
    if (goal === "traffic") return number(metric.clicks) * 10 + number(metric.reach) * .05;
    if (goal === "conversion") return number(metric.conversions) * 30 + number(metric.clicks) * 3 + number(metric.revenue) * .05;
    if (goal === "revenue") return number(metric.revenue) + number(metric.conversions) * 25;
    return number(metric.views) + number(metric.reach) * .5 + number(metric.retention) * 25;
  }

  function scoredPosts(posts = visiblePosts()) {
    const published = posts.filter((post) => post.status === "Published");
    const max = Math.max(1, ...published.map(rawScore));
    return published.map((post) => ({ post, score: Math.round(rawScore(post) / max * 100) })).sort((a, b) => b.score - a.score);
  }

  function nextAction(posts = visiblePosts()) {
    const today = todayKey();
    const overdue = posts.filter((post) => post.status !== "Published" && post.publishDate && post.publishDate < today).sort((a, b) => a.publishDate.localeCompare(b.publishDate));
    if (overdue[0]) return { title: `Finish “${overdue[0].title}”`, detail: `Overdue since ${dateLabel(overdue[0].publishDate)} · ${accountById(overdue[0].accountId).name}`, post: overdue[0] };
    const scheduled = posts.filter((post) => post.status !== "Published" && post.publishDate).sort((a, b) => a.publishDate.localeCompare(b.publishDate));
    if (scheduled[0]) return { title: `Prepare “${scheduled[0].title}”`, detail: `Due ${dateLabel(scheduled[0].publishDate)}${scheduled[0].publishTime ? ` at ${scheduled[0].publishTime}` : ""}`, post: scheduled[0] };
    const creating = posts.find((post) => post.status === "Creating") || posts.find((post) => post.status === "Idea");
    if (creating) return { title: `Move “${creating.title}” forward`, detail: `${creating.status} · add a date, hook or next production step`, post: creating };
    return { title: "Capture your next content idea", detail: "Start small: account, topic and the audience goal are enough.", post: null };
  }

  function toast(message) {
    qs(".creator-toast")?.remove();
    const node = document.createElement("div");
    node.className = "creator-toast";
    node.setAttribute("role", "status");
    node.textContent = message;
    document.body.append(node);
    window.setTimeout(() => node.remove(), 3200);
  }

  function optionList(options, selected = "") {
    return options.map((value) => `<option value="${esc(value)}"${String(value) === String(selected) ? " selected" : ""}>${esc(value)}</option>`).join("");
  }

  function accountOptions(selected = "") {
    return state.accounts.map((account) => `<option value="${esc(account.id)}"${account.id === selected ? " selected" : ""}>${esc(account.name)}</option>`).join("");
  }

  function openModal(config) {
    const modal = qs("#creatorModal");
    qs("#creatorModalEyebrow").textContent = config.eyebrow || "Creator workspace";
    qs("#creatorModalTitle").textContent = config.title;
    qs("#creatorModalDescription").textContent = config.description || "";
    qs("#creatorModalFields").innerHTML = config.fields;
    qs("#creatorModalError").textContent = "";
    qs("#creatorModalSubmit").textContent = config.submitLabel || "Save";
    modalSubmit = config.submit;
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => qs("input, select, textarea", qs("#creatorModalFields"))?.focus(), 20);
  }

  function closeModal() {
    const modal = qs("#creatorModal");
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    modalSubmit = null;
  }

  function field(name, label, value = "", options = {}) {
    const required = options.required ? " required" : "";
    const full = options.full ? " full" : "";
    if (options.type === "textarea") return `<label class="creator-field${full}">${esc(label)}<textarea name="${esc(name)}" maxlength="${options.maxlength || 1500}" placeholder="${esc(options.placeholder || "")}"${required}>${esc(value)}</textarea></label>`;
    if (options.type === "select") return `<label class="creator-field${full}">${esc(label)}<select name="${esc(name)}"${required}>${optionList(options.options || [], value)}</select></label>`;
    return `<label class="creator-field${full}">${esc(label)}<input name="${esc(name)}" type="${options.type || "text"}" value="${esc(value)}"${options.min !== undefined ? ` min="${options.min}"` : ""}${options.step ? ` step="${options.step}"` : ""}${options.placeholder ? ` placeholder="${esc(options.placeholder)}"` : ""}${required}></label>`;
  }

  function postForm(post = null, initial = {}) {
    const accountId = post?.accountId || initial.accountId || (activeAccount === "all" ? state.accounts[0].id : activeAccount);
    const account = accountById(accountId);
    const values = { status: "Idea", format: "Post", platform: account.platforms[0] || "Facebook", goal: "Awareness", ...initial, ...(post || {}) };
    openModal({
      eyebrow: post ? "Edit content" : "Quick capture",
      title: post ? "Shape this content" : "Capture a content idea",
      description: "Plan only what you know now. You can add performance numbers after publishing.",
      submitLabel: post ? "Save changes" : "Add to pipeline",
      fields: [
        field("title", "Content title", values.title, { required: true, full: true, placeholder: "What are you creating?" }),
        `<label class="creator-field">Account<select name="accountId" required>${accountOptions(accountId)}</select></label>`,
        field("platform", "Platform", values.platform, { type: "select", options: PLATFORM_OPTIONS }),
        field("status", "Stage", values.status, { type: "select", options: STATUS_ORDER }),
        field("format", "Format", values.format, { type: "select", options: FORMAT_OPTIONS }),
        field("pillar", "Content pillar", values.pillar, { placeholder: account.pillars.join(", ") }),
        field("campaign", "Campaign", values.campaign, { placeholder: "e.g. Launch week" }),
        field("publishDate", "Publish date", values.publishDate, { type: "date" }),
        field("publishTime", "Publish time", values.publishTime, { type: "time" }),
        field("goal", "Primary goal", values.goal, { type: "select", options: GOAL_OPTIONS }),
        field("hook", "Hook / opening", values.hook, { type: "textarea", full: true, maxlength: 500, placeholder: "What makes someone stop scrolling?" }),
        field("cta", "Call to action", values.cta, { placeholder: "Comment, visit, save, share…" }),
        field("repurpose", "Repurpose into", safeArray(values.repurpose).join(", "), { placeholder: "Reel, article, carousel…" }),
        field("notes", "Production notes", values.notes, { type: "textarea", full: true, maxlength: 1800, placeholder: "Script, shots, links, checklist or next action" })
      ].join(""),
      submit: (formData) => {
        const now = new Date().toISOString();
        const next = {
          ...(post || {}), id: post?.id || uid(), title: String(formData.get("title") || "").trim(),
          accountId: String(formData.get("accountId") || accountId), platform: String(formData.get("platform") || "Other"),
          status: String(formData.get("status") || "Idea"), format: String(formData.get("format") || "Post"),
          pillar: String(formData.get("pillar") || "").trim(), campaign: String(formData.get("campaign") || "").trim(),
          publishDate: String(formData.get("publishDate") || ""), publishTime: String(formData.get("publishTime") || ""),
          goal: String(formData.get("goal") || "Awareness"), hook: String(formData.get("hook") || "").trim(),
          cta: String(formData.get("cta") || "").trim(), notes: String(formData.get("notes") || "").trim(),
          repurpose: String(formData.get("repurpose") || "").split(",").map((item) => item.trim()).filter(Boolean),
          metrics: post?.metrics || {}, createdAt: post?.createdAt || now, updatedAt: now
        };
        if (!next.title) throw new Error("Add a title before saving.");
        const index = state.posts.findIndex((item) => item.id === next.id);
        if (index >= 0) state.posts[index] = next; else state.posts.unshift(next);
        save(true, post ? "Content updated." : "Content added to your pipeline.");
        render();
      }
    });
  }

  function metricsForm(post) {
    const metric = post.metrics || {};
    openModal({
      eyebrow: "Post performance",
      title: `How did “${post.title}” perform?`,
      description: "Enter only the measurements available on that platform. Blank fields stay at zero.",
      submitLabel: "Save performance",
      fields: [
        field("views", "Views / plays", metric.views, { type: "number", min: 0 }), field("reach", "Reach", metric.reach, { type: "number", min: 0 }),
        field("likes", "Likes", metric.likes, { type: "number", min: 0 }), field("comments", "Comments", metric.comments, { type: "number", min: 0 }),
        field("shares", "Shares", metric.shares, { type: "number", min: 0 }), field("saves", "Saves", metric.saves, { type: "number", min: 0 }),
        field("watchTime", "Watch time (minutes)", metric.watchTime, { type: "number", min: 0, step: "0.1" }), field("retention", "Average retention (%)", metric.retention, { type: "number", min: 0, step: "0.1" }),
        field("clicks", "Link clicks", metric.clicks, { type: "number", min: 0 }), field("conversions", "Conversions", metric.conversions, { type: "number", min: 0 }),
        field("revenue", "Revenue (KSh)", metric.revenue, { type: "number", min: 0, step: "0.01" }), field("lesson", "Lesson learned", metric.lesson, { placeholder: "What should you repeat?" })
      ].join(""),
      submit: (formData) => {
        post.metrics = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, key === "lesson" ? String(value).trim() : number(value)]));
        post.status = "Published";
        post.updatedAt = new Date().toISOString();
        save(true, "Performance saved and content marked published.");
        render();
      }
    });
  }

  function accountForm(account) {
    openModal({
      eyebrow: "Account settings", title: `Personalize ${account.name}`,
      description: "Use the handles, targets and content pillars that match this brand right now.", submitLabel: "Save account",
      fields: [
        field("name", "Account / brand name", account.name, { required: true }), field("phase", "Current phase", account.phase),
        field("handle", "Handle or website", account.handle, { placeholder: "@handle or domain" }), field("platforms", "Platforms", safeArray(account.platforms).join(", ")),
        field("weeklyTarget", "Weekly post target", account.weeklyTarget, { type: "number", min: 0 }), field("revenueGoal", "Revenue goal (KSh)", account.revenueGoal, { type: "number", min: 0 }),
        field("goal", "Main goal", account.goal, { type: "textarea", full: true, maxlength: 600 }), field("pillars", "Content pillars", safeArray(account.pillars).join(", "), { full: true, placeholder: "Separate pillars with commas" })
      ].join(""),
      submit: (formData) => {
        Object.assign(account, {
          name: String(formData.get("name") || "").trim(), phase: String(formData.get("phase") || "").trim(), handle: String(formData.get("handle") || "").trim(),
          platforms: String(formData.get("platforms") || "").split(",").map((item) => item.trim()).filter(Boolean), weeklyTarget: number(formData.get("weeklyTarget")),
          revenueGoal: number(formData.get("revenueGoal")), goal: String(formData.get("goal") || "").trim(), pillars: String(formData.get("pillars") || "").split(",").map((item) => item.trim()).filter(Boolean)
        });
        save(true, `${account.name} updated.`); render();
      }
    });
  }

  function assetForm(asset = null) {
    const values = asset || { accountId: activeAccount === "all" ? state.accounts[0].id : activeAccount, type: "Script" };
    openModal({
      eyebrow: "Creator vault", title: asset ? "Edit this asset" : "Save a reusable asset",
      description: "Keep hooks, scripts, captions, links, raw-footage notes and brand templates easy to find.", submitLabel: "Save to vault",
      fields: [
        field("name", "Asset name", values.name, { required: true, full: true }), `<label class="creator-field">Account<select name="accountId">${accountOptions(values.accountId)}</select></label>`,
        field("type", "Type", values.type, { type: "select", options: ["Hook", "Script", "Caption", "Hashtags", "Thumbnail", "Raw footage", "B-roll", "Brand template", "Link", "Other"] }),
        field("url", "Link (optional)", values.url, { full: true, type: "url", placeholder: "https://…" }), field("notes", "Notes or copy", values.notes, { type: "textarea", full: true, maxlength: 2500 })
      ].join(""),
      submit: (formData) => {
        const next = { ...(asset || {}), id: asset?.id || uid(), name: String(formData.get("name") || "").trim(), accountId: String(formData.get("accountId") || ""), type: String(formData.get("type") || "Other"), url: String(formData.get("url") || "").trim(), notes: String(formData.get("notes") || "").trim(), updatedAt: new Date().toISOString() };
        if (!next.name) throw new Error("Add an asset name.");
        const index = state.assets.findIndex((item) => item.id === next.id); if (index >= 0) state.assets[index] = next; else state.assets.unshift(next);
        save(true, "Asset saved to your creator vault."); render();
      }
    });
  }

  function revenueForm() {
    openModal({
      eyebrow: "Monetization", title: "Log creator money", description: "Track payouts, sponsorships, affiliate income, sales and production costs.", submitLabel: "Save money entry",
      fields: [
        `<label class="creator-field">Account<select name="accountId">${accountOptions(activeAccount === "all" ? state.accounts[0].id : activeAccount)}</select></label>`,
        field("kind", "Entry type", "Income", { type: "select", options: ["Income", "Pending", "Expense"] }), field("amount", "Amount (KSh)", "", { type: "number", min: 0, step: "0.01", required: true }),
        field("date", "Date", todayKey(), { type: "date", required: true }), field("source", "Source", "", { required: true, placeholder: "Facebook payout, sponsor, hosting…" }),
        field("notes", "Notes", "", { type: "textarea", full: true, maxlength: 900 })
      ].join(""),
      submit: (formData) => {
        const entry = { id: uid(), accountId: String(formData.get("accountId") || ""), kind: String(formData.get("kind") || "Income"), amount: number(formData.get("amount")), date: String(formData.get("date") || todayKey()), source: String(formData.get("source") || "").trim(), notes: String(formData.get("notes") || "").trim() };
        if (!entry.amount || !entry.source) throw new Error("Add the amount and source.");
        state.revenue.unshift(entry); save(true, "Money entry saved."); render();
      }
    });
  }

  function webMetricsForm() {
    const latest = state.webMetrics[0] || {};
    openModal({
      eyebrow: "Exampoa website", title: "Add a Search Console snapshot", description: "Copy the latest totals from Google Search Console or your website dashboard.", submitLabel: "Save website snapshot",
      fields: [
        field("date", "Snapshot date", todayKey(), { type: "date", required: true }), field("clicks", "Google clicks", latest.clicks || "", { type: "number", min: 0 }),
        field("impressions", "Impressions", latest.impressions || "", { type: "number", min: 0 }), field("ctr", "Click-through rate (%)", latest.ctr || "", { type: "number", min: 0, step: "0.1" }),
        field("position", "Average position", latest.position || "", { type: "number", min: 0, step: "0.1" }), field("downloads", "Resource downloads", latest.downloads || "", { type: "number", min: 0 }),
        field("signups", "Registrations", latest.signups || "", { type: "number", min: 0 }), field("revenue", "Website revenue (KSh)", latest.revenue || "", { type: "number", min: 0 }),
        field("topQuery", "Top search query", latest.topQuery || ""), field("topPage", "Top page", latest.topPage || ""),
      ].join(""),
      submit: (formData) => {
        const entry = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, ["date", "topQuery", "topPage"].includes(key) ? String(value).trim() : number(value)]));
        state.webMetrics.unshift({ id: uid(), ...entry }); state.webMetrics = state.webMetrics.slice(0, 52); save(true, "Exampoa website snapshot saved."); render();
      }
    });
  }

  function reviewForm() {
    openModal({
      eyebrow: "Weekly review", title: "Turn this week into a smarter next week", description: "A short review is enough. Capture the lesson and the next experiment.", submitLabel: "Save weekly review",
      fields: [
        field("week", "Week ending", todayKey(), { type: "date", required: true }), field("best", "What worked best?", "", { required: true }),
        field("underperformed", "What underperformed?", ""), field("questions", "Audience questions or comments", ""),
        field("repeat", "What will you repeat?", "", { type: "textarea", full: true }), field("test", "Next experiment", "", { type: "textarea", full: true })
      ].join(""),
      submit: (formData) => {
        state.reviews.unshift({ id: uid(), ...Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value).trim()])) });
        state.reviews = state.reviews.slice(0, 52); save(true, "Weekly content review saved."); render();
      }
    });
  }

  function renderShell() {
    const root = qs("#content");
    if (!root) return false;
    root.className = "creator-center section";
    root.innerHTML = `
      <div class="creator-head">
        <div><p class="eyebrow">Your creator command center</p><h2>Plan it, publish it, learn from it.</h2><p class="creator-intro">One calm workspace for PlayMechi, Exampoa, Medical Influencing and Leridia Jewels — built around your real goals, not sample numbers.</p></div>
        <div class="creator-head-actions"><button class="creator-secondary" type="button" data-creator-action="export">↓ Export CSV</button><button class="creator-primary" type="button" data-creator-action="add-post">＋ Add content</button></div>
      </div>
      <div class="creator-toolbar"><nav class="creator-tab-list" aria-label="Content dashboard views">${[["today","Today"],["plan","Plan"],["publish","Publish"],["analyse","Analyse"],["earn","Earn"]].map(([id,label]) => `<button class="creator-tab" type="button" data-creator-tab="${id}">${label}</button>`).join("")}</nav><button class="creator-primary" type="button" data-creator-action="quick-capture">＋ Quick capture</button></div>
      <div class="creator-account-switcher" id="creatorAccountSwitcher"></div>
      <section class="creator-panel" data-creator-panel="today"></section>
      <section class="creator-panel" data-creator-panel="plan" hidden></section>
      <section class="creator-panel" data-creator-panel="publish" hidden></section>
      <section class="creator-panel" data-creator-panel="analyse" hidden></section>
      <section class="creator-panel" data-creator-panel="earn" hidden></section>
      <button class="creator-mobile-capture" type="button" data-creator-action="quick-capture" aria-label="Quickly capture content">＋</button>
      <div class="creator-modal" id="creatorModal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="creatorModalTitle">
        <button class="creator-modal-backdrop" type="button" data-creator-action="close-modal" aria-label="Close"></button>
        <form class="creator-modal-card" id="creatorModalForm"><button class="creator-modal-close" type="button" data-creator-action="close-modal" aria-label="Close">×</button><p class="eyebrow" id="creatorModalEyebrow"></p><h2 id="creatorModalTitle"></h2><p class="creator-modal-description" id="creatorModalDescription"></p><div class="creator-form-grid" id="creatorModalFields"></div><p class="creator-modal-error" id="creatorModalError" role="alert"></p><div class="creator-modal-actions"><button class="creator-secondary" type="button" data-creator-action="close-modal">Cancel</button><button class="creator-primary" id="creatorModalSubmit" type="submit">Save</button></div></form>
      </div>`;
    document.body.classList.add("creator-upgraded");
    qsa('a[href="#analytics"], a[href="#accountInsights"], a[href="#contentPipeline"], a[href="#contentCalendar"]').forEach((link) => {
      link.href = "#content";
      link.dataset.creatorNavTab = link.textContent.toLowerCase().includes("analytic") || link.textContent.toLowerCase().includes("insight") ? "analyse" : "plan";
    });
    return true;
  }

  function renderSwitcher() {
    const node = qs("#creatorAccountSwitcher");
    const allCount = state.posts.length;
    node.innerHTML = `<button class="creator-account-switch${activeAccount === "all" ? " active" : ""}" type="button" data-account-id="all" style="--creator-accent:#493941"><i></i><span>All brands<small>${allCount} content items</small></span></button>${state.accounts.map((account) => `<button class="creator-account-switch${activeAccount === account.id ? " active" : ""}" type="button" data-account-id="${esc(account.id)}" style="--creator-accent:${esc(account.accent)}"><i></i><span>${esc(account.name)}<small>${esc(account.phase || "Personalize account")}</small></span></button>`).join("")}`;
  }

  function renderToday() {
    const panel = qs('[data-creator-panel="today"]');
    const posts = visiblePosts();
    const week = thisWeekPosts(posts);
    const today = todayKey();
    const dueToday = posts.filter((post) => post.publishDate === today && post.status !== "Published");
    const overdue = posts.filter((post) => post.publishDate && post.publishDate < today && post.status !== "Published");
    const scheduled = posts.filter((post) => post.status === "Scheduled");
    const publishedWeek = week.filter((post) => post.status === "Published");
    const account = activeAccount === "all" ? null : accountById(activeAccount);
    const target = account ? number(account.weeklyTarget) : state.accounts.reduce((sum, item) => sum + number(item.weeklyTarget), 0);
    const action = nextAction(posts);
    const best = scoredPosts(posts)[0];
    const monthPrefix = today.slice(0, 7);
    const revenue = state.revenue.filter((item) => (activeAccount === "all" || item.accountId === activeAccount) && item.kind === "Income" && item.date?.startsWith(monthPrefix)).reduce((sum, item) => sum + number(item.amount), 0);
    panel.innerHTML = `
      <div class="creator-kpi-grid">
        <article class="creator-kpi"><span>Due today</span><strong>${dueToday.length}</strong><small>${dueToday.length ? "Ready for your attention" : "Nothing urgent today"}</small></article>
        <article class="creator-kpi"><span>Overdue</span><strong>${overdue.length}</strong><small>${overdue.length ? "Reschedule or finish these" : "Your plan is clear"}</small></article>
        <article class="creator-kpi"><span>Scheduled</span><strong>${scheduled.length}</strong><small>Across your content queue</small></article>
        <article class="creator-kpi"><span>Weekly rhythm</span><strong>${publishedWeek.length}/${target || 0}</strong><small>Published toward target</small></article>
        <article class="creator-kpi"><span>Creator income</span><strong>${money(revenue)}</strong><small>Received this month</small></article>
      </div>
      <article class="creator-next-action"><span>✦</span><div><span class="creator-meta-label">Your next best action</span><strong>${esc(action.title)}</strong><small>${esc(action.detail)}</small></div><button class="creator-primary" type="button" data-creator-action="${action.post ? "edit-post" : "add-post"}"${action.post ? ` data-post-id="${esc(action.post.id)}"` : ""}>${action.post ? "Open content" : "Capture idea"}</button></article>
      <div class="creator-layout-two">
        <article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Today and next</p><h3>Your publishing runway</h3></div><button class="creator-ghost" type="button" data-set-tab="plan">Open calendar →</button></div><div class="creator-list">${renderUpcoming(posts)}</div></article>
        <article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Signal</p><h3>${best ? "Current best performer" : "Your insights will grow here"}</h3></div></div>${best ? renderBest(best) : `<p class="creator-empty">Add performance after publishing. The dashboard will identify what worked and why.</p>`}</article>
      </div>`;
  }

  function renderUpcoming(posts) {
    const upcoming = [...posts].filter((post) => post.status !== "Published").sort((a, b) => (a.publishDate || "9999").localeCompare(b.publishDate || "9999")).slice(0, 7);
    if (!upcoming.length) return `<p class="creator-empty">No content is waiting. Capture an idea when inspiration arrives.</p>`;
    return upcoming.map((post) => {
      const account = accountById(post.accountId);
      const overdue = post.publishDate && post.publishDate < todayKey();
      return `<div class="creator-list-row"><span class="creator-list-copy"><strong>${esc(post.title)}</strong><small>${esc(account.name)} · ${esc(post.platform)} · ${post.publishDate ? esc(dateLabel(post.publishDate)) : "Unscheduled"}</small></span><button class="creator-status ${overdue ? "overdue" : post.status.toLowerCase()}" type="button" data-creator-action="edit-post" data-post-id="${esc(post.id)}">${overdue ? "Overdue" : esc(post.status)}</button></div>`;
    }).join("");
  }

  function renderBest(scored) {
    const post = scored.post;
    const metric = post.metrics || {};
    return `<div class="creator-performance-copy"><strong>${esc(post.title)}</strong><small>${esc(accountById(post.accountId).name)} · ${esc(post.platform)} · goal: ${esc(post.goal)}</small></div><div class="creator-stats-grid" style="margin-top:14px"><article class="creator-stat"><span>Score</span><strong>${scored.score}</strong><small>Goal-aware score</small></article><article class="creator-stat"><span>Reach/views</span><strong>${formatNumber(number(metric.reach) || number(metric.views))}</strong><small>Audience exposure</small></article><article class="creator-stat"><span>Interactions</span><strong>${formatNumber(interactions(post))}</strong><small>Likes, comments, shares, saves</small></article><article class="creator-stat"><span>Revenue</span><strong>${money(metric.revenue)}</strong><small>Attributed to this post</small></article></div>${metric.lesson ? `<p class="creator-muted">Lesson: ${esc(metric.lesson)}</p>` : ""}`;
  }

  function renderPlan() {
    const panel = qs('[data-creator-panel="plan"]');
    panel.innerHTML = `
      <article class="creator-calendar-shell"><div class="creator-calendar-head"><div><p class="eyebrow">Publishing calendar</p><h3 id="creatorCalendarTitle"></h3></div><div class="creator-calendar-controls"><button class="creator-icon-button" type="button" data-calendar-move="-1" aria-label="Previous period">←</button><button class="creator-secondary" type="button" data-calendar-today>Today</button><button class="creator-icon-button" type="button" data-calendar-move="1" aria-label="Next period">→</button><select id="creatorCalendarView" aria-label="Calendar view">${optionList(["week", "month", "list"], state.calendarView)}</select><button class="creator-primary" type="button" data-creator-action="add-post">＋ Add content</button></div></div><div id="creatorCalendarBody"></div></article>
      <div class="creator-account-grid" style="margin-top:14px">${state.accounts.filter((account) => activeAccount === "all" || account.id === activeAccount).map(renderAccountCard).join("")}</div>`;
    renderCalendar();
  }

  function renderCalendar() {
    const body = qs("#creatorCalendarBody");
    if (!body) return;
    const focus = parseDate(state.calendarDate) || new Date();
    const posts = visiblePosts().filter((post) => post.publishDate);
    if (state.calendarView === "list") {
      qs("#creatorCalendarTitle").textContent = "Scheduled content list";
      const sorted = [...posts].sort((a, b) => a.publishDate.localeCompare(b.publishDate));
      body.innerHTML = `<div class="creator-list creator-list-calendar">${sorted.length ? sorted.map((post) => `<div class="creator-list-row"><span class="creator-list-copy"><strong>${esc(post.title)}</strong><small>${esc(dateLabel(post.publishDate, { weekday: "short", day: "numeric", month: "short", year: "numeric" }))}${post.publishTime ? ` · ${esc(post.publishTime)}` : ""} · ${esc(accountById(post.accountId).name)} · ${esc(post.platform)}</small></span><button class="creator-status ${post.status.toLowerCase()}" type="button" data-creator-action="edit-post" data-post-id="${esc(post.id)}">${esc(post.status)}</button></div>`).join("") : `<p class="creator-empty">Add a publish date to see content here.</p>`}</div>`;
      return;
    }
    let start;
    let days;
    if (state.calendarView === "month") {
      const first = new Date(focus.getFullYear(), focus.getMonth(), 1);
      start = weekStart(first); days = 42;
      qs("#creatorCalendarTitle").textContent = focus.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    } else {
      start = weekStart(focus); days = 7;
      const end = new Date(start); end.setDate(end.getDate() + 6);
      qs("#creatorCalendarTitle").textContent = `${start.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}`;
    }
    const cells = Array.from({ length: days }, (_, index) => { const date = new Date(start); date.setDate(start.getDate() + index); return date; });
    body.innerHTML = `<div class="creator-calendar-grid">${cells.map((date) => {
      const key = localDateKey(date); const items = posts.filter((post) => post.publishDate === key);
      const muted = state.calendarView === "month" && date.getMonth() !== focus.getMonth();
      return `<article class="creator-calendar-day${key === todayKey() ? " today" : ""}${muted ? " muted" : ""}"><header><small>${esc(date.toLocaleDateString("en-KE", { weekday: "short" }))}</small><strong>${date.getDate()}</strong></header>${items.map((post) => `<button class="creator-calendar-item" type="button" data-creator-action="edit-post" data-post-id="${esc(post.id)}" style="--creator-accent:${esc(accountById(post.accountId).accent)}"><strong>${esc(post.title)}</strong><small>${esc(post.publishTime || post.platform)}</small></button>`).join("")}</article>`;
    }).join("")}</div>`;
  }

  function renderAccountCard(account) {
    const posts = state.posts.filter((post) => post.accountId === account.id);
    const weekDone = thisWeekPosts(posts).filter((post) => post.status === "Published").length;
    const progress = account.weeklyTarget ? Math.min(100, Math.round(weekDone / account.weeklyTarget * 100)) : 0;
    return `<article class="creator-account-card" style="--creator-accent:${esc(account.accent)}"><header><div><p class="eyebrow">${esc(account.phase || "Creator account")}</p><h3>${esc(account.name)}</h3></div><button class="creator-ghost" type="button" data-creator-action="edit-account" data-account-id="${esc(account.id)}">Edit</button></header><p>${esc(account.goal || "Add the main goal for this account.")}</p><div class="creator-chip-list">${safeArray(account.platforms).map((item) => `<span class="creator-chip">${esc(item)}</span>`).join("")}</div><span class="creator-meta-label">Content pillars</span><div class="creator-chip-list">${safeArray(account.pillars).map((item) => `<span class="creator-chip">${esc(item)}</span>`).join("") || `<span class="creator-muted">Add pillars</span>`}</div><div class="creator-progress"><i style="width:${progress}%"></i></div><small class="creator-muted">${weekDone} of ${account.weeklyTarget || 0} weekly posts published</small></article>`;
  }

  function renderPublish() {
    const panel = qs('[data-creator-panel="publish"]');
    panel.innerHTML = `<div class="creator-filter-row"><input id="creatorPostSearch" type="search" placeholder="Search content, campaign, hook or pillar"><select id="creatorStatusFilter"><option value="all">All stages</option>${optionList(STATUS_ORDER)}</select><select id="creatorPlatformFilter"><option value="all">All platforms</option>${optionList(PLATFORM_OPTIONS)}</select><button class="creator-primary" type="button" data-creator-action="add-post">＋ Add content</button></div><div class="creator-pipeline" id="creatorPipeline"></div><div class="creator-layout-two" style="margin-top:14px"><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Repurposing</p><h3>One idea, more useful versions</h3></div></div><div id="creatorRepurposeList" class="creator-list"></div></article><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Creator vault</p><h3>Scripts, hooks and reusable assets</h3></div><button class="creator-ghost" type="button" data-creator-action="add-asset">＋ Add asset</button></div><div id="creatorAssetList" class="creator-vault-grid"></div></article></div>`;
    renderPipeline(); renderRepurpose(); renderAssets();
  }

  function renderPipeline() {
    const node = qs("#creatorPipeline");
    if (!node) return;
    const search = String(qs("#creatorPostSearch")?.value || "").toLowerCase();
    const statusFilter = qs("#creatorStatusFilter")?.value || "all";
    const platformFilter = qs("#creatorPlatformFilter")?.value || "all";
    const posts = visiblePosts().filter((post) => (!search || [post.title, post.campaign, post.hook, post.pillar].some((value) => String(value || "").toLowerCase().includes(search))) && (statusFilter === "all" || post.status === statusFilter) && (platformFilter === "all" || post.platform === platformFilter));
    node.innerHTML = STATUS_ORDER.map((status) => {
      const items = posts.filter((post) => post.status === status);
      return `<article class="creator-pipeline-column"><header><strong>${esc(status)}</strong><span>${items.length}</span></header>${items.length ? items.map(renderPostCard).join("") : `<p class="creator-empty">Nothing here yet.</p>`}</article>`;
    }).join("");
  }

  function renderPostCard(post) {
    const account = accountById(post.accountId);
    return `<article class="creator-post-card" style="--creator-accent:${esc(account.accent)}"><span class="creator-meta-label">${esc(account.name)} · ${esc(post.goal || "Awareness")}</span><strong>${esc(post.title)}</strong><small>${esc(post.platform)} · ${esc(post.format || "Post")}${post.publishDate ? ` · ${esc(dateLabel(post.publishDate))}` : " · unscheduled"}${post.pillar ? ` · ${esc(post.pillar)}` : ""}</small>${post.hook ? `<small>Hook: ${esc(post.hook)}</small>` : ""}<div class="creator-card-actions"><button class="creator-ghost" type="button" data-creator-action="edit-post" data-post-id="${esc(post.id)}">Edit</button>${post.status !== "Published" ? `<button class="creator-ghost" type="button" data-creator-action="advance-post" data-post-id="${esc(post.id)}">Next stage</button>` : ""}<button class="creator-ghost" type="button" data-creator-action="metrics" data-post-id="${esc(post.id)}">Metrics</button><button class="creator-ghost creator-danger" type="button" data-creator-action="delete-post" data-post-id="${esc(post.id)}">Delete</button></div></article>`;
  }

  function renderRepurpose() {
    const node = qs("#creatorRepurposeList");
    const posts = visiblePosts().filter((post) => safeArray(post.repurpose).length);
    node.innerHTML = posts.length ? posts.slice(0, 8).map((post) => `<div class="creator-list-row"><span class="creator-list-copy"><strong>${esc(post.title)}</strong><small>${safeArray(post.repurpose).map(esc).join(" · ")}</small></span><button class="creator-ghost" type="button" data-creator-action="create-versions" data-post-id="${esc(post.id)}">Create drafts</button></div>`).join("") : `<p class="creator-empty">Add repurposing formats while editing content. One idea can become a Reel, Short, carousel or article.</p>`;
  }

  function renderAssets() {
    const node = qs("#creatorAssetList");
    const assets = state.assets.filter((asset) => activeAccount === "all" || asset.accountId === activeAccount);
    node.innerHTML = assets.length ? assets.slice(0, 10).map((asset) => `<div class="creator-asset-row"><span class="creator-asset-copy"><strong>${esc(asset.name)}</strong><small>${esc(asset.type)} · ${esc(accountById(asset.accountId).name)}${asset.notes ? ` · ${esc(asset.notes.slice(0, 70))}` : ""}</small></span><div class="creator-card-actions">${asset.url ? `<a class="creator-ghost" href="${esc(asset.url)}" target="_blank" rel="noopener">Open</a>` : ""}<button class="creator-ghost" type="button" data-creator-action="edit-asset" data-asset-id="${esc(asset.id)}">Edit</button></div></div>`).join("") : `<p class="creator-empty">Your saved hooks, scripts, templates and production links will live here.</p>`;
  }

  function renderAnalyse() {
    const panel = qs('[data-creator-panel="analyse"]');
    const posts = visiblePosts().filter((post) => post.status === "Published");
    const totals = posts.reduce((sum, post) => { const metric = post.metrics || {}; sum.reach += number(metric.reach); sum.views += number(metric.views); sum.interactions += interactions(post); sum.clicks += number(metric.clicks); sum.conversions += number(metric.conversions); sum.revenue += number(metric.revenue); return sum; }, { reach: 0, views: 0, interactions: 0, clicks: 0, conversions: 0, revenue: 0 });
    const engagement = totals.reach ? totals.interactions / totals.reach * 100 : totals.views ? totals.interactions / totals.views * 100 : 0;
    const latestWeb = state.webMetrics[0];
    panel.innerHTML = `
      <div class="creator-stats-grid"><article class="creator-stat"><span>Reach</span><strong>${formatNumber(totals.reach)}</strong><small>Across logged posts</small></article><article class="creator-stat"><span>Views</span><strong>${formatNumber(totals.views)}</strong><small>Video and content plays</small></article><article class="creator-stat"><span>Engagement rate</span><strong>${engagement.toFixed(1)}%</strong><small>Interactions ÷ reach/views</small></article><article class="creator-stat"><span>Conversions</span><strong>${formatNumber(totals.conversions)}</strong><small>${formatNumber(totals.clicks)} tracked clicks</small></article></div>
      <div class="creator-analytics-layout"><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Post performance</p><h3>What is working — by content goal</h3></div><button class="creator-secondary" type="button" data-creator-action="export">↓ CSV</button></div><div class="creator-performance-list">${scoredPosts().length ? scoredPosts().slice(0, 12).map(({ post, score }) => `<div class="creator-performance-row"><span class="creator-performance-copy"><strong>${esc(post.title)}</strong><small>${esc(accountById(post.accountId).name)} · ${esc(post.platform)} · ${esc(post.goal)} · ${formatNumber(number(post.metrics?.reach) || number(post.metrics?.views))} reach/views</small></span><span class="creator-score">${score}/100</span><button class="creator-ghost" type="button" data-creator-action="metrics" data-post-id="${esc(post.id)}">Update</button></div>`).join("") : `<p class="creator-empty">Publish content and add its performance to build your real analytics — no placeholder numbers.</p>`}</div></article><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Weekly learning loop</p><h3>Notice, learn, test again</h3></div><button class="creator-ghost" type="button" data-creator-action="add-review">＋ Review</button></div><div class="creator-review-list">${renderReviews()}</div></article></div>
      <article class="creator-card" style="margin-top:14px"><div class="creator-card-head"><div><p class="eyebrow">Exampoa search performance</p><h3>Clicks, visibility and useful actions</h3></div><button class="creator-primary" type="button" data-creator-action="web-metrics">＋ Add snapshot</button></div><div class="creator-web-grid">${[["Google clicks",latestWeb?.clicks || 0,"Visits from search"],["Impressions",latestWeb?.impressions || 0,"Times Exampoa appeared"],["Search CTR",`${latestWeb?.ctr || 0}%`,"Clicks ÷ impressions"],["Average position",latestWeb?.position || 0,"Watch the trend over time"],["Downloads",latestWeb?.downloads || 0,"Revision resources used"],["Registrations",latestWeb?.signups || 0,"Learners registered"],["Website revenue",money(latestWeb?.revenue || 0),"Latest saved snapshot"],["Snapshot date",latestWeb ? dateLabel(latestWeb.date) : "—",latestWeb?.topQuery ? `Top query: ${latestWeb.topQuery}` : "Add your first real snapshot"]].map(([label,value,note]) => `<article class="creator-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></article>`).join("")}</div>${latestWeb?.topPage ? `<p class="creator-muted" style="margin-top:12px">Top page: ${esc(latestWeb.topPage)}</p>` : ""}</article>`;
  }

  function renderReviews() {
    const reviews = state.reviews.slice(0, 4);
    return reviews.length ? reviews.map((review) => `<article class="creator-review-row"><div><strong>${esc(dateLabel(review.week, { day: "numeric", month: "short", year: "numeric" }))} review</strong><p><b>Worked:</b> ${esc(review.best || "—")}<br><b>Next test:</b> ${esc(review.test || "—")}</p></div><small>${esc(review.repeat || "Keep learning")}</small></article>`).join("") : `<p class="creator-empty">At the end of the week, save what worked, what felt weak and one experiment for next week.</p>`;
  }

  function renderEarn() {
    const panel = qs('[data-creator-panel="earn"]');
    const entries = state.revenue.filter((item) => activeAccount === "all" || item.accountId === activeAccount);
    const income = entries.filter((item) => item.kind === "Income").reduce((sum, item) => sum + number(item.amount), 0);
    const pending = entries.filter((item) => item.kind === "Pending").reduce((sum, item) => sum + number(item.amount), 0);
    const costs = entries.filter((item) => item.kind === "Expense").reduce((sum, item) => sum + number(item.amount), 0);
    const profit = income - costs;
    panel.innerHTML = `
      <div class="creator-stats-grid"><article class="creator-stat"><span>Income received</span><strong>${money(income)}</strong><small>All saved creator income</small></article><article class="creator-stat"><span>Pending payouts</span><strong>${money(pending)}</strong><small>Expected but not received</small></article><article class="creator-stat"><span>Content costs</span><strong>${money(costs)}</strong><small>Tools, ads and production</small></article><article class="creator-stat"><span>Creator profit</span><strong>${money(profit)}</strong><small>Income minus costs</small></article></div>
      <div class="creator-earn-layout"><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Money log</p><h3>Payouts, deals, sales and costs</h3></div><button class="creator-primary" type="button" data-creator-action="add-revenue">＋ Log money</button></div><div class="creator-revenue-list">${entries.length ? entries.slice(0, 16).map((entry) => `<div class="creator-revenue-row"><span><strong>${esc(entry.source)}</strong><small>${esc(accountById(entry.accountId).name)} · ${esc(dateLabel(entry.date))} · ${esc(entry.kind)}</small></span><strong class="creator-money-amount ${entry.kind.toLowerCase()}">${entry.kind === "Expense" ? "−" : entry.kind === "Income" ? "+" : ""}${money(entry.amount)}</strong></div>`).join("") : `<p class="creator-empty">Log PlayMechi payouts, Exampoa revenue, sponsorships, Leridia sales and content costs here.</p>`}</div></article><article class="creator-card"><div class="creator-card-head"><div><p class="eyebrow">Revenue goals</p><h3>Know what you are building toward</h3></div></div><div class="creator-revenue-goals">${state.accounts.map((account) => {
        const earned = state.revenue.filter((item) => item.accountId === account.id && item.kind === "Income").reduce((sum, item) => sum + number(item.amount), 0);
        const target = number(account.revenueGoal); const progress = target ? Math.min(100, Math.round(earned / target * 100)) : 0;
        return `<div class="creator-goal-row"><header><strong>${esc(account.name)}</strong><span>${money(earned)} / ${money(target)}</span></header><div class="creator-progress"><i style="width:${progress}%"></i></div><small class="creator-muted">${target ? `${progress}% toward current goal` : "Set a revenue goal in account settings"}</small></div>`;
      }).join("")}</div></article></div>`;
  }

  function render() {
    renderSwitcher();
    qsa("[data-creator-tab]").forEach((button) => button.classList.toggle("active", button.dataset.creatorTab === state.activeTab));
    qsa("[data-creator-panel]").forEach((panel) => { panel.hidden = panel.dataset.creatorPanel !== state.activeTab; });
    if (state.activeTab === "today") renderToday();
    if (state.activeTab === "plan") renderPlan();
    if (state.activeTab === "publish") renderPublish();
    if (state.activeTab === "analyse") renderAnalyse();
    if (state.activeTab === "earn") renderEarn();
  }

  function setTab(tab) {
    if (!["today", "plan", "publish", "analyse", "earn"].includes(tab)) return;
    state.activeTab = tab; save(false); render();
  }

  function exportCsv() {
    const columns = ["Title", "Account", "Platform", "Status", "Format", "Pillar", "Campaign", "Publish date", "Goal", "Views", "Reach", "Likes", "Comments", "Shares", "Saves", "Clicks", "Conversions", "Revenue", "Lesson"];
    const rows = state.posts.map((post) => { const metric = post.metrics || {}; return [post.title, accountById(post.accountId).name, post.platform, post.status, post.format, post.pillar, post.campaign, post.publishDate, post.goal, metric.views, metric.reach, metric.likes, metric.comments, metric.shares, metric.saves, metric.clicks, metric.conversions, metric.revenue, metric.lesson]; });
    const csv = [columns, ...rows].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `charry-content-${todayKey()}.csv`; link.click(); URL.revokeObjectURL(url);
    toast("Content CSV exported.");
  }

  function handleAction(button) {
    const action = button.dataset.creatorAction;
    const post = state.posts.find((item) => item.id === button.dataset.postId);
    if (action === "add-post" || action === "quick-capture") postForm();
    if (action === "edit-post" && post) postForm(post);
    if (action === "metrics" && post) metricsForm(post);
    if (action === "advance-post" && post) { const index = STATUS_ORDER.indexOf(post.status); post.status = STATUS_ORDER[Math.min(STATUS_ORDER.length - 1, index + 1)]; if (post.status === "Scheduled" && !post.publishDate) post.publishDate = todayKey(); post.updatedAt = new Date().toISOString(); save(true, `Moved to ${post.status}.`); render(); }
    if (action === "delete-post" && post && confirm(`Delete “${post.title}”?`)) { state.posts = state.posts.filter((item) => item.id !== post.id); save(true, "Content deleted."); render(); }
    if (action === "create-versions" && post) {
      const versions = safeArray(post.repurpose).filter(Boolean);
      versions.forEach((format) => state.posts.unshift({ ...post, id: uid(), title: `${post.title} — ${format}`, status: "Creating", format, publishDate: "", publishTime: "", repurpose: [], metrics: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
      post.repurpose = []; save(true, `${versions.length} repurposed draft${versions.length === 1 ? "" : "s"} created.`); render();
    }
    if (action === "edit-account") { const account = accountById(button.dataset.accountId); if (account) accountForm(account); }
    if (action === "add-asset") assetForm();
    if (action === "edit-asset") { const asset = state.assets.find((item) => item.id === button.dataset.assetId); if (asset) assetForm(asset); }
    if (action === "add-revenue") revenueForm();
    if (action === "web-metrics") webMetricsForm();
    if (action === "add-review") reviewForm();
    if (action === "export") exportCsv();
    if (action === "close-modal") closeModal();
  }

  function bindEvents() {
    qs("#content").addEventListener("click", (event) => {
      const action = event.target.closest("[data-creator-action]"); if (action) { event.preventDefault(); handleAction(action); return; }
      const tab = event.target.closest("[data-creator-tab]"); if (tab) { setTab(tab.dataset.creatorTab); return; }
      const account = event.target.closest("[data-account-id]"); if (account) { activeAccount = account.dataset.accountId; localStorage.setItem(ACTIVE_ACCOUNT_KEY, activeAccount); render(); return; }
      const set = event.target.closest("[data-set-tab]"); if (set) setTab(set.dataset.setTab);
      const move = event.target.closest("[data-calendar-move]"); if (move) { const date = parseDate(state.calendarDate) || new Date(); date.setDate(date.getDate() + number(move.dataset.calendarMove) * (state.calendarView === "month" ? 28 : 7)); state.calendarDate = localDateKey(date); save(false); renderPlan(); }
      if (event.target.closest("[data-calendar-today]")) { state.calendarDate = todayKey(); save(false); renderPlan(); }
    });
    qs("#content").addEventListener("input", (event) => { if (["creatorPostSearch", "creatorStatusFilter", "creatorPlatformFilter"].includes(event.target.id)) renderPipeline(); });
    qs("#content").addEventListener("change", (event) => { if (event.target.id === "creatorCalendarView") { state.calendarView = event.target.value; save(false); renderCalendar(); } if (["creatorStatusFilter", "creatorPlatformFilter"].includes(event.target.id)) renderPipeline(); });
    qs("#creatorModalForm").addEventListener("submit", (event) => {
      event.preventDefault(); if (!modalSubmit) return;
      try { modalSubmit(new FormData(event.currentTarget)); closeModal(); } catch (error) { qs("#creatorModalError").textContent = error?.message || "Please check the form and try again."; }
    });
    document.addEventListener("click", (event) => { const link = event.target.closest("[data-creator-nav-tab]"); if (link) setTab(link.dataset.creatorNavTab); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape" && qs("#creatorModal")?.classList.contains("open")) closeModal(); });
  }

  migrateLegacy();
  if (!renderShell()) return;
  bindEvents();
  render();
  globalThis.MyLittleLifeCreator = Object.freeze({ getState: () => structuredClone(state), render, openPostForm: () => postForm() });
})();
