/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const worker = self as unknown as ServiceWorkerGlobalScope;
const cacheName = `careweave-${version}`;
const assets = [...build, ...files];

worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => worker.clients.claim())
  );
});

worker.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // API responses may contain private Gmail metadata or short-lived session data.
  // They are always network-only and must never enter the offline application cache.
  if (new URL(event.request.url).pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && new URL(event.request.url).origin === worker.location.origin) {
          void caches.open(cacheName).then((cache) => cache.put(event.request, response.clone()));
        }
        return response;
      })
      .catch(async () => (await caches.match(event.request)) ?? (await caches.match('/')) ?? Response.error())
  );
});
