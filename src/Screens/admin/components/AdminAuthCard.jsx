// src/Screens/admin/components/AdminAuthCard.jsx
import React from "react";

export default function AdminAuthCard({
  idToken,
  email,
  onSignOut,
  error,
  status,
  loading,
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold leading-tight">
            Greenbank Display Admin
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Manage settings from the Google Sheet.
          </p>
        </div>

        {idToken ? (
          <button
            onClick={onSignOut}
            className="shrink-0 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-sm">
          {error}
        </div>
      ) : null}

      {status || loading ? (
        <div className="mt-3 text-sm text-white/70">{status || "Working…"}</div>
      ) : null}

      {!idToken ? (
        <div className="mt-5">
          {/* Google button will be rendered into this div by the hook */}
          <div id="googleSignInBtn" />

          <div className="mt-3 text-xs text-white/60">
            Only allowlisted accounts can proceed.
          </div>

          <div className="mt-2 text-xs text-white/50">
            If no button appears, check <span className="font-mono">VITE_GOOGLE_CLIENT_ID</span> is
            set and restart the dev server.
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <div className="text-sm text-white/70">Signed in as</div>
          <div className="text-lg sm:text-xl font-semibold mt-1">
            {email || "(email unknown)"}
          </div>
        </div>
      )}
    </div>
  );
}
