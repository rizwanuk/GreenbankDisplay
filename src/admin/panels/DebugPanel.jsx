import React from "react";

export default function DebugPanel({ debug }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-4">
        <div className="text-sm font-semibold">Admin (Debug)</div>

        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs opacity-80">Token present</div>
            <div className="font-mono text-sm">{String(debug?.hasToken)}</div>
          </div>

          <div className="rounded-lg bg-black/20 p-3">
            <div className="text-xs opacity-80">HTTP status</div>
            <div className="font-mono text-sm">
              {debug?.status ?? "(none)"} {debug?.statusText ?? ""}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-80">Request URL</div>
          <div className="font-mono text-xs break-all">{debug?.url ?? ""}</div>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-80">Parsed JSON (if any)</div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-xs">
            {JSON.stringify(debug?.json ?? null, null, 2)}
          </pre>
        </div>

        <div className="mt-4">
          <div className="text-xs opacity-80">Raw response text (first 2000 chars)</div>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-black/30 p-3 text-xs whitespace-pre-wrap">
            {(debug?.text ?? "").slice(0, 2000)}
          </pre>
        </div>

        {debug?.error && (
          <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm">
            <div className="font-semibold">Error</div>
            <div className="font-mono text-xs whitespace-pre-wrap">{debug.error}</div>
          </div>
        )}
      </div>
    </div>
  );
}
