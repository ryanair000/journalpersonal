"use strict";

(() => {
  const STORAGE_KEY = "mllDailyPublishingV1";
  const CALENDAR_SOURCE = "daily-publishing-routine-v1";
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
  const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));

  const defaults = {
    version: 1,
    quotas: {
      exampoa: { instagram: 3, tiktok: 2, facebook: 3, whatsapp: 2 },
      playmechi: { facebook: 10 }
    },
    originals: { exampoa: 4, playmechi: 3 },
    time: { production: 300, attachment: 180, saturday: 420, sunday: 240 },
    days: {},
    routineView: ""
  };

  const channelDefinitions = [
    { key: "exampoa.instagram", brand: "ExamPoa", platform: "Instagram", short: "IG", tone: "rose" },
    { key: "exampoa.tiktok", brand: "ExamPoa", platform: "TikTok", short: "TT", tone: "ink" },
    { key: "exampoa.facebook", brand: "ExamPoa", platform: "Facebook", short: "FB", tone: "blue" },
    { key: "exampoa.whatsapp", brand: "ExamPoa", platform: "WhatsApp", short: "WA", tone: "green" },
    { key: "playmechi.facebook", brand: "PlayMechi", platform: "Facebook", short: "FB", tone: "sport" }
  ];

  const workflowSteps = [
    "Scan education and sports trends; verify the facts and save useful sources",
    "Create four ExamPoa master ideas: demo, revision help, trust and conversion",
    "Create three PlayMechi anchors: news, match conversation and player/story post",
    "Turn the seven masters into thirteen useful platform or template variations",
    "Schedule all 20 placements, test links and complete the final quality check",
    "Reply to meaningful comments and record the strongest early signal"
  ];

  const routines = {
    production: {
      label: "Mon · Wed · Fri",
      title: "Production + protected study day",
      note: "Five content hours, with two protected study blocks and a real evening stop.",
      blocks: [
        ["06:30", "07:15", "Trend scan & research", "work"],
        ["07:15", "08:00", "Prayer, breakfast & prepare", "life"],
        ["08:00", "10:00", "Protected exam revision", "study"],
        ["10:30", "12:00", "ExamPoa master-content batch", "exampoa"],
        ["12:00", "13:30", "Lunch & reset", "life"],
        ["13:30", "16:00", "Protected exam revision", "study"],
        ["16:30", "18:00", "PlayMechi anchor + quick-post batch", "playmechi"],
        ["18:00", "19:30", "Dinner, prayer & break", "life"],
        ["19:30", "20:45", "Repurpose, schedule, reply & log", "work"],
        ["21:00", "—", "Wind down; no new production", "life"]
      ]
    },
    attachment: {
      label: "Tue · Thu",
      title: "Attachment-search + buffer day",
      note: "Keep the 20 placements moving from your buffer while protecting attachment applications and study.",
      blocks: [
        ["06:30", "07:00", "Trend scan & urgent updates", "work"],
        ["07:00", "08:15", "Breakfast, prayer & prepare", "life"],
        ["08:30", "12:00", "Attachment search, applications & follow-up", "attachment"],
        ["12:00", "13:30", "Lunch & travel/reset", "life"],
        ["13:30", "14:30", "Update prebuilt ExamPoa + PlayMechi buffer", "work"],
        ["15:00", "17:00", "Protected exam revision", "study"],
        ["18:30", "19:30", "Schedule and publish from the buffer", "work"],
        ["20:30", "21:00", "Comments, analytics & tomorrow check", "work"]
      ]
    },
    saturday: {
      label: "Saturday",
      title: "Deep batching day",
      note: "Build evergreen material and templates so exam days do not depend on fresh production.",
      blocks: [
        ["08:00", "09:00", "Prayer, breakfast & weekly setup", "life"],
        ["09:00", "12:00", "Next-week evergreen masters + template bank", "work"],
        ["12:00", "13:00", "Lunch & full break", "life"],
        ["13:00", "15:00", "ExamPoa resources + content production", "exampoa"],
        ["15:00", "16:00", "Rest", "life"],
        ["16:00", "18:00", "PlayMechi sports-format buffer", "playmechi"],
        ["18:00", "—", "Evening off", "life"]
      ]
    },
    sunday: {
      label: "Sunday",
      title: "Review, schedule & recover",
      note: "Use four focused hours, then protect worship, family, relationships and rest.",
      blocks: [
        ["09:00", "10:30", "Analytics review + next-week decisions", "work"],
        ["11:00", "13:00", "Schedule evergreen posts and fill gaps", "work"],
        ["13:00", "18:00", "Worship, family, relationship & rest", "life"],
        ["18:00", "18:30", "Reply to comments and confirm Monday queue", "work"],
        ["18:30", "—", "Weekly reset and early wind-down", "life"]
      ]
    }
  };

  function readState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && typeof saved === "object") {
        return {
          ...clone(defaults), ...saved,
          quotas: {
            exampoa: { ...defaults.quotas.exampoa, ...(saved.quotas?.exampoa || {}) },
            playmechi: { ...defaults.quotas.playmechi, ...(saved.quotas?.playmechi || {}) }
          },
          originals: { ...defaults.originals, ...(saved.originals || {}) },
          time: { ...defaults.time, ...(saved.time || {}) },
          days: saved.days && typeof saved.days === "object" ? saved.days : {}
        };
      }
    } catch { /* use a safe starting plan below */ }
    return clone(defaults);
  }

  let state = readState();
  let resetArmed = false;

  function save(message = "Publishing plan saved.") {
    const keys = Object.keys(state.days).sort();
    keys.slice(0, Math.max(0, keys.length - 90)).forEach((key) => delete state.days[key]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.mllCloudSync?.syncNow?.();
    if (message) toast(message);
  }

  function toast(message) {
    qs(".dpr-toast")?.remove();
    const element = document.createElement("div");
    element.className = "dpr-toast";
    element.setAttribute("role", "status");
    element.textContent = message;
    document.body.append(element);
    window.setTimeout(() => element.remove(), 2600);
  }

  function quotaValue(path) {
    const [brand, platform] = path.split(".");
    return Math.max(0, Number(state.quotas?.[brand]?.[platform]) || 0);
  }

  function todayState() {
    const key = localDateKey();
    if (!state.days[key]) state.days[key] = { counts: {}, workflow: Array(workflowSteps.length).fill(false) };
    const current = state.days[key];
    current.counts = current.counts && typeof current.counts === "object" ? current.counts : {};
    current.workflow = Array.isArray(current.workflow) ? [...current.workflow, ...Array(workflowSteps.length).fill(false)].slice(0, workflowSteps.length) : Array(workflowSteps.length).fill(false);
    return current;
  }

  function countValue(path) {
    return clamp(todayState().counts[path], 0, quotaValue(path));
  }

  function totals() {
    const target = channelDefinitions.reduce((sum, item) => sum + quotaValue(item.key), 0);
    const complete = channelDefinitions.reduce((sum, item) => sum + countValue(item.key), 0);
    const exampoa = channelDefinitions.filter((item) => item.brand === "ExamPoa").reduce((sum, item) => sum + quotaValue(item.key), 0);
    const playmechi = channelDefinitions.filter((item) => item.brand === "PlayMechi").reduce((sum, item) => sum + quotaValue(item.key), 0);
    const weeklyMinutes = Number(state.time.production) * 3 + Number(state.time.attachment) * 2 + Number(state.time.saturday) + Number(state.time.sunday);
    return { target, complete, exampoa, playmechi, weeklyMinutes };
  }

  function durationLabel(minutes) {
    const value = Math.max(0, Math.round(Number(minutes) || 0));
    const hours = Math.floor(value / 60);
    const rest = value % 60;
    return hours ? `${hours}h${rest ? ` ${rest}m` : ""}` : `${rest}m`;
  }

  function defaultRoutineView() {
    const day = new Date().getDay();
    if (day === 2 || day === 4) return "attachment";
    if (day === 6) return "saturday";
    if (day === 0) return "sunday";
    return "production";
  }

  function progressCard(item) {
    const target = quotaValue(item.key);
    const complete = countValue(item.key);
    const percent = target ? Math.round(complete / target * 100) : 0;
    return `<article class="dpr-channel" data-dpr-channel="${esc(item.key)}">
      <span class="dpr-channel-icon ${esc(item.tone)}">${esc(item.short)}</span>
      <div class="dpr-channel-copy"><strong>${esc(item.brand)} · ${esc(item.platform)}</strong><small>${complete} of ${target} published today</small><i><b style="width:${percent}%"></b></i></div>
      <div class="dpr-stepper"><button type="button" data-dpr-step="-1" aria-label="Remove one ${esc(item.brand)} ${esc(item.platform)} post">−</button><strong>${complete}</strong><button type="button" data-dpr-step="1" aria-label="Add one published ${esc(item.brand)} ${esc(item.platform)} post">＋</button></div>
    </article>`;
  }

  function routineMarkup(view) {
    const routine = routines[view] || routines.production;
    return `<div class="dpr-routine-head"><div><span>${esc(routine.label)}</span><h4>${esc(routine.title)}</h4><p>${esc(routine.note)}</p></div><strong>${durationLabel(state.time[view] || state.time.production)} content</strong></div>
      <div class="dpr-timeline">${routine.blocks.map(([start, end, title, type]) => `<div class="dpr-time-row ${esc(type)}"><time>${esc(start)}<small>${esc(end)}</small></time><i></i><strong>${esc(title)}</strong></div>`).join("")}</div>`;
  }

  function render() {
    const root = qs("#dailyPublishingEngine");
    if (!root) return;
    const total = totals();
    const percent = total.target ? Math.round(total.complete / total.target * 100) : 0;
    const workflow = todayState().workflow;
    const routineView = state.routineView || defaultRoutineView();
    const originals = Number(state.originals.exampoa) + Number(state.originals.playmechi);
    const versions = Math.max(0, total.target - originals);
    root.innerHTML = `
      <div class="dpr-heading"><div><p class="eyebrow">Daily publishing engine</p><h3>Twenty placements, one controlled system.</h3><p>ExamPoa publishes ${total.exampoa} times across four platforms and PlayMechi publishes ${total.playmechi} times on Facebook. Batching keeps the plan from consuming your study day.</p></div><div class="dpr-heading-actions"><button type="button" class="creator-secondary" data-dpr-action="calendar">Add this week to Calendar</button><button type="button" class="creator-primary" data-dpr-action="settings">Adjust plan</button></div></div>
      <div class="dpr-warning"><span>High-output plan</span><strong>${total.target * 7} placements every week · ${durationLabel(total.weeklyMinutes)} content work</strong><p>This is sustainable only if ${originals} originals become ${versions} repurposed or template-based placements each day. During exams, publish from the buffer instead of creating everything live.</p></div>
      <div class="dpr-kpis"><article><span>Today</span><strong>${total.complete}/${total.target}</strong><small>placements published</small></article><article><span>Weekly goal</span><strong>${total.target * 7}</strong><small>${total.exampoa * 7} ExamPoa · ${total.playmechi * 7} PlayMechi</small></article><article><span>30-day pace</span><strong>${total.target * 30}</strong><small>publishing placements</small></article><article><span>Daily originals</span><strong>${originals}</strong><small>${versions} versions from repurposing</small></article><article><span>Work capacity</span><strong>${durationLabel(total.weeklyMinutes)}</strong><small>${durationLabel(total.weeklyMinutes / 7)} average per day</small></article></div>
      <div class="dpr-progress"><div><strong>Today’s publishing progress</strong><span>${percent}% complete</span></div><i><b style="width:${percent}%"></b></i></div>
      <div class="dpr-main-grid"><article class="dpr-card"><div class="dpr-card-head"><div><p class="eyebrow">Daily quota</p><h4>Count every published placement</h4></div><button type="button" class="creator-ghost" data-dpr-action="reset">${resetArmed ? "Confirm reset" : "Reset today"}</button></div><div class="dpr-channels">${channelDefinitions.map(progressCard).join("")}</div></article>
      <article class="dpr-card"><div class="dpr-card-head"><div><p class="eyebrow">Production recipe</p><h4>Seven originals become twenty placements</h4></div></div><div class="dpr-recipe"><div><span>ExamPoa</span><strong>${state.originals.exampoa} master pieces → ${total.exampoa} placements</strong><small>Demo · revision help · trust/community · traffic/conversion</small></div><div><span>PlayMechi</span><strong>${state.originals.playmechi} anchor pieces → ${total.playmechi} Facebook posts</strong><small>News/updates · match conversation · player/story; use quick templates for the remaining slots</small></div></div><div class="dpr-exam-rule"><strong>Exam-protection rule</strong><p>Study blocks stay fixed. If the content is not ready, use a buffered evergreen post or leave the slot open—never take time from the next exam’s revision block.</p></div></article></div>
      <div class="dpr-main-grid dpr-lower"><article class="dpr-card"><div class="dpr-card-head"><div><p class="eyebrow">Today’s workflow</p><h4>Finish in the right order</h4></div><span class="dpr-mini-progress">${workflow.filter(Boolean).length}/${workflow.length}</span></div><div class="dpr-workflow">${workflowSteps.map((label, index) => `<label><input type="checkbox" data-dpr-workflow="${index}"${workflow[index] ? " checked" : ""}><span><b>0${index + 1}</b>${esc(label)}</span></label>`).join("")}</div></article>
      <article class="dpr-card dpr-routine-card"><div class="dpr-card-head"><div><p class="eyebrow">Routine around your workload</p><h4>Know when work stops</h4></div></div><nav class="dpr-routine-tabs" aria-label="Publishing routine day types">${Object.entries(routines).map(([key, value]) => `<button type="button" data-dpr-routine="${key}" class="${routineView === key ? "active" : ""}">${esc(value.label)}</button>`).join("")}</nav><div id="dprRoutineBody">${routineMarkup(routineView)}</div></article></div>
      <dialog class="dpr-dialog" id="dprSettingsDialog"><form method="dialog" id="dprSettingsForm"><div class="dpr-dialog-head"><div><p class="eyebrow">Publishing workload</p><h3>Adjust quotas and time.</h3><p>Keep the totals honest so the routine reflects the work you actually plan to do.</p></div><button type="button" data-dpr-action="close" aria-label="Close">×</button></div><div class="dpr-form-section"><h4>Daily publishing quotas</h4><div class="dpr-form-grid">${channelDefinitions.map((item) => `<label>${esc(item.brand)} · ${esc(item.platform)}<input type="number" min="0" max="30" name="quota-${esc(item.key)}" value="${quotaValue(item.key)}" required></label>`).join("")}</div></div><div class="dpr-form-section"><h4>Original content packages</h4><div class="dpr-form-grid"><label>ExamPoa originals per day<input type="number" min="1" max="20" name="original-exampoa" value="${state.originals.exampoa}" required></label><label>PlayMechi originals per day<input type="number" min="1" max="20" name="original-playmechi" value="${state.originals.playmechi}" required></label></div></div><div class="dpr-form-section"><h4>Content-work minutes by day type</h4><div class="dpr-form-grid"><label>Mon/Wed/Fri<input type="number" min="30" max="720" name="time-production" value="${state.time.production}" required></label><label>Tue/Thu attachment days<input type="number" min="30" max="720" name="time-attachment" value="${state.time.attachment}" required></label><label>Saturday batching<input type="number" min="30" max="720" name="time-saturday" value="${state.time.saturday}" required></label><label>Sunday review/scheduling<input type="number" min="30" max="720" name="time-sunday" value="${state.time.sunday}" required></label></div></div><p class="dpr-form-error" id="dprFormError"></p><div class="dpr-dialog-actions"><button type="button" class="creator-secondary" data-dpr-action="close">Cancel</button><button type="submit" class="creator-primary">Save workload plan</button></div></form></dialog>`;
  }

  function saveSettings(form) {
    const data = new FormData(form);
    channelDefinitions.forEach((item) => {
      const [brand, platform] = item.key.split(".");
      state.quotas[brand][platform] = clamp(data.get(`quota-${item.key}`), 0, 30);
    });
    state.originals.exampoa = clamp(data.get("original-exampoa"), 1, 20);
    state.originals.playmechi = clamp(data.get("original-playmechi"), 1, 20);
    Object.keys(state.time).forEach((key) => state.time[key] = clamp(data.get(`time-${key}`), 30, 720));
    const total = totals();
    if (!total.target) throw new Error("Keep at least one daily publishing placement.");
    if (state.originals.exampoa + state.originals.playmechi > total.target) throw new Error("Original packages cannot be greater than the total placements.");
    save("Workload and routine updated.");
    render();
  }

  function addWeekToCalendar() {
    const start = new Date();
    const weekday = start.getDay() || 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - weekday + 1);
    const dayViews = ["production", "attachment", "production", "attachment", "production", "saturday", "sunday"];
    let events;
    try { events = JSON.parse(localStorage.getItem("calendarEvents") || "[]"); } catch { events = []; }
    if (!Array.isArray(events)) events = [];
    const weekDates = new Set();
    const created = [];
    dayViews.forEach((view, offset) => {
      const date = new Date(start); date.setDate(date.getDate() + offset);
      const dateKey = localDateKey(date); weekDates.add(dateKey);
      routines[view].blocks.filter((block) => ["work", "exampoa", "playmechi"].includes(block[3]) && block[1] !== "—").forEach(([startTime, endTime, title]) => created.push({
        id: `calendar-dpr-${dateKey}-${startTime.replace(":", "")}`,
        date: dateKey, title, category: "work", startTime, endTime, location: title.includes("ExamPoa") ? "ExamPoa" : title.includes("PlayMechi") ? "PlayMechi" : "Content studio",
        notes: "Part of Charry’s 20-placement daily publishing system.", repeat: "none", meta: `Work · ${startTime}–${endTime}`, color: "purple-event", source: CALENDAR_SOURCE
      }));
    });
    const merged = events.filter((event) => event.source !== CALENDAR_SOURCE || !weekDates.has(event.date)).concat(created);
    localStorage.setItem("calendarEvents", JSON.stringify(merged));
    try {
      if (typeof calendarEvents !== "undefined" && Array.isArray(calendarEvents)) calendarEvents.splice(0, calendarEvents.length, ...merged);
      if (typeof renderCalendar === "function") renderCalendar();
      if (typeof renderUpcoming === "function") renderUpcoming();
    } catch { /* calendar refreshes from storage next time it opens */ }
    window.mllCloudSync?.syncNow?.();
    toast(`${created.length} content-work blocks added to this week’s Calendar.`);
  }

  function bind() {
    const root = qs("#dailyPublishingEngine");
    root.addEventListener("click", (event) => {
      const step = event.target.closest("[data-dpr-step]");
      if (step) {
        const channel = step.closest("[data-dpr-channel]")?.dataset.dprChannel;
        if (!channel) return;
        todayState().counts[channel] = clamp(countValue(channel) + Number(step.dataset.dprStep), 0, quotaValue(channel));
        save(""); render(); return;
      }
      const routine = event.target.closest("[data-dpr-routine]");
      if (routine) { state.routineView = routine.dataset.dprRoutine; save(""); render(); return; }
      const action = event.target.closest("[data-dpr-action]")?.dataset.dprAction;
      if (action === "settings") qs("#dprSettingsDialog")?.showModal();
      if (action === "close") qs("#dprSettingsDialog")?.close();
      if (action === "calendar") addWeekToCalendar();
      if (action === "reset") {
        if (!resetArmed) { resetArmed = true; render(); window.setTimeout(() => { resetArmed = false; render(); }, 4000); }
        else { state.days[localDateKey()] = { counts: {}, workflow: Array(workflowSteps.length).fill(false) }; resetArmed = false; save("Today’s publishing progress reset."); render(); }
      }
    });
    root.addEventListener("change", (event) => {
      if (event.target.matches("[data-dpr-workflow]")) {
        todayState().workflow[Number(event.target.dataset.dprWorkflow)] = event.target.checked;
        save(""); render();
      }
    });
    root.addEventListener("submit", (event) => {
      if (event.target.id !== "dprSettingsForm") return;
      event.preventDefault();
      try { saveSettings(event.target); qs("#dprSettingsDialog")?.close(); }
      catch (error) { qs("#dprFormError").textContent = error?.message || "Check the workload values and try again."; }
    });
  }

  function mount() {
    const content = qs("#content");
    const toolbar = qs(".creator-toolbar", content);
    if (!content || !toolbar || qs("#dailyPublishingEngine")) return false;
    const root = document.createElement("section");
    root.id = "dailyPublishingEngine";
    root.className = "daily-publishing-engine";
    toolbar.insertAdjacentElement("afterend", root);
    render(); bind(); save("");
    return true;
  }

  if (!mount()) {
    const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
    const content = qs("#content");
    if (content) observer.observe(content, { childList: true, subtree: true });
  }
})();
