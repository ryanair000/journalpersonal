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
  item.innerHTML = `<span>${icon}</span><div><strong>${text.trim().replaceAll('<','&lt;')}</strong><small>${subtitle}</small></div><button>···</button>`;
  document.querySelector(selector).append(item);
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
  row.className = 'account-row';
  row.innerHTML = `<span class="platform-icon tiktok">✦</span><div><strong>${platform.trim().replaceAll('<','&lt;')}</strong><small>${username.trim().replaceAll('<','&lt;')}</small></div><b>${followers.trim().replaceAll('<','&lt;')}</b>`;
  document.querySelector('#accountList').append(row);
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
document.querySelector('#addWorkLog')?.addEventListener('click', () => {
  const hours = prompt('How many hours did you work?');
  if (hours) alert(`Logged ${hours} hour(s). Your work history can be expanded with income, clients, and project tracking next.`);
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
const userHeading = document.querySelector('.topbar h1');
if (userHeading) userHeading.innerHTML = 'Hi, Charry <span>♡</span>';

const units = [
  ['PBCU001', 'Research methods', 'Dr. Mungoma Michael'],
  ['BPT4204', 'Pharmacy management 3', 'Dr. Solomon Karanja'],
  ['BPC4202', 'Pharmaceutical Chemistry X', 'Dr. Epaphrodite Twahirwa'],
  ['BPA2203', 'Human pathology 3', 'Lecturer to add'],
  ['BPL4203', 'Pharmacology XI', 'Dr. Samuel Wainaina'],
  ['BPC4204', 'Pharmaceutical Chemistry XII', 'Lecturer to add'],
  ['BPL4105', 'Pharmacology VII', 'Dr. Dennis Opwoko'],
  ['BPL4201', 'Pharmacology IX', 'Dr. Dennis Opwoko'],
  ['BPL4205', 'Clinical pharmacy IV', 'Dr. Arwa Nath'],
  ['BPL5101', 'Clinical pharmacy V', 'Dr. Arwa Nath'],
  ['BPT3102', 'Pharmaceutics 2', 'Dr. Rose Obat']
];
const unitList = document.querySelector('#unitList');
if (unitList) {
  unitList.innerHTML = units.map(([code, name, lecturer]) => `<div><span>${escapeText(code)}</span><strong>${escapeText(name)}</strong><small>${escapeText(lecturer)} · Year 4.3</small></div>`).join('');
  document.querySelector('#schoolHub .unit-count').textContent = '11 current';
  units[3][2] = 'Dr. Jediel & Dr. Lucy Githaga';
  units[5][2] = 'Dr. Lucy Githaga';
  unitList.innerHTML = units.map(([code, name, lecturer]) => `<div><span>${escapeText(code)}</span><strong>${escapeText(name)}</strong><small>${escapeText(lecturer)} · Year 4.3</small></div>`).join('');
  document.querySelector('.unit-summary').innerHTML = '<div><strong>134</strong><small>Total units</small></div><div><strong>76</strong><small>Completed</small></div><div><strong>58</strong><small>Remaining</small></div>';
  const timetableCard = document.querySelector('.timetable-card');
  const timetableNote = document.createElement('p');
  timetableNote.className = 'detail-hint';
  timetableNote.textContent = 'Classes complete · final exam dates not released yet.';
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
  toolkit.querySelectorAll('[data-tool]').forEach((button) => button.addEventListener('click', () => {
    const item = prompt(`Add a ${button.dataset.tool}:`);
    if (!item?.trim()) return;
    const row = document.createElement('p');
    row.textContent = `${button.dataset.tool}: ${item.trim()}`;
    document.querySelector('#relationshipItems').append(row);
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
  const backup = { exportedAt: new Date().toISOString(), data: { ...localStorage } };
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
      Object.entries(backup.data).forEach(([key, value]) => localStorage.setItem(key, value));
      alert('Backup imported. Refreshing your dashboard now.');
      window.location.reload();
    } catch { alert('That file does not look like a valid dashboard backup.'); }
  };
  reader.readAsText(file);
});

let calendarView = new Date(2026, 6, 24);
let calendarFilterState = 'all';
const defaultEvents = [
  { date: '2026-07-28', title: 'Study block: Pharmacology XI', meta: 'School · 14:00', color: 'coral-event' },
  { date: '2026-08-02', title: 'Exampoa launch planning', meta: 'Work · All day', color: 'purple-event' },
  { date: '2026-08-18', title: 'Pharmacovigilance project due', meta: 'School · Deadline', color: 'green-event' }
];
let calendarEvents = JSON.parse(localStorage.getItem('calendarEvents') || 'null') || defaultEvents;
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
  const upcoming = [...calendarEvents].filter((event) => calendarFilterState === 'all' || String(event.meta || '').toLowerCase().includes(calendarFilterState)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
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
const renderCustomHabits = () => { const list = document.querySelector('#customHabitList'); const empty = document.querySelector('#habitEmpty'); if (!list) return; empty.style.display = customHabits.length ? 'none' : 'block'; list.innerHTML = customHabits.map((habit, index) => `<div class="custom-habit ${habit.done ? 'completed' : ''}"><input type="checkbox" ${habit.done ? 'checked' : ''} data-habit-index="${index}"><label>${escapeText(habit.name)}<small>${escapeText(habit.frequency || 'Daily')}</small></label><button data-remove-habit="${index}" aria-label="Remove habit">×</button></div>`).join(''); };
document.querySelector('#addCustomHabit')?.addEventListener('click', () => { const name = prompt('What habit do you want to build?'); const frequency = prompt('How often? (Daily, weekdays, weekly...)'); if (!name?.trim()) return; customHabits.push({ name: name.trim(), frequency: frequency?.trim() || 'Daily', done: false }); localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
document.querySelector('#customHabitList')?.addEventListener('change', (event) => { const input = event.target.closest('[data-habit-index]'); if (!input) return; customHabits[Number(input.dataset.habitIndex)].done = input.checked; localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
document.querySelector('#customHabitList')?.addEventListener('click', (event) => { const remove = event.target.closest('[data-remove-habit]'); if (!remove) return; customHabits.splice(Number(remove.dataset.removeHabit), 1); localStorage.setItem('customHabits', JSON.stringify(customHabits)); renderCustomHabits(); });
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

const archiveEntries = JSON.parse(localStorage.getItem('archiveEntries') || 'null') || [{ title: 'Learning to leave some things unrushed', detail: 'Saturday notes · A quiet morning', date: 'JUL 18' }, { title: 'On finding a rhythm that feels like mine', detail: 'Sunday thoughts · Personal', date: 'JUL 12' }];
const archiveList = document.querySelector('#archiveEntryList');
const renderArchiveEntries = (query = '') => { if (!archiveList) return; const entries = archiveEntries.filter((entry) => `${entry.title} ${entry.detail}`.toLowerCase().includes(query.toLowerCase())); archiveList.innerHTML = entries.map((entry) => `<article><span class="archive-entry-date">${escapeText(entry.date)}</span><div><strong>${escapeText(entry.title)}</strong><small>${escapeText(entry.detail || 'Personal entry')}</small></div><button>···</button></article>`).join('') || '<p class="capture-hint">No matching entries yet.</p>'; };
document.querySelector('#journalSearch')?.addEventListener('input', (event) => renderArchiveEntries(event.target.value));
document.querySelector('#addArchiveEntry')?.addEventListener('click', () => { const title = prompt('Entry title:'); const detail = prompt('What do you want to remember?'); if (!title?.trim()) return; archiveEntries.unshift({ title: title.trim(), detail: detail?.trim() || '', date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase() }); localStorage.setItem('archiveEntries', JSON.stringify(archiveEntries)); renderArchiveEntries(); });
renderArchiveEntries();

const nutritionNoteField = document.querySelector('#nutritionNote');
if (nutritionNoteField) nutritionNoteField.value = localStorage.getItem('nutritionNote') || '';
document.querySelector('#saveNutrition')?.addEventListener('click', () => { localStorage.setItem('nutritionNote', nutritionNoteField.value); document.querySelector('#saveNutrition').textContent = 'Saved note ✓'; });
const mealLogs = JSON.parse(localStorage.getItem('mealLogs') || '[]');
const renderMealLogs = () => { const list = document.querySelector('#mealLogList'); if (!list) return; const types = ['Breakfast', 'Lunch', 'Dinner']; list.innerHTML = types.map((type) => { const item = mealLogs.find((meal) => meal.type === type); return `<div><span>${type === 'Breakfast' ? '☕' : type === 'Lunch' ? '🥗' : '🍓'}</span><section><strong>${type}</strong><small>${escapeText(item?.detail || 'Not logged yet')}</small></section><b>${item ? '✓' : '—'}</b></div>`; }).join(''); };
document.querySelector('#addMealLog')?.addEventListener('click', () => { const type = prompt('Breakfast, Lunch, or Dinner?'); const detail = prompt('What did you eat?'); if (!type?.trim() || !detail?.trim()) return; mealLogs.push({ type: type.trim().replace(/^./, (letter) => letter.toUpperCase()), detail: detail.trim() }); localStorage.setItem('mealLogs', JSON.stringify(mealLogs)); renderMealLogs(); });
renderMealLogs();

const categoryExpenses = { ...{ food: 0, transport: 0, school: 0, personal: 0 }, ...JSON.parse(localStorage.getItem('categoryExpenses') || '{}') };
const renderCategoryExpenses = () => { const total = Object.values(categoryExpenses).reduce((sum, value) => sum + Number(value), 0); Object.entries(categoryExpenses).forEach(([category, amount]) => { const label = document.querySelector(`#${category}Spend`); const track = document.querySelector(`#${category}Track`); if (label) label.textContent = `KSh ${Number(amount).toLocaleString()}`; if (track) track.style.width = `${total ? Math.min(100, Number(amount) / total * 100) : 0}%`; }); const totalLabel = document.querySelector('#budgetDetailTotal'); if (totalLabel) totalLabel.textContent = `KSh ${total.toLocaleString()}`; const percent = document.querySelector('#budgetPercent'); if (percent) percent.textContent = `${Math.min(100, Math.round(total / 25000 * 100))}%`; };
document.querySelector('#addCategorizedExpense')?.addEventListener('click', () => { const category = prompt('Category: food, transport, school, or personal?'); const amount = Number(prompt('Amount in KSh:')); const key = category?.trim().toLowerCase(); if (!category || Number.isNaN(amount) || amount <= 0 || !(key in categoryExpenses)) return; categoryExpenses[key] += amount; localStorage.setItem('categoryExpenses', JSON.stringify(categoryExpenses)); localStorage.setItem('weeklyExpenses', Number(localStorage.getItem('weeklyExpenses') || 0) + amount); renderCategoryExpenses(); });
renderCategoryExpenses();

const scheduleEntries = JSON.parse(localStorage.getItem('scheduleEntries') || '[]');
const renderScheduleEntries = () => { const list = document.querySelector('#scheduleEntries'); if (!list) return; list.innerHTML = scheduleEntries.map((entry) => `<p><span>${escapeText(entry.day)}</span><strong>${escapeText(entry.title)}</strong><small>${escapeText(entry.time)}</small></p>`).join('') || '<p class="capture-hint">Add your first class, study block, or exam.</p>'; };
document.querySelector('#addScheduleEntry')?.addEventListener('click', () => { const day = prompt('Day:'); const time = prompt('Time:'); const title = prompt('Class, study block, or exam:'); if (!day?.trim() || !time?.trim() || !title?.trim()) return; scheduleEntries.push({ day: day.trim(), time: time.trim(), title: title.trim() }); localStorage.setItem('scheduleEntries', JSON.stringify(scheduleEntries)); renderScheduleEntries(); });
renderScheduleEntries();

let studyTimerSeconds = 25 * 60;
let studyTimerInterval;
const updateStudyTimer = () => { const display = document.querySelector('#studyTimerDisplay'); if (display) display.textContent = `${String(Math.floor(studyTimerSeconds / 60)).padStart(2, '0')}:${String(studyTimerSeconds % 60).padStart(2, '0')}`; };
document.querySelector('#startStudyTimer')?.addEventListener('click', () => { if (studyTimerInterval) return; studyTimerInterval = setInterval(() => { studyTimerSeconds -= 1; updateStudyTimer(); if (studyTimerSeconds <= 0) { clearInterval(studyTimerInterval); studyTimerInterval = undefined; alert('Focus session complete. Take a gentle break.'); } }, 1000); });
document.querySelector('#resetStudyTimer')?.addEventListener('click', () => { clearInterval(studyTimerInterval); studyTimerInterval = undefined; studyTimerSeconds = 25 * 60; updateStudyTimer(); });
document.querySelector('#addStudyLog')?.addEventListener('click', () => { const topic = prompt('What did you study?'); const duration = prompt('How long?'); if (!topic?.trim()) return; const sessions = JSON.parse(localStorage.getItem('studySessions') || '[]'); sessions.unshift({ topic: topic.trim(), duration: duration?.trim() || 'Focused session' }); localStorage.setItem('studySessions', JSON.stringify(sessions)); renderStudySessions(); });
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
document.querySelector('#clearJournalData')?.addEventListener('click', () => clearData(['quickNote', 'journalEntries', 'archiveEntries'], 'journal data'));
document.querySelector('#clearTrackingData')?.addEventListener('click', () => clearData(['dailyMood', 'habitStreak', 'habitLastComplete', 'customHabits', 'mealLogs', 'nutritionNote', 'studySessions', 'weeklyExpenses', 'categoryExpenses', 'customUnits', 'schoolStudyItems', 'schoolResearchItems', 'schoolProjectDetails', 'classEntries', 'personalBusinesses', 'workGoals', 'peopleDirectory', 'peopleCheckins', 'examPrepItems', 'businessKpis', 'careerTasks'], 'tracking and added items'));
document.querySelector('#clearAllData')?.addEventListener('click', () => { if (!confirm('Clear every locally saved dashboard item? Export a backup first if you may want it later.')) return; localStorage.clear(); window.location.reload(); });

const defaultAccountInsights = { Instagram: { followers: '2.4k', growth: '+8.2% this month', reach: '4,820', engagement: '7.4%', posts: '12', best: 'A realistic student morning', meta: 'Reel · 4,280 views · 312 likes' }, TikTok: { followers: '1.8k', growth: '+14.1% this month', reach: '6,100', engagement: '8.6%', posts: '9', best: 'Study with me setup', meta: 'Video · 8,920 views · 540 likes' }, YouTube: { followers: '824', growth: '+5.3% this month', reach: '1,900', engagement: '5.1%', posts: '3', best: 'July reset routine', meta: 'Short · 2,100 views · 98 likes' }, Other: { followers: '0', growth: 'Add your growth', reach: '0', engagement: '0%', posts: '0', best: 'Add your best content', meta: 'No performance logged yet' } };
const creatorAccountData = { ...defaultAccountInsights, ...JSON.parse(localStorage.getItem('creatorAccountInsights') || '{}') };
let selectedCreatorAccount = 'Instagram';
const renderAccountInsights = () => { const data = creatorAccountData[selectedCreatorAccount] || defaultAccountInsights.Other; document.querySelector('#accountFollowers').textContent = data.followers; document.querySelector('#accountGrowth').textContent = `↗ ${data.growth}`; document.querySelector('#accountReach').textContent = data.reach; document.querySelector('#accountEngagement').textContent = data.engagement; document.querySelector('#accountPosts').textContent = data.posts; document.querySelector('#accountBestContent').textContent = data.best; document.querySelector('#accountBestMeta').textContent = data.meta; };
document.querySelectorAll('[data-account]').forEach((button) => button.addEventListener('click', () => { selectedCreatorAccount = button.dataset.account; document.querySelectorAll('[data-account]').forEach((item) => item.classList.remove('active')); button.classList.add('active'); renderAccountInsights(); }));
document.querySelector('#updateAccountInsights')?.addEventListener('click', () => { const data = creatorAccountData[selectedCreatorAccount] || {}; const followers = prompt('Followers/subscribers:', data.followers || '0'); const reach = prompt('Reach:', data.reach || '0'); const engagement = prompt('Engagement rate:', data.engagement || '0%'); const posts = prompt('Posts this month:', data.posts || '0'); if (!followers || !reach || !engagement || !posts) return; creatorAccountData[selectedCreatorAccount] = { ...data, followers, reach, engagement, posts, growth: data.growth || 'Updated manually' }; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); renderAccountInsights(); });
document.querySelector('#addAccountPost')?.addEventListener('click', () => { const best = prompt('Best content title:'); const meta = prompt('Platform format, views, and likes:'); if (!best?.trim()) return; creatorAccountData[selectedCreatorAccount] = { ...creatorAccountData[selectedCreatorAccount], best: best.trim(), meta: meta?.trim() || 'Performance details to add' }; localStorage.setItem('creatorAccountInsights', JSON.stringify(creatorAccountData)); renderAccountInsights(); });
renderAccountInsights();

const savedPipelinePosts = JSON.parse(localStorage.getItem('pipelinePosts') || '[]');
const pipelineColumns = [...document.querySelectorAll('.pipeline-grid > article')];
const appendPipelinePost = (post, persist = false) => { const column = pipelineColumns[post.status] || pipelineColumns[0]; if (!column) return; const card = document.createElement('div'); card.className = 'pipeline-post'; card.dataset.pipelineId = post.id; const metric = post.views ? `<span class="content-metric-badge">${escapeText(post.views)} views · ${escapeText(post.likes || '0')} likes</span>` : ''; card.innerHTML = `<strong>${escapeText(post.title)}</strong><small>${escapeText(post.platform || 'Platform to add')}</small>${metric}<span class="post-edit-hint">Click to add metrics · double-click to edit</span>`; column.append(card); if (persist) { savedPipelinePosts.push(post); localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); } };
savedPipelinePosts.forEach((post) => appendPipelinePost(post));
document.querySelector('#contentPipeline')?.addEventListener('dblclick', (event) => { const card = event.target.closest('.pipeline-post'); if (!card) return; const post = savedPipelinePosts.find((item) => item.id === card.dataset.pipelineId); if (!post) return; const title = prompt('Edit post title:', post.title); const status = prompt('Move to: planned, creating, scheduled, or published:', ['planned', 'creating', 'scheduled', 'published'][post.status]); if (!title?.trim()) return; post.title = title.trim(); const newStatus = { planned: 0, creating: 1, scheduled: 2, published: 3 }[status?.trim().toLowerCase()] ?? post.status; post.status = newStatus; localStorage.setItem('pipelinePosts', JSON.stringify(savedPipelinePosts)); card.remove(); appendPipelinePost(post); });

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
