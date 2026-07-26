const CACHE_NAME = 'my-little-life-v13';
const ASSETS = [
  './', './index.html', './style.css', './mobile.css', './content.css', './analytics.css',
  './details.css', './advanced.css', './settings.css', './backup.css', './calendar.css', './review.css', './capture.css', './progress.css', './academic.css', './school-overview.css', './productivity-pass.css', './theme.css', './vision.css', './goals.css', './habits.css', './routines.css', './projects.css', './search.css', './monthly.css', './next10.css', './insights.css', './next20.css', './refinements.css', './nextpass.css', './form-actions.css', './script.js', './form-actions.js', './productivity-pass.js', './manifest.json'
];
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
});
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
    return response;
  })));
});
