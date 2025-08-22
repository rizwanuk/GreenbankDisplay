// src/hooks/useInstallPrompt.js
import { useEffect, useState } from "react";

export default function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setPromptEvent(window.__deferredInstallPrompt || null);

    const onPrompt = (e) => {
      e.preventDefault();
      window.__deferredInstallPrompt = e;
      setPromptEvent(e);
    };
    const onInstalled = () => {
      window.__deferredInstallPrompt = null;
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const inStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    (window.navigator && window.navigator.standalone);

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isIOSSafari = isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Brave/i.test(ua);

  const install = async () => {
    const ev = promptEvent || window.__deferredInstallPrompt;
    if (ev && typeof ev.prompt === "function") {
      ev.prompt();
      const choice = await ev.userChoice;
      window.__deferredInstallPrompt = null;
      setPromptEvent(null);
      return choice?.outcome === "accepted";
    }
    alert("In Safari: tap the Share icon, then ‘Add to Home Screen’.");
    return false;
  };

  const canInstallMenu =
    !inStandalone && (Boolean(promptEvent || window.__deferredInstallPrompt) || isIOSSafari);

  return { canInstallMenu, install, installed, inStandalone, isIOS, isIOSSafari };
}
