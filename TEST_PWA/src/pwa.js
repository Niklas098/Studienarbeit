const DEV_SW_RESET_KEY = "skin-cancer-pwa-dev-sw-reset";

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) {
    await clearDevServiceWorkersAndCaches();
    if (
      navigator.serviceWorker.controller &&
      sessionStorage.getItem(DEV_SW_RESET_KEY) !== "done"
    ) {
      sessionStorage.setItem(DEV_SW_RESET_KEY, "done");
      location.reload();
      await new Promise(() => {});
    }
    return;
  }
  sessionStorage.removeItem(DEV_SW_RESET_KEY);

  window.addEventListener("load", async () => {
    try {
      await navigator.serviceWorker.register("/sw.js");
    } catch (error) {
      console.error("Service worker registration failed:", error);
    }
  });
}

async function clearDevServiceWorkersAndCaches() {
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch (error) {
    console.warn("Could not clear service workers in dev:", error);
  }

  if (!("caches" in window)) return;
  try {
    const cacheKeys = await caches.keys();
    const appCaches = cacheKeys.filter((key) => key.startsWith("skin-cancer-pwa-"));
    await Promise.all(appCaches.map((key) => caches.delete(key)));
  } catch (error) {
    console.warn("Could not clear caches in dev:", error);
  }
}
