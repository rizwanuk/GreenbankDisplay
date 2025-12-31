import React, { useMemo, useState } from "react";

const SECTION_ORDER = [
  "header",
  "clock",
  "dateCard",
  "currentPrayer",
  "upcomingPrayer",
  "nextPrayer",
  "infoCard",
  "weatherCard",
  "slideshowClock",
  "slideshowDateCard",
  "slideshowCurrentPrayer",
  "slideshowCurrentPrayerCard",
  "slideshowPrayerCard",
];

const SECTION_LABELS = {
  header: "Header",
  clock: "Clock",
  dateCard: "Date card",
  currentPrayer: "Current prayer",
  upcomingPrayer: "Upcoming prayers",
  nextPrayer: "Next prayer card",
  infoCard: "Info card",
  weatherCard: "Weather card",
  slideshowClock: "Slideshow clock",
  slideshowDateCard: "Slideshow date",
  slideshowCurrentPrayer: "Slideshow current prayer (row)",
  slideshowCurrentPrayerCard: "Slideshow current prayer (card)",
  slideshowPrayerCard: "Slideshow prayer card",
};

// Mobile sections are under themeMobile.<ThemeName>.<section>
const MOBILE_SECTION_ORDER = [
  "header",
  "dateCard",
  "currentPrayer",
  "nextPrayer",
  "upcomingPrayer",
];

function Tabs({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            onClick={() => onChange(it.value)}
            className={[
              "rounded-xl border px-3 py-1.5 text-sm",
              active
                ? "border-white/20 bg-white/10"
                : "border-white/10 bg-white/5 hover:bg-white/10",
            ].join(" ")}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

function KVRow({ label, value, onChange }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
      <div className="text-sm font-medium">{label}</div>
      <div className="md:col-span-2">
        <input
          className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}

function getThemeNames(groups) {
  const set = new Set();

  // from toggles.theme
  const t = groups?.toggles?.theme;
  if (t) set.add(String(t));

  // from group keys: theme.<ThemeName>.*
  Object.keys(groups || {}).forEach((g) => {
    const m = g.match(/^theme\.(.+?)\./);
    if (m?.[1]) set.add(m[1]);
  });

  // from mobile keys: themeMobile.<ThemeName>.*
  Object.keys(groups || {}).forEach((g) => {
    const m = g.match(/^themeMobile\.(.+?)\./);
    if (m?.[1]) set.add(m[1]);
  });

  return [...set].sort((a, b) => a.localeCompare(b));
}

function collectKeysForSection(groups, groupName) {
  const section = groups[groupName] || {};
  const keys = Object.keys(section).sort((a, b) => a.localeCompare(b));
  return keys;
}

export default function ThemePanel({ groups, setValue }) {
  const themeNames = useMemo(() => getThemeNames(groups), [groups]);
  const currentTheme = String(groups?.toggles?.theme || themeNames[0] || "Theme_4");

  const [theme, setTheme] = useState(currentTheme);
  const [mode, setMode] = useState("desktop"); // desktop | mobile
  const [section, setSection] = useState("header");

  // Keep theme selector synced if sheet changes
  React.useEffect(() => {
    if (currentTheme && currentTheme !== theme) setTheme(currentTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTheme]);

  const desktopSections = useMemo(() => {
    // Only show sections that exist for the theme OR from known list
    const existing = new Set();
    Object.keys(groups || {}).forEach((g) => {
      const prefix = `theme.${theme}.`;
      if (g.startsWith(prefix)) {
        const sec = g.slice(prefix.length);
        existing.add(sec);
      }
    });

    const ordered = [
      ...SECTION_ORDER.filter((s) => existing.has(s)),
      ...[...existing].filter((s) => !SECTION_ORDER.includes(s)).sort(),
    ];

    // fallback if none found (still show order list)
    return ordered.length ? ordered : SECTION_ORDER;
  }, [groups, theme]);

  const mobileSections = useMemo(() => {
    const existing = new Set();
    Object.keys(groups || {}).forEach((g) => {
      const prefix = `themeMobile.${theme}.`;
      if (g.startsWith(prefix)) {
        const sec = g.slice(prefix.length);
        existing.add(sec);
      }
    });

    const ordered = [
      ...MOBILE_SECTION_ORDER.filter((s) => existing.has(s)),
      ...[...existing].filter((s) => !MOBILE_SECTION_ORDER.includes(s)).sort(),
    ];

    return ordered.length ? ordered : MOBILE_SECTION_ORDER;
  }, [groups, theme]);

  const groupName = useMemo(() => {
    return mode === "mobile" ? `themeMobile.${theme}.${section}` : `theme.${theme}.${section}`;
  }, [mode, theme, section]);

  const keys = useMemo(() => collectKeysForSection(groups, groupName), [groups, groupName]);
  const sectionObj = groups[groupName] || {};

  const themeTabs = themeNames.map((t) => ({ label: t, value: t }));

  const sectionTabs = (mode === "mobile" ? mobileSections : desktopSections).map((s) => ({
    label: SECTION_LABELS[s] || s,
    value: s,
  }));

  return (
    <div className="space-y-4">
      {/* Theme selector */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="text-sm font-medium">Theme</div>

        <div className="flex flex-wrap gap-2">
          <Tabs
            items={themeTabs}
            value={theme}
            onChange={(t) => {
              setTheme(t);
              // also update toggles.theme so app uses it
              setValue("toggles", "theme", t);
            }}
          />
        </div>
      </div>

      {/* Desktop/Mobile mode */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("desktop")}
          className={[
            "rounded-xl border px-3 py-1.5 text-sm",
            mode === "desktop"
              ? "border-white/20 bg-white/10"
              : "border-white/10 bg-white/5 hover:bg-white/10",
          ].join(" ")}
        >
          Desktop
        </button>
        <button
          onClick={() => setMode("mobile")}
          className={[
            "rounded-xl border px-3 py-1.5 text-sm",
            mode === "mobile"
              ? "border-white/20 bg-white/10"
              : "border-white/10 bg-white/5 hover:bg-white/10",
          ].join(" ")}
        >
          Mobile
        </button>
      </div>

      {/* Section tabs */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Section</div>
        <Tabs
          items={sectionTabs}
          value={section}
          onChange={(s) => setSection(s)}
        />
      </div>

      {/* Key/value editor */}
      <div className="rounded-2xl border border-white/10 bg-black/10 p-3 md:p-4 space-y-3">
        <div className="text-xs opacity-75">
          Editing: <span className="font-mono">{groupName}</span>
        </div>

        {keys.length === 0 ? (
          <div className="text-sm opacity-80">
            No keys found for this section.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((k) => (
              <KVRow
                key={k}
                label={k}
                value={sectionObj[k]}
                onChange={(v) => setValue(groupName, k, v)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
