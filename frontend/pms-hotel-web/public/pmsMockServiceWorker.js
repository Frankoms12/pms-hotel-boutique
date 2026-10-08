// Staff Reservations Read is always a native BFF request, even with general mocks.
// Register this listener before MSW's generated worker; do not call respondWith.
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    /^\/api\/staff\/reservations(?:\/[^/]+)?\/?$/.test(url.pathname)
  ) {
    event.stopImmediatePropagation()
  }
})

// Keep the generated MSW worker intact so other mocks and integrity checks work.
importScripts('/mockServiceWorker.js')
