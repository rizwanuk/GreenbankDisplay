// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";
import router from "./router";

// --- Capture beforeinstallprompt EARLY so React doesn't miss it ---
if (typeof window !== "undefined") {
  // holds the last beforeinstallprompt event if the page hasn't shown it yet
  window.__deferredInstallPrompt = window.__deferredInstallPrompt || null;

  window.addEventListener("beforeinstallprompt", (e) => {
    // Chrome fires this before the app is ready; stash it
    e.preventDefault();
    window.__deferredInstallPrompt = e;
  });

  window.addEventListener("appinstalled", () => {
    window.__deferredInstallPrompt = null;
  });
}

// ✅ Register the /mobile PWA service worker in production
if (import.meta?.env?.PROD && "serviceWorker" in navigator) {
  import("./pwa/registerMobileSW.js")
    .then((mod) => {
      const fn = mod.registerMobileSW || mod.default;
      if (typeof fn === "function") fn();
    })
    .catch((err) => console.error("[PWA] SW registration import failed:", err));
}

// Simple crash UI so we never get a silent blank screen
function Crash({ error }) {
  const msg =
    (error && (error.stack || error.message)) || String(error || "Unknown error");
  return (
    <div
      style={{
        padding: 16,
        background: "#1b1b1b",
        color: "#ffb4b4",
        fontFamily: "monospace",
        whiteSpace: "pre-wrap",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 8 }}>❌ App crashed</div>
      {msg}
    </div>
  );
}

class RootErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() {
    if (this.state.error) return <Crash error={this.state.error} />;
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <RootErrorBoundary>
    <RouterProvider
      router={router}
      fallbackElement={<div className="p-6 text-white bg-black">Loading…</div>}
    />
  </RootErrorBoundary>
);

// Just log global errors
window.addEventListener("error", (e) =>
  console.error("Global error:", e.error || e.message)
);
window.addEventListener("unhandledrejection", (e) =>
  console.error("Unhandled rejection:", e.reason || e)
);
