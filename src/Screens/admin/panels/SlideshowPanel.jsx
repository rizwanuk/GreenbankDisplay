// src/Screens/admin/panels/SlideshowPanel.jsx
import React, { useMemo, useState } from "react";
import { TextInput, SelectInput } from "../components/AdminField";

function getGroup(groups, groupKey) {
  const g = groups?.[groupKey];
  return g && typeof g === "object" ? g : {};
}

function safeJsonParse(s) {
  try {
    if (typeof s === "object" && s) return s;
    if (typeof s !== "string") return {};
    const trimmed = s.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  } catch {
    return null; // null = invalid JSON
  }
}

function nextSlideKey(existingKeys) {
  let max = 0;
  for (const k of existingKeys) {
    const n = Number(String(k).replace("slide", ""));
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `slide${max + 1}`;
}

// Accept blank OR "YYYY-MM-DDTHH:mm" OR ISO
function isValidDateTime(value) {
  if (!value) return true;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function splitDateTime(value) {
  // returns { date: "YYYY-MM-DD", time: "HH:mm" }
  if (!value) return { date: "", time: "" };

  // Prefer the common sheet format: 2026-02-18T10:30
  const s = String(value).trim();
  const tIdx = s.indexOf("T");
  if (tIdx > 0) {
    const date = s.slice(0, tIdx);
    const time = s.slice(tIdx + 1, tIdx + 6); // HH:mm
    return {
      date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "",
      time: /^\d{2}:\d{2}$/.test(time) ? time : "",
    };
  }

  // Fallback: try parse as ISO and format to local "YYYY-MM-DDTHH:mm"
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return { date: "", time: "" };

  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");

  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());

  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}

function combineDateTime(date, time) {
  // If both empty -> ""
  const d = String(date || "").trim();
  const t = String(time || "").trim();

  if (!d && !t) return "";

  // If date provided but no time, default time to 00:00
  if (d && !t) return `${d}T00:00`;

  // If time provided but no date, we can't safely store -> return ""
  if (!d && t) return "";

  // Both present
  return `${d}T${t}`;
}

function DateTimeRow({
  label,
  dateValue,
  timeValue,
  onChangeDate,
  onChangeTime,
  onClear,
  hint,
  invalid,
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>

      <div className="grid grid-cols-1 md:grid-cols-[220px_160px_1fr] gap-3 items-end">
        <div className="space-y-1">
          <div className="text-xs opacity-70">Date</div>
          <input
            type="date"
            value={dateValue}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs opacity-70">Time</div>
          <input
            type="time"
            value={timeValue}
            onChange={(e) => onChangeTime(e.target.value)}
            className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-2 md:justify-end">
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-sm"
            title="Clear date & time (means: always)"
          >
            Clear
          </button>
        </div>
      </div>

      {hint ? <div className="text-xs opacity-60">{hint}</div> : null}

      {invalid ? (
        <div className="text-xs rounded-xl border border-yellow-400/30 bg-yellow-500/10 text-yellow-100 px-3 py-2">
          ⚠️ Date/time looks incomplete. If you set a time, please also set a date.
        </div>
      ) : null}
    </div>
  );
}

export default function SlideshowPanel({ groups, setValue }) {
  const slideshow = getGroup(groups, "slideshow");
  const duration = slideshow?.duration ?? "8";
  const [statusMsg, setStatusMsg] = useState("");

  const slides = useMemo(() => {
    const keys = Object.keys(slideshow || {}).filter((k) => k.startsWith("slide"));
    keys.sort((a, b) => a.localeCompare(b));

    return keys.map((key) => {
      const raw = slideshow?.[key] ?? "";
      const parsed = safeJsonParse(raw);

      if (parsed === null) {
        return {
          key,
          _raw: String(raw ?? ""),
          _jsonOk: false,
          type: "image",
          content: "",
          start: "",
          end: "",
        };
      }

      return {
        key,
        _raw: String(raw ?? ""),
        _jsonOk: true,
        type: parsed?.type || "image",
        content: parsed?.content || "",
        start: parsed?.start || "",
        end: parsed?.end || "",
      };
    });
  }, [slideshow]);

  function setDuration(v) {
    setValue("slideshow", "duration", String(v ?? "").trim());
    setStatusMsg("Updated duration (remember to Save)");
    setTimeout(() => setStatusMsg(""), 1200);
  }

  function writeSlide(key, nextObj) {
    const payload = {
      type: nextObj.type || "image",
      content: nextObj.content || "",
      start: nextObj.start || "",
      end: nextObj.end || "",
    };
    setValue("slideshow", key, JSON.stringify(payload));
  }

  function updateSlide(key, patch) {
    const current = slides.find((s) => s.key === key);

    const base =
      current && current._jsonOk
        ? { type: current.type, content: current.content, start: current.start, end: current.end }
        : { type: "image", content: "", start: "", end: "" };

    writeSlide(key, { ...base, ...patch });
  }

  function addSlide() {
    const newKey = nextSlideKey(slides.map((s) => s.key));
    setValue(
      "slideshow",
      newKey,
      JSON.stringify({ type: "image", content: "", start: "", end: "" })
    );
    setStatusMsg(`Added ${newKey} (remember to Save)`);
    setTimeout(() => setStatusMsg(""), 1500);
  }

  function removeSlide(key) {
    setValue("slideshow", key, "");
    setStatusMsg(`Cleared ${key} (remember to Save)`);
    setTimeout(() => setStatusMsg(""), 1500);
  }

  return (
    <div className="space-y-4">
      {statusMsg ? (
        <div className="text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 opacity-80">
          ✅ {statusMsg}
        </div>
      ) : null}

      {/* Duration */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
        <div className="text-sm font-semibold">Slideshow timing</div>
        <div className="text-xs opacity-70">Controls how long each slide stays on screen.</div>

        <TextInput
          label="Slide duration (seconds)"
          inputMode="numeric"
          value={duration}
          onChange={(v) => setDuration(v)}
        />
      </div>

      {/* Slides */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-semibold">Slides</div>
            <div className="text-xs opacity-70">
              Add/remove slides and set start/end windows. Leave start/end blank to always show.
            </div>
          </div>

          <button
            type="button"
            onClick={addSlide}
            className="px-3 py-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/15 text-sm"
          >
            + Add slide
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {slides.length === 0 ? (
            <div className="text-sm opacity-70">
              No slides found yet. Click <b>Add slide</b> to create one.
            </div>
          ) : null}

          {slides.map((s) => {
            const startOk = isValidDateTime(s.start);
            const endOk = isValidDateTime(s.end);

            const startSplit = splitDateTime(s.start);
            const endSplit = splitDateTime(s.end);

            const startIncomplete = !startSplit.date && !!startSplit.time;
            const endIncomplete = !endSplit.date && !!endSplit.time;

            const isHtml = (s.type || "image") === "html";
            const isImage = (s.type || "image") === "image";

            return (
              <div
                key={s.key}
                className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-4"
              >
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold">{s.key}</div>

                    {!s._jsonOk ? (
                      <span className="text-xs rounded-full border border-red-400/30 bg-red-500/10 text-red-200 px-2 py-1">
                        Invalid JSON (fixed by editing fields below)
                      </span>
                    ) : null}

                    {!startOk || !endOk ? (
                      <span className="text-xs rounded-full border border-yellow-400/30 bg-yellow-500/10 text-yellow-100 px-2 py-1">
                        Check start/end
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeSlide(s.key)}
                    className="text-sm rounded-xl border border-red-400/25 bg-red-500/10 text-red-200 px-3 py-2 hover:bg-red-500/15"
                    title="Clears this slide’s value in the sheet"
                  >
                    Remove
                  </button>
                </div>

                {/* ✅ Type now supports Image + HTML CTA (no other changes) */}
                <SelectInput
                  label="Type"
                  value={s.type || "image"}
                  options={[
                    { label: "Image", value: "image" },
                    { label: "HTML CTA", value: "html" },
                  ]}
                  onChange={(v) => updateSlide(s.key, { type: v })}
                />

                {/* ✅ Image URL input (unchanged for image slides) */}
                {isImage && (
                  <TextInput
                    label="Image URL"
                    value={s.content || ""}
                    onChange={(v) => updateSlide(s.key, { content: v })}
                  />
                )}

                {/* ✅ HTML CTA editor + preview */}
                {isHtml && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">HTML (CTA)</div>
                    <div className="text-xs opacity-70">
                      Paste your CTA HTML here. You can include a &lt;style&gt; block at the top.
                    </div>

                    <textarea
                      className="w-full min-h-[160px] rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-xs font-mono"
                      placeholder="<style>...</style>\n<div>...</div>"
                      value={s.content || ""}
                      onChange={(e) => updateSlide(s.key, { content: e.target.value })}
                    />

                    <div className="text-xs opacity-60">Live preview:</div>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 overflow-auto max-h-[260px]">
                      <div dangerouslySetInnerHTML={{ __html: s.content || "" }} />
                    </div>
                  </div>
                )}

                <DateTimeRow
                  label="Start (optional)"
                  dateValue={startSplit.date}
                  timeValue={startSplit.time}
                  onChangeDate={(d) => {
                    const next = combineDateTime(d, startSplit.time);
                    updateSlide(s.key, { start: next });
                  }}
                  onChangeTime={(t) => {
                    const next = combineDateTime(startSplit.date, t);
                    updateSlide(s.key, { start: next });
                  }}
                  onClear={() => updateSlide(s.key, { start: "" })}
                  hint="Leave blank to always show. If you set a time, also set a date."
                  invalid={startIncomplete}
                />

                <DateTimeRow
                  label="End (optional)"
                  dateValue={endSplit.date}
                  timeValue={endSplit.time}
                  onChangeDate={(d) => {
                    const next = combineDateTime(d, endSplit.time);
                    updateSlide(s.key, { end: next });
                  }}
                  onChangeTime={(t) => {
                    const next = combineDateTime(endSplit.date, t);
                    updateSlide(s.key, { end: next });
                  }}
                  onClear={() => updateSlide(s.key, { end: "" })}
                  hint="Leave blank to always show. If you set a time, also set a date."
                  invalid={endIncomplete}
                />

                <div className="text-xs opacity-60">Stored JSON:</div>
                <pre className="text-xs rounded-xl border border-white/10 bg-black/20 p-3 overflow-auto whitespace-pre-wrap break-words">
                  {JSON.stringify(
                    {
                      type: s.type || "image",
                      content: s.content || "",
                      start: s.start || "",
                      end: s.end || "",
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
