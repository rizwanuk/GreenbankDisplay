import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep logging for debugging
    // eslint-disable-next-line no-console
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const msg =
      (this.state.error && (this.state.error.stack || this.state.error.message)) ||
      String(this.state.error || "Unknown error");

    return (
      <div className="min-h-screen p-6 bg-black text-white">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="text-2xl font-semibold">GreenbankDisplay crashed</div>
          <div className="opacity-80">
            This page hit a runtime error. The details are below (also in Console).
          </div>

          <pre className="whitespace-pre-wrap rounded-xl border border-white/15 bg-white/5 p-4 text-xs leading-relaxed overflow-auto">
            {msg}
          </pre>

          <div className="text-sm opacity-80">
            Tip: open DevTools → Console and paste the first red error here.
          </div>
        </div>
      </div>
    );
  }
}
