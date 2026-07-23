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

const updateHabitProgress = () => {
  const habits = [...document.querySelectorAll('.check-list input')];
  const completed = habits.filter((input) => input.checked).length;
  const progress = document.querySelector('.habits .progress');
  if (progress) progress.textContent = `${completed} / ${habits.length}`;
};
document.querySelectorAll('.check-list input').forEach((input, index) => {
  const key = `habit-${index}`;
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
});
document.querySelector('#addBusiness')?.addEventListener('click', () => {
  const name = prompt('Business or work name:');
  const type = prompt('What do you do there?');
  const duration = prompt('How long have you been doing it?');
  if (!name || !type) return;
  const row = document.createElement('div');
  row.innerHTML = `<span class="business-badge coral-badge">${name.slice(0,2).toUpperCase()}</span><section><strong>${name.trim().replaceAll('<','&lt;')}</strong><small>${type.trim().replaceAll('<','&lt;')} · ${duration?.trim() || 'New business'}</small></section><b>New</b>`;
  document.querySelector('#businessList').append(row);
});
document.querySelector('#addWorkGoal')?.addEventListener('click', () => {
  const goal = prompt('What work goal do you want to add?');
  if (!goal?.trim()) return;
  const label = document.createElement('label');
  label.innerHTML = `<input type="checkbox"> ${goal.trim().replaceAll('<','&lt;')}`;
  document.querySelector('#workGoalList').append(label);
});
document.querySelector('#addWorkLog')?.addEventListener('click', () => {
  const hours = prompt('How many hours did you work?');
  if (hours) alert(`Logged ${hours} hour(s). Your work history can be expanded with income, clients, and project tracking next.`);
});
document.querySelector('#addPerson')?.addEventListener('click', () => {
  const name = prompt('Name or nickname:');
  const group = prompt('Family, friend, or relationship?');
  const note = prompt('How do you want to stay connected?');
  if (!name || !group) return;
  const row = document.createElement('div');
  row.innerHTML = `<span class="person-avatar peach">${name.trim().charAt(0).toUpperCase()}</span><section><strong>${name.trim().replaceAll('<','&lt;')}</strong><small>${group.trim().replaceAll('<','&lt;')} · ${note?.trim() || 'Keep in touch'}</small></section><button>Check in →</button>`;
  document.querySelector('#peopleList').append(row);
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
