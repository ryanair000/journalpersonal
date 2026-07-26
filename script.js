const modal = document.querySelector('#entryModal');
const openModal = () => { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.querySelector('#entryTitle').focus(); };
const closeModal = () => { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); };
document.querySelectorAll('.js-open-modal').forEach((button) => button.addEventListener('click', openModal));
document.querySelectorAll('.js-close-modal').forEach((button) => button.addEventListener('click', closeModal));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });

document.querySelectorAll('.mood-row button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.mood-row button').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected');
  localStorage.setItem('dailyMood', button.dataset.mood);
}));
const savedMood = localStorage.getItem('dailyMood');
if (savedMood) document.querySelector(`[data-mood="${savedMood}"]`)?.classList.add('selected');

const habitDateKey = new Date().toISOString().slice(0, 10);
const updateHabitProgress = () => {
  const habits = [...document.querySelectorAll('.check-list input')];
  const completed = habits.filter((input) => input.checked).length;
  const progress = document.querySelector('.habits .progress');
  let streak = Number(localStorage.getItem('habitStreak') || 0);
  const lastComplete = localStorage.getItem('habitLastComplete');
  if (completed === habits.length && lastComplete !== habitDateKey) {
    const daysSince = lastComplete ? Math.round((new Date(habitDateKey) - new Date(lastComplete)) / 86400000) : 0;
    streak = daysSince === 1 ? streak + 1 : 1;
    localStorage.setItem('habitStreak', streak);
    localStorage.setItem('habitLastComplete', habitDateKey);
  }
  if (progress) progress.textContent = `${completed} / ${habits.length} · ${streak}d`;
};
document.querySelectorAll('.check-list input').forEach((input, index) => {
  const key = `habit-${habitDateKey}-${index}`;
  input.checked = localStorage.getItem(key) === 'true';
  input.addEventListener('change', () => {
    localStorage.setItem(key, input.checked);
    updateHabitProgress();
  });
});
updateHabitProgress();

document.querySelectorAll('.wellbeing-item').forEach((button) => button.addEventListener('click', () => {
  const key = `wellbeing-${button.dataset.action}`;
  button.classList.toggle('done');
  button.querySelector('b').textContent = button.classList.contains('done') ? '✓' : '＋';
  localStorage.setItem(key, button.classList.contains('done'));
}));
document.querySelectorAll('.wellbeing-item').forEach((button) => {
  if (localStorage.getItem(`wellbeing-${button.dataset.action}`) === 'true') {
    button.classList.add('done');
    button.querySelector('b').textContent = '✓';
  }
});

document.querySelectorAll('.log-pill').forEach((button) => button.addEventListener('click', () => {
  const value = prompt(`What did you have for ${button.dataset.log.toLowerCase()}?`);
  if (value?.trim()) {
    button.textContent = '✓ logged';
    button.style.background = 'var(--coral)';
    button.style.color = '#fff';
    localStorage.setItem(`meal-${button.dataset.log}`, value.trim());
  }
}));

document.querySelector('#addTask')?.addEventListener('click', () => {
  const task = prompt('What do you need to focus on?');
  if (!task?.trim()) return;
  const row = document.createElement('div');
  row.className = 'focus-task';
  row.innerHTML = `<span class="task-dot"></span><div><strong>${task.trim().replaceAll('<','&lt;')}</strong><small>New focus item</small></div><button aria-label="More options">···</button>`;
  document.querySelector('.schedule-card .module-link').before(row);
});

function addContentItem(selector, icon, subtitle) {
  const text = prompt('What content do you want to add?');
  if (!text?.trim()) return;
  const item = document.createElement('div');
  item.className = 'idea-item';
  item.dataset.contentIdea = 'true';
  item.innerHTML = `<span>${icon}</span><div><strong>${text.trim().replaceAll('<','&lt;')}</strong><small>${subtitle}</small></div><button>···</button>`;
  document.querySelector(selector).append(item);
  const contentIdeas = JSON.parse(localStorage.getItem('contentIdeas') || '[]');
  contentIdeas.push({ title: text.trim(), detail: subtitle, status: selector.includes('nth-of-type(2)') ? 'draft' : 'idea', createdAt: new Date().toISOString().slice(0, 10) });
  localStorage.setItem('contentIdeas', JSON.stringify(contentIdeas));
}
document.querySelector('#addContent')?.addEventListener('click', () => addContentItem('.content-board:first-of-type', '✦', 'New idea · choose a platform'));
document.querySelector('#addDraft')?.addEventListener('click', () => addContentItem('.content-board:nth-of-type(2)', '◒', 'New draft · not scheduled'));

const analyticsDefaults = {
  reach: '8,420',
  engagement: '6.8%',
  views: '12.7k'
};
const analyticsValues = JSON.parse(localStorage.getItem('contentAnalytics') || 'null') || analyticsDefaults;
document.querySelector('#reachMetric').textContent = analyticsValues.reach;
document.querySelector('#engagementMetric').textContent = analyticsValues.engagement;
document.querySelector('#viewsMetric').textContent = analyticsValues.views;
document.querySelector('#updateAnalytics')?.addEventListener('click', () => {
  const reach = prompt('Total reach this week:', analyticsValues.reach);
  const engagement = prompt('Engagement rate this week:', analyticsValues.engagement);
  const views = prompt('Total views this week:', analyticsValues.views);
  if (!reach || !engagement || !views) return;
  const updated = { reach, engagement, views };
  const analyticsHistory = JSON.parse(localStorage.getItem('analyticsHistory') || '[]');
  analyticsHistory.push({ ...updated, date: new Date().toISOString().slice(0, 10) });
  localStorage.setItem('analyticsHistory', JSON.stringify(analyticsHistory.slice(-8)));
  localStorage.setItem('contentAnalytics', JSON.stringify(updated));
  document.querySelector('#reachMetric').textContent = reach;
  document.querySelector('#engagementMetric').textContent = engagement;
  document.querySelector('#viewsMetric').textContent = views;
});

document.querySelector('#addAccount')?.addEventListener('click', () => {
  const platform = prompt('Which platform is this account on? (Instagram, TikTok, YouTube, Pinterest...)');
  const username = prompt('What is the account name or handle?');
  const followers = prompt('How many followers/subscribers does it have?');
  if (!platform?.trim() || !username?.trim() || !followers?.trim()) return;
  const row = document.createElement('div');
  row.className = 'account-row saved-account-row';
  row.innerHTML = `<span class="platform-icon tiktok">✦</span><div><strong>${platform.trim().replaceAll('<','&lt;')}</strong><small>${username.trim().replaceAll('<','&lt;')}</small></div><b>${followers.trim().replaceAll('<','&lt;')}</b>`;
  document.querySelector('#accountList').append(row);
  const contentAccounts = JSON.parse(localStorage.getItem('contentAccounts') || '[]');
  contentAccounts.push({ platform: platform.trim(), username: username.trim(), followers: followers.trim() });
  localStorage.setItem('contentAccounts', JSON.stringify(contentAccounts));
});

// Import the user's filtered August 2026 School of Pharmacy exam timetable once.
window.addEventListener('load', () => {
  const bpharmExamTimetable = [
    ['BPL3103', '2026-08-06', '8:00–10:00 AM'],
    ['BPC4102', '2026-08-07', '2:00–4:00 PM'],
    ['BPL3102', '2026-08-07', '8:00–10:00 AM'],
    ['BPC4101', '2026-08-08', '2:00–4:00 PM'],
    ['BPL5101', '2026-08-10', '11:00 AM–1:00 PM'],
    ['BPL4106', '2026-08-11', '2:00–4:00 PM'],
    ['BPL4201', '2026-08-11', '11:00 AM–1:00 PM'],
    ['BPL4105', '2026-08-12', '2:00–4:00 PM'],
    ['BPC3103', '2026-08-12', '8:00–10:00 AM'],
    ['BPL4104', '2026-08-13', '2:00–4:00 PM'],
    ['BPC4204', '2026-08-13', '11:00 AM–1:00 PM'],
    ['BPL4205', '2026-08-14', '11:00 AM–1:00 PM'],
    ['BCH2206', '2026-08-14', '8:00–10:00 AM'],
    ['BPT3102', '2026-08-15', '8:00–10:00 AM'],
    ['BMM2102', '2026-08-16', '2:00–4:00 PM'],
    ['BPA2204', '2026-08-16', '8:00–10:00 AM'],
    ['BPT4103', '2026-08-17', '2:00–4:00 PM'],
    ['BPT4204', '2026-08-17', '11:00 AM–1:00 PM'],
    ['BPA2203', '2026-08-18', '2:00–4:00 PM'],
    ['BPL4103', '2026-08-19', '2:00–4:00 PM'],
    ['BPC3202', '2026-08-19', '8:00–10:00 AM'],
    ['PBCU001', '2026-08-19', '11:00 AM–1:00 PM'],
    ['BPC4202', '2026-08-20', '11:00 AM–1:00 PM'],
    ['BPT4102', '2026-08-21', '2:00–4:00 PM'],
    ['BPL4203', '2026-08-21', '8:00–10:00 AM'],
  ].map(([code, date, time]) => {
    const unit = units.find(([unitCode]) => unitCode === code);
    return { code, name: unit?.[1] || code, date, time };
  });

  if (!localStorage.getItem('bpharmExamTimetableImportedV1')) {
    const saved = JSON.parse(localStorage.getItem('examEntries') || '[]');
    const merged = [...saved];
    bpharmExamTimetable.forEach((entry) => {
      if (!merged.some((item) => item.code === entry.code && item.date === entry.date)) merged.push(entry);
    });
    localStorage.setItem('examEntries', JSON.stringify(merged));
    bpharmExamTimetable.forEach((entry) => {
      const title = `Exam · ${entry.code} · ${entry.name}`;
      if (!calendarEvents.some((event) => event.date === entry.date && event.title === title)) calendarEvents.push({ date: entry.date, title, meta: `School · ${entry.time}`, color: 'coral-event' });
    });
    localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
    localStorage.setItem('bpharmExamTimetableImportedV1', 'true');
  }

  if (!localStorage.getItem('bpharmExamTimetableReviewedV2')) {
    const excludedCodes = new Set(['BMM2106', 'BPT3202', 'BPL4202']);
    const saved = JSON.parse(localStorage.getItem('examEntries') || '[]').filter((entry) => !excludedCodes.has(entry.code));
    localStorage.setItem('examEntries', JSON.stringify(saved));
    const keptEvents = calendarEvents.filter((event) => ![...excludedCodes].some((code) => String(event.title || '').includes(`Exam · ${code} ·`)));
    calendarEvents.splice(0, calendarEvents.length, ...keptEvents);
    localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
    localStorage.setItem('bpharmExamTimetableReviewedV2', 'true');
  }

  const examList = document.querySelector('#examList');
  const savedExams = JSON.parse(localStorage.getItem('examEntries') || '[]');
  if (examList && savedExams.length) {
    examList.replaceChildren();
    savedExams.forEach((entry) => {
      const row = document.createElement('div');
      row.innerHTML = `<span class="exam-code">${escapeText(entry.code)}</span><section><strong>${escapeText(entry.name)}</strong><small>Exam: ${escapeText(entry.date)} · ${escapeText(entry.time || 'Time to confirm')}</small>${entry.venue ? `<small>Venue: ${escapeText(entry.venue)}</small>` : ''}${entry.lecturer || entry.classYear ? `<small>${entry.lecturer ? `Lecturer: ${escapeText(entry.lecturer)}` : ''}${entry.lecturer && entry.classYear ? ' · ' : ''}${entry.classYear ? `Class: ${escapeText(entry.classYear)}` : ''}</small>` : ''}</section><b>${escapeText(entry.date)}</b>`;
      examList.append(row);
    });
  }
  if (typeof renderCalendar === 'function') renderCalendar();
  if (typeof renderUpcoming === 'function') renderUpcoming();
});

document.querySelectorAll('.feel-row button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.feel-row button').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected');
  localStorage.setItem('mentalCheckIn', button.dataset.feel);
}));
const savedFeeling = localStorage.getItem('mentalCheckIn');
if (savedFeeling) document.querySelector(`[data-feel="${savedFeeling}"]`)?.classList.add('selected');

const gratitudeNote = document.querySelector('#gratitudeNote');
gratitudeNote.value = localStorage.getItem('gratitudeNote') || '';
document.querySelector('#saveGratitude')?.addEventListener('click', () => {
  localStorage.setItem('gratitudeNote', gratitudeNote.value);
  document.querySelector('#saveGratitude').textContent = 'Saved reflection ✓';
});

document.querySelector('#addPlanner')?.addEventListener('click', () => {
  const task = prompt('What school or work task should you add?');
  if (!task?.trim()) return;
  const row = document.createElement('p');
  row.innerHTML = `<span>□</span> ${task.trim().replaceAll('<','&lt;')} <small>New task</small>`;
  document.querySelector('#plannerList').append(row);
});

document.querySelector('#addExpense')?.addEventListener('click', () => {
  const amount = prompt('How much did you spend?');
  if (!amount || Number.isNaN(Number(amount))) return;
  const current = Number(localStorage.getItem('weeklyExpenses') || 0) + Number(amount);
  localStorage.setItem('weeklyExpenses', current);
  document.querySelector('#spentTotal').textContent = `KSh ${current.toLocaleString()}`;
});
const savedExpenses = Number(localStorage.getItem('weeklyExpenses') || 0);
if (savedExpenses) document.querySelector('#spentTotal').textContent = `KSh ${savedExpenses.toLocaleString()}`;

function addSocialItem() {
  const plan = prompt('Who or what do you want to remember?');
  if (!plan?.trim()) return;
  const row = document.createElement('p');
  row.innerHTML = `<span>♡</span> ${plan.trim().replaceAll('<','&lt;')} <small>New plan</small>`;
  document.querySelector('#socialList').append(row);
}
document.querySelector('#addSocial')?.addEventListener('click', addSocialItem);
document.querySelector('#addSocialLink')?.addEventListener('click', addSocialItem);
document.querySelector('#addMemory')?.addEventListener('click', () => {
  const memory = prompt('What do you want to remember about today?');
  if (!memory?.trim()) return;
  localStorage.setItem('savedMemory', memory.trim());
  document.querySelector('#memoryText').textContent = memory.trim();
});
const savedMemory = localStorage.getItem('savedMemory');
if (savedMemory) document.querySelector('#memoryText').textContent = savedMemory;

function addSimpleRow(target, label, meta, icon = '□') {
  const value = prompt(label);
  if (!value?.trim()) return;
  const row = document.createElement('div');
  row.innerHTML = `<span>${icon}</span><strong>${value.trim().replaceAll('<','&lt;')}</strong><small>${meta}</small>`;
  document.querySelector(target).append(row);
  const storageKey = target === '#researchList' ? 'schoolResearchItems' : 'schoolStudyItems';
  const savedItems = JSON.parse(localStorage.getItem(storageKey) || '[]');
  savedItems.push({ value: value.trim(), meta, icon });
  localStorage.setItem(storageKey, JSON.stringify(savedItems));
}
document.querySelector('#addUnit')?.addEventListener('click', () => {
  const code = prompt('Unit code, for example PHR 308:');
  const name = prompt('Unit name:');
  const lecturer = prompt('Lecturer name:');
  const year = prompt('Year or semester:');
  if (!code || !name || !lecturer) return;
  const row = document.createElement('div');
  row.innerHTML = `<span>${code.trim().replaceAll('<','&lt;')}</span><strong>${name.trim().replaceAll('<','&lt;')}</strong><small>${lecturer.trim().replaceAll('<','&lt;')} · ${year?.trim() || 'Current unit'}</small>`;
  document.querySelector('#unitList').append(row);
  const savedUnits = JSON.parse(localStorage.getItem('customUnits') || '[]');
  savedUnits.push({ code: code.trim(), name: name.trim(), lecturer: lecturer.trim(), year: year?.trim() || 'Current unit' });
  localStorage.setItem('customUnits', JSON.stringify(savedUnits));
});
document.querySelector('#addStudy')?.addEventListener('click', () => addSimpleRow('#studyList', 'What do you need to study or read?', 'New session · schedule it', '◒'));
document.querySelector('#addReading')?.addEventListener('click', () => addSimpleRow('#studyList', 'What reading session should you add?', 'New reading · add a duration', '◒'));
document.querySelector('#addResearch')?.addEventListener('click', () => addSimpleRow('#researchList', 'Add a paper, link, note, or research question:', 'New reference', 'NOTE'));
document.querySelector('#addProject')?.addEventListener('click', () => {
  const title = prompt('What is your school project called?');
  const next = prompt('What is the next action?');
  if (!title) return;
  document.querySelector('#projectTitle').textContent = title.trim();
  document.querySelector('#projectNotes').textContent = next?.trim() || 'Add your next action when you know it.';
  localStorage.setItem('schoolProjectDetails', JSON.stringify({ title: title.trim(), next: next?.trim() || 'Add your next action when you know it.' }));
});
document.querySelector('#addClass')?.addEventListener('click', () => {
  const day = prompt('Which day? (Monday-Friday)');
  const time = prompt('What time?');
  const subject = prompt('Class, study block, or exam name?');
  if (!day?.trim() || !time?.trim() || !subject?.trim()) return;
  let list = document.querySelector('.schedule-entry-list');
  if (!list) {
    list = document.createElement('div');
    list.className = 'schedule-entry-list';
    document.querySelector('.timetable-card').append(list);
  }
  const row = document.createElement('p');
  row.innerHTML = `<span>${escapeText(day.trim())}</span><strong>${escapeText(subject.trim())}</strong><small>${escapeText(time.trim())}</small>`;
  list.append(row);
  const classEntries = JSON.parse(localStorage.getItem('classEntries') || '[]');
  classEntries.push({ day: day.trim(), time: time.trim(), subject: subject.trim() });
  localStorage.setItem('classEntries', JSON.stringify(classEntries));
});
document.querySelector('#addBusiness')?.addEventListener('click', () => {
  const name = prompt('Business or work name:');
  const type = prompt('What do you do there?');
  const duration = prompt('How long have you been doing it?');
  if (!name || !type) return;
  const row = document.createElement('div');
  row.innerHTML = `<span class="business-badge coral-badge">${name.slice(0,2).toUpperCase()}</span><section><strong>${name.trim().replaceAll('<','&lt;')}</strong><small>${type.trim().replaceAll('<','&lt;')} · ${duration?.trim() || 'New business'}</small></section><b>New</b>`;
  document.querySelector('#businessList').append(row);
  const businesses = JSON.parse(localStorage.getItem('personalBusinesses') || '[]');
  businesses.push({ name: name.trim(), type: type.trim(), duration: duration?.trim() || 'New business' });
  localStorage.setItem('personalBusinesses', JSON.stringify(businesses));
});
document.querySelector('#addWorkGoal')?.addEventListener('click', () => {
  const goal = prompt('What work goal do you want to add?');
  if (!goal?.trim()) return;
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox"> ${goal.trim().replaceAll('<','&lt;')}`;
  document.querySelector('#workGoalList').append(label);
  const workGoals = JSON.parse(localStorage.getItem('workGoals') || '[]');
  workGoals.push({ title: goal.trim(), done: false });
  localStorage.setItem('workGoals', JSON.stringify(workGoals));
});
const workLogEntries = JSON.parse(localStorage.getItem('workLogEntries') || '[]');
document.querySelector('#addWorkLog')?.addEventListener('click', () => {
  const hours = Number(prompt('How many hours did you work?'));
  const note = prompt('What did you work on?');
  if (Number.isNaN(hours) || hours <= 0) return;
  workLogEntries.unshift({ hours, note: note?.trim() || 'Work session', date: new Date().toISOString().slice(0, 10) });
  localStorage.setItem('workLogEntries', JSON.stringify(workLogEntries));
  alert(`Logged ${hours} hour(s).`);
});
const rhythmDefaults = { sleep: '7h 12m', water: '3 / 7', movement: '12 min' };
const rhythmData = { ...rhythmDefaults, ...JSON.parse(localStorage.getItem('rhythmData') || '{}') };
const rhythmRows = [...document.querySelectorAll('.rhythm-line')];
['sleep', 'water', 'movement'].forEach((key, index) => { if (rhythmRows[index]) rhythmRows[index].querySelector('b').textContent = rhythmData[key]; });
document.querySelector('#editRhythm')?.addEventListener('click', () => {
  const sleep = prompt('How much did you sleep? (example: 7h 30m)', rhythmData.sleep);
  const water = prompt('How many glasses of water? (example: 5 / 7)', rhythmData.water);
  const movement = prompt('How much movement? (example: 30 min)', rhythmData.movement);
  if (!sleep || !water || !movement) return;
  const updated = { sleep, water, movement };
  localStorage.setItem('rhythmData', JSON.stringify(updated));
  [sleep, water, movement].forEach((value, index) => { if (rhythmRows[index]) rhythmRows[index].querySelector('b').textContent = value; });
});
const workMetricDefaults = { hours: '42h', income: 'KSh 3,850', projects: '06' };
const workMetricData = { ...workMetricDefaults, ...JSON.parse(localStorage.getItem('workMetrics') || '{}') };
const workMetricRows = document.querySelectorAll('.work-metric-row strong');
['hours', 'income', 'projects'].forEach((key, index) => { if (workMetricRows[index]) workMetricRows[index].textContent = workMetricData[key]; });
const workMetricsCard = document.querySelector('.work-metrics');
if (workMetricsCard && !document.querySelector('#editWorkMetrics')) {
  const edit = document.createElement('button'); edit.id = 'editWorkMetrics'; edit.className = 'detail-link'; edit.type = 'button'; edit.textContent = '✎ Update work snapshot'; workMetricsCard.append(edit);
  edit.addEventListener('click', () => {
    const hours = prompt('Hours worked this month:', workMetricData.hours);
    const income = prompt('Income this month:', workMetricData.income);
    const projects = prompt('Projects completed:', workMetricData.projects);
    if (!hours || !income || !projects) return;
    const updated = { hours, income, projects }; localStorage.setItem('workMetrics', JSON.stringify(updated));
    [hours, income, projects].forEach((value, index) => { if (workMetricRows[index]) workMetricRows[index].textContent = value; });
  });
}
document.querySelector('#addPerson')?.addEventListener('click', () => {
  const name = prompt('Name or nickname:');
  const group = prompt('Family, friend, or relationship?');
  const birthday = prompt('Birthday or important date (optional):');
  const note = prompt('How do you want to stay connected?');
  if (!name || !group) return;
  const row = document.createElement('div');
  row.innerHTML = `<span class="person-avatar peach">${name.trim().charAt(0).toUpperCase()}</span><section><strong>${name.trim().replaceAll('<','&lt;')}</strong><small>${group.trim().replaceAll('<','&lt;')} · ${note?.trim() || 'Keep in touch'}</small></section><button>Check in →</button>`;
  if (birthday?.trim()) row.querySelector('small').textContent += ` · ${birthday.trim()}`;
  row.dataset.group = group.trim().toLowerCase();
  document.querySelector('#peopleList').append(row);
  const people = JSON.parse(localStorage.getItem('peopleDirectory') || '[]');
  people.push({ name: name.trim(), group: group.trim(), birthday: birthday?.trim() || '', note: note?.trim() || 'Keep in touch' });
  localStorage.setItem('peopleDirectory', JSON.stringify(people));
});
document.querySelectorAll('.people-tab').forEach((tab) => tab.addEventListener('click', () => {
  document.querySelectorAll('.people-tab').forEach((item) => item.classList.remove('active'));
  tab.classList.add('active');
}));
const peopleNote = document.querySelector('#peopleNote');
peopleNote.value = localStorage.getItem('peopleNote') || '';
document.querySelector('#savePeopleNote')?.addEventListener('click', () => {
  localStorage.setItem('peopleNote', peopleNote.value);
  document.querySelector('#savePeopleNote').textContent = 'Saved privately ✓';
});
document.querySelectorAll('.connection-scale button').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('.connection-scale button').forEach((item) => item.classList.remove('selected'));
  button.classList.add('selected');
}));

// Charry's personalized pharmacy, work, and relationship data.
const escapeText = (value) => String(value).replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Launch cleanup: help Charry turn the starter dashboard into her real space.
window.addEventListener('load', () => {
  const setupItems = [
    ['profile', 'Set your name, course, year, and unit totals', '#settingsModal'],
    ['school', 'Add your timetable, study plan, and exam dates', '#schoolHub'],
    ['content', 'Add your real creator accounts and analytics', '#accounts'],
    ['work', 'Add Leridia, PlayMechi, Exampoa, and work goals', '#workHub'],
    ['people', 'Add family, friends, Charry, birthdays, and dates', '#peopleHub'],
    ['vision', 'Upload a vision-board image or add a future goal', '#visionBoard']
  ];
  const savedSetup = (() => { try { return JSON.parse(localStorage.getItem('launchChecklist') || '{}'); } catch { return {}; } })();
  const setupCard = document.createElement('article'); setupCard.className = 'launch-setup-card';
  const renderSetup = () => {
    const completed = setupItems.filter(([key]) => savedSetup[key]).length;
    setupCard.innerHTML = `<div class="launch-setup-heading"><div><p class="eyebrow">First-day setup</p><h3>Make this dashboard completely yours.</h3><small>${completed} of ${setupItems.length} launch steps complete</small></div><button type="button" class="launch-dismiss">${completed === setupItems.length ? 'Done' : 'Hide for now'}</button></div><div class="launch-progress"><i style="width:${completed / setupItems.length * 100}%"></i></div><div class="launch-checklist">${setupItems.map(([key, label, target]) => `<label><input type="checkbox" data-launch-key="${key}" ${savedSetup[key] ? 'checked' : ''}><span>${escapeText(label)}</span><button type="button" data-launch-open="${target}">Open</button></label>`).join('')}</div><button type="button" class="clear-starters30c">Clear starter examples</button><small class="launch-note">This removes only the built-in examples; saved personal entries stay safe.</small>`;
    setupCard.querySelectorAll('[data-launch-key]').forEach((input) => input.addEventListener('change', () => { savedSetup[input.dataset.launchKey] = input.checked; localStorage.setItem('launchChecklist', JSON.stringify(savedSetup)); renderSetup(); }));
    setupCard.querySelectorAll('[data-launch-open]').forEach((button) => button.addEventListener('click', () => { const target = document.querySelector(button.dataset.launchOpen); if (target?.classList.contains('settings-modal')) { target.classList.add('open'); target.setAttribute('aria-hidden', 'false'); target.querySelector('#settingName')?.focus(); } else target?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    setupCard.querySelector('.launch-dismiss')?.addEventListener('click', () => { localStorage.setItem('launchSetupDismissed', 'true'); setupCard.remove(); });
    setupCard.querySelector('.clear-starters30c')?.addEventListener('click', () => {
      if (!confirm('Clear the built-in starter examples? Your saved personal entries will stay safe.')) return;
      localStorage.setItem('starterExamplesHidden', 'true'); document.body.classList.add('starter-examples-hidden');
      document.querySelectorAll('#content .content-board .idea-item:not([data-content-idea])').forEach((item) => item.remove());
      document.querySelectorAll('#accountList .account-row:not(.saved-account-row)').forEach((item) => item.remove());
      if (!localStorage.getItem('archiveEntries')) { archiveEntries.splice(0, archiveEntries.length); renderArchiveEntries(); }
      if (!localStorage.getItem('calendarEvents')) { calendarEvents.splice(0, calendarEvents.length); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); }
      setupCard.querySelector('.clear-starters30c').textContent = 'Starter examples cleared';
    });
  };
  renderSetup();
  if (localStorage.getItem('starterExamplesHidden') === 'true') document.body.classList.add('starter-examples-hidden');
  if (localStorage.getItem('launchSetupDismissed') !== 'true') document.querySelector('#home .welcome-card')?.after(setupCard);
});

// Next thirty-task pass: daily focus, academic rhythm, money clarity, content momentum, and connection care.
window.addEventListener('load', () => {
  const readNext30c = (key, fallback = []) => { try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; } catch { return fallback; } };
  const writeNext30c = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const safeNext30c = (value) => typeof escapeText === 'function' ? escapeText(value) : String(value ?? '').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const todayNext30c = new Date();
  const todayKeyNext30c = todayNext30c.toISOString().slice(0, 10);
  const daysBetweenNext30c = (date) => { const parsed = new Date(`${date}T00:00:00`); return Number.isNaN(parsed.getTime()) ? null : Math.ceil((parsed - new Date(`${todayKeyNext30c}T00:00:00`)) / 86400000); };
  const addCardNext30c = (parent, className, html) => { if (!parent || parent.querySelector(`.${className}`)) return parent?.querySelector(`.${className}`); const card = document.createElement('div'); card.className = className; card.innerHTML = html; parent.append(card); return card; };

  // 1. Keep the header date current on every device.
  const headerDateNext30c = document.querySelector('.topbar .eyebrow');
  if (headerDateNext30c) headerDateNext30c.textContent = todayNext30c.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  // 2. Personalize the welcome greeting by time of day.
  const greetingNext30c = document.querySelector('.topbar h1');
  if (greetingNext30c) { const hour = todayNext30c.getHours(); const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'; const name = localStorage.getItem('displayName') || localStorage.getItem('profileName') || document.querySelector('#settingName')?.value || 'Charry'; greetingNext30c.innerHTML = `${greeting}, ${safeNext30c(name)} <span>♡</span>`; }
  // 3. Show the exact date beside the daily check-in.
  const datePillNext30c = document.querySelector('#trackers .date-pill');
  if (datePillNext30c) datePillNext30c.textContent = todayNext30c.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase();

  // 4. Add a private daily focus card.
  const focusCardNext30c = addCardNext30c(document.querySelector('#home .welcome-card'), 'daily-focus30c', '<p class="eyebrow">today\'s focus</p><strong></strong><button type="button">Set focus</button>');
  const focusTextNext30c = focusCardNext30c?.querySelector('strong');
  const renderFocusNext30c = () => { if (focusTextNext30c) focusTextNext30c.textContent = localStorage.getItem('dailyFocus') || 'Choose one kind, useful thing.'; };
  renderFocusNext30c();
  focusCardNext30c?.querySelector('button')?.addEventListener('click', () => { const value = prompt('What is your main focus today?', localStorage.getItem('dailyFocus') || ''); if (!value?.trim()) return; localStorage.setItem('dailyFocus', value.trim()); renderFocusNext30c(); });
  // 5. Add a persistent top-three priority list.
  const prioritiesNext30c = readNext30c('dailyPriorities30c');
  const priorityCardNext30c = addCardNext30c(document.querySelector('#trackers'), 'daily-priorities30c', '<p class="eyebrow">top three</p><strong>Small steps for today</strong><div class="priority-list30c"></div><button type="button" class="detail-link">＋ Add priority</button>');
  const renderPrioritiesNext30c = () => { const list = priorityCardNext30c?.querySelector('.priority-list30c'); if (!list) return; list.innerHTML = prioritiesNext30c.map((item, index) => `<label><input type="checkbox" data-priority30c="${index}" ${item.done ? 'checked' : ''}><span>${safeNext30c(item.title)}</span><button type="button" data-priority-delete30c="${index}">×</button></label>`).join('') || '<small>Add only what truly matters today.</small>'; };
  renderPrioritiesNext30c();
  priorityCardNext30c?.addEventListener('click', (event) => { const add = event.target.closest('.detail-link'); const remove = event.target.closest('[data-priority-delete30c]'); if (add) { if (prioritiesNext30c.length >= 3) return alert('Keep this list to three priorities so it stays gentle.'); const title = prompt('Priority:'); if (!title?.trim()) return; prioritiesNext30c.push({ title: title.trim(), done: false }); writeNext30c('dailyPriorities30c', prioritiesNext30c); renderPrioritiesNext30c(); } if (remove) { prioritiesNext30c.splice(Number(remove.dataset.priorityDelete30c), 1); writeNext30c('dailyPriorities30c', prioritiesNext30c); renderPrioritiesNext30c(); } });
  priorityCardNext30c?.addEventListener('change', (event) => { const input = event.target.closest('[data-priority30c]'); if (!input) return; prioritiesNext30c[Number(input.dataset.priority30c)].done = input.checked; writeNext30c('dailyPriorities30c', prioritiesNext30c); });
  // 6. Save a one-line daily intention.
  const intentionCardNext30c = addCardNext30c(document.querySelector('#journal'), 'daily-intention30c', '<p class="eyebrow">daily intention</p><input type="text" placeholder="How do I want to move through today?"><button type="button">Save intention</button>');
  const intentionInputNext30c = intentionCardNext30c?.querySelector('input'); if (intentionInputNext30c) intentionInputNext30c.value = localStorage.getItem(`dailyIntention-${todayKeyNext30c}`) || '';
  intentionCardNext30c?.querySelector('button')?.addEventListener('click', () => { localStorage.setItem(`dailyIntention-${todayKeyNext30c}`, intentionInputNext30c.value.trim()); intentionCardNext30c.querySelector('button').textContent = 'Saved ✓'; });
  // 7. Give custom habits a visible seven-day completion snapshot.
  const customHabitHistoryNext30c = readNext30c('customHabitHistory');
  const habitSnapshotNext30c = addCardNext30c(document.querySelector('#customHabits .custom-habits-card'), 'habit-snapshot30c', '<p class="eyebrow">habit rhythm</p><strong></strong><small>Last seven days of check-ins.</small>');
  if (habitSnapshotNext30c) habitSnapshotNext30c.querySelector('strong').textContent = `${customHabitHistoryNext30c.filter((item) => item.date >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)).length} check-ins this week`;
  // 8. Count logged meals for today.
  const mealsTodayNext30c = readNext30c('mealLogs').filter((item) => !item.date || item.date === todayKeyNext30c).length;
  addCardNext30c(document.querySelector('#mealLog'), 'meal-tally30c', `<p class="eyebrow">today's nourishment</p><strong>${mealsTodayNext30c}/3 meals logged</strong><small>There is no perfect number—this is just a gentle reminder.</small>`);
  // 9. Count prayer/reflection check-ins without judging missed days.
  const prayerHistoryNext30c = readNext30c('prayerHistory');
  addCardNext30c(document.querySelector('.tracker-card.pink'), 'prayer-tally30c', `<p class="eyebrow">prayer rhythm</p><strong>${prayerHistoryNext30c.filter((item) => item.completed).length} saved check-ins</strong><small>Return whenever you need a quiet moment.</small>`);
  // 10. Offer a rotating gratitude prompt.
  const gratitudePromptsNext30c = ['What made today softer?', 'Who helped you recently?', 'What is your body allowing you to do?', 'What small thing felt beautiful?'];
  const promptIndexNext30c = todayNext30c.getDate() % gratitudePromptsNext30c.length;
  const gratitudeCardNext30c = addCardNext30c(document.querySelector('.reflection-detail'), 'gratitude-prompt30c', `<p class="eyebrow">gentle prompt</p><small>${gratitudePromptsNext30c[promptIndexNext30c]}</small><button type="button">Use prompt</button>`);
  gratitudeCardNext30c?.querySelector('button')?.addEventListener('click', () => { const field = document.querySelector('#gratitudeNote'); if (field) { field.value = `${gratitudePromptsNext30c[promptIndexNext30c]}\n`; field.focus(); } });

  // 11. Let journal writers set a realistic word goal.
  const journalGoalCardNext30c = addCardNext30c(document.querySelector('.journal-card'), 'journal-goal30c', '<span></span><button type="button">Set word goal</button>');
  const renderJournalGoalNext30c = () => { const words = (document.querySelector('#quickNote')?.value.trim() || '').split(/\s+/).filter(Boolean).length; const label = journalGoalCardNext30c?.querySelector('span'); if (label) label.textContent = `${words} / ${Number(localStorage.getItem('journalWordGoal30c') || 150)} words`; };
  renderJournalGoalNext30c(); document.querySelector('#quickNote')?.addEventListener('input', renderJournalGoalNext30c); journalGoalCardNext30c?.querySelector('button')?.addEventListener('click', () => { const goal = Number(prompt('Journal word goal:', localStorage.getItem('journalWordGoal30c') || '150')); if (!Number.isFinite(goal) || goal < 10) return; localStorage.setItem('journalWordGoal30c', goal); renderJournalGoalNext30c(); });
  // 12. Filter archived entries by their saved tag.
  const archiveFilterNext30c = document.createElement('select'); archiveFilterNext30c.className = 'refinement-select archive-filter30c'; archiveFilterNext30c.innerHTML = '<option value="all">All journal tags</option><option value="school">School</option><option value="work">Work</option><option value="personal">Personal</option><option value="gratitude">Gratitude</option>'; document.querySelector('.archive-actions')?.append(archiveFilterNext30c);
  archiveFilterNext30c.addEventListener('change', () => { const value = archiveFilterNext30c.value; document.querySelectorAll('#archiveEntryList article').forEach((row) => { row.hidden = value !== 'all' && !row.textContent.toLowerCase().includes(value); }); });
  // 13. Make the weekly spending limit editable.
  const budgetCardNext30c = addCardNext30c(document.querySelector('#finance'), 'budget-control30c', '<span></span><button type="button">Edit weekly budget</button>');
  const renderBudgetNext30c = () => { const budget = Number(localStorage.getItem('weeklyBudget') || 2500); const spent = Number(localStorage.getItem('weeklyExpenses') || 0); const label = budgetCardNext30c?.querySelector('span'); if (label) label.textContent = `KSh ${spent.toLocaleString()} of KSh ${budget.toLocaleString()} used`; }; renderBudgetNext30c(); budgetCardNext30c?.querySelector('button')?.addEventListener('click', () => { const budget = Number(prompt('Weekly budget in KSh:', localStorage.getItem('weeklyBudget') || '2500')); if (!Number.isFinite(budget) || budget <= 0) return; localStorage.setItem('weeklyBudget', budget); renderBudgetNext30c(); });
  // 14. Surface the remaining amount for the week.
  const remainingCardNext30c = addCardNext30c(document.querySelector('#financeBreakdown'), 'budget-remaining30c', '<p class="eyebrow">weekly breathing room</p><strong></strong><small>Based on your editable weekly budget.</small>');
  const renderRemainingNext30c = () => { const remaining = Number(localStorage.getItem('weeklyBudget') || 2500) - Number(localStorage.getItem('weeklyExpenses') || 0); const label = remainingCardNext30c?.querySelector('strong'); if (label) label.textContent = `KSh ${remaining.toLocaleString()} remaining`; remainingCardNext30c?.classList.toggle('budget-negative30c', remaining < 0); }; renderRemainingNext30c();
  // 15. Show the next recurring expense date.
  const recurringExpensesNext30c = readNext30c('recurringExpenses');
  const recurringCardNext30c = addCardNext30c(document.querySelector('#financeBreakdown'), 'recurring-next30c', '<p class="eyebrow">next recurring payment</p><strong></strong><small>Keep subscriptions and regular costs visible.</small>');
  const nextRecurringNext30c = recurringExpensesNext30c.map((item) => ({ ...item, days: daysBetweenNext30c(item.nextDate || item.date) })).filter((item) => item.days !== null && item.days >= 0).sort((a, b) => a.days - b.days)[0];
  if (recurringCardNext30c) recurringCardNext30c.querySelector('strong').textContent = nextRecurringNext30c ? `${safeNext30c(nextRecurringNext30c.name || nextRecurringNext30c.title || 'Payment')} in ${nextRecurringNext30c.days}d` : 'No dated payments yet';
  // 16. Estimate savings pace toward a dated goal.
  const savingsGoalsNext30c = readNext30c('savingsGoals');
  const datedGoalNext30c = savingsGoalsNext30c.find((goal) => goal.targetDate && daysBetweenNext30c(goal.targetDate) > 0);
  const savingsPaceNext30c = addCardNext30c(document.querySelector('#savingsList')?.parentElement || document.querySelector('#savingsList'), 'savings-pace30c', '<p class="eyebrow">savings pace</p><strong></strong><small>Suggested monthly amount uses your target date.</small>');
  if (savingsPaceNext30c) { const days = datedGoalNext30c ? daysBetweenNext30c(datedGoalNext30c.targetDate) : null; const months = days ? Math.max(1, Math.ceil(days / 30)) : 0; const monthly = months ? Math.max(0, (Number(datedGoalNext30c.target) - Number(datedGoalNext30c.saved)) / months) : 0; savingsPaceNext30c.querySelector('strong').textContent = monthly ? `KSh ${Math.ceil(monthly).toLocaleString()} / month` : 'Add a dated savings goal'; }
  // 17. Export calendar events as an iCalendar file.
  const calendarExportNext30c = document.createElement('button'); calendarExportNext30c.type = 'button'; calendarExportNext30c.className = 'small-link calendar-export30c'; calendarExportNext30c.textContent = 'Export calendar'; document.querySelector('#calendar .calendar-actions')?.append(calendarExportNext30c); calendarExportNext30c.addEventListener('click', () => { const events = readNext30c('calendarEvents'); const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Little Life//EN', ...events.map((event) => `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${String(event.date || '').replaceAll('-', '')}\nSUMMARY:${String(event.title || 'Dashboard event').replaceAll(',', '\\,')}\nDESCRIPTION:${String(event.meta || '').replaceAll(',', '\\,')}\nEND:VEVENT`), 'END:VCALENDAR']; const blob = new Blob([lines.join('\n')], { type: 'text/calendar' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-calendar-${todayKeyNext30c}.ics`; link.click(); URL.revokeObjectURL(url); });
  // 18. Add a visible count of scheduled events in the next 30 days.
  const calendarEventsNext30c = readNext30c('calendarEvents'); const upcomingCountNext30c = calendarEventsNext30c.filter((event) => { const days = daysBetweenNext30c(event.date); return days !== null && days >= 0 && days <= 30; }).length; addCardNext30c(document.querySelector('#calendar .upcoming-card'), 'upcoming-count30c', `<strong>${upcomingCountNext30c}</strong><small>saved events in the next 30 days</small>`);
  // 19. Search timetable units by day or class.
  const unitFilterNext30c = document.createElement('input'); unitFilterNext30c.type = 'search'; unitFilterNext30c.className = 'refinement-input unit-filter30c'; unitFilterNext30c.placeholder = 'Filter units'; document.querySelector('.units-card .advanced-heading')?.append(unitFilterNext30c); unitFilterNext30c.addEventListener('input', () => { const query = unitFilterNext30c.value.toLowerCase(); document.querySelectorAll('#unitList > div').forEach((row) => { row.hidden = query && !row.textContent.toLowerCase().includes(query); }); });
  // 20. Show an academic load snapshot using Claudia's saved settings.
  const totalUnitsNext30c = Number(localStorage.getItem('totalUnits') || 134); const completedUnitsNext30c = Number(localStorage.getItem('completedUnits') || 76); const academicSnapshotNext30c = addCardNext30c(document.querySelector('.units-card'), 'academic-snapshot30c', `<span>${completedUnitsNext30c} / ${totalUnitsNext30c} units</span><i style="width:${Math.min(100, completedUnitsNext30c / Math.max(1, totalUnitsNext30c) * 100)}%"></i><small>${Math.max(0, totalUnitsNext30c - completedUnitsNext30c)} units remaining</small>`);
  // 21. Set a weekly study target in minutes.
  const studyTargetCardNext30c = addCardNext30c(document.querySelector('#studyTools'), 'study-target30c', '<span></span><button type="button">Set weekly target</button>');
  const studySessionsNext30c = readNext30c('studySessions'); const minutesForSessionNext30c = (item) => Number(String(item.duration || '').match(/[0-9.]+/)?.[0]) || 0; const renderStudyTargetNext30c = () => { const weekStart = new Date(todayNext30c); weekStart.setDate(weekStart.getDate() - 6); const minutes = studySessionsNext30c.filter((item) => item.date >= weekStart.toISOString().slice(0, 10)).reduce((sum, item) => sum + minutesForSessionNext30c(item), 0); const label = studyTargetCardNext30c?.querySelector('span'); if (label) label.textContent = `${minutes} / ${Number(localStorage.getItem('studyTargetMinutes30c') || 300)} study minutes this week`; }; renderStudyTargetNext30c(); studyTargetCardNext30c?.querySelector('button')?.addEventListener('click', () => { const target = Number(prompt('Weekly study target in minutes:', localStorage.getItem('studyTargetMinutes30c') || '300')); if (!Number.isFinite(target) || target < 30) return; localStorage.setItem('studyTargetMinutes30c', target); renderStudyTargetNext30c(); });
  // 22. Calculate a study streak from saved sessions.
  const studyDatesNext30c = new Set(studySessionsNext30c.map((item) => item.date)); let studyStreakNext30c = 0; for (let offset = 0; offset < 365; offset += 1) { const day = new Date(todayNext30c); day.setDate(day.getDate() - offset); if (!studyDatesNext30c.has(day.toISOString().slice(0, 10))) break; studyStreakNext30c += 1; } addCardNext30c(document.querySelector('.study-log-card'), 'study-streak30c', `<strong>${studyStreakNext30c} day study streak</strong><small>Consistency beats intensity.</small>`);
  // 23. Add countdown labels to exams with released dates.
  const examsNext30c = readNext30c('examEntries'); document.querySelectorAll('#examList > div').forEach((row) => { const code = row.querySelector('.exam-code')?.textContent.trim(); const exam = examsNext30c.find((item) => item.code === code || item.unitCode === code); const date = exam?.date || exam?.examDate; if (date && !row.querySelector('.exam-countdown30c')) { const label = document.createElement('small'); label.className = 'exam-countdown30c'; const days = daysBetweenNext30c(date); label.textContent = days === null ? 'Check exam date' : days < 0 ? 'Exam date passed' : `${days} days to exam`; row.querySelector('section')?.append(label); } });
  // 24. Make the school project's next action easy to update.
  const projectActionNext30c = addCardNext30c(document.querySelector('.project-card'), 'project-next-action30c', '<span></span><button type="button">Update next action</button>'); const projectActionTextNext30c = projectActionNext30c?.querySelector('span'); if (projectActionTextNext30c) projectActionTextNext30c.textContent = localStorage.getItem('projectNextAction30c') || document.querySelector('#projectNotes')?.textContent || 'Add the next small step.'; projectActionNext30c?.querySelector('button')?.addEventListener('click', () => { const action = prompt('Next school project action:', localStorage.getItem('projectNextAction30c') || projectActionTextNext30c.textContent); if (!action?.trim()) return; localStorage.setItem('projectNextAction30c', action.trim()); projectActionTextNext30c.textContent = action.trim(); });
  // 25. Search the pharmacy research vault.
  const researchFilterNext30c = document.createElement('input'); researchFilterNext30c.type = 'search'; researchFilterNext30c.className = 'refinement-input research-filter30c'; researchFilterNext30c.placeholder = 'Search references'; document.querySelector('.research-card .advanced-heading')?.append(researchFilterNext30c); researchFilterNext30c.addEventListener('input', () => { const query = researchFilterNext30c.value.toLowerCase(); document.querySelectorAll('#researchList > p').forEach((row) => { row.hidden = query && !row.textContent.toLowerCase().includes(query); }); });
  // 26. Track weekly work capacity against a personal limit.
  const workCapacityCardNext30c = addCardNext30c(document.querySelector('.work-metrics'), 'work-capacity30c', '<span></span><button type="button">Set weekly capacity</button>'); const workLogsNext30c = readNext30c('workLogEntries'); const renderCapacityNext30c = () => { const limit = Number(localStorage.getItem('workCapacity30c') || 20); const weekStart = new Date(todayNext30c); weekStart.setDate(weekStart.getDate() - 6); const hours = workLogsNext30c.filter((item) => item.date >= weekStart.toISOString().slice(0, 10)).reduce((sum, item) => sum + Number(item.hours || 0), 0); const label = workCapacityCardNext30c?.querySelector('span'); if (label) label.textContent = `${hours}h / ${limit}h planned capacity`; }; renderCapacityNext30c(); workCapacityCardNext30c?.querySelector('button')?.addEventListener('click', () => { const limit = Number(prompt('Weekly work capacity in hours:', localStorage.getItem('workCapacity30c') || '20')); if (!Number.isFinite(limit) || limit <= 0) return; localStorage.setItem('workCapacity30c', limit); renderCapacityNext30c(); });
  // 27. Show work-goal completion at a glance.
  const workGoalProgressNext30c = addCardNext30c(document.querySelector('.goals-card'), 'work-goal-progress30c', '<strong></strong><small>Goals checked in this month.</small>'); const workGoalInputsNext30c = [...document.querySelectorAll('#workGoalList input')]; const renderWorkGoalProgressNext30c = () => { const done = workGoalInputsNext30c.filter((input) => input.checked).length; const label = workGoalProgressNext30c?.querySelector('strong'); if (label) label.textContent = `${done} / ${workGoalInputsNext30c.length} work goals complete`; }; renderWorkGoalProgressNext30c(); workGoalInputsNext30c.forEach((input) => input.addEventListener('change', renderWorkGoalProgressNext30c));
  // 28. Save a lightweight content analytics snapshot for trend review.
  const analyticsSnapshotNext30c = readNext30c('analyticsSnapshots30c'); const analyticsCardNext30c = addCardNext30c(document.querySelector('#analytics'), 'analytics-snapshot30c', '<strong></strong><button type="button">Save today\'s snapshot</button><small></small>'); const renderAnalyticsSnapshotNext30c = () => { const latest = analyticsSnapshotNext30c.at(-1); if (analyticsCardNext30c) { analyticsCardNext30c.querySelector('strong').textContent = latest ? `${analyticsSnapshotNext30c.length} snapshots saved` : 'Build your own trend line'; analyticsCardNext30c.querySelector('small').textContent = latest ? `${latest.date} · ${latest.reach} reach · ${latest.views} views` : 'Save the numbers you see today, then compare later.'; } }; renderAnalyticsSnapshotNext30c(); analyticsCardNext30c?.querySelector('button')?.addEventListener('click', () => { const reach = prompt('Reach:', document.querySelector('#reachMetric')?.textContent || '0'); const views = prompt('Views:', document.querySelector('#viewsMetric')?.textContent || '0'); if (reach === null || views === null) return; analyticsSnapshotNext30c.push({ date: todayKeyNext30c, reach: reach.trim(), views: views.trim() }); writeNext30c('analyticsSnapshots30c', analyticsSnapshotNext30c.slice(-60)); renderAnalyticsSnapshotNext30c(); });
  // 29. Add a quick profile editor for creator accounts.
  document.querySelectorAll('#accountList .account-row').forEach((row) => { if (row.querySelector('[data-account-edit30c]')) return; const button = document.createElement('button'); button.type = 'button'; button.dataset.accountEdit30c = 'true'; button.textContent = 'Edit'; row.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const name = row.querySelector('strong')?.textContent || 'Account'; const handle = prompt(`${name} handle or channel name:`, row.querySelector('small')?.textContent || ''); if (handle === null) return; const account = creatorAccountData[name] || {}; creatorAccountData[name] = { ...account, handle: handle.trim() }; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); if (row.querySelector('small')) row.querySelector('small').textContent = handle.trim() || 'Add a handle'; }); });
  // 30. Keep one relationship next step visible and actionable.
  const relationshipNext30c = addCardNext30c(document.querySelector('.connection-card'), 'relationship-next30c', '<p class="eyebrow">next relationship step</p><strong></strong><button type="button">Add next step</button>'); const renderRelationshipNext30c = () => { const label = relationshipNext30c?.querySelector('strong'); if (label) label.textContent = localStorage.getItem('relationshipNextStep30c') || 'Choose one caring action for this week.'; }; renderRelationshipNext30c(); relationshipNext30c?.querySelector('button')?.addEventListener('click', () => { const next = prompt('What is one caring next step?', localStorage.getItem('relationshipNextStep30c') || ''); if (!next?.trim()) return; localStorage.setItem('relationshipNextStep30c', next.trim()); renderRelationshipNext30c(); });
});
const userHeading = document.querySelector('.topbar h1');
if (userHeading) userHeading.innerHTML = 'Hi, Charry <span>♡</span>';

const units = [
  ['BPC4102', 'Pharmaceutical Chemistry VII (Nuclear Magnetic Resonance)', 'Lecturer to add'],
  ['BPC4101', 'Spectroscopy III', 'Lecturer to add'],
  ['BPL4106', 'Pharmacology VIII (GIT Pharmacology)', 'Lecturer to add'],
  ['BPL4105', 'Pharmacology VII (CVS Pharmacology)', 'Dr. Dennis Opwoko'],
  ['BPL4104', 'Pharmacology VI (Respiratory and Renal Pharmacology)', 'Lecturer to add'],
  ['BMM2102', 'Immunology', 'Lecturer to add'],
  ['BPT4103', 'Pharmacy Management I', 'Lecturer to add'],
  ['BPL4103', 'Clinical Pharmacy II (Respiratory & Infectious Diseases)', 'Lecturer to add'],
  ['BPT4102', 'Pharmaceutics VI (Unit Operations)', 'Lecturer to add'],
  ['BPL5101', 'Clinical Pharmacy V', 'Dr. Arwa Nath'],
  ['BPL4201', 'Pharmacology IX (Chemotherapy I)', 'Dr. Dennis Opwoko'],
  ['BPC4204', 'Pharmaceutical Chemistry XII (ANS)', 'Dr. Lucy Githaga'],
  ['BPL4205', 'Clinical Pharmacy IV (CNS & Bone Joint Infections)', 'Dr. Arwa Nath'],
  ['BPT3102', 'Pharmaceutics II (Drug Standards and GMP)', 'Dr. Rose Obat'],
  ['BPT4204', 'Pharmacy Management III', 'Dr. Solomon Karanja'],
  ['BPA2203', 'Human Pathology III', 'Dr. Jediel & Dr. Lucy Githaga'],
  ['PBCU001', 'Research Methods', 'Dr. Mungoma Michael'],
  ['BPC4202', 'Pharmaceutical Chemistry X (NSAIDs and Antihistamines)', 'Dr. Epaphrodite Twahirwa'],
  ['BPL4203', 'Pharmacology XI (Vitamins & Endocrine Pharmacology)', 'Dr. Samuel Wainaina'],
  ['BPC3103', 'Pharmaceutical Chemistry III (Analytical Methods I)', 'Lecturer to add'],
  ['BPC3202', 'Pharmaceutical Chemistry V (Central Nervous System Drugs)', 'Lecturer to add'],
  ['BCH2206', 'Spectroscopy II', 'Lecturer to add'],
  ['BPL3103', 'Pharmacology II (Autonomic Pharmacology)', 'Lecturer to add'],
  ['BPL3102', 'Pharmacology I (Introduction to Pharmacology)', 'Lecturer to add'],
  ['BPA2204', 'Human Pathology IV', 'Lecturer to add']
];
const unitList = document.querySelector('#unitList');
if (unitList) {
  unitList.innerHTML = units.map(([code, name, lecturer]) => `<div><span>${escapeText(code)}</span><strong>${escapeText(name)}</strong><small>${escapeText(lecturer)} · Year 4.3</small></div>`).join('');
  document.querySelector('#schoolHub .unit-count').textContent = '25 pending';
  unitList.innerHTML = units.map(([code, name, lecturer]) => `<div><span>${escapeText(code)}</span><strong>${escapeText(name)}</strong><small>${escapeText(lecturer)} · Year 4.3</small></div>`).join('');
  document.querySelector('.unit-summary').innerHTML = '<div><strong>134</strong><small>Total units</small></div><div><strong>76</strong><small>Completed</small></div><div><strong>58</strong><small>Remaining</small></div>';
  const timetableCard = document.querySelector('.timetable-card');
  const timetableNote = document.createElement('p');
  timetableNote.className = 'detail-hint';
  timetableNote.textContent = 'Classes complete - August 2026 draft exam timetable imported.';
  timetableCard.append(timetableNote);
  const studyPreference = document.createElement('p');
  studyPreference.className = 'detail-hint study-preference';
  studyPreference.textContent = 'Preferred methods: reading · past papers · summaries';
  document.querySelector('.study-card').append(studyPreference);
}

const businesses = [
  ['LJ', 'Leridia Jewels', 'Gold jewelry · Inactive · Shop goal: 28 Jan 2027', 'Rebrand'],
  ['PM', 'PlayMechi', 'Sports blog · 4 months · Monetized', 'First paycheck'],
  ['EP', 'Exampoa', 'Kenyan education website · 1 month', 'Launch + traffic'],
  ['MI', 'Medical influencing', 'Health & wellness · Starts at attachment', 'Planned']
];
const businessList = document.querySelector('#businessList');
if (businessList) businessList.innerHTML = businesses.map(([initials, name, detail, status], index) => `<div><span class="business-badge ${index % 2 ? 'purple-badge' : 'coral-badge'}">${initials}</span><section><strong>${escapeText(name)}</strong><small>${escapeText(detail)}</small></section><b>${escapeText(status)}</b></div>`).join('');
if (businessList) {
  const rebrand = document.createElement('div');
  rebrand.className = 'rebrand-plan';
  rebrand.innerHTML = '<p class="eyebrow">Leridia Jewels rebrand plan</p><label><input type="checkbox"> Define the new brand mood</label><label><input type="checkbox"> Choose colours, logo, and packaging</label><label><input type="checkbox"> Plan stock and launch budget</label><label><input type="checkbox"> Prepare for 28 January 2027 launch</label>';
  businessList.append(rebrand);
  rebrand.querySelectorAll('input').forEach((input, index) => {
    const key = `leridia-rebrand-${index}`;
    input.checked = localStorage.getItem(key) === 'true';
    input.addEventListener('change', () => localStorage.setItem(key, input.checked));
  });
}

const peopleList = document.querySelector('#peopleList');
if (peopleList) peopleList.innerHTML = '<div><span class="person-avatar peach">F</span><section><strong>Family circle</strong><small>Birthdays · gifts · favours · check-ins</small></section><button>Organize →</button></div><div><span class="person-avatar lavender">F</span><section><strong>Friends circle</strong><small>Catch-ups · memories · plans · support</small></section><button>Organize →</button></div><div><span class="person-avatar sage">♡</span><section><strong>My relationship</strong><small>Couple goals · dates · gifts · shared projects</small></section><button>Open space →</button></div>';

// Refinement pass: time, profile, reminders, exports, filtering, editing, goal math, and install feedback.
window.addEventListener('load', () => {
  const profileDateState = { settings: { ...savedSettings } };
  const dateLabel = document.querySelector('.topbar .eyebrow');
  const topHeading = document.querySelector('.topbar h1');
  const profileAvatar = document.querySelector('.topbar .avatar');
  const profileInitials = (name) => String(name || 'C').trim().split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  const updateProfileDisplay = () => { const name = profileDateState.settings.name || 'Charry'; if (topHeading) topHeading.innerHTML = `Hi, ${escapeText(name)} <span>â™¡</span>`; if (profileAvatar) { profileAvatar.textContent = localStorage.getItem('profileInitials') || profileInitials(name); profileAvatar.classList.add('profile-avatar-edit'); profileAvatar.title = 'Click to edit your profile'; } };
  const updateDateTime = () => { if (dateLabel) dateLabel.textContent = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date()); };
  updateProfileDisplay(); updateDateTime(); window.setInterval(updateDateTime, 30000);
  profileAvatar?.addEventListener('click', () => { const name = prompt('What should your dashboard call you?', profileDateState.settings.name || 'Charry'); if (!name?.trim()) return; const initials = prompt('Profile initials (1–2 letters):', profileInitials(name)) || profileInitials(name); profileDateState.settings.name = name.trim(); localStorage.setItem('dashboardSettings', JSON.stringify(profileDateState.settings)); localStorage.setItem('profileInitials', initials.trim().slice(0, 2).toUpperCase()); const settingName = document.querySelector('#settingName'); if (settingName) settingName.value = name.trim(); updateProfileDisplay(); });

  const importantDates = JSON.parse(localStorage.getItem('importantDates') || '[]');
  const reminderCard = document.querySelector('.people-reminder-card');
  if (reminderCard && !document.querySelector('#importantDatesCard')) { const datesCard = document.createElement('div'); datesCard.id = 'importantDatesCard'; datesCard.className = 'important-dates-card'; datesCard.innerHTML = '<div class="inline-actions"><div><p class="eyebrow">Important dates</p><strong>Birthdays, milestones, and reminders</strong></div><button class="refinement-button" id="addImportantDate">＋ Add</button></div><div id="importantDateList"></div>'; reminderCard.append(datesCard); }
  const renderImportantDates = () => { const list = document.querySelector('#importantDateList'); if (!list) return; const sorted = [...importantDates].sort((a, b) => String(a.date).localeCompare(String(b.date))); list.innerHTML = sorted.map((item) => `<div class="important-date-row"><span>♡</span><div><strong>${escapeText(item.title)}</strong><small>${escapeText(item.person || 'Personal reminder')}</small></div><time>${escapeText(item.date)}</time><button class="row-delete" data-important-index="${importantDates.indexOf(item)}" aria-label="Delete important date">×</button></div>`).join('') || '<p class="important-empty">Add a birthday, anniversary, exam date, or personal milestone.</p>'; };
  renderImportantDates();
  document.querySelector('#addImportantDate')?.addEventListener('click', () => { const title = prompt('What is the important date?'); const date = prompt('Date (YYYY-MM-DD or a note like 28 Jan 2027):'); const person = prompt('Who or what is it connected to?'); if (!title?.trim() || !date?.trim()) return; importantDates.push({ title: title.trim(), date: date.trim(), person: person?.trim() || 'Personal reminder' }); localStorage.setItem('importantDates', JSON.stringify(importantDates)); renderImportantDates(); });
  document.querySelector('#importantDateList')?.addEventListener('click', (event) => { const button = event.target.closest('[data-important-index]'); if (!button) return; const index = Number(button.dataset.importantIndex); if (confirm('Remove this important date?')) { importantDates.splice(index, 1); localStorage.setItem('importantDates', JSON.stringify(importantDates)); renderImportantDates(); } });

  const unitSearchHost = document.querySelector('#unitList');
  if (unitSearchHost && !document.querySelector('#unitSearch')) { const unitSearch = document.createElement('input'); unitSearch.id = 'unitSearch'; unitSearch.className = 'unit-search'; unitSearch.type = 'search'; unitSearch.placeholder = 'Search unit code, name, or lecturer'; unitSearch.setAttribute('aria-label', 'Search pharmacy units'); unitSearchHost.before(unitSearch); unitSearch.addEventListener('input', () => { const query = unitSearch.value.toLowerCase(); unitSearchHost.querySelectorAll(':scope > div').forEach((row) => { row.hidden = !row.textContent.toLowerCase().includes(query); }); }); }

  const exportExpenses = document.createElement('button'); exportExpenses.type = 'button'; exportExpenses.className = 'small-link'; exportExpenses.textContent = '↓ Export CSV'; exportExpenses.id = 'exportExpenses'; document.querySelector('#financeBreakdown .section-title')?.querySelector('.small-link')?.after(exportExpenses);
  exportExpenses.addEventListener('click', () => { const rows = [['Category', 'Amount (KSh)'], ...Object.entries(categoryExpenses).map(([category, amount]) => [category, amount]), ['Total', Object.values(categoryExpenses).reduce((sum, amount) => sum + Number(amount), 0)]]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-expenses-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); });

  archiveList?.addEventListener('click', (event) => { const button = event.target.closest('button'); if (!button) return; const article = button.closest('article'); if (!article) return; const title = article.querySelector('strong')?.textContent || ''; const index = archiveEntries.findIndex((entry) => entry.title === title); if (index < 0) return; const action = prompt('Type edit or delete:', 'edit')?.trim().toLowerCase(); if (action === 'delete' && confirm('Delete this journal archive entry?')) { archiveEntries.splice(index, 1); localStorage.setItem('archiveEntries', JSON.stringify(archiveEntries)); renderArchiveEntries(document.querySelector('#journalSearch')?.value || ''); } if (action === 'edit') { const nextTitle = prompt('Entry title:', archiveEntries[index].title); const nextDetail = prompt('Entry detail:', archiveEntries[index].detail || ''); if (nextTitle?.trim()) { archiveEntries[index].title = nextTitle.trim(); archiveEntries[index].detail = nextDetail?.trim() || ''; localStorage.setItem('archiveEntries', JSON.stringify(archiveEntries)); renderArchiveEntries(document.querySelector('#journalSearch')?.value || ''); } } });

  const updateGoalProgress = (containerId, noteClass) => { const container = document.querySelector(containerId); if (!container) return; const inputs = [...container.querySelectorAll('input[type="checkbox"]')]; const completed = inputs.filter((input) => input.checked).length; const percent = inputs.length ? Math.round(completed / inputs.length * 100) : 0; let note = container.parentElement.querySelector(`.${noteClass}`); if (!note) { note = document.createElement('small'); note.className = `goal-progress-note ${noteClass}`; container.parentElement.append(note); } note.textContent = `${completed} of ${inputs.length} complete · ${percent}%`; if (containerId === '#monthGoals' && monthlyGoals) monthlyGoals.textContent = `${percent}%`; };
  const bindGoalProgress = (containerId, storagePrefix, noteClass) => { const container = document.querySelector(containerId); if (!container) return; const bind = () => { [...container.querySelectorAll('input[type="checkbox"]')].forEach((input, index) => { const key = `${storagePrefix}-${index}`; input.checked = localStorage.getItem(key) === 'true'; input.onchange = () => { localStorage.setItem(key, input.checked); updateGoalProgress(containerId, noteClass); }; }); updateGoalProgress(containerId, noteClass); }; bind(); new MutationObserver(bind).observe(container, { childList: true, subtree: true }); };
  bindGoalProgress('#monthGoals', 'goal-month', 'month-goal-progress'); bindGoalProgress('#quarterGoals', 'goal-quarter', 'quarter-goal-progress');

  document.querySelector('#contentPipeline')?.addEventListener('click', (event) => { const card = event.target.closest('.pipeline-post'); if (!card || event.detail > 1) return; const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); if (!post) return; const views = prompt('Views / reach for this post:', post.views || ''); const likes = prompt('Likes:', post.likes || ''); const comments = prompt('Comments or saves:', post.comments || ''); if (views === null) return; post.views = views.trim(); post.likes = likes?.trim() || ''; post.comments = comments?.trim() || ''; localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); const metric = card.querySelector('.content-metric-badge') || document.createElement('span'); metric.className = 'content-metric-badge'; metric.textContent = `${post.views || '0'} views · ${post.likes || '0'} likes`; if (!metric.parentElement) card.append(metric); if (post.status === 3 && creatorAccountData[selectedCreatorAccount]) { const numericViews = Number(String(post.views).replaceAll(',', '').replace(/[^0-9.]/g, '')); const numericLikes = Number(String(post.likes).replaceAll(',', '').replace(/[^0-9.]/g, '')); const account = creatorAccountData[selectedCreatorAccount]; if (numericViews) account.reach = post.views; if (numericViews && numericLikes) account.engagement = `${(numericLikes / numericViews * 100).toFixed(1)}%`; account.best = post.title; account.meta = `${post.platform || 'Post'} · ${post.views || '0'} views · ${post.likes || '0'} likes`; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); renderAccountInsights(); } });

  const appStatus = document.createElement('div'); appStatus.id = 'appStatus'; appStatus.className = 'app-status'; document.body.append(appStatus); let installPromptEvent;
  const showAppStatus = (message, offline = false, install = false) => { appStatus.className = `app-status visible${offline ? ' offline' : ''}`; appStatus.innerHTML = `<span>${escapeText(message)}</span>${install ? '<button class="install-button" id="installApp">Install</button>' : ''}`; if (install) document.querySelector('#installApp').addEventListener('click', async () => { installPromptEvent?.prompt(); await installPromptEvent?.userChoice; installPromptEvent = null; appStatus.classList.remove('visible'); }); window.setTimeout(() => appStatus.classList.remove('visible'), 4500); };
  const updateConnectionStatus = () => showAppStatus(navigator.onLine ? 'Online · your entries are saved on this device.' : 'Offline · your dashboard still works locally.', !navigator.onLine);
  window.addEventListener('online', updateConnectionStatus); window.addEventListener('offline', updateConnectionStatus); window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); installPromptEvent = event; showAppStatus('Install this dashboard for quicker access.', false, true); }); window.setTimeout(updateConnectionStatus, 700);
});

const connectionCard = document.querySelector('.connection-card');
if (connectionCard) {
  const toolkit = document.createElement('div');
  toolkit.className = 'relationship-toolkit';
  toolkit.innerHTML = '<p class="eyebrow">Couple toolkit</p><div class="toolkit-grid"><button data-tool="couple goals">♡ Couple goals</button><button data-tool="date idea">✧ Date idea</button><button data-tool="gift idea">□ Gift idea</button><button data-tool="favour">＋ Favour</button><button data-tool="shared project">◇ Shared project</button><button data-tool="to-do item">☑ To-do list</button></div><div id="relationshipItems" class="relationship-items"></div>';
  connectionCard.append(toolkit);
  const savedRelationshipItems = JSON.parse(localStorage.getItem('relationshipItems') || '[]');
  savedRelationshipItems.forEach((item) => { const row = document.createElement('p'); row.textContent = `${item.type}: ${item.text}`; document.querySelector('#relationshipItems').append(row); });
  toolkit.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => {
    const item = prompt(`Add a ${button.dataset.tool}:`);
    if (!item?.trim()) return;
    const row = document.createElement('p');
    row.textContent = `${button.dataset.tool}: ${item.trim()}`;
    document.querySelector('#relationshipItems').append(row);
    savedRelationshipItems.push({ type: button.dataset.tool, text: item.trim() });
    localStorage.setItem('relationshipItems', JSON.stringify(savedRelationshipItems));
  }));
}

const settingsModal = document.querySelector('#settingsModal');
const settingsDefaults = { name: 'Charry', course: 'Pharmacy', year: '4.3', totalUnits: '134', completedUnits: '76', studyMethods: 'Reading, past papers, summaries', relationship: 'All areas', currency: 'KSh' };
const savedSettings = { ...settingsDefaults, ...JSON.parse(localStorage.getItem('dashboardSettings') || '{}') };
const settingMap = { name: '#settingName', course: '#settingCourse', year: '#settingYear', totalUnits: '#settingTotalUnits', completedUnits: '#settingCompletedUnits', studyMethods: '#settingStudyMethods', relationship: '#settingRelationship', currency: '#settingCurrency' };
Object.entries(settingMap).forEach(([key, selector]) => { const field = document.querySelector(selector); if (field) field.value = savedSettings[key]; });
const showSettings = () => { settingsModal.classList.add('open'); settingsModal.setAttribute('aria-hidden', 'false'); document.querySelector('#settingName').focus(); };
const hideSettings = () => { settingsModal.classList.remove('open'); settingsModal.setAttribute('aria-hidden', 'true'); };
document.querySelector('#openSettings')?.addEventListener('click', showSettings);
document.querySelector('#closeSettings')?.addEventListener('click', hideSettings);
document.querySelector('#settingsBackdrop')?.addEventListener('click', hideSettings);
document.querySelector('#settingsForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const updated = Object.fromEntries(Object.entries(settingMap).map(([key, selector]) => [key, document.querySelector(selector).value.trim()]));
  localStorage.setItem('dashboardSettings', JSON.stringify(updated));
  const heading = document.querySelector('.topbar h1');
  if (heading) heading.innerHTML = `Hi, ${escapeText(updated.name)} <span>♡</span>`;
  const summary = document.querySelector('.unit-summary');
  if (summary) summary.innerHTML = `<div><strong>${escapeText(updated.totalUnits)}</strong><small>Total units</small></div><div><strong>${escapeText(updated.completedUnits)}</strong><small>Completed</small></div><div><strong>${Math.max(0, Number(updated.totalUnits) - Number(updated.completedUnits))}</strong><small>Remaining</small></div>`;
  hideSettings();
});

document.querySelector('#exportData')?.addEventListener('click', () => {
  const selectedKeys = JSON.parse(localStorage.getItem('backupScope') || 'null');
  const allData = { ...localStorage };
  const data = Array.isArray(selectedKeys) && selectedKeys.length ? Object.fromEntries(selectedKeys.filter((key) => key in allData).map((key) => [key, allData[key]])) : allData;
  const backup = { app: 'my little life', version: 2, exportedAt: new Date().toISOString(), data };
  const file = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = `my-little-life-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
});
document.querySelector('#importData')?.addEventListener('click', () => document.querySelector('#importFile').click());
document.querySelector('#importFile')?.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const backup = JSON.parse(reader.result);
      if (!backup.data || typeof backup.data !== 'object') throw new Error('Invalid backup');
      const keys = Object.keys(backup.data);
      if (!confirm(`Import ${keys.length} saved items? This will replace matching local items.\n\n${keys.slice(0, 8).join(', ')}${keys.length > 8 ? '…' : ''}`)) return;
      Object.entries(backup.data).forEach(([key, value]) => localStorage.setItem(key, value));
      alert('Backup imported. Refreshing your dashboard now.');
      window.location.reload();
    } catch { alert('That file does not look like a valid dashboard backup.'); }
  };
  reader.readAsText(file);
});

let calendarView = new Date();
let calendarFilterState = 'all';
const defaultEvents = [
  { date: '2026-07-28', title: 'Study block: Pharmacology XI', meta: 'School · 14:00', color: 'coral-event' },
  { date: '2026-08-02', title: 'Exampoa launch planning', meta: 'Work · All day', color: 'purple-event' },
  { date: '2026-08-18', title: 'Pharmacovigilance project due', meta: 'School · Deadline', color: 'green-event' }
];
let calendarEvents = JSON.parse(localStorage.getItem('calendarEvents') || 'null') || (localStorage.getItem('starterExamplesHidden') === 'true' ? [] : defaultEvents);
const renderCalendar = () => {
  const year = calendarView.getFullYear();
  const month = calendarView.getMonth();
  document.querySelector('#calendarMonth').textContent = calendarView.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const days = document.querySelector('#calendarDays');
  const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDays = new Date(year, month, 0).getDate();
  const cells = [];
  for (let index = 0; index < 42; index += 1) {
    const dayNumber = index - firstDay + 1;
    const actualDate = new Date(year, month, dayNumber);
    const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
    const dateString = `${actualDate.getFullYear()}-${String(actualDate.getMonth() + 1).padStart(2, '0')}-${String(actualDate.getDate()).padStart(2, '0')}`;
    const hasEvent = calendarEvents.some((event) => event.date === dateString && (calendarFilterState === 'all' || String(event.meta || '').toLowerCase().includes(calendarFilterState)));
    const isToday = dateString === new Date().toISOString().slice(0, 10);
    cells.push(`<button class="${isCurrentMonth ? '' : 'muted-day '}${isToday ? 'today ' : ''}${hasEvent ? 'has-event' : ''}" data-date="${dateString}">${isCurrentMonth ? dayNumber : (dayNumber <= 0 ? previousDays + dayNumber : dayNumber - daysInMonth)}</button>`);
  }
  days.innerHTML = cells.join('');
};
const renderUpcoming = () => {
  const list = document.querySelector('#upcomingEvents');
  const todayKey = new Date().toISOString().slice(0, 10);
  const upcoming = [...calendarEvents].filter((event) => event.date >= todayKey && (calendarFilterState === 'all' || String(event.meta || '').toLowerCase().includes(calendarFilterState))).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
  list.innerHTML = upcoming.map((event) => { const date = new Date(`${event.date}T00:00:00`); return `<div><span class="event-date ${event.color || 'coral-event'}">${date.getDate()}<span>${date.toLocaleString('en-US', { month: 'short' }).toUpperCase()}</span></span><section><strong>${escapeText(event.title)}</strong><small>${escapeText(event.meta || 'Personal event')}</small></section></div>`; }).join('');
};
document.querySelector('#previousMonth')?.addEventListener('click', () => { calendarView.setMonth(calendarView.getMonth() - 1); renderCalendar(); });
document.querySelector('#nextMonth')?.addEventListener('click', () => { calendarView.setMonth(calendarView.getMonth() + 1); renderCalendar(); });
document.querySelector('#addCalendarEvent')?.addEventListener('click', () => {
  const date = prompt('Date (YYYY-MM-DD):');
  const title = prompt('What is happening?');
  const meta = prompt('Category or time, for example “School · 14:00”:');
  if (!date?.match(/^\d{4}-\d{2}-\d{2}$/) || !title?.trim()) return;
  calendarEvents.push({ date, title: title.trim(), meta: meta?.trim() || 'Personal event', color: 'coral-event' });
  localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents));
  renderCalendar(); renderUpcoming();
});
renderCalendar(); renderUpcoming();
document.querySelector('#calendarFilter')?.addEventListener('change', (event) => { calendarFilterState = event.target.value; renderCalendar(); renderUpcoming(); });

const reviewFields = ['reviewProud', 'reviewHeavy', 'reviewPriorities', 'reviewPromise'];
const savedReview = JSON.parse(localStorage.getItem('weeklyReview') || '{}');
reviewFields.forEach((id) => { const field = document.querySelector(`#${id}`); if (field) field.value = savedReview[id] || ''; });
const habitCount = document.querySelectorAll('.check-list input:checked').length;
const reviewHabits = document.querySelector('#reviewHabits');
if (reviewHabits) reviewHabits.textContent = `${habitCount} / 4`;
const reviewEntries = document.querySelector('#reviewEntries');
if (reviewEntries) reviewEntries.textContent = JSON.parse(localStorage.getItem('journalEntries') || '[]').length + (localStorage.getItem('quickNote') ? 1 : 0);
const reviewEvents = document.querySelector('#reviewEvents');
if (reviewEvents) reviewEvents.textContent = calendarEvents.length;
document.querySelector('#saveReview')?.addEventListener('click', () => {
  const review = Object.fromEntries(reviewFields.map((id) => [id, document.querySelector(`#${id}`).value]));
  localStorage.setItem('weeklyReview', JSON.stringify(review));
  document.querySelector('#saveReview').innerHTML = 'Review saved ✓';
});

const captureType = document.querySelector('#captureType');
const captureHint = document.querySelector('#captureHint');
const captureHints = { journal: 'Journal thoughts go into your private notes.', task: 'Tasks appear in your School & work planner.', study: 'Study sessions appear in your study schedule.', expense: 'Enter the amount in the detail field, for example: 450.', content: 'Content ideas appear in your Ideas board.', memory: 'Memories appear in your Memory vault.', gratitude: 'Gratitude goes into your private reflection.', event: 'Enter the date in the detail field as YYYY-MM-DD.' };
captureType?.addEventListener('change', () => { captureHint.textContent = captureHints[captureType.value]; });
document.querySelector('#captureForm')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const type = captureType.value;
  const title = document.querySelector('#captureTitle').value.trim();
  const detail = document.querySelector('#captureDetail').value.trim();
  if (!title) return;
  if (type === 'journal') {
    const existing = localStorage.getItem('quickNote');
    localStorage.setItem('quickNote', existing ? `${existing}\n\n${title}${detail ? ` — ${detail}` : ''}` : `${title}${detail ? ` — ${detail}` : ''}`);
    if (quickNote) quickNote.value = localStorage.getItem('quickNote');
  } else if (type === 'task') {
    const row = document.createElement('p'); row.innerHTML = `<span>□</span> ${escapeText(title)} <small>${escapeText(detail || 'New task')}</small>`; document.querySelector('#plannerList')?.append(row);
  } else if (type === 'study') {
    const row = document.createElement('div'); row.innerHTML = `<strong>${escapeText(title)}</strong><small>${escapeText(detail || 'New study session')}</small><span class="study-tag">PENDING</span>`; document.querySelector('#studyList')?.append(row);
  } else if (type === 'expense') {
    const amount = Number((detail || title).replace(/[^0-9.]/g, ''));
    if (!Number.isNaN(amount) && amount > 0) { const current = Number(localStorage.getItem('weeklyExpenses') || 0) + amount; localStorage.setItem('weeklyExpenses', current); if (document.querySelector('#spentTotal')) document.querySelector('#spentTotal').textContent = `KSh ${current.toLocaleString()}`; }
  } else if (type === 'content') {
    const item = document.createElement('div'); item.className = 'idea-item'; item.innerHTML = `<span>✦</span><div><strong>${escapeText(title)}</strong><small>${escapeText(detail || 'New idea · choose a platform')}</small></div><button>···</button>`; document.querySelector('.content-board')?.append(item);
  } else if (type === 'memory') {
    localStorage.setItem('savedMemory', `${title}${detail ? ` — ${detail}` : ''}`); if (document.querySelector('#memoryText')) document.querySelector('#memoryText').textContent = localStorage.getItem('savedMemory');
  } else if (type === 'gratitude') {
    localStorage.setItem('gratitudeNote', `${title}${detail ? ` — ${detail}` : ''}`); if (gratitudeNote) gratitudeNote.value = localStorage.getItem('gratitudeNote');
  } else if (type === 'event') {
    if (!detail.match(/^\d{4}-\d{2}-\d{2}$/)) { captureHint.textContent = 'Please use a date like 2026-08-18 for an event.'; return; }
    calendarEvents.push({ date: detail, title, meta: 'Personal event', color: 'coral-event' }); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming();
  }
  event.target.reset(); captureHint.textContent = 'Added to your dashboard ✓';
});

const completionKey = (prefix, text) => `${prefix}-${text.trim().slice(0, 80)}`;
document.querySelectorAll('#workGoalList input').forEach((input, index) => {
  const key = `work-goal-${index}`;
  input.checked = localStorage.getItem(key) === 'true';
  input.addEventListener('change', () => localStorage.setItem(key, input.checked));
});
const restoreClickableCompletion = (selector, prefix) => {
  document.querySelectorAll(selector).forEach((item) => {
    const text = item.textContent.trim();
    const key = completionKey(prefix, text);
    if (localStorage.getItem(key) === 'true') item.classList.add('completed-row');
    item.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      item.classList.toggle('completed-row');
      localStorage.setItem(key, item.classList.contains('completed-row'));
    });
  });
};
restoreClickableCompletion('#plannerList p', 'planner');
restoreClickableCompletion('#studyList > div', 'study');

document.querySelector('#addExam')?.addEventListener('click', () => {
  const code = prompt('Unit code:');
  const name = prompt('Unit or exam name:');
  const date = prompt('Exam date, or type TBD:');
  if (!code || !name) return;
  const row = document.createElement('div');
  row.innerHTML = `<span class="exam-code">${escapeText(code)}</span><section><strong>${escapeText(name)}</strong><small>Final date: ${escapeText(date || 'TBD')} · Preparation: not started</small></section><b>${escapeText(date || 'TBD')}</b>`;
  document.querySelector('#examList').append(row);
  const examEntries = JSON.parse(localStorage.getItem('examEntries') || '[]'); examEntries.push({ code: code.trim(), name: name.trim(), date: date?.trim() || 'TBD' }); localStorage.setItem('examEntries', JSON.stringify(examEntries));
});
document.querySelector('#addMilestone')?.addEventListener('click', () => {
  const milestone = prompt('What milestone are you working toward?');
  if (!milestone?.trim()) return;
  const row = document.createElement('div');
  row.className = 'milestone';
  row.innerHTML = `<span>＋</span><div><strong>${escapeText(milestone)}</strong><small>New milestone</small></div><i></i>`;
  document.querySelector('.milestone-card .detail-link').before(row);
});

const persistentCollections = [
  ['persist-planner', '#plannerList'],
  ['persist-study', '#studyList'],
  ['persist-content', '.content-board'],
  ['persist-people', '#peopleList'],
  ['persist-research', '#researchList']
];
const hydrateCollection = (key, selector) => {
  const container = document.querySelector(selector);
  if (!container) return;
  const items = JSON.parse(localStorage.getItem(key) || '[]');
  items.forEach((html) => { const holder = document.createElement('div'); holder.innerHTML = html; const item = holder.firstElementChild; if (item) { item.dataset.persisted = 'true'; container.append(item); } });
};
const watchCollection = (key, selector) => {
  const container = document.querySelector(selector);
  if (!container) return;
  const observer = new MutationObserver((records) => {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType !== 1 || node.dataset.persisted) return;
      node.dataset.persisted = 'true';
      stored.push(node.outerHTML);
    }));
    if (records.some((record) => record.addedNodes.length)) localStorage.setItem(key, JSON.stringify(stored));
  });
  observer.observe(container, { childList: true });
};
persistentCollections.forEach(([key, selector]) => hydrateCollection(key, selector));
persistentCollections.forEach(([key, selector]) => watchCollection(key, selector));

const backupActions = document.querySelector('.backup-tools > div');
if (backupActions) {
  const themeButton = document.createElement('button'); themeButton.id = 'toggleTheme'; themeButton.type = 'button'; themeButton.textContent = '☾ Theme'; backupActions.append(themeButton);
  const privacyButton = document.createElement('button'); privacyButton.id = 'togglePrivacy'; privacyButton.type = 'button'; privacyButton.textContent = '◌ Privacy mode'; backupActions.append(privacyButton);
  if (localStorage.getItem('darkTheme') === 'true') document.body.classList.add('soft-dark');
  if (localStorage.getItem('privacyMode') === 'true') document.body.classList.add('privacy-mode');
  themeButton.addEventListener('click', () => { document.body.classList.toggle('soft-dark'); localStorage.setItem('darkTheme', document.body.classList.contains('soft-dark')); });
  privacyButton.addEventListener('click', () => { document.body.classList.toggle('privacy-mode'); localStorage.setItem('privacyMode', document.body.classList.contains('privacy-mode')); });
}

const defaultVisionItems = [
  { title: 'Graduate with confidence', category: 'Pharmacy', text: 'I am becoming the woman I am meant to be.' },
  { title: 'Leridia Jewels', category: 'Business', text: 'A beautiful shop, ready for 28 January 2027.' },
  { title: 'A soft, healthy life', category: 'Wellbeing', text: 'Rest, movement, prayer, and peace.' },
  { title: 'Love that feels safe', category: 'Relationships', text: 'Communication, quality time, and shared dreams.' }
];
let visionItems = JSON.parse(localStorage.getItem('visionItems') || 'null') || defaultVisionItems;
const renderVision = () => {
  const grid = document.querySelector('#visionBoardGrid');
  if (!grid) return;
  grid.innerHTML = visionItems.map((item, index) => `<article class="vision-card ${item.image ? 'image-card' : ''}" ${item.image ? `style="background-image:url('${item.image}')"` : ''}><button class="vision-remove" data-vision-index="${index}" aria-label="Remove vision">×</button><span class="vision-category">${escapeText(item.category || 'My vision')}</span><h3>${escapeText(item.title)}</h3><p>${escapeText(item.text || '')}</p></article>`).join('') + '<article class="vision-card add-card" id="visionAddCard"><h3>＋ Add to the board</h3><p>A dream, feeling, place, or goal</p></article>';
};
const saveVision = () => localStorage.setItem('visionItems', JSON.stringify(visionItems));
const addVisionCard = () => { const title = prompt('What belongs on your vision board?'); if (!title?.trim()) return; const category = prompt('Category: Pharmacy, Business, Wellbeing, Love, Home, or other:'); const text = prompt('A short affirmation or detail:'); visionItems.push({ title: title.trim(), category: category?.trim() || 'My vision', text: text?.trim() || '' }); saveVision(); renderVision(); };
document.querySelector('#addVisionCard')?.addEventListener('click', addVisionCard);
document.querySelector('#visionBoardGrid')?.addEventListener('click', (event) => { const remove = event.target.closest('.vision-remove'); if (remove) { visionItems.splice(Number(remove.dataset.visionIndex), 1); saveVision(); renderVision(); return; } if (event.target.closest('#visionAddCard')) addVisionCard(); });
document.querySelector('#visionImageUpload')?.addEventListener('change', (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const title = prompt('Name this image or vision:'); if (!title?.trim()) return; visionItems.push({ title: title.trim(), category: 'Image', text: 'A visual reminder of what I am creating.', image: reader.result }); saveVision(); renderVision(); }; reader.readAsDataURL(file); });
renderVision();

document.querySelectorAll('.goal-list input').forEach((input, index) => { const key = `goal-${index}`; input.checked = localStorage.getItem(key) === 'true'; input.addEventListener('change', () => localStorage.setItem(key, input.checked)); });
document.querySelector('#addGoal')?.addEventListener('click', () => { const timeframe = prompt('Yearly, quarterly, or monthly goal?'); const goal = prompt('What is the goal?'); if (!goal?.trim()) return; const list = timeframe?.toLowerCase().startsWith('month') ? document.querySelector('#monthGoals') : document.querySelector('#quarterGoals'); const label = document.createElement('label'); label.innerHTML = `<input type="checkbox"> ${escapeText(goal.trim())}`; list?.append(label); });

let customHabits = JSON.parse(localStorage.getItem('customHabits') || '[]');
const renderCustomHabits = () => { const list = document.querySelector('#customHabitList'); const empty = document.querySelector('#habitEmpty'); if (!list) return; empty.style.display = customHabits.length ? 'none' : 'block'; list.innerHTML = customHabits.map((habit, index) => `<div class="custom-habit ${habit.done ? 'completed' : ''}"><input type="checkbox" ${habit.done ? 'checked' : ''} data-habit-index="${index}"><label>${escapeText(habit.name)}<small>${escapeText(habit.frequency || 'Daily')}</small></label><button data-edit-habit="${index}" aria-label="Edit habit">✎</button><button data-remove-habit="${index}" aria-label="Remove habit">×</button></div>`).join(''); };
document.querySelector('#addCustomHabit')?.addEventListener('click', () => { const name = prompt('What habit do you want to build?'); const frequency = prompt('How often? (Daily, weekdays, weekly...)'); if (!name?.trim()) return; customHabits.push({ name: name.trim(), frequency: frequency?.trim() || 'Daily', done: false }); localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
document.querySelector('#customHabitList')?.addEventListener('change', (event) => { const input = event.target.closest('[data-habit-index]'); if (!input) return; customHabits[Number(input.dataset.habitIndex)].done = input.checked; localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
document.querySelector('#customHabitList')?.addEventListener('click', (event) => { const edit = event.target.closest('[data-edit-habit]'); const remove = event.target.closest('[data-remove-habit]'); if (edit) { const habit = customHabits[Number(edit.dataset.editHabit)]; const name = prompt('Habit name:', habit.name); const frequency = prompt('How often?', habit.frequency || 'Daily'); if (name?.trim()) { habit.name = name.trim(); habit.frequency = frequency?.trim() || 'Daily'; localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); } return; } if (!remove) return; customHabits.splice(Number(remove.dataset.removeHabit), 1); localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
renderCustomHabits();

const savedRoutines = JSON.parse(localStorage.getItem('routines') || '[]');
savedRoutines.forEach((routine) => { const list = document.querySelector('#routineList'); const item = document.createElement('article'); item.innerHTML = `<span class="routine-icon">↻</span><div><strong>${escapeText(routine.name)}</strong><small>${escapeText(routine.detail)}</small></div><b>${escapeText(routine.time)}</b><input type="checkbox">`; list?.append(item); });
document.querySelector('#routineList')?.addEventListener('change', (event) => { if (event.target.type === 'checkbox') { const checks = [...document.querySelectorAll('#routineList input')].map((input) => input.checked); localStorage.setItem('routineChecks', JSON.stringify(checks)); } });
const savedRoutineChecks = JSON.parse(localStorage.getItem('routineChecks') || '[]');
document.querySelectorAll('#routineList input').forEach((input, index) => { input.checked = savedRoutineChecks[index] === true; });
document.querySelector('#addRoutine')?.addEventListener('click', () => { const name = prompt('What routine do you want to repeat?'); const time = prompt('What time?'); const detail = prompt('What does it include?'); if (!name?.trim()) return; const routines = JSON.parse(localStorage.getItem('routines') || '[]'); routines.push({ name: name.trim(), time: time?.trim() || 'Anytime', detail: detail?.trim() || 'Your recurring routine' }); localStorage.setItem('routines', JSON.stringify(routines)); const item = document.createElement('article'); item.innerHTML = `<span class="routine-icon">↻</span><div><strong>${escapeText(name)}</strong><small>${escapeText(detail || 'Your recurring routine')}</small></div><b>${escapeText(time || 'Anytime')}</b><input type="checkbox">`; document.querySelector('#routineList')?.append(item); });

let boardProjects = JSON.parse(localStorage.getItem('boardProjects') || '[]');
const renderBoardProjects = () => { const columns = document.querySelectorAll('.kanban-grid > article'); boardProjects.forEach((project) => { const column = columns[project.status === 'done' ? 2 : project.status === 'active' ? 1 : 0]; if (!column || column.querySelector(`[data-project="${CSS.escape(project.title)}"]`)) return; const item = document.createElement('div'); item.className = 'kanban-item'; item.dataset.project = project.title; item.innerHTML = `<strong>${escapeText(project.title)}</strong><small>${escapeText(project.meta)}</small>`; column.append(item); }); };
document.querySelector('#addBoardProject')?.addEventListener('click', () => { const title = prompt('Project name:'); const meta = prompt('Category and next action:'); const status = prompt('Status: explore, active, or done:', 'explore'); if (!title?.trim()) return; boardProjects.push({ title: title.trim(), meta: meta?.trim() || 'New project', status: status?.trim().toLowerCase() || 'explore' }); localStorage.setItem('boardProjects', JSON.stringify(boardProjects)); renderBoardProjects(); });
renderBoardProjects();

const runDashboardSearch = () => { const query = document.querySelector('#dashboardSearchInput')?.value.trim().toLowerCase(); const results = document.querySelector('#searchResults'); if (!results) return; if (!query) { results.innerHTML = ''; return; } const matches = [...document.querySelectorAll('main section')].filter((section) => section.textContent.toLowerCase().includes(query)).slice(0, 9); results.innerHTML = matches.map((section) => `<button class="search-result" data-target="${section.id}">${escapeText(section.querySelector('h2')?.textContent || section.id)}<small>Open section →</small></button>`).join('') || '<p class="capture-hint">Nothing found yet. Try another word.</p>'; };
document.querySelector('#dashboardSearchInput')?.addEventListener('input', runDashboardSearch);
document.querySelector('#searchResults')?.addEventListener('click', (event) => { const result = event.target.closest('[data-target]'); if (result) document.querySelector(`#${CSS.escape(result.dataset.target)}`)?.scrollIntoView({ behavior: 'smooth' }); });

const monthlyContent = document.querySelector('#monthlyContent');
if (monthlyContent) monthlyContent.textContent = document.querySelectorAll('.idea-item').length + JSON.parse(localStorage.getItem('journalEntries') || '[]').length;
const monthlyGoals = document.querySelector('#monthlyGoals');
if (monthlyGoals) { const goals = [...document.querySelectorAll('#monthGoals input')]; monthlyGoals.textContent = `${goals.length ? Math.round((goals.filter((goal) => goal.checked).length / goals.length) * 100) : 0}%`; }
const monthlyHabits = document.querySelector('#monthlyHabits');
if (monthlyHabits) monthlyHabits.textContent = document.querySelectorAll('.check-list input:checked').length + customHabits.filter((habit) => habit.done).length;
const monthlyMoney = document.querySelector('#monthlyMoney');
if (monthlyMoney) monthlyMoney.textContent = `KSh ${Number(localStorage.getItem('weeklyExpenses') || 0).toLocaleString()}`;

const archiveEntries = JSON.parse(localStorage.getItem('archiveEntries') || 'null') || (localStorage.getItem('starterExamplesHidden') === 'true' ? [] : [{ title: 'Learning to leave some things unrushed', detail: 'Saturday notes · A quiet morning', date: 'JUL 18' }, { title: 'On finding a rhythm that feels like mine', detail: 'Sunday thoughts · Personal', date: 'JUL 12' }]);
const archiveList = document.querySelector('#archiveEntryList');
const renderArchiveEntries = (query = '') => { if (!archiveList) return; const entries = archiveEntries.filter((entry) => `${entry.title} ${entry.detail} ${entry.tag || ''}`.toLowerCase().includes(query.toLowerCase())); archiveList.innerHTML = entries.map((entry) => `<article><span class="archive-entry-date">${escapeText(entry.date)}</span><div><strong>${escapeText(entry.title)}</strong><small>${escapeText(entry.detail || 'Personal entry')}${entry.tag ? ` · ${escapeText(entry.tag)}` : ''}</small></div><button>···</button></article>`).join('') || '<p class="capture-hint">No matching entries yet.</p>'; };
document.querySelector('#journalSearch')?.addEventListener('input', (event) => renderArchiveEntries(event.target.value));
document.querySelector('#addArchiveEntry')?.addEventListener('click', () => { const title = prompt('Entry title:'); const detail = prompt('What do you want to remember?'); const tag = prompt('Tag: school, work, personal, or gratitude?'); if (!title?.trim()) return; archiveEntries.unshift({ title: title.trim(), detail: detail?.trim() || '', tag: tag?.trim().toLowerCase() || 'personal', date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() }); localStorage.setItem('archiveEntries', JSON.stringify(archiveEntries)); renderArchiveEntries(); });
renderArchiveEntries();

const nutritionNoteField = document.querySelector('#nutritionNote');
if (nutritionNoteField) nutritionNoteField.value = localStorage.getItem('nutritionNote') || '';
document.querySelector('#saveNutrition')?.addEventListener('click', () => { localStorage.setItem('nutritionNote', nutritionNoteField.value); document.querySelector('#saveNutrition').textContent = 'Saved note ✓'; });
const mealLogs = JSON.parse(localStorage.getItem('mealLogs') || '[]');
const renderMealLogs = () => { const list = document.querySelector('#mealLogList'); if (!list) return; const types = ['Breakfast', 'Lunch', 'Dinner']; list.innerHTML = types.map((type) => { const item = mealLogs.find((meal) => meal.type === type); return `<div><span>${type === 'Breakfast' ? '☕' : type === 'Lunch' ? '🥗' : '🍓'}</span><section><strong>${type}</strong><small>${escapeText(item?.detail || 'Not logged yet')}</small></section><b>${item ? '✓' : '—'}</b></div>`; }).join(''); };
document.querySelector('#addMealLog')?.addEventListener('click', () => { const type = prompt('Breakfast, Lunch, or Dinner?'); const detail = prompt('What did you eat?'); if (!type?.trim() || !detail?.trim()) return; mealLogs.push({ type: type.trim().replace(/^./, (letter) => letter.toUpperCase()), detail: detail.trim(), date: new Date().toISOString().slice(0, 10) }); localStorage.setItem('mealLogs', JSON.stringify(mealLogs)); renderMealLogs(); });
renderMealLogs();

const categoryExpenses = { ...{ food: 0, transport: 0, school: 0, personal: 0 }, ...JSON.parse(localStorage.getItem('categoryExpenses') || '{}') };
const renderCategoryExpenses = () => { const total = Object.values(categoryExpenses).reduce((sum, value) => sum + Number(value), 0); Object.entries(categoryExpenses).forEach(([category, amount]) => { const label = document.querySelector(`#${category}Spend`); const track = document.querySelector(`#${category}Track`); if (label) label.textContent = `KSh ${Number(amount).toLocaleString()}`; if (track) track.style.width = `${total ? Math.min(100, Number(amount) / total * 100) : 0}%`; }); const totalLabel = document.querySelector('#budgetDetailTotal'); if (totalLabel) totalLabel.textContent = `KSh ${total.toLocaleString()}`; const percent = document.querySelector('#budgetPercent'); if (percent) percent.textContent = `${Math.min(100, Math.round(total / Number(localStorage.getItem('monthlyBudget') || 25000) * 100))}%`; };
document.querySelector('#addCategorizedExpense')?.addEventListener('click', () => { const category = prompt('Category: food, transport, school, or personal?'); const amount = Number(prompt('Amount in KSh:')); const key = category?.trim().toLowerCase(); const note = prompt('What was it for? (optional)'); if (!category || Number.isNaN(amount) || amount <= 0 || !(key in categoryExpenses)) return; categoryExpenses[key] += amount; localStorage.setItem('categoryExpenses', JSON.stringify(categoryExpenses)); localStorage.setItem('weeklyExpenses', Number(localStorage.getItem('weeklyExpenses') || 0) + amount); const expenseLedger = JSON.parse(localStorage.getItem('expenseLedger') || '[]'); expenseLedger.unshift({ id: `expense-${Date.now()}`, category: key, amount, note: note?.trim() || '', date: new Date().toISOString().slice(0, 10) }); localStorage.setItem('expenseLedger', JSON.stringify(expenseLedger)); renderCategoryExpenses(); });
renderCategoryExpenses();

const scheduleEntries = JSON.parse(localStorage.getItem('scheduleEntries') || '[]');
const renderScheduleEntries = () => { const list = document.querySelector('#scheduleEntries'); if (!list) return; list.innerHTML = scheduleEntries.map((entry) => `<p><span>${escapeText(entry.day)}</span><strong>${escapeText(entry.title)}</strong><small>${escapeText(entry.time)}</small></p>`).join('') || '<p class="capture-hint">Add your first class, study block, or exam.</p>'; };
document.querySelector('#addScheduleEntry')?.addEventListener('click', () => { const day = prompt('Day:'); const time = prompt('Time:'); const title = prompt('Class, study block, or exam:'); if (!day?.trim() || !time?.trim() || !title?.trim()) return; scheduleEntries.push({ day: day.trim(), time: time.trim(), title: title.trim() }); localStorage.setItem('scheduleEntries', JSON.stringify(scheduleEntries)); renderScheduleEntries(); });
renderScheduleEntries();

let studyTimerSeconds = Number(localStorage.getItem('studyTimerSeconds') || 25 * 60);
let studyTimerInterval;
const updateStudyTimer = () => { const display = document.querySelector('#studyTimerDisplay'); if (display) display.textContent = `${String(Math.floor(studyTimerSeconds / 60)).padStart(2, '0')}:${String(studyTimerSeconds % 60).padStart(2, '0')}`; localStorage.setItem('studyTimerSeconds', studyTimerSeconds); };
updateStudyTimer();
document.querySelector('#startStudyTimer')?.addEventListener('click', () => { if (studyTimerInterval) return; studyTimerInterval = setInterval(() => { studyTimerSeconds -= 1; updateStudyTimer(); if (studyTimerSeconds <= 0) { clearInterval(studyTimerInterval); studyTimerInterval = undefined; alert('Focus session complete. Take a gentle break.'); } }, 1000); });
document.querySelector('#resetStudyTimer')?.addEventListener('click', () => { clearInterval(studyTimerInterval); studyTimerInterval = undefined; studyTimerSeconds = 25 * 60; updateStudyTimer(); });
document.querySelector('#addStudyLog')?.addEventListener('click', () => { const topic = prompt('What did you study?'); const duration = prompt('How long?'); if (!topic?.trim()) return; const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]'); sessions.unshift({ topic: topic.trim(), duration: duration?.trim() || 'Focused session', date: new Date().toISOString().slice(0, 10) }); localStorage.setItem('studySessions', JSON.stringify(sessions)); renderStudySessions(); });
const renderStudySessions = () => { const list = document.querySelector('#studySessionLog'); if (!list) return; const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]'); list.innerHTML = sessions.slice(0, 5).map((session) => `<p><strong>${escapeText(session.topic)}</strong><small>${escapeText(session.duration)}</small></p>`).join('') || '<p class="capture-hint">Your completed study sessions will appear here.</p>'; };
renderStudySessions();

document.querySelector('#addExamPrep')?.addEventListener('click', () => { const unit = prompt('Unit or exam name:'); const code = prompt('Unit code and lecturer:'); const progress = Number(prompt('Preparation progress, 0–100:')); if (!unit?.trim() || Number.isNaN(progress)) return; const safeProgress = Math.max(0, Math.min(100, progress)); const item = document.createElement('article'); item.innerHTML = `<div><strong>${escapeText(unit)}</strong><small>${escapeText(code || 'Unit details to add')}</small></div><div class="prep-bar"><i style="width:${safeProgress}%"></i></div><b>${safeProgress}%</b>`; document.querySelector('#examPrepList')?.append(item); const examPrepItems = JSON.parse(localStorage.getItem('examPrepItems') || '[]'); examPrepItems.push({ unit: unit.trim(), code: code?.trim() || 'Unit details to add', progress: safeProgress }); localStorage.setItem('examPrepItems', JSON.stringify(examPrepItems)); });

document.querySelector('#addBusinessKpi')?.addEventListener('click', () => { const business = prompt('Business:'); const metric = prompt('What are you measuring?'); const value = prompt('Current value:'); const note = prompt('Target or note:'); if (!business?.trim() || !metric?.trim() || !value?.trim()) return; const card = document.createElement('article'); card.innerHTML = `<p class="eyebrow">${escapeText(business)}</p><strong>${escapeText(value)}</strong><small>${escapeText(metric)}</small><span>${escapeText(note || 'Add a target')}</span>`; document.querySelector('#businessKpiList')?.append(card); const businessKpis = JSON.parse(localStorage.getItem('businessKpis') || '[]'); businessKpis.push({ business: business.trim(), metric: metric.trim(), value: value.trim(), note: note?.trim() || 'Add a target' }); localStorage.setItem('businessKpis', JSON.stringify(businessKpis)); });

document.querySelectorAll('[data-people-filter]').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('[data-people-filter]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); const filter = button.dataset.peopleFilter; document.querySelectorAll('#peopleCheckinList > div').forEach((item) => { item.style.display = filter === 'all' || item.dataset.personGroup === filter ? 'flex' : 'none'; }); }));
document.querySelector('#addPeopleCheckin')?.addEventListener('click', () => { const group = prompt('Family, friends, or relationship?'); const title = prompt('What should you remember or do?'); const detail = prompt('When or why?'); if (!group?.trim() || !title?.trim()) return; const row = document.createElement('div'); row.dataset.personGroup = group.trim().toLowerCase(); row.innerHTML = `<strong>${escapeText(title)}</strong><small>${escapeText(detail || 'Check in soon')}</small><span>${escapeText(group)}</span>`; document.querySelector('#peopleCheckinList')?.append(row); const checkins = JSON.parse(localStorage.getItem('peopleCheckins') || '[]'); checkins.push({ group: group.trim().toLowerCase(), title: title.trim(), detail: detail?.trim() || 'Check in soon' }); localStorage.setItem('peopleCheckins', JSON.stringify(checkins)); });
const peopleReminder = document.querySelector('#peopleReminderInput'); if (peopleReminder) peopleReminder.value = localStorage.getItem('peopleReminder') || '';
document.querySelector('#savePeopleReminder')?.addEventListener('click', () => { localStorage.setItem('peopleReminder', peopleReminder.value); document.querySelector('#connectionReminder').textContent = peopleReminder.value || 'Who needs a little love from you?'; });
if (localStorage.getItem('peopleReminder')) document.querySelector('#connectionReminder').textContent = localStorage.getItem('peopleReminder');

document.querySelector('#addPipelinePost')?.addEventListener('click', () => { const title = prompt('Post or content title:'); const platform = prompt('Platform:'); const status = prompt('Status: planned, creating, scheduled, or published?', 'planned'); if (!title?.trim()) return; const columnIndex = { planned: 0, creating: 1, scheduled: 2, published: 3 }[status?.trim().toLowerCase()] ?? 0; const post = { id: `pipeline-${Date.now()}`, title: title.trim(), platform: platform?.trim() || 'Platform to add', status: columnIndex, views: '', likes: '', comments: '' }; if (typeof appendPipelinePost === 'function') appendPipelinePost(post, true); });

const clearData = (keys, label) => { if (!confirm(`Clear ${label}? This cannot be undone unless you have an exported backup.`)) return; keys.forEach((key) => localStorage.removeItem(key)); document.querySelector('#dataManagementStatus').textContent = `${label} cleared.`; setTimeout(() => window.location.reload(), 700); };
document.querySelector('#clearJournalData')?.addEventListener('click', () => clearData(['quickNote', 'journalEntries', 'archiveEntries', 'gratitudeHistory'], 'journal data'));
document.querySelector('#clearTrackingData')?.addEventListener('click', () => clearData(['dailyMood', 'habitStreak', 'habitLastComplete', 'customHabits', 'customHabitHistory', 'routineHistory', 'routines', 'mealLogs', 'nutritionNote', 'nutritionHistory', 'studySessions', 'studyTimerSeconds', 'studyTimerHistory', 'weeklyExpenses', 'categoryExpenses', 'expenseLedger', 'incomeEntries', 'prayerHistory', 'moodHistory', 'mentalHealthHistory', 'workoutHistory', 'rhythmHistory', 'unitProgress', 'contentAccounts', 'accountAnalyticsHistory', 'selectedCreatorAccount', 'contentIdeas', 'customUnits', 'schoolStudyItems', 'schoolResearchItems', 'schoolProjectDetails', 'projectMilestones', 'classEntries', 'examEntries', 'personalBusinesses', 'businessStatuses', 'workGoals', 'workDeadlines', 'workLogEntries', 'peopleDirectory', 'peopleCheckins', 'peopleContactHistory', 'peopleNoteHistory', 'relationshipFeelHistory', 'relationshipDates', 'examPrepItems', 'examNextActions', 'businessKpis', 'careerTasks', 'analyticsHistory', 'recurringExpenses', 'recurringEvents', 'savingsContributions', 'monthlyBudget'], 'tracking and added items'));
document.querySelector('#clearAllData')?.addEventListener('click', () => { if (!confirm('Clear every locally saved dashboard item? Export a backup first if you may want it later.')) return; localStorage.clear(); window.location.reload(); });

const defaultAccountInsights = { Instagram: { followers: '2.4k', growth: '+8.2% this month', reach: '4,820', engagement: '7.4%', posts: '12', best: 'A realistic student morning', meta: 'Reel · 4,280 views · 312 likes' }, TikTok: { followers: '1.8k', growth: '+14.1% this month', reach: '6,100', engagement: '8.6%', posts: '9', best: 'Study with me setup', meta: 'Video · 8,920 views · 540 likes' }, YouTube: { followers: '824', growth: '+5.3% this month', reach: '1,900', engagement: '5.1%', posts: '3', best: 'July reset routine', meta: 'Short · 2,100 views · 98 likes' }, Other: { followers: '0', growth: 'Add your growth', reach: '0', engagement: '0%', posts: '0', best: 'Add your best content', meta: 'No performance logged yet' } };
const creatorAccountData = { ...defaultAccountInsights, ...JSON.parse(localStorage.getItem('creatorAccountInsights') || '{}') };
let selectedCreatorAccount = 'Instagram';
const renderAccountInsights = () => { const data = creatorAccountData[selectedCreatorAccount] || defaultAccountInsights.Other; document.querySelector('#accountFollowers').textContent = data.followers; document.querySelector('#accountGrowth').textContent = `↗ ${data.growth}`; document.querySelector('#accountReach').textContent = data.reach; document.querySelector('#accountEngagement').textContent = data.engagement; document.querySelector('#accountPosts').textContent = data.posts; document.querySelector('#accountBestContent').textContent = data.best; document.querySelector('#accountBestMeta').textContent = data.meta; };
document.querySelectorAll('[data-account]').forEach((button) => button.addEventListener('click', () => { selectedCreatorAccount = button.dataset.account; document.querySelectorAll('[data-account]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderAccountInsights(); }));
document.querySelector('#updateAccountInsights')?.addEventListener('click', () => { const data = creatorAccountData[selectedCreatorAccount] || {}; const followers = prompt('Followers/subscribers:', data.followers || '0'); const reach = prompt('Reach:', data.reach || '0'); const engagement = prompt('Engagement rate:', data.engagement || '0%'); const posts = prompt('Posts this month:', data.posts || '0'); if (!followers || !reach || !engagement || !posts) return; creatorAccountData[selectedCreatorAccount] = { ...data, followers, reach, engagement, posts, growth: data.growth || 'Updated manually' }; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); const history = JSON.parse(localStorage.getItem('accountAnalyticsHistory') || '[]'); history.push({ account: selectedCreatorAccount, date: new Date().toISOString().slice(0, 10), followers, reach, engagement, posts }); localStorage.setItem('accountAnalyticsHistory', JSON.stringify(history.slice(-40))); renderAccountInsights(); });
document.querySelector('#addAccountPost')?.addEventListener('click', () => { const best = prompt('Best content title:'); const meta = prompt('Platform format, views, and likes:'); if (!best?.trim()) return; creatorAccountData[selectedCreatorAccount] = { ...creatorAccountData[selectedCreatorAccount], best: best.trim(), meta: meta?.trim() || 'Performance details to add' }; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); renderAccountInsights(); });
renderAccountInsights();

const savedPipelinePosts = JSON.parse(localStorage.getItem('pipelinePosts') || '[]');
const pipelineColumns = [...document.querySelectorAll('.pipeline-grid > article')];
const appendPipelinePost = (post, persist = false) => { const column = pipelineColumns[post.status] || pipelineColumns[0]; if (!column) return; const card = document.createElement('div'); card.className = 'pipeline-post'; card.dataset.pipelineId = post.id; const metric = post.views ? `<span class="content-metric-badge">${escapeText(post.views)} views · ${escapeText(post.likes || '0')} likes</span>` : ''; card.innerHTML = `<strong>${escapeText(post.title)}</strong><small>${escapeText(post.platform || 'Platform to add')}</small>${metric}<span class="post-edit-hint">Click to add metrics · double-click to edit</span>`; column.append(card); if (persist) { savedPipelinePosts.push(post); localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); } };
savedPipelinePosts.forEach((post) => appendPipelinePost(post));
document.querySelector('#contentPipeline')?.addEventListener('dblclick', (event) => { const card = event.target.closest('.pipeline-post'); if (!card) return; const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); if (!post) return; const title = prompt('Edit post title:', post.title); const status = prompt('Move to: planned, creating, scheduled, or published:', ['planned', 'creating', 'scheduled', 'published'][post.status]); if (!title?.trim()) return; post.title = title.trim(); const newStatus = { planned: 0, creating: 1, scheduled: 2, published: 3 }[status?.trim().toLowerCase()] ?? post.status; post.status = newStatus; if (newStatus === 3 && !post.publishedAt) post.publishedAt = new Date().toISOString().slice(0, 10); localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); card.remove(); appendPipelinePost(post); });

document.querySelector('#visionBoardGrid')?.addEventListener('dblclick', (event) => { const card = event.target.closest('.vision-card:not(.add-card)'); if (!card) return; const index = [...document.querySelectorAll('#visionBoardGrid .vision-card:not(.add-card)')].indexOf(card); if (index < 0 || !visionItems[index]) return; const title = prompt('Edit vision title:', visionItems[index].title); const text = prompt('Edit affirmation or detail:', visionItems[index].text || ''); const position = Number(prompt(`Move to position 1-${visionItems.length}:`, index + 1)); if (title?.trim()) visionItems[index].title = title.trim(); if (text !== null) visionItems[index].text = text.trim(); if (position >= 1 && position <= visionItems.length && position !== index + 1) { const [moved] = visionItems.splice(index, 1); visionItems.splice(position - 1, 0, moved); } saveVision(); renderVision(); });

const savedResources = JSON.parse(localStorage.getItem('pharmacyResources') || '[]');
const appendResource = (resource, persist = false) => { const item = document.createElement('article'); item.innerHTML = `<span class="resource-type">${escapeText(resource.type)}</span><div><strong>${escapeText(resource.title)}</strong><small>${escapeText(resource.note || 'Reference')}</small></div><button>${resource.link ? 'Open →' : 'Review →'}</button>`; document.querySelector('#resourceList')?.append(item); if (persist) { savedResources.push(resource); localStorage.setItem('pharmacyResources', JSON.stringify(savedResources)); } };
savedResources.forEach((resource) => appendResource(resource));
document.querySelector('#addResource')?.addEventListener('click', () => { const title = prompt('Resource title:'); const type = prompt('PDF, link, note, or book:'); const note = prompt('Course or note:'); const link = prompt('Optional link:'); if (!title?.trim()) return; appendResource({ title: title.trim(), type: type?.trim() || 'NOTE', note: note?.trim() || 'Pharmacy reference', link: link?.trim() || '' }, true); });

const careerNoteField = document.querySelector('#careerNote'); if (careerNoteField) careerNoteField.value = localStorage.getItem('careerNote') || '';
document.querySelector('#saveCareerNote')?.addEventListener('click', () => { localStorage.setItem('careerNote', careerNoteField.value); document.querySelector('#saveCareerNote').textContent = 'Saved reflection ✓'; });
document.querySelectorAll('#careerTaskList input').forEach((input, index) => { const key = `career-task-${index}`; input.checked = localStorage.getItem(key) === 'true'; input.addEventListener('change', () => localStorage.setItem(key, input.checked)); });
document.querySelector('#addCareerTask')?.addEventListener('click', () => { const task = prompt('What career or attachment task should you add?'); if (!task?.trim()) return; const label = document.createElement('label'); label.innerHTML = `<input type="checkbox"> ${escapeText(task)}`; document.querySelector('#careerTaskList')?.append(label); const careerTasks = JSON.parse(localStorage.getItem('careerTasks') || '[]'); careerTasks.push({ title: task.trim(), done: false }); localStorage.setItem('careerTasks', JSON.stringify(careerTasks)); });

let savingsGoals = JSON.parse(localStorage.getItem('savingsGoals') || '[]');
const renderSavings = () => { const list = document.querySelector('#savingsList'); if (!list) return; list.innerHTML = savingsGoals.map((goal) => `<article><div><p class="eyebrow">${escapeText(goal.name)}</p><strong>KSh ${Number(goal.saved).toLocaleString()} <small>/ KSh ${Number(goal.target).toLocaleString()}</small></strong><div class="savings-bar"><i style="width:${Math.min(100, Number(goal.saved) / Number(goal.target) * 100)}%"></i></div><span>${escapeText(goal.note || 'Keep going')}</span></div></article>`).join('') || '<p class="capture-hint">Add a savings goal to give your money direction.</p>'; };
document.querySelector('#addSavingsGoal')?.addEventListener('click', () => { const name = prompt('Savings goal name:'); const target = Number(prompt('Target amount in KSh:')); const saved = Number(prompt('Amount already saved:', '0')); const note = prompt('Target date or note:'); if (!name?.trim() || !target || Number.isNaN(target)) return; savingsGoals.push({ name: name.trim(), target, saved: Number.isNaN(saved) ? 0 : saved, note: note?.trim() || '' }); localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals)); renderSavings(); });
renderSavings();

const journalTagSelect = document.createElement('select'); journalTagSelect.id = 'journalTagFilter'; journalTagSelect.innerHTML = '<option value="">All tags</option><option value="school">School</option><option value="work">Work</option><option value="personal">Personal</option><option value="gratitude">Gratitude</option>'; document.querySelector('.archive-actions')?.prepend(journalTagSelect);
journalTagSelect.addEventListener('change', () => { const tag = journalTagSelect.value; if (tag) { const search = document.querySelector('#journalSearch'); search.value = tag; search.dispatchEvent(new Event('input')); } else { document.querySelector('#journalSearch').value = ''; renderArchiveEntries(); } });

const savedDueItems = JSON.parse(localStorage.getItem('dueItems') || '[]');
const addDueRow = (item, persist = false) => { const row = document.createElement('div'); row.innerHTML = `<span class="due-date urgent-due">${escapeText(item.date)}</span><section><strong>${escapeText(item.title)}</strong><small>${escapeText(item.meta || 'Reminder')}</small></section><b>${escapeText(item.when || 'Soon')}</b>`; document.querySelector('#dueList')?.append(row); if (persist) { savedDueItems.push(item); localStorage.setItem('dueItems', JSON.stringify(savedDueItems)); } };
savedDueItems.forEach((item) => addDueRow(item));
document.querySelector('#addDueItem')?.addEventListener('click', () => { const date = prompt('Date:'); const title = prompt('What is due?'); const meta = prompt('Category or detail:'); const when = prompt('How soon?'); if (!date?.trim() || !title?.trim()) return; addDueRow({ date: date.trim(), title: title.trim(), meta: meta?.trim() || 'Reminder', when: when?.trim() || 'Soon' }, true); });

const mealPattern = document.querySelector('#mealPatternText'); if (mealPattern && localStorage.getItem('mealPattern')) mealPattern.textContent = localStorage.getItem('mealPattern');
document.querySelector('#addMealPattern')?.addEventListener('click', () => { const note = prompt('What pattern are you noticing?'); if (!note?.trim()) return; localStorage.setItem('mealPattern', note.trim()); if (mealPattern) mealPattern.textContent = note.trim(); });

const moodHistory = JSON.parse(localStorage.getItem('moodHistory') || '{}');
document.querySelectorAll('.mood-row button').forEach((button) => button.addEventListener('click', () => { moodHistory[new Date().toISOString().slice(0, 10)] = button.dataset.mood; localStorage.setItem('moodHistory', JSON.stringify(moodHistory)); const note = document.querySelector('#moodHistoryNote'); if (note) note.textContent = `Today is marked as ${button.dataset.mood}. Keep noticing with kindness.`; }));

document.addEventListener('keydown', (event) => { if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); document.querySelector('#dashboardSearchInput')?.focus(); } if (event.altKey && event.key.toLowerCase() === 'q') { event.preventDefault(); document.querySelector('#captureTitle')?.focus(); document.querySelector('#quickCapture')?.scrollIntoView({ behavior: 'smooth' }); } });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));

const quickNote = document.querySelector('#quickNote');
quickNote.value = localStorage.getItem('quickNote') || '';
document.querySelector('#saveNote').addEventListener('click', () => {
  localStorage.setItem('quickNote', quickNote.value);
  const button = document.querySelector('#saveNote');
  button.textContent = 'Saved ✓';
  setTimeout(() => { button.textContent = 'Save note ↗'; }, 1400);
});

document.querySelector('#entryForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const title = document.querySelector('#entryTitle').value.trim();
  const body = document.querySelector('#entryBody').value.trim();
  if (!title || !body) return;
  const entries = JSON.parse(localStorage.getItem('journalEntries') || '[]');
  entries.unshift({ title, body, date: new Date().toLocaleDateString() });
  localStorage.setItem('journalEntries', JSON.stringify(entries));
  event.target.reset(); closeModal();
  const saved = document.querySelector('#saveNote'); saved.textContent = 'Entry saved ✓';
  setTimeout(() => { saved.textContent = 'Save note ↗'; }, 1600);
});
// Second persistence pass: hydrate the areas that can be expanded from the dashboard.
window.addEventListener('load', () => {
  const readList = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const appendHtml = (selector, html) => document.querySelector(selector)?.insertAdjacentHTML('beforeend', html);
  const customUnits = readList('customUnits');
  customUnits.forEach((unit) => appendHtml('#unitList', `<div class="saved-custom-row"><span>${escapeText(unit.code)}</span><strong>${escapeText(unit.name)}</strong><small>${escapeText(unit.lecturer)} · ${escapeText(unit.year)}</small></div>`));
  readList('schoolStudyItems').forEach((item) => appendHtml('#studyList', `<div class="saved-custom-row"><span>${escapeText(item.icon || '◒')}</span><strong>${escapeText(item.value)}</strong><small>${escapeText(item.meta)}</small></div>`));
  readList('schoolResearchItems').forEach((item) => appendHtml('#researchList', `<p class="saved-custom-row"><span>NOTE</span> ${escapeText(item.value)} <small>${escapeText(item.meta)}</small></p>`));
  const savedProject = JSON.parse(localStorage.getItem('schoolProjectDetails') || 'null');
  if (savedProject) { const title = document.querySelector('#projectTitle'); const notes = document.querySelector('#projectNotes'); if (title) title.textContent = savedProject.title; if (notes) notes.textContent = savedProject.next; }
  const classEntries = readList('classEntries');
  if (classEntries.length) { let list = document.querySelector('.schedule-entry-list'); if (!list) { list = document.createElement('div'); list.className = 'schedule-entry-list'; document.querySelector('.timetable-card')?.append(list); } classEntries.forEach((entry) => { list.insertAdjacentHTML('beforeend', `<p><span>${escapeText(entry.day)}</span><strong>${escapeText(entry.subject)}</strong><small>${escapeText(entry.time)}</small></p>`); }); }
  readList('personalBusinesses').forEach((business) => appendHtml('#businessList', `<div class="saved-custom-row"><span class="business-badge coral-badge">${escapeText(business.name.slice(0, 2).toUpperCase())}</span><section><strong>${escapeText(business.name)}</strong><small>${escapeText(business.type)} · ${escapeText(business.duration)}</small></section><b>New</b></div>`));
  readList('workGoals').forEach((goal, index) => appendHtml('#workGoalList', `<label class="saved-work-goal"><input type="checkbox" data-saved-work-goal="${index}" ${goal.done ? 'checked' : ''}> ${escapeText(goal.title)}</label>`));
  document.querySelector('#workGoalList')?.addEventListener('change', (event) => { const input = event.target.closest('[data-saved-work-goal]'); if (!input) return; const goals = readList('workGoals'); goals[Number(input.dataset.savedWorkGoal)].done = input.checked; localStorage.setItem('workGoals', JSON.stringify(goals)); });
  readList('peopleDirectory').forEach((person) => appendHtml('#peopleList', `<div class="saved-custom-row"><span class="person-avatar peach">${escapeText(person.name.charAt(0).toUpperCase())}</span><section><strong>${escapeText(person.name)}</strong><small>${escapeText(person.group)} · ${escapeText(person.note)}${person.birthday ? ` · ${escapeText(person.birthday)}` : ''}</small></section><button>Check in →</button></div>`));
  readList('peopleCheckins').forEach((item) => appendHtml('#peopleCheckinList', `<div data-person-group="${escapeText(item.group)}"><strong>${escapeText(item.title)}</strong><small>${escapeText(item.detail)}</small><span>${escapeText(item.group)}</span></div>`));
  readList('examPrepItems').forEach((item) => appendHtml('#examPrepList', `<article><div><strong>${escapeText(item.unit)}</strong><small>${escapeText(item.code)}</small></div><div class="prep-bar"><i style="width:${item.progress}%"></i></div><b>${item.progress}%</b></article>`));
  readList('businessKpis').forEach((item) => appendHtml('#businessKpiList', `<article><p class="eyebrow">${escapeText(item.business)}</p><strong>${escapeText(item.value)}</strong><small>${escapeText(item.metric)}</small><span>${escapeText(item.note)}</span></article>`));
  readList('careerTasks').forEach((task, index) => appendHtml('#careerTaskList', `<label><input type="checkbox" data-saved-career-task="${index}" ${task.done ? 'checked' : ''}> ${escapeText(task.title)}</label>`));
  document.querySelector('#careerTaskList')?.addEventListener('change', (event) => { const input = event.target.closest('[data-saved-career-task]'); if (!input) return; const tasks = readList('careerTasks'); tasks[Number(input.dataset.savedCareerTask)].done = input.checked; localStorage.setItem('careerTasks', JSON.stringify(tasks)); });

  const examActions = document.querySelector('#examPrep .section-title');
  if (examActions && !document.querySelector('#addExamDateRefinement')) { const examDateButton = document.createElement('button'); examDateButton.id = 'addExamDateRefinement'; examDateButton.className = 'small-link'; examDateButton.type = 'button'; examDateButton.textContent = '＋ Add exam date'; examActions.append(examDateButton); examDateButton.addEventListener('click', () => { const title = prompt('Exam or unit name:'); const date = prompt('Exam date (YYYY-MM-DD):'); if (!title?.trim() || !date?.match(/^\d{4}-\d{2}-\d{2}$/)) return; calendarEvents.push({ date, title: `Exam · ${title.trim()}`, meta: 'School · Exam', color: 'coral-event' }); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); }); }

  const settingsCard = document.querySelector('.settings-card');
  if (settingsCard && !document.querySelector('#customizationPanel')) { const panel = document.createElement('div'); panel.id = 'customizationPanel'; panel.className = 'customization-panel'; panel.innerHTML = '<p class="eyebrow">Personalize your layout</p><strong>Show the spaces you use most.</strong><div class="customization-options"></div>'; const options = [['home', 'Today'], ['trackers', 'Trackers'], ['schoolHub', 'School center'], ['workHub', 'Work'], ['people', 'People'], ['calendar', 'Calendar'], ['goalsHub', 'Goals'], ['visionBoard', 'Vision board'], ['contentPipeline', 'Content pipeline'], ['monthlySummary', 'Monthly summary']]; const hiddenSections = new Set(readList('hiddenSections')); options.forEach(([id, label]) => { const item = document.createElement('label'); const input = document.createElement('input'); input.type = 'checkbox'; input.checked = !hiddenSections.has(id); input.dataset.customSection = id; item.append(input, document.createTextNode(label)); panel.querySelector('.customization-options').append(item); const section = document.querySelector(`#${id}`); if (section) section.hidden = hiddenSections.has(id); }); settingsCard.querySelector('.backup-tools')?.before(panel); panel.addEventListener('change', (event) => { const input = event.target.closest('[data-custom-section]'); if (!input) return; const section = document.querySelector(`#${input.dataset.customSection}`); if (section) section.hidden = !input.checked; const current = [...panel.querySelectorAll('[data-custom-section]:not(:checked)')].map((checkbox) => checkbox.dataset.customSection); localStorage.setItem('hiddenSections', JSON.stringify(current)); }); }
});
// Next ten-task pass: management controls, progress summaries, analytics history, and mobile access.
window.addEventListener('load', () => {
  const readPersisted = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const addPersistedControls = (selector, storageKey) => {
    const rows = [...document.querySelectorAll(`${selector} .saved-custom-row`)];
    rows.forEach((row, index) => { if (row.querySelector('.edit-controls')) return; row.classList.add('editable-item'); row.dataset.persistedStore = storageKey; row.dataset.persistedIndex = index; const controls = document.createElement('span'); controls.className = 'edit-controls'; controls.innerHTML = `<button class="edit-persisted" aria-label="Edit saved item">✎</button><button class="delete-persisted" aria-label="Delete saved item">×</button>`; row.append(controls); });
  };
  [['#unitList', 'customUnits'], ['#studyList', 'schoolStudyItems'], ['#researchList', 'schoolResearchItems'], ['#businessList', 'personalBusinesses'], ['#peopleList', 'peopleDirectory'], ['#examPrepList', 'examPrepItems'], ['#businessKpiList', 'businessKpis']].forEach(([selector, key]) => addPersistedControls(selector, key));
  const checkinItems = readPersisted('peopleCheckins');
  const checkinRows = checkinItems.length ? [...document.querySelectorAll('#peopleCheckinList > div')].slice(-checkinItems.length) : [];
  checkinRows.forEach((row, index) => { row.classList.add('saved-custom-row', 'editable-item'); row.dataset.persistedStore = 'peopleCheckins'; row.dataset.persistedIndex = index; const controls = document.createElement('span'); controls.className = 'edit-controls'; controls.innerHTML = `<button class="edit-persisted" aria-label="Edit saved check-in">✎</button><button class="delete-persisted" aria-label="Delete saved check-in">×</button>`; row.append(controls); });
  document.addEventListener('click', (event) => {
    const action = event.target.closest('.edit-persisted, .delete-persisted'); if (!action) return; const row = action.closest('[data-persisted-store]'); if (!row) return; const key = row.dataset.persistedStore; const items = readPersisted(key); const index = Number(row.dataset.persistedIndex); if (!items[index]) return;
    if (action.classList.contains('delete-persisted')) { if (!confirm('Delete this saved item?')) return; items.splice(index, 1); localStorage.setItem(key, JSON.stringify(items)); window.location.reload(); return; }
    const item = items[index]; const prompts = { customUnits: [['code', 'Unit code', item.code], ['name', 'Unit name', item.name], ['lecturer', 'Lecturer', item.lecturer], ['year', 'Year or semester', item.year]], schoolStudyItems: [['value', 'Study item', item.value], ['meta', 'Detail or timing', item.meta]], schoolResearchItems: [['value', 'Research item', item.value], ['meta', 'Reference detail', item.meta]], personalBusinesses: [['name', 'Business name', item.name], ['type', 'Business type', item.type], ['duration', 'Duration', item.duration]], peopleDirectory: [['name', 'Name', item.name], ['group', 'Family, friends, or relationship', item.group], ['note', 'Connection note', item.note], ['birthday', 'Birthday or important date', item.birthday]], peopleCheckins: [['group', 'Group', item.group], ['title', 'Reminder or action', item.title], ['detail', 'When or why', item.detail]], examPrepItems: [['unit', 'Unit or exam', item.unit], ['code', 'Unit code and lecturer', item.code], ['progress', 'Preparation progress 0–100', item.progress]], businessKpis: [['business', 'Business', item.business], ['metric', 'Metric', item.metric], ['value', 'Current value', item.value], ['note', 'Target or note', item.note]] }[key] || [];
    prompts.forEach(([field, label, current]) => { const value = prompt(`${label}:`, current); if (value !== null && value.trim() !== '') item[field] = field === 'progress' ? Math.max(0, Math.min(100, Number(value) || 0)) : value.trim(); }); localStorage.setItem(key, JSON.stringify(items)); window.location.reload();
  });

  const scheduleList = document.querySelector('#scheduleEntries');
  const enhanceScheduleRows = () => { if (!scheduleList) return; [...scheduleList.querySelectorAll('p')].forEach((row, index) => { if (row.dataset.scheduleEnhanced || !scheduleEntries[index]) return; row.dataset.scheduleEnhanced = 'true'; row.classList.add('editable-item'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(scheduleEntries[index].done); checkbox.title = 'Mark complete'; checkbox.addEventListener('change', () => { scheduleEntries[index].done = checkbox.checked; localStorage.setItem('scheduleEntries', JSON.stringify(scheduleEntries)); }); row.prepend(checkbox); }); };
  enhanceScheduleRows(); if (scheduleList) new MutationObserver(enhanceScheduleRows).observe(scheduleList, { childList: true });

  const examSection = document.querySelector('#examPrep');
  const examSummary = document.createElement('div'); examSummary.className = 'summary-strip'; examSection?.querySelector('.section-title')?.after(examSummary);
  const renderExamSummary = () => { if (!examSummary) return; const prep = readPersisted('examPrepItems'); const average = prep.length ? Math.round(prep.reduce((sum, item) => sum + Number(item.progress || 0), 0) / prep.length) : 0; const futureExams = calendarEvents.filter((event) => String(event.meta || '').toLowerCase().includes('exam') && event.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)); const nearest = futureExams[0]; const days = nearest ? Math.max(0, Math.ceil((new Date(`${nearest.date}T00:00:00`) - new Date()) / 86400000)) : null; examSummary.innerHTML = `<span class="summary-chip"><strong>${average}%</strong> average prep</span><span class="summary-chip"><strong>${prep.length}</strong> saved prep plans</span><span class="summary-chip"><strong>${nearest ? `${days}d` : '—'}</strong> to next exam</span>`; };
  renderExamSummary();

  const workGoalBox = document.querySelector('#workGoalList'); const workGoalSummary = document.createElement('div'); workGoalSummary.className = 'summary-strip'; workGoalBox?.after(workGoalSummary);
  const renderWorkGoalSummary = () => { if (!workGoalSummary || !workGoalBox) return; const inputs = [...workGoalBox.querySelectorAll('input[type="checkbox"]')]; const done = inputs.filter((input) => input.checked).length; workGoalSummary.innerHTML = `<span class="summary-chip"><strong>${inputs.length ? Math.round(done / inputs.length * 100) : 0}%</strong> work goals complete</span>`; }; renderWorkGoalSummary(); workGoalBox?.addEventListener('change', renderWorkGoalSummary);

  const budgetCard = document.querySelector('#financeBreakdown .budget-detail-card');
  if (budgetCard && !document.querySelector('#monthlyBudgetEditor')) { const editor = document.createElement('div'); editor.id = 'monthlyBudgetEditor'; editor.className = 'inline-actions'; editor.innerHTML = `<label class="refinement-label" for="monthlyBudgetInput">Monthly budget</label><input class="budget-input" id="monthlyBudgetInput" type="number" min="0" step="100" value="${Number(localStorage.getItem('monthlyBudget') || 25000)}"><button class="refinement-button" id="saveMonthlyBudget">Save</button>`; budgetCard.append(editor); document.querySelector('#saveMonthlyBudget').addEventListener('click', () => { const amount = Number(document.querySelector('#monthlyBudgetInput').value); if (!Number.isNaN(amount) && amount >= 0) { localStorage.setItem('monthlyBudget', amount); renderCategoryExpenses(); } }); }

  const analyticsSection = document.querySelector('#analytics'); const analyticsHistoryCard = document.createElement('article'); analyticsHistoryCard.className = 'analytics-history-card'; analyticsSection?.querySelector('.section-title')?.after(analyticsHistoryCard);
  const renderAnalyticsHistory = () => { if (!analyticsHistoryCard) return; const history = JSON.parse(localStorage.getItem('analyticsHistory') || '[]'); const values = history.map((item) => Number(String(item.views).replaceAll(',', '').replace(/[^0-9.]/g, '')) || 0).slice(-8); const max = Math.max(...values, 1); analyticsHistoryCard.innerHTML = `<p class="eyebrow">Analytics snapshots</p><strong>${history.length ? `${history.length} saved updates` : 'No snapshots yet'}</strong>${values.length ? `<div class="trend-list">${values.map((value) => `<i style="height:${Math.max(8, value / max * 100)}%" title="${value.toLocaleString()} views"></i>`).join('')}</div>` : '<small>Use Update analytics to build a private trend.</small>'}`; }; renderAnalyticsHistory(); document.querySelector('#updateAnalytics')?.addEventListener('click', () => window.setTimeout(renderAnalyticsHistory, 100));

  if (!document.querySelector('#mobileQuickNav')) { const nav = document.createElement('nav'); nav.id = 'mobileQuickNav'; nav.className = 'quick-nav'; nav.innerHTML = '<button data-quick-target="home"><span>⌂</span>Today</button><button data-quick-target="trackers"><span>♡</span>Track</button><button data-quick-target="schoolHub"><span>▣</span>School</button><button data-quick-target="journal"><span>✎</span>Journal</button><button data-quick-target="goalsHub"><span>☆</span>Goals</button>'; document.body.append(nav); nav.addEventListener('click', (event) => { const button = event.target.closest('[data-quick-target]'); if (button) document.querySelector(`#${button.dataset.quickTarget}`)?.scrollIntoView({ behavior: 'smooth' }); }); }

  const dataCard = document.querySelector('#dataManagement .data-management-card');
  if (dataCard && !document.querySelector('#dataHealth')) { const health = document.createElement('div'); health.id = 'dataHealth'; health.className = 'summary-strip'; const refreshHealth = () => { const last = localStorage.getItem('lastBackupAt'); health.innerHTML = `<span class="summary-chip"><strong>${Object.keys(localStorage).length}</strong> saved items</span><span class="summary-chip"><strong>${last ? new Date(last).toLocaleDateString() : 'Not yet'}</strong> last backup</span>`; }; dataCard.append(health); refreshHealth(); document.querySelector('#exportData')?.addEventListener('click', () => window.setTimeout(() => { localStorage.setItem('lastBackupAt', new Date().toISOString()); refreshHealth(); }, 150)); }
});
// Batch of ten: deeper history, safer backups, detailed money, and richer search.
window.addEventListener('load', () => {
  const readBatch = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const savingsList = document.querySelector('#savingsList');
  if (savingsList) [...savingsList.querySelectorAll('article')].forEach((row, index) => { if (!savingsGoals[index] || row.querySelector('.edit-savings')) return; row.classList.add('editable-item'); const controls = document.createElement('span'); controls.className = 'edit-controls'; controls.innerHTML = '<button class="edit-savings" aria-label="Edit savings goal">✎</button><button class="delete-savings" aria-label="Delete savings goal">×</button>'; row.append(controls); });
  savingsList?.addEventListener('click', (event) => { const edit = event.target.closest('.edit-savings'); const remove = event.target.closest('.delete-savings'); if (!edit && !remove) return; const row = event.target.closest('article'); const index = [...savingsList.querySelectorAll('article')].indexOf(row); if (!savingsGoals[index]) return; if (remove) { if (!confirm('Delete this savings goal?')) return; savingsGoals.splice(index, 1); localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals)); renderSavings(); window.location.reload(); return; } const goal = savingsGoals[index]; const name = prompt('Goal name:', goal.name); const target = Number(prompt('Target amount:', goal.target)); const saved = Number(prompt('Amount saved:', goal.saved)); const note = prompt('Target date or note:', goal.note || ''); if (!name?.trim() || Number.isNaN(target) || target <= 0) return; savingsGoals[index] = { name: name.trim(), target, saved: Number.isNaN(saved) ? goal.saved : saved, note: note?.trim() || '' }; localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals)); renderSavings(); window.location.reload(); });

  const financeBreakdownBatch = document.querySelector('#financeBreakdown'); const ledger = readBatch('expenseLedger'); const ledgerCard = document.createElement('article'); ledgerCard.className = 'ledger-card'; financeBreakdownBatch?.append(ledgerCard);
  const renderLedger = () => { if (!ledgerCard) return; ledgerCard.innerHTML = `<p class="eyebrow">Expense ledger</p><strong>Recent spending details</strong>${ledger.length ? ledger.slice(0, 8).map((item, index) => `<div class="ledger-row"><span>${escapeText(item.category)}</span><section><strong>KSh ${Number(item.amount).toLocaleString()}</strong><small>${escapeText(item.note || 'No note')}</small></section><time>${escapeText(item.date)}</time><button data-ledger-edit="${index}" aria-label="Edit expense">✎</button><button data-ledger-delete="${index}" aria-label="Delete expense">×</button></div>`).join('') : '<small>Add a categorized expense to start your ledger.</small>'}`; }; renderLedger(); document.querySelector('#addCategorizedExpense')?.addEventListener('click', () => window.setTimeout(() => { const freshLedger = readBatch('expenseLedger'); ledger.splice(0, ledger.length, ...freshLedger); renderLedger(); }, 100));
  ledgerCard.addEventListener('click', (event) => { const edit = event.target.closest('[data-ledger-edit]'); const remove = event.target.closest('[data-ledger-delete]'); if (!edit && !remove) return; const index = Number((edit || remove).dataset.ledgerEdit ?? (edit || remove).dataset.ledgerDelete); const item = ledger[index]; if (!item) return; if (remove) { if (!confirm('Delete this expense from the ledger?')) return; categoryExpenses[item.category] = Math.max(0, Number(categoryExpenses[item.category]) - Number(item.amount)); ledger.splice(index, 1); } else { const category = prompt('Category: food, transport, school, or personal?', item.category)?.trim().toLowerCase(); const amount = Number(prompt('Amount in KSh:', item.amount)); const note = prompt('What was it for?', item.note || ''); if (!category || !(category in categoryExpenses) || Number.isNaN(amount) || amount <= 0) return; categoryExpenses[item.category] = Math.max(0, Number(categoryExpenses[item.category]) - Number(item.amount)); categoryExpenses[category] += amount; Object.assign(item, { category, amount, note: note?.trim() || '' }); } localStorage.setItem('expenseLedger', JSON.stringify(ledger)); localStorage.setItem('categoryExpenses', JSON.stringify(categoryExpenses)); renderCategoryExpenses(); renderLedger(); });

  const backupToolsBatch = document.querySelector('.backup-tools');
  if (backupToolsBatch && !document.querySelector('#backupScope')) { const scope = document.createElement('div'); scope.id = 'backupScope'; scope.className = 'backup-scope'; scope.innerHTML = '<p class="eyebrow">Backup scope</p><label><input type="checkbox" data-backup-group="all"> All data</label><label><input type="checkbox" data-backup-group="journal"> Journal</label><label><input type="checkbox" data-backup-group="tracking"> Tracking</label><label><input type="checkbox" data-backup-group="school"> School</label><label><input type="checkbox" data-backup-group="work"> Work</label><label><input type="checkbox" data-backup-group="people"> People</label><label><input type="checkbox" data-backup-group="content"> Content</label>'; backupToolsBatch.append(scope); const savedScope = JSON.parse(localStorage.getItem('backupScope') || 'null'); scope.querySelectorAll('[data-backup-group]').forEach((input) => { input.checked = !savedScope ? input.dataset.backupGroup === 'all' : false; }); scope.addEventListener('change', (event) => { const input = event.target.closest('[data-backup-group]'); if (!input) return; const allKeys = Object.keys(localStorage); const groups = { journal: ['journal', 'archive', 'quickNote', 'gratitude', 'memory'], tracking: ['mood', 'habit', 'meal', 'expense', 'rhythm', 'study', 'weekly', 'mental', 'workout', 'unit', 'recurring'], school: ['unit', 'school', 'class', 'exam', 'schedule', 'research', 'career'], work: ['business', 'work', 'savings', 'pipeline'], people: ['people', 'important', 'relationship'], content: ['content', 'creator', 'vision', 'analytics', 'account'] }; if (input.dataset.backupGroup === 'all') { scope.querySelectorAll('[data-backup-group]').forEach((item) => { item.checked = item === input; }); localStorage.removeItem('backupScope'); return; } input.checked = input.checked; scope.querySelector('[data-backup-group="all"]').checked = false; const selected = [...scope.querySelectorAll('[data-backup-group]:checked')].map((item) => item.dataset.backupGroup); const keys = allKeys.filter((key) => selected.some((group) => groups[group].some((term) => key.toLowerCase().includes(term)))); localStorage.setItem('backupScope', JSON.stringify(keys)); }); }

  const moodBars = document.querySelector('#moodBars'); const moodScore = { overwhelmed: 20, low: 35, okay: 55, good: 75, glowing: 95 }; const renderMoodHistory = () => { if (!moodBars) return; const history = readBatch('moodHistory', {}); const days = [...Array(7)].map((_, offset) => { const date = new Date(); date.setDate(date.getDate() - (6 - offset)); return date.toISOString().slice(0, 10); }); moodBars.innerHTML = days.map((date) => `<div><i style="height:${moodScore[history[date]] || 10}%"></i><span>${new Date(`${date}T00:00:00`).toLocaleString('en-US', { weekday: 'short' }).toUpperCase()}</span></div>`).join(''); const note = document.querySelector('#moodHistoryNote'); if (note) note.textContent = `${Object.keys(history).length} mood check-ins saved. Notice patterns without judging them.`; }; renderMoodHistory(); document.querySelectorAll('.mood-row button').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderMoodHistory, 50)));

  const habitCard = document.querySelector('.tracker-card.habits'); if (habitCard && !document.querySelector('#habitHistorySummary')) { const summary = document.createElement('div'); summary.id = 'habitHistorySummary'; summary.className = 'history-mini-card'; const renderHabitHistory = () => { const values = [...Array(7)].map((_, offset) => { const date = new Date(); date.setDate(date.getDate() - (6 - offset)); const key = date.toISOString().slice(0, 10); return [...document.querySelectorAll('.check-list input')].filter((_, index) => localStorage.getItem(`habit-${key}-${index}`) === 'true').length; }); const max = Math.max(...values, 1); summary.innerHTML = `<p class="eyebrow">Last 7 days</p><strong>${values.reduce((sum, value) => sum + value, 0)} habit check-ins</strong><div class="history-bars">${values.map((value) => `<i style="height:${Math.max(8, value / max * 100)}%"></i>`).join('')}</div>`; }; habitCard.append(summary); renderHabitHistory(); document.querySelectorAll('.check-list input').forEach((input) => input.addEventListener('change', () => window.setTimeout(renderHabitHistory, 50))); }

  const prayerButton = document.querySelector('.wellbeing-item[data-action="Prayer"]'); const prayerCard = document.querySelector('.tracker-card.pink'); const prayerHistory = readBatch('prayerHistory'); if (prayerCard && prayerButton && !document.querySelector('#prayerHistoryCard')) { const card = document.createElement('div'); card.id = 'prayerHistoryCard'; card.className = 'history-mini-card'; prayerCard.append(card); const renderPrayerHistory = () => { const completed = prayerHistory.filter((item) => item.completed).length; card.innerHTML = `<p class="eyebrow">Prayer & reflection history</p><strong>${completed} saved check-ins</strong><small>${prayerHistory.slice(-3).map((item) => `${item.date}: ${item.completed ? 'complete' : 'skipped'}`).join(' · ') || 'Tap Prayer / reflection to begin.'}</small>`; }; renderPrayerHistory(); prayerButton.addEventListener('click', () => { const date = new Date().toISOString().slice(0, 10); const existing = prayerHistory.find((item) => item.date === date); if (existing) existing.completed = prayerButton.classList.contains('done'); else prayerHistory.push({ date, completed: prayerButton.classList.contains('done') }); localStorage.setItem('prayerHistory', JSON.stringify(prayerHistory)); renderPrayerHistory(); }); }

  const searchInput = document.querySelector('#dashboardSearchInput'); const searchResults = document.querySelector('#searchResults'); searchInput?.addEventListener('input', () => { window.setTimeout(() => { const query = searchInput.value.trim().toLowerCase(); if (!query || !searchResults) return; const indexed = [['customUnits', 'schoolHub'], ['schoolStudyItems', 'schoolHub'], ['schoolResearchItems', 'schoolHub'], ['personalBusinesses', 'workHub'], ['peopleDirectory', 'people'], ['peopleCheckins', 'peopleDetails'], ['examPrepItems', 'examPrep'], ['businessKpis', 'businessKpis'], ['savingsGoals', 'savingsGoals'], ['expenseLedger', 'financeBreakdown']]; const matches = []; indexed.forEach(([key, target]) => readBatch(key).forEach((item) => { const text = JSON.stringify(item).toLowerCase(); if (text.includes(query)) matches.push(`<button class="search-result" data-target="${target}">${escapeText(item.name || item.title || item.value || item.unit || item.business || item.category || key)}<small>Saved item · Open section →</small></button>`); })); if (matches.length) searchResults.innerHTML += matches.slice(0, 6).join(''); }, 30); });
});
// Next ten-task pass: calendars, routines, resources, exam prep, and relationship continuity.
window.addEventListener('load', () => {
  const readNext = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const upcomingList = document.querySelector('#upcomingEvents');
  if (upcomingList) { const upcoming = [...calendarEvents].filter((event) => calendarFilterState === 'all' || String(event.meta || '').toLowerCase().includes(calendarFilterState)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6); [...upcomingList.children].forEach((row, index) => { const item = upcoming[index]; if (!item || row.querySelector('.calendar-edit-controls')) return; const eventIndex = calendarEvents.indexOf(item); const controls = document.createElement('span'); controls.className = 'edit-controls calendar-edit-controls'; controls.innerHTML = '<button data-calendar-edit aria-label="Edit calendar event">✎</button><button data-calendar-delete aria-label="Delete calendar event">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-calendar-edit]'); const remove = event.target.closest('[data-calendar-delete]'); if (remove) { if (!confirm('Delete this calendar event?')) return; calendarEvents.splice(eventIndex, 1); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); window.location.reload(); return; } const current = calendarEvents[eventIndex]; const date = prompt('Date (YYYY-MM-DD):', current.date); const title = prompt('Event title:', current.title); const meta = prompt('Category or time:', current.meta || 'Personal event'); if (!date?.match(/^\d{4}-\d{2}-\d{2}$/) || !title?.trim()) return; Object.assign(current, { date, title: title.trim(), meta: meta?.trim() || 'Personal event' }); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); window.location.reload(); }); }); }

  const dueList = document.querySelector('#dueList'); if (dueList && savedDueItems.length) { const rows = [...dueList.children].slice(-savedDueItems.length); rows.forEach((row, index) => { if (row.querySelector('.due-edit-controls')) return; row.classList.add('editable-item'); const controls = document.createElement('span'); controls.className = 'edit-controls due-edit-controls'; controls.innerHTML = '<button data-due-edit aria-label="Edit reminder">✎</button><button data-due-delete aria-label="Delete reminder">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-due-edit]'); const remove = event.target.closest('[data-due-delete]'); if (remove) { if (!confirm('Delete this reminder?')) return; savedDueItems.splice(index, 1); localStorage.setItem('dueItems', JSON.stringify(savedDueItems)); window.location.reload(); return; } const item = savedDueItems[index]; const date = prompt('Date or label:', item.date); const title = prompt('What is due?', item.title); const meta = prompt('Category or detail:', item.meta); const when = prompt('How soon?', item.when); if (!date?.trim() || !title?.trim()) return; Object.assign(item, { date: date.trim(), title: title.trim(), meta: meta?.trim() || 'Reminder', when: when?.trim() || 'Soon' }); localStorage.setItem('dueItems', JSON.stringify(savedDueItems)); window.location.reload(); }); }); }

  const routineList = document.querySelector('#routineList'); const routineHistory = readNext('routineHistory'); const logRoutineHistory = () => { const date = new Date().toISOString().slice(0, 10); const completed = [...routineList?.querySelectorAll('input[type="checkbox"]') || []].filter((input) => input.checked).length; const existing = routineHistory.find((item) => item.date === date); if (existing) existing.completed = completed; else routineHistory.push({ date, completed }); localStorage.setItem('routineHistory', JSON.stringify(routineHistory.slice(-30))); }; routineList?.addEventListener('change', (event) => { if (event.target.type === 'checkbox') logRoutineHistory(); });

  const customHabitHistory = readNext('customHabitHistory'); const customHabitList = document.querySelector('#customHabitList'); const customHabitHistoryCard = document.createElement('div'); customHabitHistoryCard.className = 'history-mini-card'; document.querySelector('#customHabits .custom-habits-card')?.append(customHabitHistoryCard); const renderCustomHabitHistory = () => { if (!customHabitHistoryCard) return; const latest = customHabitHistory.slice(-7); customHabitHistoryCard.innerHTML = `<p class="eyebrow">Custom habit rhythm</p><strong>${latest.reduce((sum, item) => sum + item.completed, 0)} check-ins recorded</strong><small>${latest.map((item) => `${item.date}: ${item.completed}`).join(' · ') || 'Check off a custom habit to start your history.'}</small>`; }; renderCustomHabitHistory(); customHabitList?.addEventListener('change', () => { const date = new Date().toISOString().slice(0, 10); const completed = [...customHabitList.querySelectorAll('input[type="checkbox"]')].filter((input) => input.checked).length; const existing = customHabitHistory.find((item) => item.date === date); if (existing) existing.completed = completed; else customHabitHistory.push({ date, completed }); localStorage.setItem('customHabitHistory', JSON.stringify(customHabitHistory.slice(-30))); renderCustomHabitHistory(); });

  const ledgerBatch = readNext('expenseLedger'); const ledgerContainer = document.querySelector('.ledger-card'); if (ledgerContainer && !document.querySelector('#exportDetailedExpenses')) { const button = document.createElement('button'); button.id = 'exportDetailedExpenses'; button.className = 'refinement-button'; button.type = 'button'; button.textContent = '↓ Export detailed CSV'; ledgerContainer.querySelector('.eyebrow')?.after(button); button.addEventListener('click', () => { const rows = [['Date', 'Category', 'Amount (KSh)', 'Note'], ...ledgerBatch.map((item) => [item.date, item.category, item.amount, item.note || ''])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-expense-ledger-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); }); }

  const pipelinePostsBatch = readNext('pipelinePosts'); document.querySelectorAll('.pipeline-post').forEach((card) => { if (card.querySelector('.pipeline-remove')) return; const button = document.createElement('button'); button.className = 'pipeline-remove'; button.type = 'button'; button.textContent = '×'; button.title = 'Delete post'; card.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const index = pipelinePostsBatch.findIndex((post) => post.id === card.dataset.pipelineId); if (index < 0 || !confirm('Delete this content post?')) return; pipelinePostsBatch.splice(index, 1); localStorage.setItem('pipelinePosts', JSON.stringify(pipelinePostsBatch)); card.remove(); }); });

  const resourceRows = document.querySelectorAll('#resourceList article'); const customResources = readNext('pharmacyResources'); [...resourceRows].slice(-customResources.length).forEach((row, index) => { if (row.querySelector('.resource-edit-controls')) return; const controls = document.createElement('span'); controls.className = 'edit-controls resource-edit-controls'; controls.innerHTML = '<button data-resource-edit aria-label="Edit resource">✎</button><button data-resource-delete aria-label="Delete resource">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-resource-edit]'); const remove = event.target.closest('[data-resource-delete]'); if (remove) { if (!confirm('Delete this resource?')) return; customResources.splice(index, 1); localStorage.setItem('pharmacyResources', JSON.stringify(customResources)); window.location.reload(); return; } const resource = customResources[index]; const title = prompt('Resource title:', resource.title); const type = prompt('Type:', resource.type); const note = prompt('Course or note:', resource.note); const link = prompt('Link:', resource.link || ''); if (!title?.trim()) return; Object.assign(resource, { title: title.trim(), type: type?.trim() || 'NOTE', note: note?.trim() || 'Pharmacy reference', link: link?.trim() || '' }); localStorage.setItem('pharmacyResources', JSON.stringify(customResources)); window.location.reload(); }); });

  const examRows = document.querySelectorAll('#examPrepList article'); const examItems = readNext('examPrepItems'); [...examRows].slice(-examItems.length).forEach((row, index) => { if (row.querySelector('.exam-edit-controls')) return; const controls = document.createElement('span'); controls.className = 'edit-controls exam-edit-controls'; controls.innerHTML = '<button data-exam-edit aria-label="Edit exam prep">✎</button><button data-exam-delete aria-label="Delete exam prep">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-exam-edit]'); const remove = event.target.closest('[data-exam-delete]'); if (remove) { if (!confirm('Delete this exam preparation plan?')) return; examItems.splice(index, 1); localStorage.setItem('examPrepItems', JSON.stringify(examItems)); window.location.reload(); return; } const item = examItems[index]; const unit = prompt('Unit or exam:', item.unit); const code = prompt('Unit code and lecturer:', item.code); const progress = Number(prompt('Preparation progress 0–100:', item.progress)); if (!unit?.trim() || Number.isNaN(progress)) return; Object.assign(item, { unit: unit.trim(), code: code?.trim() || 'Unit details to add', progress: Math.max(0, Math.min(100, progress)) }); localStorage.setItem('examPrepItems', JSON.stringify(examItems)); window.location.reload(); }); });
});
// Next ten-task pass: current dates, account persistence, habit controls, meal history, and cache freshness.
window.addEventListener('load', () => {
  const readCurrentBatch = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const routineRows = document.querySelectorAll('#routineList article'); const routinesBatch = readCurrentBatch('routines'); [...routineRows].slice(-routinesBatch.length).forEach((row, index) => { if (row.querySelector('.routine-edit-controls')) return; const controls = document.createElement('span'); controls.className = 'edit-controls routine-edit-controls'; controls.innerHTML = '<button data-routine-edit aria-label="Edit routine">✎</button><button data-routine-delete aria-label="Delete routine">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-routine-edit]'); const remove = event.target.closest('[data-routine-delete]'); if (remove) { if (!confirm('Delete this recurring routine?')) return; routinesBatch.splice(index, 1); localStorage.setItem('routines', JSON.stringify(routinesBatch)); window.location.reload(); return; } const routine = routinesBatch[index]; const name = prompt('Routine name:', routine.name); const time = prompt('Time:', routine.time); const detail = prompt('What does it include?', routine.detail); if (!name?.trim()) return; Object.assign(routine, { name: name.trim(), time: time?.trim() || 'Anytime', detail: detail?.trim() || 'Your recurring routine' }); localStorage.setItem('routines', JSON.stringify(routinesBatch)); window.location.reload(); }); });

  const scheduleRowsBatch = document.querySelectorAll('#scheduleEntries p'); scheduleRowsBatch.forEach((row, index) => { if (!scheduleEntries[index] || row.querySelector('.schedule-edit-controls')) return; const controls = document.createElement('span'); controls.className = 'edit-controls schedule-edit-controls'; controls.innerHTML = '<button data-schedule-edit aria-label="Edit schedule entry">✎</button><button data-schedule-delete aria-label="Delete schedule entry">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-schedule-edit]'); const remove = event.target.closest('[data-schedule-delete]'); if (remove) { if (!confirm('Delete this schedule entry?')) return; scheduleEntries.splice(index, 1); localStorage.setItem('scheduleEntries', JSON.stringify(scheduleEntries)); window.location.reload(); return; } const entry = scheduleEntries[index]; const day = prompt('Day:', entry.day); const time = prompt('Time:', entry.time); const title = prompt('Class, study block, or exam:', entry.title); if (!day?.trim() || !time?.trim() || !title?.trim()) return; Object.assign(entry, { day: day.trim(), time: time.trim(), title: title.trim() }); localStorage.setItem('scheduleEntries', JSON.stringify(scheduleEntries)); window.location.reload(); }); });

  const accountListBatch = document.querySelector('#accountList'); const savedContentAccounts = readCurrentBatch('contentAccounts'); savedContentAccounts.forEach((account) => { const row = document.createElement('div'); row.className = 'account-row saved-account-row'; row.innerHTML = `<span class="platform-icon tiktok">✦</span><div><strong>${escapeText(account.platform)}</strong><small>${escapeText(account.username)}</small></div><b>${escapeText(account.followers)}</b><button class="account-remove" aria-label="Remove account">×</button>`; accountListBatch?.append(row); }); accountListBatch?.addEventListener('click', (event) => { const remove = event.target.closest('.account-remove'); if (!remove) return; const row = remove.closest('.saved-account-row'); const index = [...accountListBatch.querySelectorAll('.saved-account-row')].indexOf(row); const currentAccounts = readCurrentBatch('contentAccounts'); if (index < 0 || index >= currentAccounts.length || !confirm('Remove this content account?')) return; currentAccounts.splice(index, 1); localStorage.setItem('contentAccounts', JSON.stringify(currentAccounts)); row.remove(); });

  const mealHistoryCard = document.createElement('article'); mealHistoryCard.className = 'history-mini-card'; const mealHistoryHost = document.querySelector('#mealLog .meal-history-card'); mealHistoryHost?.append(mealHistoryCard); const renderMealHistoryBatch = () => { const datedMeals = mealLogs.filter((meal) => meal.date).slice(-7); mealHistoryCard.innerHTML = `<p class="eyebrow">Meal history</p><strong>${datedMeals.length} dated meal logs</strong><small>${datedMeals.map((meal) => `${meal.date} · ${meal.type}`).join(' · ') || 'New meal logs will appear here with dates.'}</small>`; }; renderMealHistoryBatch(); document.querySelector('#addMealLog')?.addEventListener('click', () => window.setTimeout(renderMealHistoryBatch, 80));
});
// Next ten-step integration pass: budgets, accounts, meals, relationships, study, and capture summaries.
window.addEventListener('load', () => {
  const readIntegration = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const weeklyBudgetLabel = document.querySelector('#finance .balance-line div:nth-child(2) strong'); if (weeklyBudgetLabel) weeklyBudgetLabel.textContent = `KSh ${Math.round(Number(localStorage.getItem('monthlyBudget') || 25000) / 4.345).toLocaleString()}`;

  const accountSelector = document.querySelector('#accountSelector'); const customAccounts = readIntegration('contentAccounts'); customAccounts.forEach((account, index) => { const key = `custom-${index}`; if (accountSelector?.querySelector(`[data-account="${key}"]`)) return; const button = document.createElement('button'); button.dataset.account = key; button.textContent = account.platform || account.username; accountSelector?.append(button); creatorAccountData[key] = creatorAccountData[key] || { ...defaultAccountInsights.Other, followers: account.followers || '0', best: `${account.platform || 'Account'} content`, meta: `${account.username || 'Custom account'} · Add performance` }; button.addEventListener('click', () => { selectedCreatorAccount = key; accountSelector.querySelectorAll('[data-account]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderAccountInsights(); }); });

  const mealList = document.querySelector('#mealLogList'); const enhanceMealRows = () => { if (!mealList) return; [...mealList.children].forEach((row) => { if (row.querySelector('.meal-edit-controls')) return; const type = row.querySelector('strong')?.textContent; const controls = document.createElement('span'); controls.className = 'edit-controls meal-edit-controls'; controls.innerHTML = '<button data-meal-edit aria-label="Edit meal">✎</button><button data-meal-delete aria-label="Delete meal">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-meal-edit]'); const remove = event.target.closest('[data-meal-delete]'); const matches = mealLogs.map((meal, index) => ({ meal, index })).filter(({ meal }) => meal.type === type); const current = matches[matches.length - 1]; if (!current) return; if (remove) { if (!confirm('Delete this meal log?')) return; mealLogs.splice(current.index, 1); } else { const detail = prompt('What did you eat?', current.meal.detail); if (!detail?.trim()) return; current.meal.detail = detail.trim(); } localStorage.setItem('mealLogs', JSON.stringify(mealLogs)); renderMealLogs(); }); }); }; enhanceMealRows(); if (mealList) new MutationObserver(enhanceMealRows).observe(mealList, { childList: true });

  const relationshipHost = document.querySelector('#relationshipItems'); const enhanceRelationshipRows = () => { if (!relationshipHost) return; [...relationshipHost.querySelectorAll('p')].forEach((row, index) => { if (row.querySelector('.relationship-edit-controls')) return; row.classList.add('editable-item'); const controls = document.createElement('span'); controls.className = 'edit-controls relationship-edit-controls'; controls.innerHTML = '<button data-relationship-edit aria-label="Edit relationship item">✎</button><button data-relationship-delete aria-label="Delete relationship item">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const items = readIntegration('relationshipItems'); const item = items[index]; if (!item) return; if (event.target.closest('[data-relationship-delete]')) { if (!confirm('Delete this relationship item?')) return; items.splice(index, 1); } else { const text = prompt(`${item.type}:`, item.text); if (!text?.trim()) return; item.text = text.trim(); } localStorage.setItem('relationshipItems', JSON.stringify(items)); window.location.reload(); }); }); }; enhanceRelationshipRows(); if (relationshipHost) new MutationObserver(enhanceRelationshipRows).observe(relationshipHost, { childList: true });

  document.querySelector('#addDueItem')?.addEventListener('click', () => window.setTimeout(() => { const item = savedDueItems[savedDueItems.length - 1]; if (!item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) return; if (calendarEvents.some((event) => event.date === item.date && event.title === item.title)) return; calendarEvents.push({ date: item.date, title: item.title, meta: item.meta || 'Reminder', color: 'purple-event' }); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); }, 100));

  const studyCard = document.querySelector('.study-log-card'); const studySummary = document.createElement('div'); studySummary.className = 'summary-strip'; studyCard?.append(studySummary); const renderStudySummary = () => { const sessions = readIntegration('studySessions'); const minutes = sessions.reduce((sum, session) => sum + (Number(String(session.duration).match(/[0-9.]+/)?.[0]) || 0), 0); studySummary.innerHTML = `<span class="summary-chip"><strong>${sessions.length}</strong> sessions</span><span class="summary-chip"><strong>${minutes}</strong> minutes logged</span>`; }; renderStudySummary(); document.querySelector('#addStudyLog')?.addEventListener('click', () => window.setTimeout(renderStudySummary, 80));

  const journalTitle = document.querySelector('#journalArchive .section-title'); const tagSummary = document.createElement('div'); tagSummary.className = 'summary-strip'; journalTitle?.append(tagSummary); const renderTagSummary = () => { const counts = archiveEntries.reduce((map, entry) => { const tag = entry.tag || 'untagged'; map[tag] = (map[tag] || 0) + 1; return map; }, {}); tagSummary.innerHTML = Object.entries(counts).map(([tag, count]) => `<span class="summary-chip"><strong>${count}</strong> ${escapeText(tag)}</span>`).join('') || '<span class="summary-chip">No tagged entries yet</span>'; }; renderTagSummary(); document.querySelector('#addArchiveEntry')?.addEventListener('click', () => window.setTimeout(renderTagSummary, 80));

  const captureSection = document.querySelector('#quickCapture'); const captureSummary = document.createElement('div'); captureSummary.className = 'summary-strip'; captureSection?.querySelector('.capture-hint')?.after(captureSummary); const renderCaptureSummary = () => { captureSummary.innerHTML = `<span class="summary-chip"><strong>${readIntegration('dueItems').length}</strong> reminders</span><span class="summary-chip"><strong>${readIntegration('journalEntries').length}</strong> journal entries</span><span class="summary-chip"><strong>${calendarEvents.length}</strong> calendar events</span>`; }; renderCaptureSummary();
});
// Next ten-task usability pass: mobile, dates, currency, completion states, and richer summaries.
window.addEventListener('load', () => {
  const readNextPass = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const mobileToggle = document.createElement('button'); mobileToggle.className = 'sidebar-toggle'; mobileToggle.type = 'button'; mobileToggle.textContent = '☰ Menu'; mobileToggle.setAttribute('aria-label', 'Open navigation'); document.body.append(mobileToggle); mobileToggle.addEventListener('click', () => { document.body.classList.toggle('sidebar-open'); mobileToggle.textContent = document.body.classList.contains('sidebar-open') ? '× Close' : '☰ Menu'; });

  const updateCurrency = () => { const settings = JSON.parse(localStorage.getItem('dashboardSettings') || '{}'); const unit = settings.currency || 'KSh'; const spent = Number(localStorage.getItem('weeklyExpenses') || 0); const monthlyBudget = Number(localStorage.getItem('monthlyBudget') || 25000); const spentLabel = document.querySelector('#spentTotal'); const weeklyLabel = document.querySelector('#finance .balance-line div:nth-child(2) strong'); const budgetLabel = document.querySelector('#budgetDetailTotal'); const monthlyLabel = document.querySelector('#monthlyMoney'); if (spentLabel) spentLabel.textContent = `${unit} ${spent.toLocaleString()}`; if (weeklyLabel) weeklyLabel.textContent = `${unit} ${Math.round(monthlyBudget / 4.345).toLocaleString()}`; if (budgetLabel) budgetLabel.textContent = `${unit} ${Number(Object.values(categoryExpenses).reduce((sum, value) => sum + Number(value), 0)).toLocaleString()}`; if (monthlyLabel) monthlyLabel.textContent = `${unit} ${spent.toLocaleString()}`; document.querySelectorAll('#financeBreakdown .category-card b').forEach((label, index) => { const keys = ['food', 'transport', 'school', 'personal']; label.textContent = `${unit} ${Number(categoryExpenses[keys[index]] || 0).toLocaleString()}`; }); }; updateCurrency(); document.querySelector('#settingsForm')?.addEventListener('submit', () => window.setTimeout(updateCurrency, 60));

  const monthLabel = document.querySelector('#monthlySummary .date-pill'); if (monthLabel) monthLabel.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase();
  const calendarSection = document.querySelector('#calendar'); const dayDetails = document.createElement('div'); dayDetails.className = 'calendar-day-details'; calendarSection?.querySelector('.calendar-layout')?.after(dayDetails); document.querySelector('#calendarDays')?.addEventListener('click', (event) => { const day = event.target.closest('[data-date]'); if (!dayDetails || !day) return; const events = calendarEvents.filter((item) => item.date === day.dataset.date); dayDetails.innerHTML = events.length ? `<strong>${escapeText(day.dataset.date)}</strong>${events.map((item) => `<small>${escapeText(item.title)} · ${escapeText(item.meta || 'Personal event')}</small>`).join('')}` : `<strong>${escapeText(day.dataset.date)}</strong><small>No events planned for this day.</small>`; });

  const dueListPass = document.querySelector('#dueList'); if (dueListPass && savedDueItems.length) { [...dueListPass.children].slice(-savedDueItems.length).forEach((row, index) => { if (row.querySelector('.completion-control')) return; const item = savedDueItems[index]; const label = document.createElement('label'); label.className = 'completion-control'; label.innerHTML = `<input type="checkbox" ${item.done ? 'checked' : ''}> done`; label.querySelector('input').addEventListener('change', (event) => { item.done = event.target.checked; localStorage.setItem('dueItems', JSON.stringify(savedDueItems)); row.style.opacity = item.done ? '.55' : '1'; }); row.append(label); row.style.opacity = item.done ? '.55' : '1'; }); }

  const studyLogPass = document.querySelector('#studySessionLog'); const enhanceStudyRows = () => { if (!studyLogPass) return; const sessions = readNextPass('studySessions'); [...studyLogPass.querySelectorAll('p')].forEach((row, index) => { if (!sessions[index] || row.querySelector('.study-edit-controls')) return; const controls = document.createElement('span'); controls.className = 'edit-controls study-edit-controls'; controls.innerHTML = '<button data-study-edit aria-label="Edit study log">✎</button><button data-study-delete aria-label="Delete study log">×</button>'; row.append(controls); controls.addEventListener('click', (event) => { event.stopPropagation(); const edit = event.target.closest('[data-study-edit]'); const remove = event.target.closest('[data-study-delete]'); if (remove) { if (!confirm('Delete this study session?')) return; sessions.splice(index, 1); } else { const topic = prompt('What did you study?', sessions[index].topic); const duration = prompt('How long?', sessions[index].duration); if (!topic?.trim()) return; Object.assign(sessions[index], { topic: topic.trim(), duration: duration?.trim() || 'Focused session' }); } localStorage.setItem('studySessions', JSON.stringify(sessions)); renderStudySessions(); }); }); }; enhanceStudyRows(); if (studyLogPass) new MutationObserver(enhanceStudyRows).observe(studyLogPass, { childList: true });

  const customInsightButtons = document.querySelectorAll('#accountSelector [data-account^="custom-"]'); customInsightButtons.forEach((button) => { button.title = 'Select this account, then use Update account below'; });
});
// Next fifteen-task pass: work history, savings actions, resources, dates, exports, and polish.
window.addEventListener('load', () => {
  const readFifteen = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));

  const workMetrics = document.querySelector('#workHub .work-metrics');
  const workSessionSummary = document.createElement('div');
  workSessionSummary.className = 'history-mini-card work-session-summary';
  workMetrics?.append(workSessionSummary);
  const renderWorkSessionSummary = () => {
    if (!workSessionSummary) return;
    const entries = readFifteen('workLogEntries');
    const monthKey = new Date().toISOString().slice(0, 7);
    const monthEntries = entries.filter((entry) => String(entry.date || '').startsWith(monthKey));
    const hours = monthEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    const notes = monthEntries.slice(0, 3).map((entry) => `${entry.date}: ${entry.note || 'Work session'}`);
    const metric = [...(workMetrics?.querySelectorAll('.work-metric-row') || [])].find((row) => row.textContent.toLowerCase().includes('hours'))?.querySelector('strong');
    if (metric) metric.textContent = `${hours}h`;
    workSessionSummary.innerHTML = `<p class="eyebrow">Logged work sessions</p><strong>${hours}h this month · ${monthEntries.length} sessions</strong>${notes.length ? `<small>${notes.map((note) => escapeText(note)).join(' · ')}</small>` : '<small>Log your first session to see the rhythm of your work.</small>'}`;
  };
  renderWorkSessionSummary();
  document.querySelector('#addWorkLog')?.addEventListener('click', () => window.setTimeout(renderWorkSessionSummary, 80));

  const savingsListFifteen = document.querySelector('#savingsList');
  const parseGoalDate = (note) => {
    const value = String(note || '');
    const iso = value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
    if (iso) return new Date(`${iso}T00:00:00`);
    const parsed = Date.parse(value.replace(/^target\s*:\s*/i, ''));
    return Number.isNaN(parsed) ? null : new Date(parsed);
  };
  const renderSavingsCountdowns = () => {
    if (!savingsListFifteen) return;
    const goals = readFifteen('savingsGoals');
    [...savingsListFifteen.querySelectorAll('article')].forEach((row, index) => {
      const goal = goals[index];
      if (!goal) return;
      row.classList.add('editable-item');
      const date = parseGoalDate(goal.note);
      const countdown = date ? Math.ceil((date - new Date()) / 86400000) : null;
      let extra = row.querySelector('.savings-goal-actions');
      if (!extra) { extra = document.createElement('div'); extra.className = 'savings-goal-actions'; row.append(extra); }
      extra.innerHTML = `<button type="button" class="refinement-button" data-saving-contribute="${index}">＋ Add contribution</button>${countdown !== null ? `<small class="savings-countdown">${countdown >= 0 ? `${countdown} days to target` : 'Target date passed · update your plan'}</small>` : '<small class="savings-countdown">Add a target date in Edit goal.</small>'}`;
    });
  };
  renderSavingsCountdowns();
  if (savingsListFifteen) {
    new MutationObserver(renderSavingsCountdowns).observe(savingsListFifteen, { childList: true });
    savingsListFifteen.addEventListener('click', (event) => {
      const button = event.target.closest('[data-saving-contribute]');
      if (!button) return;
      event.stopPropagation();
      const goals = readFifteen('savingsGoals');
      const goal = goals[Number(button.dataset.savingContribute)];
      if (!goal) return;
      const amount = Number(prompt(`Add to ${goal.name} (KSh):`, '0'));
      if (Number.isNaN(amount) || amount <= 0) return;
      goal.saved = Number(goal.saved || 0) + amount;
      localStorage.setItem('savingsGoals', JSON.stringify(goals));
      savingsGoals.splice(0, savingsGoals.length, ...goals);
      renderSavings();
    });
  }

  const kpiListFifteen = document.querySelector('#businessKpiList');
  const kpiSummaryFifteen = document.createElement('div');
  kpiSummaryFifteen.className = 'summary-strip';
  kpiListFifteen?.after(kpiSummaryFifteen);
  const renderKpiSummaryFifteen = () => {
    const kpis = readFifteen('businessKpis');
    const numericTotal = kpis.reduce((sum, item) => sum + (Number(String(item.value).replaceAll(',', '').replace(/[^0-9.-]/g, '')) || 0), 0);
    kpiSummaryFifteen.innerHTML = `<span class="summary-chip"><strong>${kpis.length}</strong> saved KPI${kpis.length === 1 ? '' : 's'}</span><span class="summary-chip"><strong>${numericTotal.toLocaleString()}</strong> total numeric value</span>`;
  };
  renderKpiSummaryFifteen();
  const decorateKpisFifteen = () => {
    if (!kpiListFifteen) return;
    const kpis = readFifteen('businessKpis');
    [...kpiListFifteen.querySelectorAll('article')].slice(-kpis.length).forEach((row, index) => {
      if (row.querySelector('[data-kpi-edit]')) return;
      const controls = document.createElement('span'); controls.className = 'edit-controls'; controls.innerHTML = '<button type="button" data-kpi-edit aria-label="Edit KPI">✎</button><button type="button" data-kpi-delete aria-label="Delete KPI">×</button>'; row.append(controls);
      controls.addEventListener('click', (event) => {
        event.stopPropagation();
        const current = readFifteen('businessKpis');
        const item = current[index];
        if (!item) return;
        if (event.target.closest('[data-kpi-delete]')) { if (!confirm('Delete this KPI?')) return; current.splice(index, 1); }
        else { const business = prompt('Business:', item.business); const metric = prompt('Metric:', item.metric); const value = prompt('Current value:', item.value); const note = prompt('Target or note:', item.note); if (!business?.trim() || !metric?.trim() || !value?.trim()) return; Object.assign(item, { business: business.trim(), metric: metric.trim(), value: value.trim(), note: note?.trim() || 'Add a target' }); }
        localStorage.setItem('businessKpis', JSON.stringify(current)); window.location.reload();
      });
    });
  };
  decorateKpisFifteen();
  if (kpiListFifteen) new MutationObserver(() => { decorateKpisFifteen(); renderKpiSummaryFifteen(); }).observe(kpiListFifteen, { childList: true });

  const resourceListFifteen = document.querySelector('#resourceList');
  const decorateResourcesFifteen = () => {
    const resources = readFifteen('pharmacyResources');
    [...(resourceListFifteen?.querySelectorAll('article') || [])].slice(-resources.length).forEach((row, index) => {
      const resource = resources[index];
      const openButton = row.querySelector('button:not([data-resource-edit]):not([data-resource-delete])');
      if (openButton && resource?.link) { openButton.dataset.resourceLink = resource.link; openButton.title = 'Open saved link'; }
    });
  };
  decorateResourcesFifteen();
  if (resourceListFifteen) new MutationObserver(decorateResourcesFifteen).observe(resourceListFifteen, { childList: true });
  resourceListFifteen?.addEventListener('click', (event) => { const button = event.target.closest('[data-resource-link]'); if (button) window.open(button.dataset.resourceLink, '_blank', 'noopener'); });

  const importantListFifteen = document.querySelector('#importantDateList');
  const decorateImportantDatesFifteen = () => {
    [...(importantListFifteen?.querySelectorAll('.important-date-row') || [])].forEach((row) => {
      if (row.querySelector('[data-important-edit]')) return;
      const deleteButton = row.querySelector('[data-important-index]'); if (!deleteButton) return;
      const editButton = document.createElement('button'); editButton.type = 'button'; editButton.dataset.importantEdit = deleteButton.dataset.importantIndex; editButton.className = 'row-edit'; editButton.setAttribute('aria-label', 'Edit important date'); editButton.textContent = '✎'; deleteButton.before(editButton);
    });
  };
  decorateImportantDatesFifteen();
  importantListFifteen?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-important-edit]'); if (!button) return;
    event.stopPropagation(); const dates = readFifteen('importantDates'); const item = dates[Number(button.dataset.importantEdit)]; if (!item) return;
    const title = prompt('What is the important date?', item.title); const date = prompt('Date:', item.date); const person = prompt('Who or what is it connected to?', item.person); if (!title?.trim() || !date?.trim()) return;
    Object.assign(item, { title: title.trim(), date: date.trim(), person: person?.trim() || 'Personal reminder' }); localStorage.setItem('importantDates', JSON.stringify(dates)); window.location.reload();
  });

  document.querySelectorAll('.sidebar a').forEach((link) => link.addEventListener('click', () => { document.body.classList.remove('sidebar-open'); const toggle = document.querySelector('.sidebar-toggle'); if (toggle) { toggle.textContent = '☰ Menu'; toggle.setAttribute('aria-label', 'Open navigation'); } }));

  const settingsTriggerFifteen = document.querySelector('#openSettings');
  const restoreSettingsFocus = () => { if (settingsModal?.getAttribute('aria-hidden') === 'true') window.setTimeout(() => settingsTriggerFifteen?.focus(), 0); };
  settingsTriggerFifteen?.addEventListener('click', () => { window.setTimeout(() => document.querySelector('#settingName')?.focus(), 0); });
  document.querySelector('#closeSettings')?.addEventListener('click', restoreSettingsFocus);
  document.querySelector('#settingsBackdrop')?.addEventListener('click', restoreSettingsFocus);
  document.querySelector('#settingsForm')?.addEventListener('submit', () => window.setTimeout(restoreSettingsFocus, 30));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && settingsModal?.classList.contains('open')) { hideSettings(); restoreSettingsFocus(); } });

  const journalActionsFifteen = document.querySelector('#journalArchive .archive-actions');
  if (journalActionsFifteen && !document.querySelector('#exportJournalMarkdown')) {
    const button = document.createElement('button'); button.id = 'exportJournalMarkdown'; button.type = 'button'; button.className = 'small-link'; button.textContent = '↓ Markdown'; journalActionsFifteen.append(button);
    button.addEventListener('click', () => { const entries = [...archiveEntries].sort((a, b) => String(b.date).localeCompare(String(a.date))); const markdown = `# My little life journal\n\n${entries.map((entry) => `## ${entry.title}\n\n_${entry.date}${entry.tag ? ` · ${entry.tag}` : ''}_\n\n${entry.detail || ''}`).join('\n\n') || 'No journal entries yet.'}\n`; const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-journal-${new Date().toISOString().slice(0, 10)}.md`; link.click(); URL.revokeObjectURL(url); });
  }

  const dataCardFifteen = document.querySelector('#dataManagement .data-management-card');
  if (dataCardFifteen && !document.querySelector('#printDashboard')) { const print = document.createElement('button'); print.id = 'printDashboard'; print.type = 'button'; print.textContent = 'Print dashboard'; dataCardFifteen.append(print); print.addEventListener('click', () => window.print()); }
  if (dataCardFifteen && !document.querySelector('#dataFreshness')) { const freshness = document.createElement('span'); freshness.id = 'dataFreshness'; freshness.className = 'data-freshness'; localStorage.setItem('dashboardLastOpenedAt', new Date().toISOString()); freshness.textContent = `Last opened ${new Date().toLocaleString()}`; dataCardFifteen.append(freshness); }
});
// Next fifteen-task pass: daily patterns, school progress, content history, and connection care.
window.addEventListener('load', () => {
  const readNextFifteen = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));

  const searchInputNext = document.querySelector('#dashboardSearchInput');
  const searchResultsNext = document.querySelector('#searchResults');
  const renderSearchNext = () => {
    if (!searchInputNext || !searchResultsNext) return;
    const query = searchInputNext.value.trim().toLowerCase();
    if (!query) { searchResultsNext.innerHTML = ''; return; }
    const sections = [...document.querySelectorAll('main section')].filter((section) => section.textContent.toLowerCase().includes(query)).slice(0, 5).map((section) => ({ target: section.id, title: section.querySelector('h2')?.textContent || section.id, detail: 'Open dashboard section' }));
    const saved = [['customUnits', 'schoolHub'], ['schoolStudyItems', 'schoolHub'], ['schoolResearchItems', 'schoolHub'], ['personalBusinesses', 'workHub'], ['peopleDirectory', 'peopleDetails'], ['peopleCheckins', 'peopleDetails'], ['examPrepItems', 'examPrep'], ['businessKpis', 'businessKpis'], ['savingsGoals', 'savingsGoals'], ['expenseLedger', 'financeBreakdown']].flatMap(([key, target]) => readNextFifteen(key).filter((item) => JSON.stringify(item).toLowerCase().includes(query)).map((item) => ({ target, title: item.name || item.title || item.value || item.unit || item.business || item.category || key, detail: `Saved ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}` })));
    const unique = [...new Map([...sections, ...saved].map((item) => [`${item.target}-${item.title}`, item])).values()].slice(0, 9);
    searchResultsNext.innerHTML = unique.map((item) => `<button class="search-result" data-target="${escapeText(item.target)}">${escapeText(item.title)}<small>${escapeText(item.detail)} · Open section →</small></button>`).join('') || '<p class="capture-hint">Nothing found yet. Try another word.</p>';
  };
  searchInputNext?.addEventListener('input', () => window.setTimeout(renderSearchNext, 90));
  searchResultsNext?.addEventListener('click', (event) => { const result = event.target.closest('[data-target]'); if (!result) return; document.querySelector(`#${result.dataset.target}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });

  const habitInsightNext = document.createElement('div'); habitInsightNext.className = 'history-mini-card'; const habitCardNext = document.querySelector('.tracker-card.habits'); habitCardNext?.append(habitInsightNext);
  const renderHabitInsightNext = () => {
    if (!habitInsightNext) return;
    const inputs = [...document.querySelectorAll('.check-list input')]; const fullDays = [];
    for (let offset = 0; offset < 14; offset += 1) { const day = new Date(); day.setDate(day.getDate() - offset); const date = day.toISOString().slice(0, 10); const complete = inputs.length > 0 && inputs.every((_, index) => localStorage.getItem(`habit-${date}-${index}`) === 'true'); fullDays.push(complete); }
    let streak = 0; while (fullDays[streak]) streak += 1;
    const completedLastWeek = fullDays.slice(0, 7).filter(Boolean).length;
    habitInsightNext.innerHTML = `<p class="eyebrow">Habit rhythm</p><strong>${streak} day streak · ${completedLastWeek}/7 full days</strong><small>Small consistency counts more than a perfect week.</small>`;
  };
  renderHabitInsightNext(); document.querySelectorAll('.check-list input').forEach((input) => input.addEventListener('change', () => window.setTimeout(renderHabitInsightNext, 50)));

  const moodInsightNext = document.createElement('div'); moodInsightNext.className = 'history-mini-card'; document.querySelector('#moodHistory .mood-history-card')?.append(moodInsightNext);
  const renderMoodInsightNext = () => { const history = readNextFifteen('moodHistory', {}); const labels = Object.values(history).map((value) => String(value).toLowerCase()); const scores = { radiant: 5, good: 4, okay: 3, low: 2, overwhelmed: 1 }; const total = labels.reduce((sum, label) => sum + (scores[label] || 0), 0); const common = Object.entries(labels.reduce((map, label) => { map[label] = (map[label] || 0) + 1; return map; }, {})).sort((a, b) => b[1] - a[1])[0]; moodInsightNext.innerHTML = `<p class="eyebrow">Mood pattern</p><strong>${labels.length ? `Average ${ (total / labels.length).toFixed(1) } / 5` : 'No pattern yet'}</strong><small>${common ? `Most frequent: ${escapeText(common[0])} (${common[1]} check-in${common[1] === 1 ? '' : 's'})` : 'Choose a mood daily to notice your rhythm.'}</small>`; };
  renderMoodInsightNext(); document.querySelectorAll('.mood-row button').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderMoodInsightNext, 60)));

  const gratitudeHistoryNext = readNextFifteen('gratitudeHistory'); const gratitudeCardNext = document.createElement('div'); gratitudeCardNext.className = 'history-mini-card'; document.querySelector('.reflection-detail')?.append(gratitudeCardNext);
  const renderGratitudeHistoryNext = () => { const recent = gratitudeHistoryNext.slice(-5).reverse(); gratitudeCardNext.innerHTML = `<p class="eyebrow">Gratitude history</p><strong>${gratitudeHistoryNext.length} reflection${gratitudeHistoryNext.length === 1 ? '' : 's'} saved</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.text)}`).join(' · ') || 'Your saved gratitude reflections will stay here.'}</small>`; };
  renderGratitudeHistoryNext(); document.querySelector('#saveGratitude')?.addEventListener('click', () => { const text = document.querySelector('#gratitudeNote')?.value.trim(); if (!text) return; gratitudeHistoryNext.push({ date: new Date().toISOString().slice(0, 10), text }); localStorage.setItem('gratitudeHistory', JSON.stringify(gratitudeHistoryNext.slice(-60))); renderGratitudeHistoryNext(); });

  const prayerStreakNext = document.createElement('div'); prayerStreakNext.className = 'history-mini-card'; document.querySelector('#prayerHistoryCard')?.after(prayerStreakNext);
  const renderPrayerStreakNext = () => { const history = readNextFifteen('prayerHistory'); const completed = new Set(history.filter((item) => item.completed).map((item) => item.date)); let streak = 0; for (let offset = 0; offset < 365; offset += 1) { const date = new Date(); date.setDate(date.getDate() - offset); if (!completed.has(date.toISOString().slice(0, 10))) break; streak += 1; } prayerStreakNext.innerHTML = `<p class="eyebrow">Prayer rhythm</p><strong>${streak} day streak</strong><small>${completed.size} completed reflection${completed.size === 1 ? '' : 's'} recorded.</small>`; };
  renderPrayerStreakNext(); document.querySelector('.wellbeing-item[data-action="Prayer"]')?.addEventListener('click', () => window.setTimeout(renderPrayerStreakNext, 70));

  const mealSummaryNext = document.createElement('div'); mealSummaryNext.className = 'history-mini-card'; document.querySelector('#mealLog .nutrition-card')?.before(mealSummaryNext);
  const renderMealSummaryNext = () => { const meals = readNextFifteen('mealLogs'); const counts = meals.reduce((map, item) => { const type = item.type || 'Other'; map[type] = (map[type] || 0) + 1; return map; }, {}); const latest = meals.slice(-1)[0]; mealSummaryNext.innerHTML = `<p class="eyebrow">Nourishment pattern</p><strong>${meals.length} meals logged</strong><small>${Object.entries(counts).map(([type, count]) => `${escapeText(type)} ${count}`).join(' · ') || 'Breakfast, lunch, and dinner will be counted here.'}${latest ? ` · Latest: ${escapeText(latest.date || 'today')}` : ''}</small>`; };
  renderMealSummaryNext(); document.querySelector('#addMealLog')?.addEventListener('click', () => window.setTimeout(renderMealSummaryNext, 80));

  const routineInsightNext = document.createElement('div'); routineInsightNext.className = 'history-mini-card'; document.querySelector('#routineList')?.after(routineInsightNext);
  const renderRoutineInsightNext = () => { const history = readNextFifteen('routineHistory'); const lastSeven = history.slice(-7); const total = lastSeven.reduce((sum, item) => sum + Number(item.completed || 0), 0); routineInsightNext.innerHTML = `<p class="eyebrow">Routine rhythm</p><strong>${total} completions in the last ${lastSeven.length || 0} logged day${lastSeven.length === 1 ? '' : 's'}</strong><small>${history.slice(-3).map((item) => `${item.date}: ${item.completed} done`).join(' · ') || 'Check off a routine to start tracking the pattern.'}</small>`; };
  renderRoutineInsightNext(); document.querySelector('#routineList')?.addEventListener('change', () => window.setTimeout(renderRoutineInsightNext, 60));

  const unitListNext = document.querySelector('#unitList'); const unitProgressNext = readNextFifteen('unitProgress', {}); const unitSummaryNext = document.querySelector('#schoolHub .units-card .unit-summary');
  const renderUnitProgressNext = () => { const rows = [...(unitListNext?.children || [])]; let done = 0; rows.forEach((row, index) => { const key = row.querySelector('strong')?.textContent.trim() || row.textContent.trim().slice(0, 40); const input = row.querySelector('[data-unit-progress]'); if (!input) { const label = document.createElement('label'); label.className = 'unit-progress-control'; label.innerHTML = `<input type="checkbox" data-unit-progress="${escapeText(key)}"> done`; row.append(label); } const checkbox = row.querySelector('[data-unit-progress]'); checkbox.checked = unitProgressNext[key] === true; if (checkbox.checked) done += 1; checkbox.onchange = () => { unitProgressNext[key] = checkbox.checked; localStorage.setItem('unitProgress', JSON.stringify(unitProgressNext)); renderUnitProgressNext(); }; }); if (unitSummaryNext && rows.length) { const tracked = unitSummaryNext.querySelector('.tracked-unit-summary') || document.createElement('div'); tracked.className = 'tracked-unit-summary'; tracked.innerHTML = `<strong>${done}/${rows.length}</strong><small>visible unit rows completed</small>`; if (!tracked.parentElement) unitSummaryNext.append(tracked); } };
  renderUnitProgressNext(); if (unitListNext) new MutationObserver(renderUnitProgressNext).observe(unitListNext, { childList: true });

  const studyQueueNext = document.createElement('div'); studyQueueNext.className = 'summary-strip'; document.querySelector('#studyList')?.after(studyQueueNext);
  const renderStudyQueueNext = () => { const rows = [...(document.querySelector('#studyList')?.children || [])]; const pending = rows.filter((row) => !row.textContent.toLowerCase().includes('reading') && !row.textContent.toLowerCase().includes('done')).length; studyQueueNext.innerHTML = `<span class="summary-chip"><strong>${rows.length}</strong> study items</span><span class="summary-chip"><strong>${pending}</strong> need attention</span>`; };
  renderStudyQueueNext(); document.querySelectorAll('#addStudy, #addReading').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderStudyQueueNext, 80)));

  const examFilterNext = document.createElement('select'); examFilterNext.className = 'refinement-select'; examFilterNext.innerHTML = '<option value="all">All prep plans</option><option value="starting">Starting · 0–39%</option><option value="building">Building · 40–79%</option><option value="ready">Ready · 80%+</option>'; document.querySelector('#examPrep .section-title')?.append(examFilterNext);
  examFilterNext.addEventListener('change', () => { document.querySelectorAll('#examPrepList article').forEach((row) => { const progress = Number(row.querySelector('b')?.textContent || 0); const filter = examFilterNext.value; row.hidden = filter === 'starting' ? progress >= 40 : filter === 'building' ? progress < 40 || progress >= 80 : filter === 'ready' ? progress < 80 : false; }); });

  const analyticsExportNext = document.createElement('button'); analyticsExportNext.type = 'button'; analyticsExportNext.className = 'small-link'; analyticsExportNext.textContent = '↓ CSV'; const analyticsActionsNext = document.querySelector('#analytics .analytics-actions'); analyticsActionsNext?.append(analyticsExportNext); analyticsExportNext.addEventListener('click', () => { const rows = [['Date', 'Reach', 'Engagement', 'Views'], ...readNextFifteen('analyticsHistory').map((item) => [item.date, item.reach, item.engagement, item.views])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-content-analytics-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); });

  const accountListNext = document.querySelector('#accountList'); const accountTotalNext = document.createElement('div'); accountTotalNext.className = 'summary-strip'; accountListNext?.after(accountTotalNext);
  const renderAccountTotalNext = () => { const total = [...(accountListNext?.querySelectorAll('.account-row') || [])].reduce((sum, row) => sum + (Number(row.querySelector('b')?.textContent.replaceAll(',', '').replace(/[^0-9.]/g, '')) || 0), 0); accountTotalNext.innerHTML = `<span class="summary-chip"><strong>${total.toLocaleString()}</strong> combined followers / subscribers</span>`; };
  renderAccountTotalNext(); if (accountListNext) new MutationObserver(renderAccountTotalNext).observe(accountListNext, { childList: true });

  const peopleListNext = document.querySelector('#peopleCheckinList'); const contactHistoryNext = readNextFifteen('peopleContactHistory'); const contactSummaryNext = document.createElement('div'); contactSummaryNext.className = 'history-mini-card'; peopleListNext?.after(contactSummaryNext);
  const decoratePeopleRowsNext = () => { [...(peopleListNext?.children || [])].forEach((row) => { if (row.querySelector('[data-contact-log]')) return; const button = document.createElement('button'); button.type = 'button'; button.className = 'contact-log-button'; button.dataset.contactLog = 'true'; button.textContent = 'Log contact'; row.append(button); }); };
  const renderContactSummaryNext = () => { const latest = contactHistoryNext.slice(-3).reverse(); contactSummaryNext.innerHTML = `<p class="eyebrow">Connection history</p><strong>${contactHistoryNext.length} check-in${contactHistoryNext.length === 1 ? '' : 's'} logged</strong><small>${latest.map((item) => `${escapeText(item.date)} · ${escapeText(item.title)}`).join(' · ') || 'Log a check-in when you reach out to someone.'}</small>`; };
  decoratePeopleRowsNext(); renderContactSummaryNext(); peopleListNext?.addEventListener('click', (event) => { const button = event.target.closest('[data-contact-log]'); if (!button) return; const row = button.closest('[data-person-group]'); const title = row?.querySelector('strong')?.textContent || 'Connection'; const group = row?.dataset.personGroup || 'personal'; contactHistoryNext.push({ date: new Date().toISOString().slice(0, 10), title, group }); localStorage.setItem('peopleContactHistory', JSON.stringify(contactHistoryNext.slice(-60))); renderContactSummaryNext(); button.textContent = 'Logged ✓'; }); if (peopleListNext) new MutationObserver(decoratePeopleRowsNext).observe(peopleListNext, { childList: true });

  const careerListNext = document.querySelector('#careerTaskList'); const careerProgressNext = document.querySelector('#careerTracker .career-progress-card'); const renderCareerProgressNext = () => { const inputs = [...(careerListNext?.querySelectorAll('input[type="checkbox"]') || [])]; const done = inputs.filter((input) => input.checked).length; const percent = inputs.length ? Math.round(done / inputs.length * 100) : 0; const strong = careerProgressNext?.querySelector('strong'); const bar = careerProgressNext?.querySelector('.career-bar i'); if (strong) strong.textContent = `${percent}%`; if (bar) bar.style.width = `${percent}%`; }; renderCareerProgressNext(); careerListNext?.addEventListener('change', renderCareerProgressNext); if (careerListNext) new MutationObserver(renderCareerProgressNext).observe(careerListNext, { childList: true });
});
// Next fifteen-task pass: daily wellbeing, persistent planning, and richer life systems.
window.addEventListener('load', () => {
  const readNextRound = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const todayNextRound = new Date();
  const longDateNextRound = todayNextRound.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const topEyebrowNextRound = document.querySelector('.topbar .eyebrow'); if (topEyebrowNextRound) topEyebrowNextRound.textContent = longDateNextRound;
  const trackerDateNextRound = document.querySelector('#trackers .date-pill'); if (trackerDateNextRound) trackerDateNextRound.textContent = todayNextRound.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
  const memoryDateNextRound = document.querySelector('#memoryVault .memory-preview span'); if (memoryDateNextRound) memoryDateNextRound.textContent = todayNextRound.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();

  const mentalHistoryNextRound = readNextRound('mentalHealthHistory'); const mentalCardNextRound = document.createElement('div'); mentalCardNextRound.className = 'history-mini-card'; document.querySelector('.mind-detail')?.append(mentalCardNextRound);
  const renderMentalNextRound = () => { const recent = mentalHistoryNextRound.slice(-5).reverse(); mentalCardNextRound.innerHTML = `<p class="eyebrow">Mental-health check-ins</p><strong>${mentalHistoryNextRound.length} check-in${mentalHistoryNextRound.length === 1 ? '' : 's'} saved</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.feel)}`).join(' · ') || 'Your calm, tired, anxious, and hopeful check-ins will build a gentle pattern.'}</small>`; };
  renderMentalNextRound(); document.querySelectorAll('.feel-row button').forEach((button) => button.addEventListener('click', () => { mentalHistoryNextRound.push({ date: new Date().toISOString().slice(0, 10), feel: button.dataset.feel }); localStorage.setItem('mentalHealthHistory', JSON.stringify(mentalHistoryNextRound.slice(-60))); renderMentalNextRound(); }));

  const workoutHistoryNextRound = readNextRound('workoutHistory'); const wellbeingCardNextRound = document.querySelector('.tracker-card.pink'); const workoutCardNextRound = document.createElement('div'); workoutCardNextRound.className = 'history-mini-card'; wellbeingCardNextRound?.append(workoutCardNextRound);
  const renderWorkoutNextRound = () => { const recent = workoutHistoryNextRound.slice(-5).reverse(); workoutCardNextRound.innerHTML = `<p class="eyebrow">Workout history</p><strong>${workoutHistoryNextRound.length} session${workoutHistoryNextRound.length === 1 ? '' : 's'} logged</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.activity)}${item.duration ? ` · ${escapeText(item.duration)}` : ''}`).join(' · ') || 'Add movement in whatever form feels supportive today.'}</small>`; };
  if (wellbeingCardNextRound && !document.querySelector('#logWorkout')) { const button = document.createElement('button'); button.id = 'logWorkout'; button.type = 'button'; button.className = 'detail-link'; button.textContent = '＋ Log workout'; wellbeingCardNextRound.querySelector('.wellbeing-links')?.after(button); button.addEventListener('click', () => { const activity = prompt('What movement did you do?'); const duration = prompt('How long?'); if (!activity?.trim()) return; workoutHistoryNextRound.push({ date: new Date().toISOString().slice(0, 10), activity: activity.trim(), duration: duration?.trim() || '' }); localStorage.setItem('workoutHistory', JSON.stringify(workoutHistoryNextRound.slice(-60))); renderWorkoutNextRound(); }); }
  renderWorkoutNextRound();

  const rhythmHistoryNextRound = readNextRound('rhythmHistory'); const rhythmCardNextRound = document.createElement('div'); rhythmCardNextRound.className = 'history-mini-card'; document.querySelector('.rhythm-card')?.append(rhythmCardNextRound);
  const renderRhythmNextRound = () => { const recent = rhythmHistoryNextRound.slice(-4).reverse(); rhythmCardNextRound.innerHTML = `<p class="eyebrow">Rhythm history</p><strong>${rhythmHistoryNextRound.length} daily check-in${rhythmHistoryNextRound.length === 1 ? '' : 's'}</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.sleep)} sleep · ${escapeText(item.water)} water`).join(' · ') || 'Sleep, water, and movement check-ins will appear here.'}</small>`; };
  renderRhythmNextRound(); document.querySelector('#editRhythm')?.addEventListener('click', () => window.setTimeout(() => { const current = JSON.parse(localStorage.getItem('rhythmData') || '{}'); if (!current.sleep) return; rhythmHistoryNextRound.push({ date: new Date().toISOString().slice(0, 10), ...current }); localStorage.setItem('rhythmHistory', JSON.stringify(rhythmHistoryNextRound.slice(-60))); renderRhythmNextRound(); }, 80));

  const captureFormNextRound = document.querySelector('#captureForm'); const savedCaptureTasksNextRound = readNextRound('captureTasks'); const plannerListNextRound = document.querySelector('#plannerList');
  savedCaptureTasksNextRound.forEach((task) => { if (plannerListNextRound && ![...plannerListNextRound.children].some((row) => row.textContent.includes(task.title))) { const row = document.createElement('p'); row.dataset.captureTask = 'true'; row.innerHTML = `<span>□</span> ${escapeText(task.title)} <small>${escapeText(task.detail || 'Captured task')}</small>`; plannerListNextRound.append(row); } });
  captureFormNextRound?.addEventListener('submit', (event) => { const type = captureFormNextRound.querySelector('#captureType')?.value; const title = captureFormNextRound.querySelector('#captureTitle')?.value.trim(); const detail = captureFormNextRound.querySelector('#captureDetail')?.value.trim(); if (!title) return; if (type === 'task') { savedCaptureTasksNextRound.push({ title, detail, date: new Date().toISOString().slice(0, 10) }); localStorage.setItem('captureTasks', JSON.stringify(savedCaptureTasksNextRound.slice(-60))); } if (type === 'content') { const ideas = readNextRound('contentIdeas'); ideas.push({ title, detail, status: 'idea', createdAt: new Date().toISOString().slice(0, 10) }); localStorage.setItem('contentIdeas', JSON.stringify(ideas.slice(-80))); } }, { capture: true });

  const projectCardNextRound = document.querySelector('.project-card'); const projectMilestonesNextRound = readNextRound('projectMilestones');
  if (projectCardNextRound && !document.querySelector('#projectMilestonesNext')) { const milestoneBox = document.createElement('div'); milestoneBox.id = 'projectMilestonesNext'; milestoneBox.className = 'project-milestones-next'; milestoneBox.innerHTML = '<div class="inline-actions"><strong>Project milestones</strong><button type="button" class="refinement-button" id="addProjectMilestoneNext">＋ Add</button></div><div class="project-milestone-list"></div>'; projectCardNextRound.append(milestoneBox); const list = milestoneBox.querySelector('.project-milestone-list'); const renderProjectMilestonesNext = () => { list.innerHTML = projectMilestonesNextRound.map((item, index) => `<label><input type="checkbox" data-project-milestone="${index}" ${item.done ? 'checked' : ''}> ${escapeText(item.title)}</label>`).join('') || '<small>Add the next small step for this project.</small>'; list.querySelectorAll('input').forEach((input) => input.addEventListener('change', () => { projectMilestonesNextRound[Number(input.dataset.projectMilestone)].done = input.checked; localStorage.setItem('projectMilestones', JSON.stringify(projectMilestonesNextRound)); })); }; renderProjectMilestonesNext(); milestoneBox.querySelector('#addProjectMilestoneNext').addEventListener('click', () => { const title = prompt('What project milestone should you add?'); if (!title?.trim()) return; projectMilestonesNextRound.push({ title: title.trim(), done: false }); localStorage.setItem('projectMilestones', JSON.stringify(projectMilestonesNextRound)); renderProjectMilestonesNext(); }); }

  const researchListNextRound = document.querySelector('#researchList'); const researchFilterNextRound = document.createElement('select'); researchFilterNextRound.className = 'refinement-select'; researchFilterNextRound.innerHTML = '<option value="all">All references</option><option value="pdf">PDFs</option><option value="link">Links</option><option value="note">Notes</option>'; document.querySelector('.research-card .advanced-heading')?.append(researchFilterNextRound); const applyResearchFilterNextRound = () => { const filter = researchFilterNextRound.value; [...(researchListNextRound?.children || [])].forEach((row) => { const text = row.textContent.toLowerCase(); row.hidden = filter !== 'all' && !text.includes(filter); }); }; researchFilterNextRound.addEventListener('change', applyResearchFilterNextRound);

  const businessSummaryNextRound = document.createElement('div'); businessSummaryNextRound.className = 'summary-strip'; const businessListNextRound = document.querySelector('#businessList'); businessListNextRound?.after(businessSummaryNextRound); const renderBusinessSummaryNextRound = () => { const saved = readNextRound('personalBusinesses'); const visible = [...(businessListNextRound?.children || [])].length; const latest = saved.slice(-1)[0]; businessSummaryNextRound.innerHTML = `<span class="summary-chip"><strong>${visible}</strong> visible work spaces</span><span class="summary-chip"><strong>${saved.length}</strong> added businesses</span><span class="summary-chip">${latest ? `Latest: ${escapeText(latest.name)}` : 'Add a business to begin'}</span>`; }; renderBusinessSummaryNextRound(); if (businessListNextRound) new MutationObserver(renderBusinessSummaryNextRound).observe(businessListNextRound, { childList: true });

  const contentIdeasNextRound = readNextRound('contentIdeas'); const contentBoardsNextRound = [...document.querySelectorAll('#content .content-board')].slice(0, 2); contentIdeasNextRound.forEach((idea) => { const board = idea.status === 'draft' ? contentBoardsNextRound[1] : contentBoardsNextRound[0]; if (!board || [...board.querySelectorAll('.idea-item')].some((row) => row.textContent.includes(idea.title))) return; const row = document.createElement('div'); row.className = 'idea-item'; row.dataset.contentIdea = 'true'; row.innerHTML = `<span>${idea.status === 'draft' ? '◒' : '✦'}</span><div><strong>${escapeText(idea.title)}</strong><small>${escapeText(idea.detail || 'Saved content idea')} · ${escapeText(idea.createdAt || '')}</small></div><button>···</button>`; board.append(row); });
  const contentHubNextRound = document.querySelector('#content .content-hub-grid'); const renderContentCountsNextRound = () => { [...(contentHubNextRound?.querySelectorAll('.content-board') || [])].forEach((board) => { const count = board.querySelector('.board-heading span:last-child'); const items = board.querySelectorAll('.idea-item').length; if (count && count.textContent !== String(items)) count.textContent = String(items); }); }; renderContentCountsNextRound(); document.querySelectorAll('#addContent, #addDraft').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderContentCountsNextRound, 80))); if (contentHubNextRound) contentHubNextRound.querySelectorAll('.content-board').forEach((board) => new MutationObserver(renderContentCountsNextRound).observe(board, { childList: true }));

  const accountHistoryCardNextRound = document.createElement('div'); accountHistoryCardNextRound.className = 'history-mini-card'; document.querySelector('#accountInsights .account-performance')?.after(accountHistoryCardNextRound); const renderAccountHistoryNextRound = () => { const history = readNextRound('accountAnalyticsHistory'); const recent = history.filter((item) => item.account === selectedCreatorAccount).slice(-3).reverse(); accountHistoryCardNextRound.innerHTML = `<p class="eyebrow">Account history</p><strong>${recent.length} saved update${recent.length === 1 ? '' : 's'} for ${escapeText(selectedCreatorAccount)}</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.followers)} followers · ${escapeText(item.engagement)} engagement`).join(' · ') || 'Update an account to build a private performance timeline.'}</small>`; }; renderAccountHistoryNextRound(); document.querySelectorAll('#accountSelector [data-account]').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderAccountHistoryNextRound, 50))); document.querySelector('#updateAccountInsights')?.addEventListener('click', () => window.setTimeout(renderAccountHistoryNextRound, 80));

  const relationshipItemsNextRound = document.querySelector('#relationshipItems'); const relationshipSummaryNextRound = document.createElement('div'); relationshipSummaryNextRound.className = 'summary-strip'; relationshipItemsNextRound?.after(relationshipSummaryNextRound); const renderRelationshipSummaryNextRound = () => { const items = readNextRound('relationshipItems'); const counts = items.reduce((map, item) => { map[item.type] = (map[item.type] || 0) + 1; return map; }, {}); relationshipSummaryNextRound.innerHTML = `<span class="summary-chip"><strong>${items.length}</strong> relationship ideas</span>${Object.entries(counts).slice(0, 4).map(([type, count]) => `<span class="summary-chip"><strong>${count}</strong> ${escapeText(type)}</span>`).join('')}`; }; renderRelationshipSummaryNextRound(); if (relationshipItemsNextRound) new MutationObserver(renderRelationshipSummaryNextRound).observe(relationshipItemsNextRound, { childList: true });

  const visionActionsNextRound = document.querySelector('#visionBoard .vision-actions'); const visionFilterNextRound = document.createElement('select'); visionFilterNextRound.className = 'refinement-select'; visionFilterNextRound.innerHTML = '<option value="all">All visions</option>'; [...new Set(visionItems.map((item) => item.category || 'My vision'))].forEach((category) => { const option = document.createElement('option'); option.value = category; option.textContent = category; visionFilterNextRound.append(option); }); visionActionsNextRound?.append(visionFilterNextRound); const applyVisionFilterNextRound = () => { const filter = visionFilterNextRound.value; document.querySelectorAll('#visionBoardGrid .vision-card:not(.add-card)').forEach((card) => { card.hidden = filter !== 'all' && card.querySelector('.vision-category')?.textContent !== filter; }); }; applyVisionFilterNextRound(); if (document.querySelector('#visionBoardGrid')) new MutationObserver(applyVisionFilterNextRound).observe(document.querySelector('#visionBoardGrid'), { childList: true }); visionFilterNextRound.addEventListener('change', applyVisionFilterNextRound);

  const backupToolsNextRound = document.querySelector('.backup-tools'); const backupFeedbackNextRound = document.createElement('span'); backupFeedbackNextRound.className = 'backup-feedback'; backupToolsNextRound?.append(backupFeedbackNextRound); const setBackupFeedbackNextRound = (message) => { backupFeedbackNextRound.textContent = message; }; document.querySelector('#exportData')?.addEventListener('click', () => setTimeout(() => setBackupFeedbackNextRound(`Backup prepared ${new Date().toLocaleTimeString()}`), 100)); document.querySelector('#importFile')?.addEventListener('change', (event) => { const file = event.target.files?.[0]; if (file) setBackupFeedbackNextRound(`Checking ${file.name} · ${Math.round(file.size / 1024)} KB`); });

  const recurringExpensesNextRound = readNextRound('recurringExpenses'); const financeBreakdownNextRound = document.querySelector('#financeBreakdown'); if (financeBreakdownNextRound && !document.querySelector('#recurringExpensesCard')) { const card = document.createElement('article'); card.id = 'recurringExpensesCard'; card.className = 'recurring-expenses-card'; card.innerHTML = '<div class="advanced-heading"><div><p class="eyebrow">Recurring expenses</p><h3>Remember the things that repeat.</h3></div><button type="button" class="refinement-button" id="addRecurringExpenseNext">＋ Add</button></div><div class="recurring-expense-list"></div>'; financeBreakdownNextRound.append(card); const list = card.querySelector('.recurring-expense-list'); const renderRecurringNextRound = () => { const monthly = recurringExpensesNextRound.reduce((sum, item) => sum + (item.frequency === 'weekly' ? Number(item.amount) * 4.345 : item.frequency === 'yearly' ? Number(item.amount) / 12 : Number(item.amount)), 0); list.innerHTML = recurringExpensesNextRound.map((item, index) => `<div class="recurring-expense-row"><span>${escapeText(item.name)}</span><small>${escapeText(item.frequency)} · ${escapeText(item.nextDate || 'date to add')}</small><strong>KSh ${Number(item.amount).toLocaleString()}</strong><button type="button" data-recurring-delete="${index}" aria-label="Delete recurring expense">×</button></div>`).join('') || '<small>No recurring expenses added yet.</small>'; const total = card.querySelector('.recurring-total') || document.createElement('p'); total.className = 'recurring-total'; total.innerHTML = `<strong>About KSh ${Math.round(monthly).toLocaleString()}</strong><small>estimated monthly repeat cost</small>`; if (!total.parentElement) card.append(total); }; renderRecurringNextRound(); card.querySelector('#addRecurringExpenseNext').addEventListener('click', () => { const name = prompt('What repeats?'); const amount = Number(prompt('Amount in KSh:')); const frequency = prompt('Frequency: monthly, weekly, or yearly?', 'monthly')?.trim().toLowerCase(); const nextDate = prompt('Next payment date or note:'); if (!name?.trim() || Number.isNaN(amount) || amount <= 0) return; recurringExpensesNextRound.push({ name: name.trim(), amount, frequency: ['weekly', 'yearly'].includes(frequency) ? frequency : 'monthly', nextDate: nextDate?.trim() || '' }); localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpensesNextRound)); renderRecurringNextRound(); }); list.addEventListener('click', (event) => { const button = event.target.closest('[data-recurring-delete]'); if (!button || !confirm('Delete this recurring expense?')) return; recurringExpensesNextRound.splice(Number(button.dataset.recurringDelete), 1); localStorage.setItem('recurringExpenses', JSON.stringify(recurringExpensesNextRound)); renderRecurringNextRound(); }); }
});
// Next thirty-task pass: deeper school, money, content, wellbeing, relationship, and backup tools.
window.addEventListener('load', () => {
  const readThirty = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const currentDateThirty = new Date(); const currentKeyThirty = currentDateThirty.toISOString().slice(0, 10); const monthKeyThirty = currentKeyThirty.slice(0, 7);
  const schoolOverview = document.querySelector('#schoolOverview');
  if (schoolOverview) {
    const readOverviewList = (key) => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
    const settingsOverview = JSON.parse(localStorage.getItem('dashboardSettings') || '{}');
    const totalOverview = Number(settingsOverview.totalUnits || 134); const completedOverview = Number(settingsOverview.completedUnits || 76); const pendingOverview = Math.max(0, totalOverview - completedOverview);
    const unitsOverview = document.querySelector('#schoolOverviewUnits'); const unitsDetailOverview = document.querySelector('#schoolOverviewUnitsDetail'); const unitsBarOverview = document.querySelector('#schoolOverviewUnitsBar');
    if (unitsOverview) unitsOverview.textContent = `${completedOverview} / ${totalOverview}`; if (unitsDetailOverview) unitsDetailOverview.textContent = `${pendingOverview} units remaining`; if (unitsBarOverview) unitsBarOverview.style.width = `${Math.min(100, completedOverview / Math.max(totalOverview, 1) * 100)}%`;
    const examOverview = readOverviewList('examEntries').filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)).sort((a, b) => a.date.localeCompare(b.date)); const nextExamOverview = examOverview.find((item) => item.date >= currentKeyThirty) || examOverview[0]; const examCodeOverview = document.querySelector('#schoolOverviewExam'); const examDetailOverview = document.querySelector('#schoolOverviewExamDetail');
    if (nextExamOverview) { if (examCodeOverview) examCodeOverview.textContent = nextExamOverview.code || nextExamOverview.name; if (examDetailOverview) examDetailOverview.textContent = `${new Date(`${nextExamOverview.date}T00:00:00`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })} · ${nextExamOverview.time || 'Time to confirm'}`; } else { if (examCodeOverview) examCodeOverview.textContent = 'Dates pending'; if (examDetailOverview) examDetailOverview.textContent = 'Add dates when the timetable is released'; }
    const weekStartOverview = new Date(currentDateThirty); weekStartOverview.setDate(weekStartOverview.getDate() - 6); const weekStartKeyOverview = weekStartOverview.toISOString().slice(0, 10); const studyOverview = readOverviewList('studySessions').filter((item) => item.date >= weekStartKeyOverview); const studyMinutesOverview = studyOverview.reduce((sum, item) => sum + (Number(String(item.duration || '').match(/[0-9.]+/)?.[0]) || 0), 0); const studyLabelOverview = document.querySelector('#schoolOverviewStudy'); const studyDetailOverview = document.querySelector('#schoolOverviewStudyDetail'); if (studyLabelOverview) studyLabelOverview.textContent = `${studyMinutesOverview} min`; if (studyDetailOverview) studyDetailOverview.textContent = `${studyOverview.length} session${studyOverview.length === 1 ? '' : 's'} logged this week`;
    const prepOverview = readOverviewList('examPrepItems'); const prepAverageOverview = prepOverview.length ? Math.round(prepOverview.reduce((sum, item) => sum + Number(item.progress || 0), 0) / prepOverview.length) : 0; const prepLabelOverview = document.querySelector('#schoolOverviewPrep'); const prepDetailOverview = document.querySelector('#schoolOverviewPrepDetail'); if (prepLabelOverview) prepLabelOverview.textContent = `${prepAverageOverview}%`; if (prepDetailOverview) prepDetailOverview.textContent = prepOverview.length ? `${prepOverview.length} plan${prepOverview.length === 1 ? '' : 's'} tracked` : 'Add your first preparation plan';
  }
  const settingsThirty = JSON.parse(localStorage.getItem('dashboardSettings') || '{}'); const unitTotalThirty = Number(settingsThirty.totalUnits || 134); const unitDoneThirty = Number(settingsThirty.completedUnits || 76); const unitSummaryThirty = document.querySelector('#schoolHub .units-card .unit-summary'); const unitCountThirty = document.querySelector('#schoolHub .units-card .unit-count'); const unitBarThirty = document.querySelector('#schoolHub .units-card .unit-progress i'); if (unitCountThirty) unitCountThirty.textContent = `${document.querySelectorAll('#unitList > div').length} pending`; if (unitBarThirty) unitBarThirty.style.width = `${Math.min(100, unitDoneThirty / Math.max(unitTotalThirty, 1) * 100)}%`; if (unitSummaryThirty) unitSummaryThirty.innerHTML = `<div><strong>${unitTotalThirty}</strong><small>Total units</small></div><div><strong>${unitDoneThirty}</strong><small>Completed</small></div><div><strong>${Math.max(0, unitTotalThirty - unitDoneThirty)}</strong><small>Remaining</small></div>`;

  const dueItemsThirty = readThirty('dueItems'); const dueSummaryThirty = document.createElement('div'); dueSummaryThirty.className = 'summary-strip'; document.querySelector('#dueSoon .section-title')?.after(dueSummaryThirty); const renderDueSummaryThirty = () => { const items = readThirty('dueItems'); const open = items.filter((item) => !item.done).length; const done = items.filter((item) => item.done).length; dueSummaryThirty.innerHTML = `<span class="summary-chip"><strong>${open}</strong> open reminders</span><span class="summary-chip"><strong>${done}</strong> completed</span>`; }; renderDueSummaryThirty(); document.querySelector('#dueList')?.addEventListener('change', renderDueSummaryThirty);

  const calendarActionsThirty = document.querySelector('#calendar .calendar-actions'); if (calendarActionsThirty && !document.querySelector('#exportCalendarIcs')) { const todayButton = document.createElement('button'); todayButton.type = 'button'; todayButton.className = 'small-link'; todayButton.textContent = 'Today'; calendarActionsThirty.append(todayButton); todayButton.addEventListener('click', () => { calendarView = new Date(); renderCalendar(); renderUpcoming(); }); const exportButton = document.createElement('button'); exportButton.id = 'exportCalendarIcs'; exportButton.type = 'button'; exportButton.className = 'small-link'; exportButton.textContent = '↓ ICS'; calendarActionsThirty.append(exportButton); exportButton.addEventListener('click', () => { const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//My Little Life//EN']; calendarEvents.forEach((event) => { lines.push('BEGIN:VEVENT', `UID:${event.date}-${event.title.replace(/[^a-z0-9]/gi, '')}@mylittlelife`, `DTSTART;VALUE=DATE:${event.date.replaceAll('-', '')}`, `SUMMARY:${event.title.replaceAll(',', '\\,')}`, `DESCRIPTION:${String(event.meta || '').replaceAll(',', '\\,')}`, 'END:VEVENT'); }); lines.push('END:VCALENDAR'); const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-calendar-${currentKeyThirty}.ics`; link.click(); URL.revokeObjectURL(url); }); }

  const importantThirty = readThirty('importantDates'); const importantListThirty = document.querySelector('#importantDateList'); const parseDateThirty = (value) => { const parsed = Date.parse(String(value || '')); return Number.isNaN(parsed) ? null : new Date(parsed); }; const addImportantCountdownsThirty = () => { [...(importantListThirty?.querySelectorAll('.important-date-row') || [])].forEach((row) => { if (row.querySelector('.important-countdown')) return; const dateText = row.querySelector('time')?.textContent; const date = parseDateThirty(dateText); if (!date) return; const days = Math.ceil((date - new Date()) / 86400000); const small = document.createElement('small'); small.className = 'important-countdown'; small.textContent = days >= 0 ? `${days} days away` : 'Date passed'; row.querySelector('time')?.after(small); }); }; addImportantCountdownsThirty(); if (importantListThirty) new MutationObserver(addImportantCountdownsThirty).observe(importantListThirty, { childList: true });

  const incomeEntriesThirty = readThirty('incomeEntries'); const incomeCardThirty = document.createElement('article'); incomeCardThirty.className = 'income-tracker-card'; const workHubThirty = document.querySelector('#workHub .work-layout'); workHubThirty?.append(incomeCardThirty); const renderIncomeThirty = () => { const entries = incomeEntriesThirty.filter((item) => String(item.date).startsWith(monthKeyThirty)); const total = entries.reduce((sum, item) => sum + Number(item.amount || 0), 0); incomeCardThirty.innerHTML = `<p class="eyebrow">Income log</p><strong>KSh ${total.toLocaleString()}</strong><small>${entries.length} payment${entries.length === 1 ? '' : 's'} this month</small><button type="button" class="detail-link" id="addIncomeThirty">＋ Log income</button>`; incomeCardThirty.querySelector('#addIncomeThirty').addEventListener('click', () => { const amount = Number(prompt('Income received in KSh:')); const source = prompt('Where did it come from?'); if (Number.isNaN(amount) || amount <= 0 || !source?.trim()) return; incomeEntriesThirty.unshift({ amount, source: source.trim(), date: currentKeyThirty }); localStorage.setItem('incomeEntries', JSON.stringify(incomeEntriesThirty.slice(0, 100))); renderIncomeThirty(); renderCashflowThirty(); }); }; const cashflowCardThirty = document.createElement('article'); cashflowCardThirty.className = 'cashflow-card'; document.querySelector('#financeBreakdown .finance-detail-grid')?.after(cashflowCardThirty); const renderCashflowThirty = () => { const income = incomeEntriesThirty.filter((item) => String(item.date).startsWith(monthKeyThirty)).reduce((sum, item) => sum + Number(item.amount || 0), 0); const spending = Object.values(categoryExpenses).reduce((sum, value) => sum + Number(value || 0), 0); cashflowCardThirty.innerHTML = `<p class="eyebrow">Monthly cash flow</p><strong class="${income - spending >= 0 ? 'cashflow-positive' : 'cashflow-negative'}">${income - spending >= 0 ? '+' : ''}KSh ${(income - spending).toLocaleString()}</strong><small>KSh ${income.toLocaleString()} income · KSh ${spending.toLocaleString()} logged spending</small>`; }; renderIncomeThirty(); renderCashflowThirty(); document.querySelectorAll('#addCategorizedExpense, #addExpense').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderCashflowThirty, 80)));

  const nutritionHistoryThirty = readThirty('nutritionHistory'); const nutritionHostThirty = document.querySelector('#mealLog .nutrition-card'); const nutritionHistoryCardThirty = document.createElement('div'); nutritionHistoryCardThirty.className = 'history-mini-card'; nutritionHostThirty?.append(nutritionHistoryCardThirty); const renderNutritionThirty = () => { const recent = nutritionHistoryThirty.slice(-4).reverse(); nutritionHistoryCardThirty.innerHTML = `<p class="eyebrow">Nourishment reflections</p><strong>${nutritionHistoryThirty.length} note${nutritionHistoryThirty.length === 1 ? '' : 's'} saved</strong><small>${recent.map((item) => `${escapeText(item.date)} · ${escapeText(item.text)}`).join(' · ') || 'Save a note about energy, appetite, or ease.'}</small>`; }; renderNutritionThirty(); document.querySelector('#saveNutrition')?.addEventListener('click', () => { const text = document.querySelector('#nutritionNote')?.value.trim(); if (!text) return; nutritionHistoryThirty.push({ date: currentKeyThirty, text }); localStorage.setItem('nutritionHistory', JSON.stringify(nutritionHistoryThirty.slice(-60))); renderNutritionThirty(); });

  const mentalNotesThirty = readThirty('mentalHealthNotes'); const mentalDetailThirty = document.querySelector('.mind-detail'); if (mentalDetailThirty && !document.querySelector('#addMentalNoteThirty')) { const button = document.createElement('button'); button.id = 'addMentalNoteThirty'; button.type = 'button'; button.className = 'detail-link'; button.textContent = '＋ Add private note'; mentalDetailThirty.append(button); const card = document.createElement('div'); card.className = 'history-mini-card'; mentalDetailThirty.append(card); const renderMentalNotesThirty = () => { card.innerHTML = `<p class="eyebrow">Private check-in notes</p><strong>${mentalNotesThirty.length} note${mentalNotesThirty.length === 1 ? '' : 's'} saved</strong><small>${mentalNotesThirty.slice(-3).reverse().map((item) => `${escapeText(item.date)} · ${escapeText(item.text)}`).join(' · ') || 'Add context when a mood needs more than one word.'}`; }; renderMentalNotesThirty(); button.addEventListener('click', () => { const text = prompt('What do you want to remember about this check-in?'); if (!text?.trim()) return; mentalNotesThirty.push({ date: currentKeyThirty, text: text.trim() }); localStorage.setItem('mentalHealthNotes', JSON.stringify(mentalNotesThirty.slice(-60))); renderMentalNotesThirty(); }); }

  const studyTimerHistoryThirty = readThirty('studyTimerHistory'); const timerCardThirty = document.querySelector('.timer-card'); if (timerCardThirty && !document.querySelector('#saveFocusBlockThirty')) { const button = document.createElement('button'); button.id = 'saveFocusBlockThirty'; button.type = 'button'; button.className = 'detail-link'; button.textContent = '＋ Save focus block'; timerCardThirty.append(button); const historyCard = document.createElement('div'); historyCard.className = 'history-mini-card'; timerCardThirty.append(historyCard); const renderTimerHistoryThirty = () => { const minutes = studyTimerHistoryThirty.reduce((sum, item) => sum + Number(item.minutes || 0), 0); historyCard.innerHTML = `<p class="eyebrow">Focus history</p><strong>${minutes} minutes saved</strong><small>${studyTimerHistoryThirty.slice(-3).reverse().map((item) => `${escapeText(item.date)} · ${item.minutes} min`).join(' · ') || 'Save a focus block after a study session.'}</small>`; }; renderTimerHistoryThirty(); button.addEventListener('click', () => { const minutes = Number(prompt('How many focused minutes?', '25')); if (Number.isNaN(minutes) || minutes <= 0) return; studyTimerHistoryThirty.push({ date: currentKeyThirty, minutes }); localStorage.setItem('studyTimerHistory', JSON.stringify(studyTimerHistoryThirty.slice(-100))); renderTimerHistoryThirty(); }); }

  const studyWeekCardThirty = document.createElement('article'); studyWeekCardThirty.className = 'study-week-card'; document.querySelector('#studyTools .study-tools-grid')?.append(studyWeekCardThirty); const studySessionsThirty = readThirty('studySessions'); const renderStudyWeekThirty = () => { const days = [...Array(7)].map((_, offset) => { const day = new Date(); day.setDate(day.getDate() - (6 - offset)); const key = day.toISOString().slice(0, 10); return { key, minutes: studySessionsThirty.filter((item) => item.date === key).reduce((sum, item) => sum + (Number(String(item.duration || '').match(/[0-9.]+/)?.[0]) || 0), 0) }; }); const max = Math.max(...days.map((day) => day.minutes), 1); studyWeekCardThirty.innerHTML = `<p class="eyebrow">Study week</p><strong>${days.reduce((sum, day) => sum + day.minutes, 0)} minutes recorded</strong><div class="study-week-bars">${days.map((day) => `<i style="height:${Math.max(8, day.minutes / max * 100)}%" title="${day.minutes} minutes"></i>`).join('')}</div><small>Logged study time across the last seven days.</small>`; }; renderStudyWeekThirty(); document.querySelector('#addStudyLog')?.addEventListener('click', () => window.setTimeout(renderStudyWeekThirty, 80));

  const lecturerCardThirty = document.createElement('article'); lecturerCardThirty.className = 'lecturer-directory-card'; document.querySelector('#schoolHub .units-card')?.after(lecturerCardThirty); const renderLecturersThirty = () => { const names = [...(document.querySelectorAll('#unitList small') || [])].map((item) => item.textContent.split('·')[0].trim()).filter(Boolean); const counts = names.reduce((map, name) => { map[name] = (map[name] || 0) + 1; return map; }, {}); lecturerCardThirty.innerHTML = `<p class="eyebrow">Lecturer directory</p><strong>${Object.keys(counts).length} lecturer${Object.keys(counts).length === 1 ? '' : 's'} in your visible units</strong><small>${Object.entries(counts).slice(0, 6).map(([name, count]) => `${escapeText(name)} · ${count} unit${count === 1 ? '' : 's'}`).join(' · ') || 'Add units with lecturer names to build this directory.'}</small>`; }; renderLecturersThirty();

  const examEntriesThirty = readThirty('examEntries'); const examListThirty = document.querySelector('#examList'); examEntriesThirty.forEach((item) => { if (!examListThirty || [...examListThirty.children].some((row) => row.textContent.includes(item.code) && row.textContent.includes(item.name))) return; const row = document.createElement('div'); row.innerHTML = `<span class="exam-code">${escapeText(item.code)}</span><section><strong>${escapeText(item.name)}</strong><small>Final date: ${escapeText(item.date)} · ${escapeText(item.time || 'Time to confirm')}</small>${item.venue ? `<small>Venue: ${escapeText(item.venue)}</small>` : ''}${item.lecturer || item.classYear ? `<small>${item.lecturer ? `Lecturer: ${escapeText(item.lecturer)}` : ''}${item.lecturer && item.classYear ? ' · ' : ''}${item.classYear ? `Class: ${escapeText(item.classYear)}` : ''}</small>` : ''}</section><b>${escapeText(item.date)}</b>`; examListThirty.append(row); }); const examLogSummaryThirty = document.createElement('div'); examLogSummaryThirty.className = 'summary-strip'; document.querySelector('#examList')?.after(examLogSummaryThirty); const futureExamEntriesThirty = examEntriesThirty.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date) && item.date >= currentKeyThirty); examLogSummaryThirty.innerHTML = `<span class="summary-chip"><strong>${examEntriesThirty.length}</strong> saved exam dates</span><span class="summary-chip"><strong>${futureExamEntriesThirty.length}</strong> upcoming added dates</span>`;

  const projectMilestoneListThirty = document.querySelector('#projectMilestonesNext .project-milestone-list'); const renderProjectProgressThirty = () => { const items = readThirty('projectMilestones'); const done = items.filter((item) => item.done).length; const bar = document.querySelector('.project-card .project-bar i'); if (bar && items.length) bar.style.width = `${Math.round(done / items.length * 100)}%`; }; renderProjectProgressThirty(); projectMilestoneListThirty?.addEventListener('change', () => window.setTimeout(renderProjectProgressThirty, 60));

  const researchListThirty = document.querySelector('#researchList'); const decorateResearchLinksThirty = () => { [...(researchListThirty?.children || [])].forEach((row) => { if (row.querySelector('.research-open-link')) return; const match = row.textContent.match(/https?:\/\/[^\s]+/); if (!match) return; const link = document.createElement('a'); link.className = 'research-open-link'; link.href = match[0]; link.target = '_blank'; link.rel = 'noopener'; link.textContent = 'Open'; row.append(link); }); }; decorateResearchLinksThirty(); if (researchListThirty) new MutationObserver(decorateResearchLinksThirty).observe(researchListThirty, { childList: true });

  const businessesThirty = readThirty('personalBusinesses'); const businessStatusesThirty = JSON.parse(localStorage.getItem('businessStatuses') || '{}'); const businessListThirty = document.querySelector('#businessList'); const decorateBusinessStatusThirty = () => { [...(businessListThirty?.querySelectorAll('.saved-custom-row') || [])].slice(-businessesThirty.length).forEach((row, index) => { if (row.querySelector('[data-business-status]')) return; const button = document.createElement('button'); button.type = 'button'; button.className = 'business-status-button'; button.dataset.businessStatus = index; button.textContent = businessStatusesThirty[businessesThirty[index].name] || 'Set status'; row.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const status = prompt('Status: active, paused, or completed?', button.textContent); if (!status?.trim()) return; businessStatusesThirty[businessesThirty[index].name] = status.trim(); localStorage.setItem('businessStatuses', JSON.stringify(businessStatusesThirty)); button.textContent = status.trim(); }); }); }; decorateBusinessStatusThirty(); if (businessListThirty) new MutationObserver(decorateBusinessStatusThirty).observe(businessListThirty, { childList: true });

  const deadlineThirty = readThirty('workDeadlines'); const workDeadlineCardThirty = document.createElement('div'); workDeadlineCardThirty.className = 'work-deadline-card'; document.querySelector('#workHub .work-layout')?.after(workDeadlineCardThirty); const renderDeadlinesThirty = () => { workDeadlineCardThirty.innerHTML = `<div class="inline-actions"><div><p class="eyebrow">Work deadlines</p><strong>${deadlineThirty.length} planned milestone${deadlineThirty.length === 1 ? '' : 's'}</strong></div><button type="button" class="refinement-button" id="addWorkDeadlineThirty">＋ Add</button></div>${deadlineThirty.map((item, index) => `<div class="work-deadline-row"><span>${escapeText(item.date)}</span><strong>${escapeText(item.title)}</strong><button type="button" data-work-deadline-delete="${index}" aria-label="Delete work deadline">×</button></div>`).join('') || '<small>Add a deadline for Leridia, PlayMechi, Exampoa, or medical influencing.</small>'}`; workDeadlineCardThirty.querySelector('#addWorkDeadlineThirty').addEventListener('click', () => { const title = prompt('Work milestone:'); const date = prompt('Date or timeframe:'); if (!title?.trim() || !date?.trim()) return; deadlineThirty.push({ title: title.trim(), date: date.trim() }); localStorage.setItem('workDeadlines', JSON.stringify(deadlineThirty)); renderDeadlinesThirty(); }); workDeadlineCardThirty.querySelectorAll('[data-work-deadline-delete]').forEach((button) => button.addEventListener('click', () => { deadlineThirty.splice(Number(button.dataset.workDeadlineDelete), 1); localStorage.setItem('workDeadlines', JSON.stringify(deadlineThirty)); renderDeadlinesThirty(); })); }; renderDeadlinesThirty();

  const contentHubThirty = document.querySelector('#content .content-hub-grid'); const platformFilterThirty = document.createElement('select'); platformFilterThirty.className = 'refinement-select'; platformFilterThirty.innerHTML = '<option value="all">All platforms</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="youtube">YouTube</option><option value="facebook">Facebook</option>'; document.querySelector('#content .section-title')?.append(platformFilterThirty); const applyPlatformFilterThirty = () => { const filter = platformFilterThirty.value; contentHubThirty?.querySelectorAll('.idea-item').forEach((item) => { item.hidden = filter !== 'all' && !item.textContent.toLowerCase().includes(filter); }); }; platformFilterThirty.addEventListener('change', applyPlatformFilterThirty);

  const pipelineSummaryThirty = document.createElement('div'); pipelineSummaryThirty.className = 'summary-strip'; document.querySelector('#contentPipeline .pipeline-grid')?.after(pipelineSummaryThirty); const renderPipelineSummaryThirty = () => { const columns = [...(document.querySelectorAll('#pipelineGrid > article') || [])]; pipelineSummaryThirty.innerHTML = columns.map((column) => `<span class="summary-chip"><strong>${column.querySelectorAll('.pipeline-post').length}</strong> ${escapeText(column.querySelector('.pipeline-heading strong')?.textContent || 'posts')}</span>`).join(''); }; renderPipelineSummaryThirty(); const pipelineGridThirty = document.querySelector('#pipelineGrid'); if (pipelineGridThirty) new MutationObserver(renderPipelineSummaryThirty).observe(pipelineGridThirty, { childList: true, subtree: true });

  const decoratePublishedDatesThirty = () => { document.querySelectorAll('.pipeline-post').forEach((card) => { const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); if (!post?.publishedAt || card.querySelector('.published-date')) return; const date = document.createElement('small'); date.className = 'published-date'; date.textContent = `Published ${post.publishedAt}`; card.append(date); }); }; decoratePublishedDatesThirty(); if (pipelineGridThirty) new MutationObserver(decoratePublishedDatesThirty).observe(pipelineGridThirty, { childList: true, subtree: true });

  const accountGrowthThirty = document.createElement('div'); accountGrowthThirty.className = 'summary-strip'; document.querySelector('#accountInsights .account-performance')?.after(accountGrowthThirty); const renderAccountGrowthThirty = () => { const history = readThirty('accountAnalyticsHistory'); const recent = history.filter((item) => item.account === selectedCreatorAccount).slice(-2); const latest = recent[recent.length - 1]; const previous = recent[recent.length - 2]; const currentFollowers = Number(String(latest?.followers || creatorAccountData[selectedCreatorAccount]?.followers || 0).replaceAll(',', '').replace(/[^0-9.]/g, '')) || 0; const oldFollowers = Number(String(previous?.followers || 0).replaceAll(',', '').replace(/[^0-9.]/g, '')) || 0; accountGrowthThirty.innerHTML = `<span class="summary-chip"><strong>${previous ? `${currentFollowers - oldFollowers >= 0 ? '+' : ''}${(currentFollowers - oldFollowers).toLocaleString()}` : '—'}</strong> follower change since last saved update</span>`; }; renderAccountGrowthThirty(); document.querySelectorAll('#accountSelector [data-account]').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderAccountGrowthThirty, 60))); document.querySelector('#updateAccountInsights')?.addEventListener('click', () => window.setTimeout(renderAccountGrowthThirty, 80));

  const peopleNoteHistoryThirty = readThirty('peopleNoteHistory'); const peopleNoteCardThirty = document.createElement('div'); peopleNoteCardThirty.className = 'history-mini-card'; document.querySelector('.connection-card')?.append(peopleNoteCardThirty); const renderPeopleNotesThirty = () => { peopleNoteCardThirty.innerHTML = `<p class="eyebrow">People reflections</p><strong>${peopleNoteHistoryThirty.length} private note${peopleNoteHistoryThirty.length === 1 ? '' : 's'}</strong><small>${peopleNoteHistoryThirty.slice(-3).reverse().map((item) => `${escapeText(item.date)} · ${escapeText(item.text)}`).join(' · ') || 'Your relationship and boundary notes will appear here.'}`; }; renderPeopleNotesThirty(); document.querySelector('#savePeopleNote')?.addEventListener('click', () => { const text = document.querySelector('#peopleNote')?.value.trim(); if (!text) return; peopleNoteHistoryThirty.push({ date: currentKeyThirty, text }); localStorage.setItem('peopleNoteHistory', JSON.stringify(peopleNoteHistoryThirty.slice(-60))); renderPeopleNotesThirty(); });

  const relationshipFeelHistoryThirty = readThirty('relationshipFeelHistory'); const relationshipFeelCardThirty = document.createElement('div'); relationshipFeelCardThirty.className = 'history-mini-card'; document.querySelector('.connection-card')?.append(relationshipFeelCardThirty); const renderRelationshipFeelThirty = () => { relationshipFeelCardThirty.innerHTML = `<p class="eyebrow">Relationship feeling history</p><strong>${relationshipFeelHistoryThirty.length} check-in${relationshipFeelHistoryThirty.length === 1 ? '' : 's'}</strong><small>${relationshipFeelHistoryThirty.slice(-4).reverse().map((item) => `${escapeText(item.date)} · ${escapeText(item.feel)}`).join(' · ') || 'Choose a feeling to start noticing what you need.'}`; }; renderRelationshipFeelThirty(); document.querySelectorAll('.connection-scale button').forEach((button) => button.addEventListener('click', () => { const feel = button.querySelector('small')?.textContent || button.textContent; relationshipFeelHistoryThirty.push({ date: currentKeyThirty, feel }); localStorage.setItem('relationshipFeelHistory', JSON.stringify(relationshipFeelHistoryThirty.slice(-60))); renderRelationshipFeelThirty(); }));

  const birthdayCardThirty = document.createElement('div'); birthdayCardThirty.className = 'birthday-countdown-card'; document.querySelector('#peopleHub .people-layout')?.after(birthdayCardThirty); const renderBirthdaysThirty = () => { const people = readThirty('peopleDirectory'); const upcoming = people.map((person) => { const date = parseDateThirty(person.birthday); if (!date) return null; const next = new Date(currentDateThirty.getFullYear(), date.getMonth(), date.getDate()); if (next < currentDateThirty) next.setFullYear(next.getFullYear() + 1); return { ...person, days: Math.ceil((next - currentDateThirty) / 86400000) }; }).filter(Boolean).sort((a, b) => a.days - b.days).slice(0, 3); birthdayCardThirty.innerHTML = `<p class="eyebrow">Birthday countdowns</p><strong>${upcoming.length ? upcoming.map((person) => `${escapeText(person.name)} · ${person.days}d`).join(' · ') : 'Add birthdays to your people directory'}</strong><small>Keep gifts, favours, and thoughtful messages on your radar.</small>`; }; renderBirthdaysThirty();

  const journalCountThirty = document.createElement('small'); journalCountThirty.className = 'journal-word-count'; quickNote?.after(journalCountThirty); const renderJournalCountThirty = () => { const text = quickNote?.value.trim() || ''; journalCountThirty.textContent = `${text ? text.split(/\s+/).length : 0} words · ${text.length} characters`; }; renderJournalCountThirty(); quickNote?.addEventListener('input', renderJournalCountThirty);

  const visionExportThirty = document.createElement('button'); visionExportThirty.type = 'button'; visionExportThirty.className = 'small-link'; visionExportThirty.textContent = '↓ Export board'; document.querySelector('#visionBoard .vision-actions')?.append(visionExportThirty); visionExportThirty.addEventListener('click', () => { const markdown = `# My vision board\n\n${visionItems.map((item) => `## ${item.title}\n\n**${item.category || 'My vision'}**\n\n${item.text || ''}`).join('\n\n')}`; const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-vision-board-${currentKeyThirty}.md`; link.click(); URL.revokeObjectURL(url); });

  const integrityThirty = document.createElement('div'); integrityThirty.className = 'backup-integrity-card'; const dataManagementThirty = document.querySelector('#dataManagement .data-management-card'); dataManagementThirty?.append(integrityThirty); const renderIntegrityThirty = () => { const keys = Object.keys(localStorage); const jsonKeys = keys.filter((key) => { try { JSON.parse(localStorage.getItem(key)); return true; } catch { return false; } }); const size = keys.reduce((sum, key) => sum + (localStorage.getItem(key)?.length || 0), 0); integrityThirty.innerHTML = `<p class="eyebrow">Backup health</p><strong>${keys.length} saved keys · ${Math.round(size / 1024)} KB</strong><small>${jsonKeys.length} JSON collections readable · Export a backup before clearing anything.</small>`; }; renderIntegrityThirty();
});
// Next thirty-task pass: customization, editable histories, smarter filters, and privacy polish.
window.addEventListener('load', () => {
  const readNext30b = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const settingsCard30b = document.querySelector('.settings-card');
  if (settingsCard30b && !document.querySelector('#accentChoice30b')) { const label = document.createElement('label'); label.innerHTML = 'Accent color<select id="accentChoice30b"><option value="#db8b9f">Rose</option><option value="#b38bd9">Lavender</option><option value="#7eaf9b">Sage</option><option value="#e6a16b">Peach</option></select></label>'; settingsCard30b.querySelector('.settings-grid')?.append(label); const select = label.querySelector('select'); select.value = localStorage.getItem('accentColor') || '#db8b9f'; const apply = () => { document.documentElement.style.setProperty('--coral', select.value); document.documentElement.style.setProperty('--pink', select.value); localStorage.setItem('accentColor', select.value); }; select.addEventListener('change', apply); apply(); const compact = document.createElement('label'); compact.innerHTML = '<input type="checkbox" id="compactMode30b"> Compact layout'; settingsCard30b.querySelector('.settings-grid')?.append(compact); const compactInput = compact.querySelector('input'); compactInput.checked = localStorage.getItem('compactMode') === 'true'; document.body.classList.toggle('compact-layout', compactInput.checked); compactInput.addEventListener('change', () => { document.body.classList.toggle('compact-layout', compactInput.checked); localStorage.setItem('compactMode', compactInput.checked); }); }

  const printSection30b = document.createElement('div'); printSection30b.className = 'print-section-control'; printSection30b.innerHTML = '<select aria-label="Choose section to print"><option value="all">Print full dashboard</option><option value="schoolHub">Print school center</option><option value="workHub">Print work planner</option><option value="content">Print content</option><option value="journalArchive">Print journal</option></select><button type="button">Print selection</button>'; document.querySelector('#dataManagement .data-management-card')?.append(printSection30b); printSection30b.querySelector('button').addEventListener('click', () => { const target = printSection30b.querySelector('select').value; const sections = [...document.querySelectorAll('main > section')]; const hidden = sections.filter((section) => target !== 'all' && section.id !== target); hidden.forEach((section) => { section.dataset.printHidden30b = 'true'; section.hidden = true; }); window.print(); window.setTimeout(() => hidden.forEach((section) => { section.hidden = false; delete section.dataset.printHidden30b; }), 500); });

  const scope30b = document.querySelector('#backupScope'); if (scope30b && !scope30b.querySelector('.backup-scope-count30b')) { const count = document.createElement('small'); count.className = 'backup-scope-count30b'; scope30b.append(count); const update = () => { const checked = scope30b.querySelectorAll('[data-backup-group]:checked'); count.textContent = checked.length === 1 && checked[0].dataset.backupGroup === 'all' ? 'All saved data selected' : `${checked.length} backup group${checked.length === 1 ? '' : 's'} selected`; }; update(); scope30b.addEventListener('change', update); }
  const importStatus30b = document.createElement('small'); importStatus30b.className = 'import-validation30b'; document.querySelector('.backup-tools')?.append(importStatus30b); document.querySelector('#importFile')?.addEventListener('change', (event) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const backup = JSON.parse(reader.result); const valid = backup.app === 'my little life' && backup.data && typeof backup.data === 'object'; importStatus30b.textContent = valid ? `Valid dashboard backup · ${Object.keys(backup.data).length} keys` : 'Backup format needs review'; } catch { importStatus30b.textContent = 'Could not read this JSON file'; } }; reader.readAsText(file); });

  const storageWarning30b = document.createElement('small'); storageWarning30b.className = 'storage-warning30b'; const dataCard30b = document.querySelector('#dataManagement .data-management-card'); dataCard30b?.append(storageWarning30b); const storageSize30b = Object.keys(localStorage).reduce((sum, key) => sum + (localStorage.getItem(key)?.length || 0), 0); storageWarning30b.textContent = storageSize30b > 4000000 ? 'Storage is getting full · export a backup soon.' : `Local storage: ${Math.round(storageSize30b / 1024)} KB used.`;

  const searchCategory30b = document.createElement('select'); searchCategory30b.className = 'refinement-select'; searchCategory30b.innerHTML = '<option value="all">All search results</option><option value="school">School</option><option value="work">Work</option><option value="content">Content</option><option value="people">People</option><option value="finance">Finance</option>'; document.querySelector('#dashboardSearch .search-box')?.after(searchCategory30b); const applySearchCategory30b = () => { const category = searchCategory30b.value; const targets = { school: ['schoolHub', 'studyTools', 'examPrep'], work: ['workHub', 'businessKpis', 'contentPipeline'], content: ['content', 'analytics', 'contentPipeline'], people: ['people', 'peopleDetails', 'relationshipHub'], finance: ['finance', 'financeBreakdown', 'savingsGoals'] }; document.querySelectorAll('#searchResults [data-target]').forEach((item) => { item.hidden = category !== 'all' && !targets[category]?.includes(item.dataset.target); }); }; searchCategory30b.addEventListener('change', applySearchCategory30b); document.querySelector('#dashboardSearchInput')?.addEventListener('input', () => window.setTimeout(applySearchCategory30b, 120));

  const completionSummary30b = document.createElement('div'); completionSummary30b.className = 'global-completion30b'; document.querySelector('#home .welcome-card')?.after(completionSummary30b); const renderCompletion30b = () => { const checks = [...document.querySelectorAll('input[type="checkbox"]')]; const done = checks.filter((input) => input.checked).length; completionSummary30b.innerHTML = `<span><strong>${done}</strong> completed controls</span><span><strong>${Math.max(0, checks.length - done)}</strong> still open</span>`; }; renderCompletion30b(); document.addEventListener('change', (event) => { if (event.target.matches('input[type="checkbox"]')) renderCompletion30b(); });

  const recurring30b = readNext30b('recurringEvents'); const recurringCard30b = document.createElement('div'); recurringCard30b.className = 'recurring-manager30b'; document.querySelector('#calendar .calendar-layout')?.after(recurringCard30b); const renderRecurring30b = () => { const rows = recurring30b.map((item, index) => `<div><strong>${escapeText(item.title)}</strong><small>${escapeText(item.start)} · ${escapeText(item.frequency)}</small><button type="button" data-recurring-edit30b="${index}">Edit</button><button type="button" data-recurring-delete30b="${index}">×</button></div>`).join(''); recurringCard30b.innerHTML = `<p class="eyebrow">Recurring events</p>${rows || '<small>No recurring events saved.</small>'}`; recurringCard30b.querySelectorAll('[data-recurring-edit30b]').forEach((button) => button.addEventListener('click', () => { const item = recurring30b[Number(button.dataset.recurringEdit30b)]; const title = prompt('Event title:', item.title); const start = prompt('First date:', item.start); if (!title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return; Object.assign(item, { title: title.trim(), start }); localStorage.setItem('recurringEvents', JSON.stringify(recurring30b)); renderRecurring30b(); })); recurringCard30b.querySelectorAll('[data-recurring-delete30b]').forEach((button) => button.addEventListener('click', () => { recurring30b.splice(Number(button.dataset.recurringDelete30b), 1); localStorage.setItem('recurringEvents', JSON.stringify(recurring30b)); renderRecurring30b(); })); }; renderRecurring30b();

  const savingsGoals30b = document.querySelector('#savingsList'); const decorateSavingsDates30b = () => { [...(savingsGoals30b?.querySelectorAll('article') || [])].forEach((row, index) => { if (row.querySelector('[data-goal-date30b]')) return; const button = document.createElement('button'); button.type = 'button'; button.dataset.goalDate30b = index; button.className = 'goal-date30b'; button.textContent = 'Set target date'; row.append(button); button.addEventListener('click', () => { const goal = savingsGoals[index]; const date = prompt('Target date (YYYY-MM-DD):', goal.targetDate || ''); if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return; goal.targetDate = date; localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals)); button.textContent = `Target ${date}`; }); }); }; decorateSavingsDates30b(); if (savingsGoals30b) new MutationObserver(decorateSavingsDates30b).observe(savingsGoals30b, { childList: true });
  const contributionBreakdown30b = document.createElement('div'); contributionBreakdown30b.className = 'summary-strip'; const contributions30b = readNext30b('savingsContributions'); const groupedContributions30b = contributions30b.reduce((map, item) => { map[item.goal] = (map[item.goal] || 0) + Number(item.amount || 0); return map; }, {}); contributionBreakdown30b.innerHTML = Object.entries(groupedContributions30b).map(([goal, amount]) => `<span class="summary-chip"><strong>KSh ${amount.toLocaleString()}</strong> ${escapeText(goal)}</span>`).join('') || '<span class="summary-chip">Goal contributions will be grouped here.</span>'; savingsGoals30b?.after(contributionBreakdown30b);

  const incomeBreakdown30b = document.createElement('div'); incomeBreakdown30b.className = 'summary-strip'; const income30b = readNext30b('incomeEntries'); const incomeSources30b = income30b.reduce((map, item) => { map[item.source] = (map[item.source] || 0) + Number(item.amount || 0); return map; }, {}); incomeBreakdown30b.innerHTML = Object.entries(incomeSources30b).map(([source, amount]) => `<span class="summary-chip"><strong>KSh ${amount.toLocaleString()}</strong> ${escapeText(source)}</span>`).join('') || '<span class="summary-chip">Income sources will appear here.</span>'; document.querySelector('.income-history-card')?.after(incomeBreakdown30b);

  const workAnalytics30b = document.createElement('div'); workAnalytics30b.className = 'work-week-chart30b'; const work30b = readNext30b('workLogEntries'); const workDays30b = [...Array(7)].map((_, offset) => { const day = new Date(); day.setDate(day.getDate() - (6 - offset)); const key = day.toISOString().slice(0, 10); return { key, hours: work30b.filter((item) => item.date === key).reduce((sum, item) => sum + Number(item.hours || 0), 0) }; }); const maxWork30b = Math.max(...workDays30b.map((item) => item.hours), 1); workAnalytics30b.innerHTML = `<p class="eyebrow">Work week</p><strong>${workDays30b.reduce((sum, item) => sum + item.hours, 0)} hours across 7 days</strong><div>${workDays30b.map((item) => `<i style="height:${Math.max(8, item.hours / maxWork30b * 100)}%" title="${item.hours} hours"></i>`).join('')}</div>`; document.querySelector('.work-history-card')?.after(workAnalytics30b);

  const businessSummary30b = document.createElement('div'); businessSummary30b.className = 'summary-strip'; const refreshBusiness30b = () => { const statuses = JSON.parse(localStorage.getItem('businessStatuses') || '{}'); const values = Object.values(statuses); businessSummary30b.innerHTML = `<span class="summary-chip"><strong>${values.filter((value) => value === 'active').length}</strong> active</span><span class="summary-chip"><strong>${values.filter((value) => value === 'paused').length}</strong> paused</span><span class="summary-chip"><strong>${values.filter((value) => value === 'completed').length}</strong> completed</span>`; }; document.querySelector('#businessList')?.after(businessSummary30b); refreshBusiness30b(); document.querySelector('#businessList')?.addEventListener('click', () => window.setTimeout(refreshBusiness30b, 50));

  const deadlineCard30b = document.querySelector('.work-deadline-card'); const deadlines30b = readNext30b('workDeadlines'); if (deadlineCard30b && !deadlineCard30b.querySelector('[data-deadline-edit30b]')) { deadlineCard30b.querySelectorAll('.work-deadline-row').forEach((row, index) => { const edit = document.createElement('button'); edit.type = 'button'; edit.dataset.deadlineEdit30b = index; edit.textContent = 'Edit'; row.append(edit); edit.addEventListener('click', () => { const item = deadlines30b[index]; const title = prompt('Milestone:', item.title); const date = prompt('Date:', item.date); if (!title?.trim() || !date?.trim()) return; Object.assign(item, { title: title.trim(), date: date.trim() }); localStorage.setItem('workDeadlines', JSON.stringify(deadlines30b)); window.location.reload(); }); }); }

  const selectedAccount30b = localStorage.getItem('selectedCreatorAccount'); if (selectedAccount30b) { const accountButton = document.querySelector(`#accountSelector [data-account="${CSS.escape(selectedAccount30b)}"]`); if (accountButton) accountButton.click(); } document.querySelectorAll('#accountSelector [data-account]').forEach((button) => button.addEventListener('click', () => localStorage.setItem('selectedCreatorAccount', button.dataset.account)));
  const accountChart30b = document.createElement('div'); accountChart30b.className = 'account-history-chart30b'; document.querySelector('#accountInsights .account-performance')?.after(accountChart30b); const renderAccountChart30b = () => { const values = readNext30b('accountAnalyticsHistory').filter((item) => item.account === selectedCreatorAccount).map((item) => Number(String(item.followers).replaceAll(',', '').replace(/[^0-9.]/g, '')) || 0).slice(-8); const max = Math.max(...values, 1); accountChart30b.innerHTML = `<p class="eyebrow">Follower history</p><div>${values.map((value) => `<i style="height:${Math.max(8, value / max * 100)}%" title="${value.toLocaleString()}"></i>`).join('') || '<small>Save account updates to build this chart.</small>'}</div>`; }; renderAccountChart30b(); document.querySelectorAll('#accountSelector [data-account]').forEach((button) => button.addEventListener('click', () => window.setTimeout(renderAccountChart30b, 50))); document.querySelector('#updateAccountInsights')?.addEventListener('click', () => window.setTimeout(renderAccountChart30b, 80));

  const pipelineSearch30b = document.createElement('input'); pipelineSearch30b.type = 'search'; pipelineSearch30b.className = 'pipeline-search30b'; pipelineSearch30b.placeholder = 'Search posts'; document.querySelector('#contentPipeline .section-title')?.append(pipelineSearch30b); pipelineSearch30b.addEventListener('input', () => { const query = pipelineSearch30b.value.toLowerCase(); document.querySelectorAll('.pipeline-post').forEach((card) => { card.hidden = Boolean(query) && !card.textContent.toLowerCase().includes(query); }); });
  document.querySelectorAll('.pipeline-post').forEach((card) => { if (card.querySelector('[data-pipeline-status30b]')) return; const select = document.createElement('select'); select.dataset.pipelineStatus30b = 'true'; select.innerHTML = '<option value="0">Planned</option><option value="1">Creating</option><option value="2">Scheduled</option><option value="3">Published</option>'; const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); if (post) select.value = post.status; card.append(select); select.addEventListener('change', (event) => { event.stopPropagation(); if (!post) return; post.status = Number(select.value); if (post.status === 3 && !post.publishedAt) post.publishedAt = new Date().toISOString().slice(0, 10); localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); window.location.reload(); }); });

  document.querySelectorAll('#content .idea-item').forEach((item) => { if (item.querySelector('[data-idea-edit30b]')) return; const edit = document.createElement('button'); edit.type = 'button'; edit.dataset.ideaEdit30b = 'true'; edit.textContent = 'Edit'; item.append(edit); edit.addEventListener('click', (event) => { event.stopPropagation(); const oldTitle = item.querySelector('strong')?.textContent || ''; const next = prompt('Idea title:', oldTitle); if (!next?.trim()) return; const ideas = readNext30b('contentIdeas'); const match = ideas.find((idea) => idea.title === oldTitle); if (match) { match.title = next.trim(); localStorage.setItem('contentIdeas', JSON.stringify(ideas)); } item.querySelector('strong').textContent = next.trim(); }); });
  document.querySelectorAll('#content .idea-item').forEach((item) => { if (item.querySelector('[data-idea-delete30b]')) return; const remove = document.createElement('button'); remove.type = 'button'; remove.dataset.ideaDelete30b = 'true'; remove.textContent = '×'; remove.className = 'idea-delete30b'; item.append(remove); remove.addEventListener('click', (event) => { event.stopPropagation(); const title = item.querySelector('strong')?.textContent || ''; const ideas = readNext30b('contentIdeas').filter((idea) => idea.title !== title); localStorage.setItem('contentIdeas', JSON.stringify(ideas)); item.remove(); }); });

  const unitFilter30b = document.createElement('select'); unitFilter30b.className = 'refinement-select'; unitFilter30b.innerHTML = '<option value="all">All units</option><option value="year 4.3">Year 4.3</option><option value="year 3">Year 3</option>'; const lecturerFilter30b = document.createElement('select'); lecturerFilter30b.className = 'refinement-select'; lecturerFilter30b.innerHTML = '<option value="all">All lecturers</option>'; [...new Set([...document.querySelectorAll('#unitList small')].map((row) => row.textContent.split('·')[0].trim()).filter(Boolean))].forEach((name) => { const option = document.createElement('option'); option.value = name.toLowerCase(); option.textContent = name; lecturerFilter30b.append(option); }); document.querySelector('#schoolHub .units-card .advanced-heading')?.append(unitFilter30b, lecturerFilter30b); const applyUnitFilters30b = () => document.querySelectorAll('#unitList > div').forEach((row) => { const text = row.textContent.toLowerCase(); row.hidden = (unitFilter30b.value !== 'all' && !text.includes(unitFilter30b.value)) || (lecturerFilter30b.value !== 'all' && !text.includes(lecturerFilter30b.value)); }); unitFilter30b.addEventListener('change', applyUnitFilters30b); lecturerFilter30b.addEventListener('change', applyUnitFilters30b); const bulkUnit30b = document.createElement('button'); bulkUnit30b.type = 'button'; bulkUnit30b.className = 'small-link'; bulkUnit30b.textContent = 'Mark visible complete'; document.querySelector('#schoolHub .units-card .advanced-heading')?.append(bulkUnit30b); bulkUnit30b.addEventListener('click', () => document.querySelectorAll('#unitList [data-unit-progress]').forEach((input) => { if (!input.closest('[hidden]')) { input.checked = true; input.dispatchEvent(new Event('change', { bubbles: true })); } }));

  const examActions30b = document.querySelectorAll('#examPrepList article'); const examNext30b = JSON.parse(localStorage.getItem('examNextActions') || '{}'); examActions30b.forEach((row) => { if (row.querySelector('[data-exam-next30b]')) return; const unit = row.querySelector('strong')?.textContent || ''; const button = document.createElement('button'); button.type = 'button'; button.dataset.examNext30b = 'true'; button.className = 'exam-next30b'; button.textContent = examNext30b[unit] || 'Add next action'; row.append(button); button.addEventListener('click', () => { const next = prompt('Next exam-prep action:', examNext30b[unit] || ''); if (!next?.trim()) return; examNext30b[unit] = next.trim(); localStorage.setItem('examNextActions', JSON.stringify(examNext30b)); button.textContent = next.trim(); }); });

  const scheduleRows30b = [...(document.querySelectorAll('#scheduleEntries p') || [])]; const scheduleConflicts30b = scheduleRows30b.reduce((map, row) => { const key = row.textContent.match(/(Monday|Tuesday|Wednesday|Thursday|Friday).*?(\d{1,2}:\d{2})/i)?.slice(1).join(' '); if (key) (map[key] ||= []).push(row); return map; }, {}); const conflictKeys30b = Object.keys(scheduleConflicts30b).filter((key) => scheduleConflicts30b[key].length > 1); const scheduleConflict30b = document.createElement('small'); scheduleConflict30b.className = 'schedule-conflict30b'; scheduleConflict30b.textContent = conflictKeys30b.length ? `Schedule conflicts: ${conflictKeys30b.join(', ')}` : 'No timetable conflicts detected.'; document.querySelector('#scheduleEntries')?.after(scheduleConflict30b);

  const wellbeingOverview30b = document.createElement('div'); wellbeingOverview30b.className = 'wellbeing-overview30b'; const moods30b = readNext30b('moodHistory', {}); const workouts30b = readNext30b('workoutHistory'); const meals30b = readNext30b('mealLogs'); const lastSeven30b = Object.keys(moods30b).filter((key) => key >= new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)).length; wellbeingOverview30b.innerHTML = `<p class="eyebrow">Wellbeing week</p><strong>${lastSeven30b} mood check-ins · ${workouts30b.length} workouts · ${meals30b.length} meals logged</strong><small>A gentle snapshot of how you have been caring for yourself.</small>`; document.querySelector('#moodHistory .mood-history-card')?.after(wellbeingOverview30b);

  const overdueContacts30b = document.createElement('div'); overdueContacts30b.className = 'overdue-contacts30b'; const peopleHistory30b = readNext30b('peopleContactHistory'); const latestByGroup30b = peopleHistory30b.reduce((map, item) => { map[item.group] = item.date; return map; }, {}); const stale30b = Object.entries(latestByGroup30b).filter(([, date]) => (Date.now() - new Date(`${date}T00:00:00`)) / 86400000 > 14); overdueContacts30b.innerHTML = `<p class="eyebrow">Connection nudge</p><strong>${stale30b.length ? `${stale30b.length} group${stale30b.length === 1 ? '' : 's'} may need a check-in` : 'Your connection rhythm looks current'}</strong><small>${stale30b.map(([group]) => escapeText(group)).join(' · ') || 'Keep reaching out in ways that feel genuine.'}</small>`; document.querySelector('#peopleDetails .people-detail-grid')?.after(overdueContacts30b);

  const gratitudeExport30b = document.createElement('button'); gratitudeExport30b.type = 'button'; gratitudeExport30b.className = 'small-link'; gratitudeExport30b.textContent = '↓ Export gratitude'; document.querySelector('.reflection-detail .detail-head')?.append(gratitudeExport30b); gratitudeExport30b.addEventListener('click', () => { const rows = [['Date', 'Reflection'], ...readNext30b('gratitudeHistory').map((item) => [item.date, item.text])]; const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replaceAll('"', '""')}"`).join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `charry-gratitude-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); });

  const privacyCard30b = document.createElement('div'); privacyCard30b.className = 'privacy-status30b'; const renderPrivacy30b = () => { privacyCard30b.innerHTML = `<strong>${navigator.onLine ? 'Online' : 'Offline mode'}</strong><small>${navigator.onLine ? 'Your local dashboard is connected.' : 'Everything continues to save on this device.'} · Privacy mode is ${document.body.classList.contains('privacy-mode') ? 'on' : 'off'}.</small>`; }; document.querySelector('footer.footer')?.before(privacyCard30b); renderPrivacy30b(); window.addEventListener('online', renderPrivacy30b); window.addEventListener('offline', renderPrivacy30b);
});
// Next thirty-task pass: operational controls for calendars, money, content, school, and relationships.
window.addEventListener('load', () => {
  const readNext30 = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  const date30 = new Date().toISOString().slice(0, 10);
  const addCalendarEvent30 = (date, title, meta = 'Personal event') => { if (!date || !title || calendarEvents.some((event) => event.date === date && event.title === title)) return; calendarEvents.push({ date, title, meta, color: 'coral-event' }); localStorage.setItem('calendarEvents', JSON.stringify(calendarEvents)); renderCalendar(); renderUpcoming(); };

  document.querySelector('#calendarDays')?.addEventListener('dblclick', (event) => { const day = event.target.closest('[data-date]'); if (!day) return; const title = prompt(`Add an event on ${day.dataset.date}:`); const meta = prompt('Category or time:'); if (title?.trim()) addCalendarEvent30(day.dataset.date, title.trim(), meta?.trim() || 'Personal event'); });
  const recurringEvents30 = readNext30('recurringEvents'); const calendarActions30 = document.querySelector('#calendar .calendar-actions'); if (calendarActions30 && !document.querySelector('#addRecurringEvent30')) { const button = document.createElement('button'); button.id = 'addRecurringEvent30'; button.type = 'button'; button.className = 'small-link'; button.textContent = '＋ Repeat'; calendarActions30.append(button); button.addEventListener('click', () => { const title = prompt('What should repeat?'); const start = prompt('First date (YYYY-MM-DD):'); const frequency = prompt('Frequency: weekly or monthly?', 'monthly')?.trim().toLowerCase(); const meta = prompt('Category or note:'); if (!title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(start)) return; recurringEvents30.push({ title: title.trim(), start, frequency: frequency === 'weekly' ? 'weekly' : 'monthly', meta: meta?.trim() || 'Recurring event' }); localStorage.setItem('recurringEvents', JSON.stringify(recurringEvents30)); syncRecurringEvents30(); }); }
  const syncRecurringEvents30 = () => { recurringEvents30.forEach((item, index) => { for (let step = 0; step < 8; step += 1) { const day = new Date(`${item.start}T00:00:00`); if (item.frequency === 'weekly') day.setDate(day.getDate() + step * 7); else day.setMonth(day.getMonth() + step); const date = day.toISOString().slice(0, 10); addCalendarEvent30(date, `${item.title} · repeat`, item.meta); } }); }; syncRecurringEvents30();

  const dueSort30 = document.createElement('select'); dueSort30.className = 'refinement-select'; dueSort30.innerHTML = '<option value="soon">Soonest first</option><option value="new">Newest added</option><option value="open">Open first</option>'; document.querySelector('#dueSoon .section-title')?.append(dueSort30); dueSort30.addEventListener('change', () => { const list = document.querySelector('#dueList'); if (!list) return; const rows = [...list.children]; rows.sort((a, b) => dueSort30.value === 'open' ? Number(a.style.opacity === '0.55') - Number(b.style.opacity === '0.55') : dueSort30.value === 'new' ? b.textContent.localeCompare(a.textContent) : a.textContent.localeCompare(b.textContent)); rows.forEach((row) => list.append(row)); }); document.querySelectorAll('#dueList .due-date').forEach((dateNode) => { const raw = dateNode.textContent.trim(); const parsed = Date.parse(raw); if (!Number.isNaN(parsed)) { const days = Math.ceil((parsed - new Date()) / 86400000); const row = dateNode.closest('div'); const label = row?.querySelector('b'); if (label && !label.dataset.relative) { label.dataset.relative = 'true'; label.textContent = days >= 0 ? `${days} days` : 'passed'; } } });

  const importantList30 = document.querySelector('#importantDateList'); if (importantList30 && !importantList30.querySelector('.sync-important-date')) { const syncButton = document.createElement('button'); syncButton.className = 'sync-important-date refinement-button'; syncButton.type = 'button'; syncButton.textContent = '＋ Sync a date to calendar'; importantList30.before(syncButton); syncButton.addEventListener('click', () => { const dates = readNext30('importantDates'); const title = prompt('Which saved date should sync?'); const item = dates.find((entry) => entry.title.toLowerCase() === title?.trim().toLowerCase()) || dates[0]; if (item && /^\d{4}-\d{2}-\d{2}$/.test(item.date)) addCalendarEvent30(item.date, item.title, `Personal · ${item.person || 'Important date'}`); }); }

  const savingsContributions30 = readNext30('savingsContributions'); const savingsList30 = document.querySelector('#savingsList'); const contributionCard30 = document.createElement('div'); contributionCard30.className = 'savings-contribution-card'; savingsList30?.after(contributionCard30); const renderSavingsHistory30 = () => { const total = savingsContributions30.reduce((sum, item) => sum + Number(item.amount || 0), 0); contributionCard30.innerHTML = `<p class="eyebrow">Contribution history</p><strong>KSh ${total.toLocaleString()} recorded</strong><small>${savingsContributions30.slice(-4).reverse().map((item) => `${escapeText(item.date)} · ${escapeText(item.goal)} · KSh ${Number(item.amount).toLocaleString()}`).join(' · ') || 'Record contributions to see your savings rhythm.'}<button type="button" class="detail-link" id="addSavingsContribution30">＋ Log contribution</button></small>`; contributionCard30.querySelector('#addSavingsContribution30').addEventListener('click', () => { const goal = prompt('Which savings goal?'); const amount = Number(prompt('Amount in KSh:')); if (!goal?.trim() || Number.isNaN(amount) || amount <= 0) return; savingsContributions30.push({ goal: goal.trim(), amount, date: date30 }); localStorage.setItem('savingsContributions', JSON.stringify(savingsContributions30.slice(-100))); const match = savingsGoals.find((item) => item.name.toLowerCase() === goal.trim().toLowerCase()); if (match) { match.saved = Number(match.saved || 0) + amount; localStorage.setItem('savingsGoals', JSON.stringify(savingsGoals)); renderSavings(); } renderSavingsHistory30(); }); }; renderSavingsHistory30();
  const decorateSavingsPercent30 = () => { [...(savingsList30?.querySelectorAll('article') || [])].forEach((row) => { if (row.querySelector('.savings-percent30')) return; const value = row.querySelector('strong')?.textContent.match(/[0-9,]+/g)?.map((item) => Number(item.replaceAll(',', ''))) || []; if (value.length < 2) return; const label = document.createElement('small'); label.className = 'savings-percent30'; label.textContent = `${Math.min(100, Math.round(value[0] / Math.max(value[1], 1) * 100))}% funded`; row.querySelector('.savings-bar')?.after(label); }); }; decorateSavingsPercent30(); if (savingsList30) new MutationObserver(decorateSavingsPercent30).observe(savingsList30, { childList: true });

  const ledger30 = document.querySelector('.ledger-card'); if (ledger30 && !ledger30.querySelector('.ledger-month-filter30')) { const filter = document.createElement('select'); filter.className = 'refinement-select ledger-month-filter30'; filter.innerHTML = '<option value="all">All months</option>'; const months = [...new Set(readNext30('expenseLedger').map((item) => String(item.date || '').slice(0, 7)).filter(Boolean))]; months.forEach((month) => { const option = document.createElement('option'); option.value = month; option.textContent = month; filter.append(option); }); ledger30.querySelector('.eyebrow')?.after(filter); filter.addEventListener('change', () => ledger30.querySelectorAll('.ledger-row').forEach((row) => { row.hidden = filter.value !== 'all' && !row.textContent.includes(filter.value); })); }

  const incomeHistory30 = readNext30('incomeEntries'); const incomeHistoryCard30 = document.createElement('div'); incomeHistoryCard30.className = 'income-history-card'; document.querySelector('#workHub .work-layout')?.after(incomeHistoryCard30); const renderIncomeHistory30 = () => { incomeHistoryCard30.innerHTML = `<p class="eyebrow">Income history</p>${incomeHistory30.slice(0, 6).map((item, index) => `<div><span>${escapeText(item.source)}</span><small>${escapeText(item.date)}</small><strong>KSh ${Number(item.amount).toLocaleString()}</strong><button type="button" data-income-delete30="${index}" aria-label="Delete income">×</button></div>`).join('') || '<small>No income entries yet.</small>'}`; incomeHistoryCard30.querySelectorAll('[data-income-delete30]').forEach((button) => button.addEventListener('click', () => { incomeHistory30.splice(Number(button.dataset.incomeDelete30), 1); localStorage.setItem('incomeEntries', JSON.stringify(incomeHistory30)); renderIncomeHistory30(); })); }; renderIncomeHistory30();

  const workHistory30 = readNext30('workLogEntries'); const workHistoryCard30 = document.createElement('div'); workHistoryCard30.className = 'work-history-card'; document.querySelector('#workHub .work-layout')?.after(workHistoryCard30); const renderWorkHistory30 = () => { workHistoryCard30.innerHTML = `<p class="eyebrow">Work session history</p>${workHistory30.slice(0, 6).map((item, index) => `<div><span>${escapeText(item.date)}</span><small>${escapeText(item.note)}</small><strong>${item.hours}h</strong><button type="button" data-work-delete30="${index}" aria-label="Delete work session">×</button></div>`).join('') || '<small>No sessions logged yet.</small>'}`; workHistoryCard30.querySelectorAll('[data-work-delete30]').forEach((button) => button.addEventListener('click', () => { workHistory30.splice(Number(button.dataset.workDelete30), 1); localStorage.setItem('workLogEntries', JSON.stringify(workHistory30)); renderWorkHistory30(); })); }; renderWorkHistory30();

  const savedAccounts30 = readNext30('contentAccounts'); const accountList30 = document.querySelector('#accountList'); const decorateAccountEdit30 = () => { [...(accountList30?.querySelectorAll('.saved-account-row') || [])].forEach((row, index) => { if (row.querySelector('[data-account-edit30]')) return; const button = document.createElement('button'); button.type = 'button'; button.dataset.accountEdit30 = index; button.className = 'account-edit30'; button.textContent = 'Edit'; row.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const account = savedAccounts30[index]; if (!account) return; const platform = prompt('Platform:', account.platform); const username = prompt('Handle:', account.username); const followers = prompt('Followers:', account.followers); if (!platform?.trim() || !username?.trim() || !followers?.trim()) return; Object.assign(account, { platform: platform.trim(), username: username.trim(), followers: followers.trim() }); localStorage.setItem('contentAccounts', JSON.stringify(savedAccounts30)); window.location.reload(); }); }); }; decorateAccountEdit30();

  const platformFilter30 = document.createElement('select'); platformFilter30.className = 'refinement-select'; platformFilter30.innerHTML = '<option value="all">All pipeline posts</option><option value="planned">Planned</option><option value="creating">Creating</option><option value="scheduled">Scheduled</option><option value="published">Published</option>'; document.querySelector('#contentPipeline .section-title')?.append(platformFilter30); platformFilter30.addEventListener('change', () => document.querySelectorAll('.pipeline-post').forEach((card) => { const column = card.closest('article')?.querySelector('.pipeline-heading strong')?.textContent.toLowerCase(); card.hidden = platformFilter30.value !== 'all' && column !== platformFilter30.value; }));
  const pipelineGrid30 = document.querySelector('#pipelineGrid'); const decorateDuplicate30 = () => { document.querySelectorAll('.pipeline-post').forEach((card) => { if (card.querySelector('[data-pipeline-duplicate30]')) return; const button = document.createElement('button'); button.type = 'button'; button.dataset.pipelineDuplicate30 = 'true'; button.className = 'pipeline-duplicate30'; button.textContent = 'Duplicate'; card.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const original = savedPipelinePosts.find((post) => post.id === card.dataset.pipelineId); if (!original) return; const copy = { ...original, id: `pipeline-${Date.now()}`, title: `${original.title} · copy`, status: 0, publishedAt: '' }; savedPipelinePosts.push(copy); localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); appendPipelinePost(copy); }); }); }; decorateDuplicate30(); if (pipelineGrid30) new MutationObserver(decorateDuplicate30).observe(pipelineGrid30, { childList: true, subtree: true });

  document.querySelectorAll('#content .idea-item').forEach((item) => { if (item.querySelector('[data-idea-pipeline30]')) return; const button = document.createElement('button'); button.type = 'button'; button.dataset.ideaPipeline30 = 'true'; button.className = 'idea-pipeline30'; button.textContent = 'Plan'; item.append(button); button.addEventListener('click', (event) => { event.stopPropagation(); const title = item.querySelector('strong')?.textContent; const platform = item.querySelector('small')?.textContent; if (!title || typeof appendPipelinePost !== 'function') return; appendPipelinePost({ id: `pipeline-${Date.now()}`, title, platform, status: 0, views: '', likes: '', comments: '' }, true); }); });

  const gratitude30 = readNext30('gratitudeHistory'); const gratitudeStreak30 = document.createElement('div'); gratitudeStreak30.className = 'history-mini-card'; document.querySelector('.reflection-detail')?.append(gratitudeStreak30); const renderGratitudeStreak30 = () => { const dates = new Set(gratitude30.map((item) => item.date)); let streak = 0; for (let i = 0; i < 365; i += 1) { const day = new Date(); day.setDate(day.getDate() - i); if (!dates.has(day.toISOString().slice(0, 10))) break; streak += 1; } gratitudeStreak30.innerHTML = `<p class="eyebrow">Gratitude streak</p><strong>${streak} day${streak === 1 ? '' : 's'}</strong><small>${gratitude30.length} total reflections saved.</small>`; }; renderGratitudeStreak30();

  const workout30 = readNext30('workoutHistory'); const workoutTotal30 = document.createElement('div'); workoutTotal30.className = 'summary-strip'; document.querySelector('#logWorkout')?.after(workoutTotal30); const renderWorkoutTotal30 = () => { const minutes = workout30.reduce((sum, item) => sum + (Number(String(item.duration || '').match(/[0-9.]+/)?.[0]) || 0), 0); workoutTotal30.innerHTML = `<span class="summary-chip"><strong>${minutes}</strong> minutes logged</span><span class="summary-chip"><strong>${workout30.length}</strong> sessions</span>`; }; renderWorkoutTotal30();

  const mealDateButton30 = document.createElement('button'); mealDateButton30.type = 'button'; mealDateButton30.className = 'small-link'; mealDateButton30.textContent = '＋ Log another date'; document.querySelector('#mealLog .section-title')?.append(mealDateButton30); mealDateButton30.addEventListener('click', () => { const date = prompt('Meal date (YYYY-MM-DD):', date30); const type = prompt('Breakfast, Lunch, or Dinner?'); const detail = prompt('What did you eat?'); if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !type?.trim() || !detail?.trim()) return; mealLogs.push({ date, type: type.trim().replace(/^./, (letter) => letter.toUpperCase()), detail: detail.trim() }); localStorage.setItem('mealLogs', JSON.stringify(mealLogs)); renderMealLogs(); });

  const rhythmSummary30 = document.createElement('div'); rhythmSummary30.className = 'summary-strip'; document.querySelector('.rhythm-card')?.append(rhythmSummary30); const renderRhythmSummary30 = () => { const data = JSON.parse(localStorage.getItem('rhythmData') || '{}'); const water = Number(String(data.water || '').match(/[0-9.]+/)?.[0]) || 0; const movement = Number(String(data.movement || '').match(/[0-9.]+/)?.[0]) || 0; const sleep = Number(String(data.sleep || '').match(/[0-9.]+/)?.[0]) || 0; rhythmSummary30.innerHTML = `<span class="summary-chip"><strong>${sleep || 0}h</strong> sleep</span><span class="summary-chip"><strong>${water}</strong> glasses</span><span class="summary-chip"><strong>${movement}</strong> movement min</span>`; }; renderRhythmSummary30(); document.querySelector('#editRhythm')?.addEventListener('click', () => window.setTimeout(renderRhythmSummary30, 80));

  const schedule30 = document.querySelector('#scheduleEntries'); const scheduleFilter30 = document.createElement('select'); scheduleFilter30.className = 'refinement-select'; scheduleFilter30.innerHTML = '<option value="all">All days</option><option>Monday</option><option>Tuesday</option><option>Wednesday</option><option>Thursday</option><option>Friday</option>'; document.querySelector('.timetable-editor-card .advanced-heading')?.append(scheduleFilter30); scheduleFilter30.addEventListener('change', () => schedule30?.querySelectorAll('p').forEach((row) => { row.hidden = scheduleFilter30.value !== 'all' && !row.textContent.toLowerCase().includes(scheduleFilter30.value.toLowerCase()); }));

  const unitPrepButton30 = document.createElement('button'); unitPrepButton30.type = 'button'; unitPrepButton30.className = 'small-link'; unitPrepButton30.textContent = '＋ Prep from unit'; document.querySelector('#schoolHub .section-title')?.append(unitPrepButton30); unitPrepButton30.addEventListener('click', () => { const rows = [...(document.querySelectorAll('#unitList > div') || [])]; const choice = prompt(`Unit name or number 1-${rows.length}:`); const row = rows[Number(choice) - 1] || rows.find((item) => item.textContent.toLowerCase().includes(String(choice || '').toLowerCase())); const unit = row?.querySelector('strong')?.textContent || choice; const code = row?.querySelector('span')?.textContent || 'Unit details to add'; if (!unit?.trim()) return; const items = readNext30('examPrepItems'); if (items.some((item) => item.unit === unit)) return; items.push({ unit, code, progress: 0 }); localStorage.setItem('examPrepItems', JSON.stringify(items)); window.location.reload(); });

  const examConflictCard30 = document.createElement('div'); examConflictCard30.className = 'exam-conflict-card'; document.querySelector('#examPrep .exam-prep-list')?.after(examConflictCard30); const examDates30 = calendarEvents.filter((event) => String(event.meta || '').toLowerCase().includes('exam')); const conflictMap30 = examDates30.reduce((map, event) => { (map[event.date] ||= []).push(event.title); return map; }, {}); const conflicts30 = Object.entries(conflictMap30).filter(([, items]) => items.length > 1); examConflictCard30.innerHTML = conflicts30.length ? `<strong>Exam date conflicts</strong><small>${conflicts30.map(([date, items]) => `${date}: ${items.map((item) => escapeText(item)).join(', ')}`).join(' · ')}</small>` : '<small>No exam-date conflicts detected.</small>';

  const milestoneList30 = document.querySelector('#projectMilestonesNext .project-milestone-list'); const projectItems30 = readNext30('projectMilestones'); const decorateMilestoneEdit30 = () => { milestoneList30?.querySelectorAll('label').forEach((row, index) => { if (row.querySelector('[data-milestone-edit30]')) return; const edit = document.createElement('button'); edit.type = 'button'; edit.dataset.milestoneEdit30 = index; edit.textContent = 'Edit'; edit.className = 'milestone-edit30'; row.append(edit); edit.addEventListener('click', (event) => { event.preventDefault(); const title = prompt('Milestone:', projectItems30[index]?.title); if (!title?.trim()) return; projectItems30[index].title = title.trim(); localStorage.setItem('projectMilestones', JSON.stringify(projectItems30)); window.location.reload(); }); }); }; decorateMilestoneEdit30(); if (milestoneList30) new MutationObserver(decorateMilestoneEdit30).observe(milestoneList30, { childList: true });

  const researchCounts30 = document.createElement('div'); researchCounts30.className = 'summary-strip'; document.querySelector('#researchList')?.after(researchCounts30); const researchRows30 = [...(document.querySelectorAll('#researchList > p') || [])]; const counts30 = researchRows30.reduce((map, row) => { const type = row.querySelector('span')?.textContent || 'NOTE'; map[type] = (map[type] || 0) + 1; return map; }, {}); researchCounts30.innerHTML = Object.entries(counts30).map(([type, count]) => `<span class="summary-chip"><strong>${count}</strong> ${escapeText(type)}</span>`).join('');

  const businessStatusSummary30 = document.createElement('div'); businessStatusSummary30.className = 'summary-strip'; document.querySelector('#businessList')?.after(businessStatusSummary30); const statuses30 = JSON.parse(localStorage.getItem('businessStatuses') || '{}'); const statusCounts30 = Object.values(statuses30).reduce((map, value) => { map[value] = (map[value] || 0) + 1; return map; }, {}); businessStatusSummary30.innerHTML = Object.entries(statusCounts30).map(([status, count]) => `<span class="summary-chip"><strong>${count}</strong> ${escapeText(status)}</span>`).join('') || '<span class="summary-chip">Set a business status to see your portfolio rhythm.</span>';

  const deadlineSync30 = document.querySelector('.work-deadline-card'); if (deadlineSync30 && !deadlineSync30.querySelector('#syncWorkDeadlines30')) { const button = document.createElement('button'); button.id = 'syncWorkDeadlines30'; button.type = 'button'; button.className = 'refinement-button'; button.textContent = 'Sync dated milestones'; deadlineSync30.querySelector('.inline-actions')?.append(button); button.addEventListener('click', () => readNext30('workDeadlines').filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date)).forEach((item) => addCalendarEvent30(item.date, item.title, 'Work · milestone'))); }

  const relationshipDates30 = readNext30('relationshipDates'); const relationshipDateCard30 = document.createElement('div'); relationshipDateCard30.className = 'relationship-date-card'; document.querySelector('#relationshipItems')?.after(relationshipDateCard30); const renderRelationshipDates30 = () => { relationshipDateCard30.innerHTML = `<p class="eyebrow">Relationship date planner</p>${relationshipDates30.map((item, index) => `<div><strong>${escapeText(item.title)}</strong><small>${escapeText(item.date)}</small><button type="button" data-relationship-date-delete30="${index}">×</button></div>`).join('') || '<small>Add dates, date ideas, or shared milestones.</small>'}<button type="button" class="detail-link" id="addRelationshipDate30">＋ Add date</button>`; relationshipDateCard30.querySelector('#addRelationshipDate30').addEventListener('click', () => { const title = prompt('Date or shared milestone:'); const date = prompt('Date (YYYY-MM-DD):'); if (!title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return; relationshipDates30.push({ title: title.trim(), date }); localStorage.setItem('relationshipDates', JSON.stringify(relationshipDates30)); addCalendarEvent30(date, title.trim(), 'Relationship'); renderRelationshipDates30(); }); relationshipDateCard30.querySelectorAll('[data-relationship-date-delete30]').forEach((button) => button.addEventListener('click', () => { relationshipDates30.splice(Number(button.dataset.relationshipDateDelete30), 1); localStorage.setItem('relationshipDates', JSON.stringify(relationshipDates30)); renderRelationshipDates30(); })); }; renderRelationshipDates30();

  const pipelineStatus30b = document.createElement('select'); pipelineStatus30b.className = 'refinement-select'; pipelineStatus30b.innerHTML = '<option value="all">All pipeline posts</option><option value="planned">Planned</option><option value="creating">Creating</option><option value="scheduled">Scheduled</option><option value="published">Published</option>'; document.querySelector('#contentPipeline .section-title')?.append(pipelineStatus30b); const pipelinePlatform30 = document.createElement('select'); pipelinePlatform30.className = 'refinement-select'; pipelinePlatform30.innerHTML = '<option value="all">All platforms</option>'; [...new Set(savedPipelinePosts.map((post) => post.platform).filter(Boolean))].forEach((platform) => { const option = document.createElement('option'); option.value = platform.toLowerCase(); option.textContent = platform; pipelinePlatform30.append(option); }); document.querySelector('#contentPipeline .section-title')?.append(pipelinePlatform30); const applyPipelineFilters30 = () => { const status = pipelineStatus30b.value; const platform = pipelinePlatform30.value; document.querySelectorAll('.pipeline-post').forEach((card) => { const column = card.closest('article')?.querySelector('.pipeline-heading strong')?.textContent.toLowerCase(); const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); card.hidden = (status !== 'all' && column !== status) || (platform !== 'all' && String(post?.platform || '').toLowerCase() !== platform); }); }; pipelineStatus30b.addEventListener('change', applyPipelineFilters30); pipelinePlatform30.addEventListener('change', applyPipelineFilters30);
  document.addEventListener('keydown', (event) => { if (event.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') { event.preventDefault(); document.querySelector('#dashboardSearchInput')?.focus(); } if (event.altKey && ['1', '2', '3'].includes(event.key)) { event.preventDefault(); const targets = { '1': 'home', '2': 'schoolHub', '3': 'content' }; document.querySelector(`#${targets[event.key]}`)?.scrollIntoView({ behavior: 'smooth' }); } }); document.querySelectorAll('button, select, input, textarea').forEach((control) => { if (!control.getAttribute('aria-label') && !control.id && !control.textContent.trim()) control.setAttribute('aria-label', 'Dashboard control'); });
});
