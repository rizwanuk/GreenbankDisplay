// src/main.jsx
import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RouterProvider } from "react-router-dom";

const rootEl = document.getElementById("root");
const root = createRoot(rootEl);

// Simple crash UI so we never get a silent blank screen again
function Crash({ error }) {
  const msg = error?.stack || error?.message || String(error);
  return (
    <div style={{ padding: 16, background: "#1b1b1b", color: "#ffb4b4", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
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
    // still log to console for devtools
    console.error(error, info);
  }
  render() {
    if (this.state.error) return <Crash error={this.state.error} />;
    return this.props.children;
  }
}

// Phase A: show something immediately so we know the root mounted
root.render(
  <div className="p-6 text-white bg-black text-2xl">
    ✅ Root mounted & Tailwind loaded. Loading routes…
  </div>
);

// Phase B: dynamically import your router so import/render errors are caught and shown
import("./router")
  .then((mod) => {
    const router = mod.default || mod.router;
    if (!router) {
      throw new Error(
        "Router module did not export a router. Export default or named `router` from src/router."
      );
    }

    root.render(
      <React.StrictMode>
        <RootErrorBoundary>
          <RouterProvider
            router={router}
            // Fallback prevents a blank screen while lazy routes load
            fallbackElement={<div className="p-6 text-white bg-black">Loading…</div>}
          />
        </RootErrorBoundary>
      </React.StrictMode>
    );
  })
  .catch((e) => {
    root.render(<Crash error={e} />);
  });

// Also catch unhandled async errors
window.addEventListener("error", (e) => root.render(<Crash error={e.error || e.message} />));
window.addEventListener("unhandledrejection", (e) => root.render(<Crash error={e.reason || e} />));
