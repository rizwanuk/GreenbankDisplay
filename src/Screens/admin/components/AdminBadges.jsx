import React from "react";

export default function AdminAuthCard({
  idToken,
  email,
  onSignOut,
  error,
  status,
  loading,
}) {
  const card = "rounded-2xl bg-white/5 border border-white/10 p-5";

  return (
    <div className={card}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold leading-tight">
            Greenbank Display Admin
          </h1>
          <p className="text-white/70 mt-1">
            Testing a few settings first (mobile-friendly).
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

      {idToken ? (
        <div className="mt-4">
          <div className="text-sm text-white/70">Signed in as</div>
          <div className="text-lg sm:text-xl font-semibold mt-1 truncate">
            {email || "(email unknown)"}
          </div>

          {(status || loading) ? (
            <div className="mt-3 text-sm text-white/70">{status || "Working…"}</div>
          ) : null}
        </div>
      ) : (
        <div className="mt-5">
          <div id="googleSignInBtn" />
          <div className="mt-3 text-xs text-white/60">
            Only allowlisted accounts can proceed.
          </div>
        </div>
      )}
    </div>
  );
}
