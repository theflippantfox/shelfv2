// Unregister any old service workers from previous projects (e.g. shelf v1)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
      console.log("Unregistered stale service worker:", registration.scope);
    }
  });
}
