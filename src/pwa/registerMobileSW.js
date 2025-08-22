export async function registerMobileSW() {
  if (!("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.register("/mobile/sw.js", { scope: "/mobile/" });

    // Optional: detect updates and prompt to reload
    reg.addEventListener("updatefound", () => {
      const newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener("statechange", () => {
        if (newSW.state === "installed" && navigator.serviceWorker.controller) {
          const want = confirm("Greenbank Mobile updated. Reload now?");
          if (want) {
            newSW.postMessage({ type: "SKIP_WAITING" });
            navigator.serviceWorker.addEventListener("controllerchange", () => {
              window.location.reload();
            });
          }
        }
      });
    });
  } catch (err) {
    console.error("[PWA] SW registration failed:", err);
  }
}
