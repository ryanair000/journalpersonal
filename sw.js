const CACHE_NAME = 'my-little-life-v35';
const ASSETS = [
  './', './index.html', './style.css', './mobile.css', './content.css', './analytics.css',
  './details.css', './advanced.css', './settings.css', './backup.css?v=26', './calendar.css', './review.css', './capture.css', './progress.css', './academic.css', './school-overview.css', './productivity-pass.css', './auth-sync.css', './school-cloud.css?v=32', './theme.css', './vision.css', './goals.css', './habits.css', './routines.css', './projects.css', './search.css', './monthly.css', './next10.css', './insights.css', './next20.css', './refinements.css', './nextpass.css?v=30', './form-actions.css?v=27', './creator-center.css', './life-command.css', './layout-polish.css?v=25', './focus-plan.css?v=31', './business-planner.css?v=33', './exampoa-command.css?v=35', './script.js?v=30', './form-actions.js?v=30', './productivity-pass.js', './supabase-config.js', './auth-sync.js?v=20', './records-safety.js?v=26', './school-cloud.js?v=32', './creator-center.js', './life-command.js', './focus-plan.js?v=32', './business-planner.js?v=33', './exampoa-content-data.js?v=35', './exampoa-command.js?v=35', './manifest.json'
];
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);
  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;
  event.respondWith(
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }).catch(() => caches.match(event.request).then((cached) => cached || Response.error()))
  );
});
