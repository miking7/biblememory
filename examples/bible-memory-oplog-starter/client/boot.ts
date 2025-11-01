import { syncNow } from "./sync";

export async function scheduleSync() {
  syncNow();
  setInterval(() => { if (navigator.onLine) syncNow(); }, 60_000);
  window.addEventListener("online", () => syncNow());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && navigator.onLine) syncNow();
  });
}

scheduleSync();
