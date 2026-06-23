export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    return
  }

  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`)
      .then(() => navigator.serviceWorker.ready)
      .then((registration) => {
        const urls = new Set<string>([
          window.location.href,
          new URL(import.meta.env.BASE_URL, window.location.origin).href,
          new URL(
            `${import.meta.env.BASE_URL}manifest.webmanifest`,
            window.location.origin,
          ).href,
        ])

        performance.getEntriesByType('resource').forEach((entry) => {
          const url = new URL(entry.name)
          if (url.origin === window.location.origin) {
            urls.add(url.href)
          }
        })

        registration.active?.postMessage({
          type: 'CACHE_URLS',
          urls: [...urls],
        })
      })
      .catch(() => {
        // Offline installation is an enhancement; the local app remains usable.
      })
  })
}
