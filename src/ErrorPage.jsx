// src/ErrorPage.jsx
import React from "react";
import { useRouteError, isRouteErrorResponse } from "react-router-dom";

export default function ErrorPage() {
  const err = useRouteError?.() || null;

  let title = "Something went wrong";
  let message = "An unexpected error occurred.";

  if (isRouteErrorResponse?.(err)) {
    title = `${err.status} ${err.statusText || "Error"}`;
    message = typeof err.data === "string" ? err.data : message;
  } else if (err) {
    message = err?.message || String(err);
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-2xl mx-auto rounded-2xl bg-white/5 border border-white/10 p-5">
        <div className="text-2xl font-semibold">{title}</div>
        <div className="mt-2 text-sm text-white/70 whitespace-pre-wrap break-words">
          {message}
        </div>

        {err ? (
          <details className="mt-4 text-xs text-white/60">
            <summary className="cursor-pointer select-none">Show technical details</summary>
            <pre className="mt-2 overflow-auto rounded-lg bg-black/50 p-3 border border-white/10">
{String(
  err?.stack ||
  (typeof err === "object" ? JSON.stringify(err, null, 2) : err)
)}
            </pre>
          </details>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <a href="/" className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600">
            Main
          </a>
          <a href="/admin" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10">
            Admin
          </a>
          <a href="/mobile" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10">
            Mobile
          </a>
          <a href="/embed2" className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10">
            Embed2
          </a>
        </div>
      </div>
    </div>
  );
}
