// Lightweight hook to surface the beforeinstallprompt event
import { useEffect, useState } from "react";

export default function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };
    const onInstalled = () => setInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) return false;
    promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null); // Chrome fires only once
    return choice?.outcome === "accepted";
  };

  return { canInstall: !!promptEvent, install, installed };
}
