// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";

// If your router exports default, this works.
// If it exports a named `router`, change to: import { router } from "./router";
import router from "./router";

// ✅ Register the /mobile PWA service worker in production via dynamic import
if (import.meta?.env?.PROD && "serviceWorker" in navigator) {
  import("./pwa/registerMobileSW.js")
    .then((mod) => {
      // Supports both named and default export
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

// ErrorBoundary to catch render-time errors inside RouterProvider/route elements
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
  // NOTE: StrictMode is intentionally OFF while we stabilise HMR/reload.
  <RootErrorBoundary>
    <RouterProvider
      router={router}
      fallbackElement={<div className="p-6 text-white bg-black">Loading…</div>}
    />
  </RootErrorBoundary>
);

// Log global errors to console (don’t re-render the root here to avoid race conditions)
window.addEventListener("error", (e) =>
  console.error("Global error:", e.error || e.message)
);
window.addEventListener("unhandledrejection", (e) =>
  console.error("Unhandled rejection:", e.reason || e)
);
