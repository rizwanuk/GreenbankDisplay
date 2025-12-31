import React, { useMemo, useState } from "react";
import AdminShell from "./admin/components/AdminShell";
import AdminAuthCard from "./admin/components/AdminAuthCard";
import AdminBadges from "./admin/components/AdminBadges";
import AdminSection from "./admin/components/AdminSection";
import { Field, SelectInput, TextArea, TextInput } from "./admin/components/AdminField";
import ReadOnlySettingsTable from "./admin/components/ReadOnlySettingsTable";
import { useAdminSettings } from "./admin/useAdminSettings";

function asBoolToken(v) {
  const s = String(v ?? "").trim().toUpperCase();
  if (s === "TRUE" || s === "FALSE") return s;
  return s === "1" || s === "YES" ? "TRUE" : "FALSE";
}

function clampIntString(v, { min = 0, max = 9999 } = {}) {
  const n = parseInt(String(v || "").replace(/[^\d-]/g, ""), 10);
  if (Number.isNaN(n)) return "";
  return String(Math.max(min, Math.min(max, n)));
}

function normalizeTimeHHmm(v) {
  const raw = String(v ?? "").trim();
  if (!raw) return "";
  // allow "13.30" or "13:30"
  const s = raw.replace(/[．。]/g, ".").replace(/[：﹕︓]/g, ":").replace(".", ":");
  const m = s.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return raw; // keep as-is so user can see it's invalid
  const hh = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${pad2(hh)}:${pad2(mm)}`;
}

/** Curated label keys (from your sheet example) */
const LABEL_GROUP_EN = "labels";
const LABEL_GROUP_AR = "labels.arabic";

// Prayers + sunrise + ishraq
const LABEL_KEYS_PRAYER = [
  ["fajr", "Fajr"],
  ["sunrise", "Sunrise (Shouruq)"],
  ["ishraq", "Ishraq"],
  ["dhuhr", "Zuhr"],
  ["asr", "Asr"],
  ["maghrib", "Maghrib"],
  ["isha", "Isha (Esha)"],
];

// Table headings + common UI labels
const LABEL_KEYS_UI = [
  ["begins", "Begins (Adhan)"],
  ["jamaah", "Jama’ah (Iqamah)"],
];

// Specials
const LABEL_KEYS_SPECIAL = [
  ["jummah", "Jum’ah"],
  ["nafl", "Nafl"],
  ["eidFitr", "Eid-ul-Fitr"],
  ["eidAdha", "Eid-ul-Adha"],
];

// Hijri months
const LABEL_KEYS_HIJRI_MONTHS = [
  ["muharram", "Muharram"],
  ["safar", "Safar"],
  ["rabiAwal", "Rabi’ al-Awwal"],
  ["rabiThani", "Rabi’ al-Akhir"],
  ["jumadaAwal", "Jumada al-Ula"],
  ["jumadaThani", "Jumada al-Akhirah"],
  ["rajab", "Rajab"],
  ["shaban", "Sha’ban"],
  ["ramadan", "Ramadan"],
  ["shawwal", "Shawwal"],
  ["dhulQadah", "Dhul Qa’dah"],
  ["dhulHijjah", "Dhul Hijjah"],
];

function LabelRow({ title, k, get, set }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={`${title} (English)`} hint={`${LABEL_GROUP_EN}.${k}`}>
        <TextInput
          value={get(LABEL_GROUP_EN, k, "")}
          onChange={(e) => set(LABEL_GROUP_EN, k, e.target.value)}
          placeholder="English label…"
        />
      </Field>

      <Field label={`${title} (Arabic)`} hint={`${LABEL_GROUP_AR}.${k}`}>
        <TextInput
          value={get(LABEL_GROUP_AR, k, "")}
          onChange={(e) => set(LABEL_GROUP_AR, k, e.target.value)}
          placeholder="Arabic label…"
          dir="rtl"
        />
      </Field>
    </div>
  );
}

function LabelsPanel({ get, set }) {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/90">Prayer names</div>
        <div className="space-y-3">
          {LABEL_KEYS_PRAYER.map(([k, title]) => (
            <LabelRow key={k} title={title} k={k} get={get} set={set} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/90">Table headings</div>
        <div className="space-y-3">
          {LABEL_KEYS_UI.map(([k, title]) => (
            <LabelRow key={k} title={title} k={k} get={get} set={set} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/90">Special labels</div>
        <div className="space-y-3">
          {LABEL_KEYS_SPECIAL.map(([k, title]) => (
            <LabelRow key={k} title={title} k={k} get={get} set={set} />
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold text-white/90">Hijri month names</div>
        <div className="space-y-3">
          {LABEL_KEYS_HIJRI_MONTHS.map(([k, title]) => (
            <LabelRow key={k} title={title} k={k} get={get} set={set} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** ---------------- Prayer rules (timings.*) ---------------- */

const TIMINGS_GROUP = "timings";

const TIMING_FIELDS = [
  {
    key: "makroohBeforeSunrise",
    title: "Makrooh before sunrise (minutes)",
    hint: "Minutes before Shouruq where prayer is not allowed",
    min: 0,
    max: 60,
    placeholder: "1",
  },
  {
    key: "makroohAfterSunrise",
    title: "Makrooh after sunrise (minutes)",
    hint: "Minutes after Shouruq where prayer is not allowed",
    min: 0,
    max: 60,
    placeholder: "10",
  },
  {
    key: "showIshraq",
    title: "Ishraq window length (minutes)",
    hint: "How long Ishraq is shown (after it begins)",
    min: 0,
    max: 180,
    placeholder: "30",
  },
  {
    key: "makroohBeforeZuhr",
    title: "Makrooh before Zuhr (minutes)",
    hint: "Zawal window length",
    min: 0,
    max: 60,
    placeholder: "10",
  },
  {
    key: "makroohBeforeAsr",
    title: "Makrooh before Asr (minutes)",
    hint: "Often 0 (no warning window)",
    min: 0,
    max: 60,
    placeholder: "0",
  },
  {
    key: "makroohBeforeMaghrib",
    title: "Makrooh before Maghrib (minutes)",
    hint: "Window before sunset / Maghrib begins",
    min: 0,
    max: 60,
    placeholder: "10",
  },
  {
    key: "makroohBeforeIsha",
    title: "Makrooh before Isha (minutes)",
    hint: "Often 0",
    min: 0,
    max: 60,
    placeholder: "0",
  },
  {
    key: "jamaahHighlightDuration",
    title: "Jama’ah highlight duration (minutes)",
    hint: "How long the “Jama’ah in progress” state is held",
    min: 0,
    max: 30,
    placeholder: "5",
  },
];

function TimingsPanel({ get, set }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        These are used across the display and embed screens to drive Makrooh/Ishraq/Jama’ah behaviour.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TIMING_FIELDS.map((f) => (
          <Field key={f.key} label={f.title} hint={`timings.${f.key} • ${f.hint}`}>
            <TextInput
              inputMode="numeric"
              value={get(TIMINGS_GROUP, f.key, "")}
              placeholder={f.placeholder}
              onChange={(e) =>
                set(TIMINGS_GROUP, f.key, clampIntString(e.target.value, { min: f.min, max: f.max }))
              }
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

/** ---------------- Jum’ah times (jummahTimes.*) ---------------- */

const JUMMAH_GROUP = "jummahTimes";
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function JummahTimesPanel({ get, set }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-white/70">
        Month-based Jum’ah Jama’ah time. Use <span className="font-semibold">HH:mm</span> (e.g. 13:30).
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MONTHS.map((m) => (
          <Field key={m} label={m} hint={`jummahTimes.${m}`}>
            <TextInput
              value={get(JUMMAH_GROUP, m, "")}
              placeholder="13:30"
              onBlur={(e) => set(JUMMAH_GROUP, m, normalizeTimeHHmm(e.target.value))}
              onChange={(e) => set(JUMMAH_GROUP, m, e.target.value)}
              inputMode="numeric"
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

export default function AdminScreen() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const admin = useAdminSettings(clientId);

  const {
    idToken,
    email,
    allowedClient,
    allowedServer,
    serverEmail,
    rows,
    dirtyCount,
    themeOptions,
    loading,
    status,
    error,
    signOut,
    save,
    refresh,
    resetDraft,
    get,
    set,
  } = admin;

  const [showAll, setShowAll] = useState(false);

  const canEdit = idToken && allowedServer;

  const categories = useMemo(
    () => [
      { key: "appearance", title: "Appearance", subtitle: "Theme + clock format (safe to test)." },
      { key: "labels", title: "Labels", subtitle: "English + Arabic labels (prayers, headings, Hijri months)." },
      { key: "prayerRules", title: "Prayer rules", subtitle: "Makrooh windows, Ishraq, Jama’ah highlight." },
      { key: "jummah", title: "Jum’ah times", subtitle: "Monthly Jum’ah Jama’ah time." },
      { key: "slideshow", title: "Slideshow", subtitle: "Rotation timing for slideshow screen." },
      { key: "infoCard", title: "Info card", subtitle: "Rotation + override message for announcements." },
      { key: "testMode", title: "Test mode", subtitle: "Optional fake time controls (if you use them)." },
    ],
    []
  );

  return (
    <AdminShell>
      <div className="space-y-6">
        <AdminAuthCard
          idToken={idToken}
          email={email}
          onSignOut={signOut}
          error={error}
          status={status}
          loading={loading}
        />

        {idToken ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/70">
              Server verified as:{" "}
              <span className="font-semibold text-white">{serverEmail || "—"}</span>
            </div>

            <AdminBadges
              allowedClient={allowedClient}
              allowedServer={allowedServer}
              dirtyCount={dirtyCount}
            />

            {canEdit ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={save}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg border ${
                    loading
                      ? "bg-white/10 border-white/10 opacity-60"
                      : "bg-emerald-700 border-emerald-600 hover:bg-emerald-600"
                  }`}
                >
                  Save changes
                </button>

                <button
                  onClick={refresh}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  Refresh from sheet
                </button>

                <button
                  onClick={resetDraft}
                  disabled={loading || dirtyCount === 0}
                  className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 disabled:opacity-50"
                >
                  Reset changes
                </button>

                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="ml-auto px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
                >
                  {showAll ? "Hide all settings" : "Show all settings"}
                </button>
              </div>
            ) : (
              <div className="mt-4 text-sm text-red-200">
                Signed in, but server blocked — check allowlist.
              </div>
            )}
          </div>
        ) : null}

        {/* Curated panels */}
        {canEdit ? (
          <div className="space-y-4">
            {/* Appearance */}
            <AdminSection
              title={categories.find((c) => c.key === "appearance")?.title}
              subtitle={categories.find((c) => c.key === "appearance")?.subtitle}
              defaultOpen
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Theme">
                  <SelectInput
                    value={get("toggles", "theme", "")}
                    onChange={(e) => set("toggles", "theme", e.target.value)}
                  >
                    <option value="">(not set)</option>
                    {themeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </SelectInput>
                </Field>

                <Field label="Clock 24 hours">
                  <SelectInput
                    value={asBoolToken(get("toggles", "clock24Hours", "FALSE"))}
                    onChange={(e) => set("toggles", "clock24Hours", e.target.value)}
                  >
                    <option value="FALSE">FALSE</option>
                    <option value="TRUE">TRUE</option>
                  </SelectInput>
                </Field>
              </div>
            </AdminSection>

            {/* Labels */}
            <AdminSection
              title={categories.find((c) => c.key === "labels")?.title}
              subtitle={categories.find((c) => c.key === "labels")?.subtitle}
              defaultOpen={false}
            >
              <LabelsPanel get={get} set={set} />
            </AdminSection>

            {/* Prayer rules */}
            <AdminSection
              title={categories.find((c) => c.key === "prayerRules")?.title}
              subtitle={categories.find((c) => c.key === "prayerRules")?.subtitle}
              defaultOpen
            >
              <TimingsPanel get={get} set={set} />
            </AdminSection>

            {/* Jummah */}
            <AdminSection
              title={categories.find((c) => c.key === "jummah")?.title}
              subtitle={categories.find((c) => c.key === "jummah")?.subtitle}
              defaultOpen
            >
              <JummahTimesPanel get={get} set={set} />
            </AdminSection>

            {/* Slideshow */}
            <AdminSection
              title={categories.find((c) => c.key === "slideshow")?.title}
              subtitle={categories.find((c) => c.key === "slideshow")?.subtitle}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Slideshow duration (seconds)" hint="e.g. 8">
                  <TextInput
                    value={get("slideshow", "duration", "8")}
                    onChange={(e) =>
                      set("slideshow", "duration", clampIntString(e.target.value, { min: 3, max: 60 }))
                    }
                    inputMode="numeric"
                  />
                </Field>
              </div>
            </AdminSection>

            {/* Info card */}
            <AdminSection
              title={categories.find((c) => c.key === "infoCard")?.title}
              subtitle={categories.find((c) => c.key === "infoCard")?.subtitle}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Rotate interval (seconds)" hint="e.g. 15">
                  <TextInput
                    value={get("infoCard", "rotateInterval", "15")}
                    onChange={(e) =>
                      set("infoCard", "rotateInterval", clampIntString(e.target.value, { min: 5, max: 120 }))
                    }
                    inputMode="numeric"
                  />
                </Field>

                <Field label="Override duration (seconds)" hint="e.g. 300">
                  <TextInput
                    value={get("infoCard", "overrideDuration", "300")}
                    onChange={(e) =>
                      set("infoCard", "overrideDuration", clampIntString(e.target.value, { min: 10, max: 3600 }))
                    }
                    inputMode="numeric"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Override message" hint="Shown when forced">
                    <TextArea
                      className="min-h-[140px]"
                      value={get("infoCard", "overrideMessage", "")}
                      onChange={(e) => set("infoCard", "overrideMessage", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </AdminSection>

            {/* Test mode */}
            <AdminSection
              title={categories.find((c) => c.key === "testMode")?.title}
              subtitle={categories.find((c) => c.key === "testMode")?.subtitle}
              defaultOpen={false}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Fake time enabled">
                  <SelectInput
                    value={asBoolToken(get("toggles", "fakeTimeEnabled", "FALSE"))}
                    onChange={(e) => set("toggles", "fakeTimeEnabled", e.target.value)}
                  >
                    <option value="FALSE">FALSE</option>
                    <option value="TRUE">TRUE</option>
                  </SelectInput>
                </Field>

                <Field label="Fake time" hint="HH:mm e.g. 13:05">
                  <TextInput
                    value={get("toggles", "fakeTime", "")}
                    onChange={(e) => set("toggles", "fakeTime", e.target.value)}
                    placeholder="13:05"
                  />
                </Field>
              </div>
            </AdminSection>

            {/* Read-only settings */}
            {showAll ? <ReadOnlySettingsTable rows={rows} /> : null}
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
