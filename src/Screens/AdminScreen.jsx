// src/Screens/AdminScreen.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useAdminSettings } from "./admin/hooks/useAdminSettings";
import AdminPanelShell from "./admin/components/AdminPanelShell";

import LabelsPanel from "./admin/panels/LabelsPanel";
import ThemePanel from "./admin/panels/ThemePanel";
import MosquePanel from "./admin/panels/MosquePanel";
import PrayerRulesPanel from "./admin/panels/PrayerRulesPanel";
import JummahTimesPanel from "./admin/panels/JummahTimesPanel";
import TestModePanel from "./admin/panels/TestModePanel";
import IslamicCalendarPanel from "./admin/panels/IslamicCalendarPanel";
import PrayerTimesPanel from "./admin/panels/PrayerTimesPanel";
import SignInPanel from "./admin/components/SignInPanel";

const PANELS = [
  {
    id: "islamicCalendar",
    title: "Islamic Calendar",
    desc: "Preview today’s Hijri date and adjust offset / month normalisation.",
    emoji: "🌙",
    render: (props) => <IslamicCalendarPanel {...props} />,
  },
  {
    id: "prayertimes",
    title: "Prayer Times",
    desc: "View (and soon edit) the daily adhan & jama'ah times from the PrayerTimes sheet.",
    emoji: "⏱️",
    render: (props) => <PrayerTimesPanel {...props} />,
  },
  {
    id: "jummah",
    title: "Jummah Times",
    desc: "Per-month Jummah Jama'ah times used across the app.",
    emoji: "🗓️",
    render: (props) => <JummahTimesPanel {...props} />,
  },
  {
    id: "mosque",
    title: "Mosque",
    desc: "Name, address, website and logo used across the app.",
    emoji: "📍",
    render: (props) => <MosquePanel {...props} />,
  },
  {
    id: "rules",
    title: "Prayer Rules",
    desc: "Makrooh windows, Ishraq, Jama'ah highlight duration.",
    emoji: "🕌",
    render: (props) => <PrayerRulesPanel {...props} />,
  },
  {
    id: "labels",
    title: "Labels",
    desc: "English + Arabic prayer labels and UI text.",
    emoji: "🏷️",
    render: (props) => <LabelsPanel {...props} />,
  },
  {
    id: "theme",
    title: "Theme",
    desc: "Edit Theme_3 / Theme_4 styling for desktop and mobile.",
    emoji: "🎨",
    render: (props) => <ThemePanel {...props} />,
  },
  {
    id: "test",
    title: "Test Mode",
    desc: "Fake time controls for testing layouts and transitions.",
    emoji: "🧪",
    render: (props) => <TestModePanel {...props} />,
  },
];

function isAuthErrorMessage(err) {
  const s = String(err || "").toLowerCase();
  return (
    s.includes("missing bearer token") ||
    s.includes("token used too late") ||
    s.includes("expired") ||
    s.includes("invalid token") ||
    s.includes("jwt") ||
    s.includes("unauthorized") ||
    s.includes("401")
  );
}

function getToken() {
  try {
    return typeof window !== "undefined"
      ? localStorage.getItem("gbm_admin_id_token")
      : null;
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    localStorage.removeItem("gbm_admin_id_token");
  } catch {
    // ignore
  }
}

export default function AdminScreen() {
  const { loading, email, error, groups, setValue, saveAll, reload } =
    useAdminSettings();

  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  // ✅ No cards open by default
  const [openId, setOpenId] = useState("");

  // Derived auth state
  const token = getToken();
  const authError = isAuthErrorMessage(error);
  const needsSignIn = !token || authError;

  // If we detect an expired/invalid token, clear it so UI reliably shows sign-in.
  useEffect(() => {
    if (authError) clearToken();
  }, [authError]);

  const canRender = useMemo(
    () => Object.keys(groups || {}).length > 0,
    [groups]
  );

  async function onSave() {
    setSavedMsg("");
    setSaving(true);
    const r = await saveAll();
    setSaving(false);

    if (r?.ok) {
      setSavedMsg("Saved");
      setTimeout(() => setSavedMsg(""), 1200);
    }
  }

  async function onRefresh() {
    // If token expired, force a clean sign-in rather than spamming 401s
    if (needsSignIn) clearToken();
    await reload();
  }

  const subtitle = needsSignIn
    ? "Please sign in to load and edit settings."
    : "Edit live settings stored in Google Sheets.";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-black text-white">
      {/* Sticky app header */}
      <div className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="text-lg md:text-2xl font-semibold tracking-tight">
                  Admin
                </div>
                <span className="hidden md:inline text-xs rounded-full border border-white/15 bg-white/5 px-2 py-1 opacity-80">
                  GreenbankDisplay
                </span>
              </div>

              <div className="text-xs md:text-sm opacity-75 truncate">
                {needsSignIn
                  ? subtitle
                  : `Signed in as ${email || "—"} • ${subtitle}`}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onRefresh}
                className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 active:scale-[0.99]"
              >
                Refresh
              </button>

              <button
                onClick={onSave}
                disabled={saving || needsSignIn}
                className="rounded-xl border border-white/15 bg-emerald-600/80 px-4 py-2 text-sm hover:bg-emerald-600 disabled:opacity-60 active:scale-[0.99]"
                title={needsSignIn ? "Sign in to save changes" : "Save changes"}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>

          {/* Mobile panel picker */}
          {!needsSignIn && (
            <div className="mt-3 md:hidden">
              <div className="flex items-center gap-2">
                <div className="text-xs opacity-70">Panel</div>
                <select
                  value={openId}
                  onChange={(e) => setOpenId(e.target.value)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none"
                >
                  {/* ✅ Placeholder so we don't force-open a panel */}
                  <option value="">Select a panel…</option>
                  {PANELS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-5 space-y-4">
        {savedMsg ? (
          <div className="rounded-2xl bg-emerald-600/15 border border-emerald-400/20 p-3 text-sm">
            ✅ {savedMsg}
          </div>
        ) : null}

        {/* If auth error, show a friendly banner (instead of scary raw text) */}
        {authError && (
          <div className="rounded-2xl bg-amber-600/15 border border-amber-400/20 p-3 text-sm">
            Your session has expired. Please sign in again.
          </div>
        )}

        {/* Non-auth errors */}
        {error && !needsSignIn && (
          <div className="rounded-2xl bg-red-600/15 border border-red-400/20 p-3 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
            Loading…
          </div>
        )}

        {!loading && needsSignIn && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <SignInPanel
              onSignedIn={() => {
                // After sign-in, reload settings and keep all panels closed
                setOpenId("");
                reload();
              }}
            />
          </div>
        )}

        {!loading && !needsSignIn && !canRender && !error && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm opacity-80">
            No settings loaded.
          </div>
        )}

        {!loading && !needsSignIn && canRender && (
          <div className="grid grid-cols-1 gap-4">
            {PANELS.map((p) => (
              <AdminPanelShell
                key={p.id}
                title={p.title}
                description={p.desc}
                icon={p.emoji}
                isOpen={openId === p.id}
                onToggle={() => setOpenId((cur) => (cur === p.id ? "" : p.id))}
              >
                {p.render({ groups, setValue })}
              </AdminPanelShell>
            ))}
          </div>
        )}

        {/* Mobile bottom save bar */}
        {!needsSignIn && (
          <div className="md:hidden sticky bottom-0 z-20 -mx-4 px-4 py-3 bg-slate-950/70 backdrop-blur border-t border-white/10">
            <button
              onClick={onSave}
              disabled={saving || needsSignIn}
              className="w-full rounded-2xl border border-white/15 bg-emerald-600/80 py-3 text-base font-semibold disabled:opacity-60 active:scale-[0.99]"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
