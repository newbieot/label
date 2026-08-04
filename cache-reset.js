(async () => {
  const status = document.getElementById('status');
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    status.textContent = 'Pembaruan selesai. Membuka aplikasi terbaru…';
  } catch (error) {
    console.warn(error);
    status.textContent = 'Cache sudah diproses. Membuka aplikasi…';
  }
  const target = new URL('./', location.href);
  target.searchParams.set('fresh', Date.now().toString());
  location.replace(target.href);
})();
