import React from "react";

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    if (import.meta?.env?.DEV) {
      console.error("App crashed:", error, info);
    }
  }
  handleReload = () => window.location.reload();

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="p-4 m-4 rounded-xl bg-red-100 text-red-900 border border-red-300">
        <h2 className="font-bold text-lg mb-1">Something went wrong</h2>
        <p className="text-sm opacity-80 mb-3">
          Try reloading the page. If the issue persists, please let the admin know.
        </p>
        <button
          onClick={this.handleReload}
          className="px-3 py-1 rounded bg-red-600 text-white font-semibold"
        >
          Reload
        </button>
      </div>
    );
  }
}
