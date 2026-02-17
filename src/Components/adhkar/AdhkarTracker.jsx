// src/Components/adhkar/AdhkarTracker.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ADHKAR_PRESETS, ADHKAR_PACKS, getAdhkarById } from "../../utils/adhkarPresets";
import {
  loadHistory,
  appendHistory,
  clearHistory,
  deleteHistoryRecord,
  formatHistoryDate,
} from "../../utils/adhkarHistory";

// ── LocalStorage keys ────────────────────────────────────────────────────────
const LS_MODE = "gbm_adhkar_mode";
const LS_TARGET = "gbm_adhkar_target";
const LS_COUNT = "gbm_adhkar_count";
const LS_BASKET = "gbm_adhkar_basket";
const LS_BIDX = "gbm_basket_index";
const LS_BPROG = "gbm_basket_progress_v1";
const LS_BDONE = "gbm_basket_done_v1";

// ── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0e14",
  surface: "#13181f",
  surfaceHigh: "#1c232d",
  border: "rgba(255,255,255,0.07)",
  borderMid: "rgba(255,255,255,0.12)",
  green: "#22c55e",
  greenDim: "rgba(34,197,94,0.13)",
  greenBord: "rgba(34,197,94,0.3)",
  gold: "#f59e0b",
  text: "#eef2f7",
  muted: "rgba(238,242,247,0.5)",
  faint: "rgba(238,242,247,0.22)",
  red: "#ef4444",
  redDim: "rgba(239,68,68,0.14)",
  blue: "#60a5fa",
};

const COUNTER_PRESETS = [33, 34, 100];

// ── Helpers ───────────────────────────────────────────────────────────────────
function remapObj(obj, removed) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const i = Number(k);
    if (!Number.isFinite(i)) return;
    if (i < removed) out[i] = obj[k];
    if (i > removed) out[i - 1] = obj[k];
  });
  return out;
}
function reorderObj(obj, from, to) {
  const keys = Object.keys(obj || {})
    .map(Number)
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!keys.length) return obj;
  const max = Math.max(...keys, 0);
  const arr = Array.from({ length: max + 1 }, (_, i) => obj[i]);
  const [m] = arr.splice(from, 1);
  arr.splice(to, 0, m);
  const out = {};
  arr.forEach((v, i) => {
    if (v !== undefined) out[i] = v;
  });
  return out;
}
function lsGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v !== null ? v : fallback;
  } catch {
    return fallback;
  }
}
function lsGetJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

// ── Ring (progress) ──────────────────────────────────────────────────────────
function Ring({ progress, size = 120, count, target, label }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const off = c - Math.min(Math.max(progress, 0), 1) * c;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={T.green}
          strokeWidth="10"
          strokeDasharray={c}
          strokeDashoffset={off}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.25s ease" }}
        />
      </svg>

      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-bold tabular-nums" style={{ color: T.text, lineHeight: 1 }}>
          {count}
        </span>
        <span className="text-xs mt-0.5" style={{ color: T.muted }}>
          / {target}
        </span>
        {label ? (
          <span className="text-[10px] mt-1 tracking-wide" style={{ color: T.faint }}>
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ text }) {
  if (!text) return null;
  return (
    <div className="pointer-events-none fixed left-0 right-0 bottom-6 flex justify-center z-50">
      <div
        className="px-4 py-2 rounded-2xl border border-white/15 backdrop-blur-md"
        style={{ background: "rgba(0,0,0,0.65)", color: T.text }}
      >
        <span className="text-sm font-semibold">{text}</span>
      </div>
    </div>
  );
}

// ── History tab ───────────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState(() => loadHistory());
  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3">
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <span className="text-5xl">📖</span>
          <p className="text-sm" style={{ color: T.muted }}>
            No sessions recorded yet.
          </p>
        </div>
      ) : (
        <>
          <button
            onClick={() => {
              clearHistory();
              setHistory([]);
            }}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition"
            style={{
              background: "rgba(239,68,68,0.08)",
              color: "#f87171",
              border: "1px solid rgba(239,68,68,0.18)",
            }}
          >
            Clear all
          </button>

          {history.map((rec) => (
            <div
              key={rec.id}
              className="rounded-2xl p-4"
              style={{ background: T.surface, border: `1px solid ${T.border}` }}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold capitalize" style={{ color: T.text }}>
                    {rec.mode === "basket" ? "Daily Routine (Wird)" : rec.mode === "general" ? "Dhikr" : "Taraweeh"}
                  </span>
                  <span className="text-xs ml-2" style={{ color: T.faint }}>
                    {formatHistoryDate(rec.completedAt)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    deleteHistoryRecord(rec.id);
                    setHistory((h) => h.filter((r) => r.id !== rec.id));
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-lg"
                  style={{ color: T.faint }}
                >
                  ×
                </button>
              </div>

              {rec.mode === "basket" && rec.items ? (
                <div className="space-y-1.5">
                  {rec.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: T.muted }}>
                        {item.transliteration}
                      </span>
                      <span className="text-xs font-semibold" style={{ color: item.completed ? T.green : T.faint }}>
                        {item.completed ? `✓ ${item.count}×` : `${item.progress || 0}/${item.count}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs" style={{ color: T.muted }}>
                  {rec.totalCount} / {rec.target} completed
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Count picker ──────────────────────────────────────────────────────────────
function CountPicker({ value, onChange }) {
  return (
    <div className="mt-2 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${T.border}` }}>
      <div className="text-xs mb-2 font-semibold" style={{ color: T.muted }}>
        Recite count
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[1, 3, 7, 10, 33, 34, 100].map((n) => (
          <button
            key={n}
            onClick={(e) => {
              e.stopPropagation();
              onChange(n);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
            style={{
              background: value === n ? T.greenDim : "rgba(255,255,255,0.05)",
              color: value === n ? T.green : T.muted,
              border: `1px solid ${value === n ? T.greenBord : T.border}`,
            }}
          >
            {n}×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={999}
          value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            e.stopPropagation();
            onChange(Math.max(1, Math.min(999, Number(e.target.value) || 1)));
          }}
          className="w-20 px-3 py-1.5 rounded-xl text-xs text-center outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${T.border}`, color: T.text }}
        />
        <span className="text-xs" style={{ color: T.faint }}>
          custom
        </span>
      </div>
    </div>
  );
}

// ── Awrad tab (curated collections) ──────────────────────────────────────────
function AwradTab({ onApplyPack }) {
  const PACKS = useMemo(
    () =>
      (ADHKAR_PACKS || []).map((pack) => {
        const items = (pack.items || []).map(getAdhkarById).filter(Boolean);
        return { ...pack, itemCount: items.length, preview: items.slice(0, 3).map((a) => a.transliteration) };
      }),
    []
  );

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3">
      <p className="text-xs pb-1" style={{ color: T.muted }}>
        Curated collections of adhkar — أوراد مختارة
      </p>
      {PACKS.map((pack) => (
        <div key={pack.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="font-bold mb-0.5" style={{ color: T.text }}>
            {pack.title}
          </div>
          <div className="text-xs mb-3" style={{ color: T.muted }}>
            {pack.description} · {pack.itemCount} adhkar
          </div>
          {pack.preview.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {pack.preview.map((p, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: T.faint }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => onApplyPack(pack, { replace: true })}
              className="flex-1 py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition"
              style={{ background: T.green, color: "#fff" }}
            >
              Start this Wird
            </button>
            <button
              onClick={() => onApplyPack(pack, { replace: false })}
              className="px-4 py-3 rounded-xl text-sm font-semibold active:scale-[0.97] transition"
              style={{ background: "rgba(255,255,255,0.07)", color: T.muted, border: `1px solid ${T.border}` }}
            >
              Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dhikr library (add/remove) ───────────────────────────────────────────────
function DhikrLibrary({ basket, onToggleItem, libraryCounts, onChangeCount, selectedIdSet }) {
  const [expandedPreset, setExpandedPreset] = useState(null);
  const list = useMemo(() => ADHKAR_PRESETS || [], []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-2">
      <p className="text-xs pb-1" style={{ color: T.muted }}>
        Tap any dhikr to add/remove it from your Wird — أذكار فردية
      </p>

      {list.map((preset) => {
        const isSelected = selectedIdSet.has(preset.id);
        const isExpanded = expandedPreset === preset.id;
        const customCount = libraryCounts[preset.id] ?? preset.count;

        return (
          <div
            key={preset.id}
            className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: isSelected ? "rgba(34,197,94,0.07)" : T.surface,
              border: `1px solid ${isSelected ? T.greenBord : T.border}`,
            }}
          >
            <button onClick={() => onToggleItem(preset)} className="w-full text-left p-4">
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 mt-1 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: isSelected ? T.green : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${isSelected ? T.green : T.border}`,
                  }}
                >
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="text-xl leading-loose mb-1 text-right"
                    style={{ color: T.text, fontFamily: "serif", direction: "rtl", wordBreak: "break-word" }}
                  >
                    {preset.arabic}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: T.text }}>
                    {preset.transliteration}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: T.muted }}>
                    {preset.translation}
                  </div>

                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: T.greenDim, color: T.green }}
                    >
                      {customCount}×
                    </span>
                    {isSelected && <span className="text-xs" style={{ color: T.green }}>In Wird</span>}
                  </div>
                </div>
              </div>
            </button>

            <div className="px-4 pb-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedPreset(isExpanded ? null : preset.id);
                }}
                className="text-xs underline"
                style={{ color: T.faint }}
              >
                {isExpanded ? "Hide" : "Customise count"}
              </button>
              {isExpanded && <CountPicker value={customCount} onChange={(v) => onChangeCount(preset.id, v)} />}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Counter screen (Zikr / Taraweeh) ─────────────────────────────────────────
function CounterScreen({
  type, // "dhikr" | "taraweeh"
  count,
  target,
  setTarget,
  setTargetInput,
  increment,
  decrement,
  reset,
  editingTarget,
  targetInput,
  setEditingTarget,
  applyTarget,
}) {
  const progress = target > 0 ? Math.min(count / target, 1) : 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <Ring
          progress={progress}
          size={160}
          count={count}
          target={target}
          label={type === "taraweeh" ? "Raka'ah" : "Dhikr"}
        />

        <div className="mt-6 w-full max-w-md">
          {type === "taraweeh" ? (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[8, 20].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setTarget(n);
                    setTargetInput(String(n));
                  }}
                  className="py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition"
                  style={{
                    background: target === n ? T.green : T.surfaceHigh,
                    color: target === n ? "#fff" : T.muted,
                    border: `1px solid ${target === n ? T.green : T.border}`,
                  }}
                >
                  {n} raka'ah
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {COUNTER_PRESETS.map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setTarget(n);
                    setTargetInput(String(n));
                  }}
                  className="py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition"
                  style={{
                    background: target === n ? T.green : T.surfaceHigh,
                    color: target === n ? "#fff" : T.muted,
                    border: `1px solid ${target === n ? T.green : T.border}`,
                  }}
                >
                  {n}×
                </button>
              ))}
            </div>
          )}

          {editingTarget ? (
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                value={targetInput}
                autoFocus
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyTarget()}
                className="flex-1 px-3 py-3 rounded-2xl text-sm text-center outline-none"
                style={{ background: T.surfaceHigh, border: `1px solid ${T.greenBord}`, color: T.text }}
              />
              <button
                onClick={applyTarget}
                className="px-5 py-3 rounded-2xl text-sm font-bold active:scale-[0.98] transition"
                style={{ background: T.green, color: "#fff" }}
              >
                Set
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingTarget(true)}
              className="w-full py-3 rounded-2xl text-sm text-center mb-4 active:scale-[0.98] transition"
              style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.muted }}
            >
              Target: <span style={{ color: T.text, fontWeight: 800 }}>{target}</span>
              <span className="ml-1 text-xs" style={{ color: T.faint }}>
                · tap to change
              </span>
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={decrement}
              disabled={count === 0}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold transition active:scale-95"
              style={{
                background: T.surfaceHigh,
                border: `1.5px solid ${count === 0 ? T.border : T.borderMid}`,
                color: count === 0 ? T.faint : T.text,
              }}
            >
              −
            </button>

            <button
              onClick={increment}
              disabled={count >= target}
              className="flex-1 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition active:scale-[0.97]"
              style={{
                background: count >= target ? "rgba(255,255,255,0.05)" : T.green,
                color: count >= target ? T.faint : "#fff",
                boxShadow: count >= target ? "none" : "0 0 34px rgba(34,197,94,0.28)",
                letterSpacing: "0.05em",
              }}
            >
              {count >= target ? "✓" : type === "taraweeh" ? "+2" : "TAP"}
            </button>

            <button
              onClick={reset}
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-sm font-bold transition active:scale-95"
              style={{
                background: T.surfaceHigh,
                border: `1.5px solid ${T.borderMid}`,
                color: T.muted,
              }}
            >
              ↺
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdhkarTracker() {
  // Navigation (new UX)
  // home | wird | library | awrad | history | counter
  const [screen, setScreen] = useState("home");

  // Counter type: dhikr | taraweeh
  const [counterType, setCounterType] = useState("dhikr");

  // ── Core state ────────────────────────────────────────────────────────────
  const [mode, setMode] = useState(() => lsGet(LS_MODE, "wird")); // remembers last mode chosen
  const [target, setTarget] = useState(() => Number(lsGet(LS_TARGET, "33")));
  const [count, setCount] = useState(() => Number(lsGet(LS_COUNT, "0")));

  // ── Basket ────────────────────────────────────────────────────────────────
  const [basket, setBasket] = useState(() => lsGetJSON(LS_BASKET, []));
  const [basketIndex, setBasketIndex] = useState(() => Number(lsGet(LS_BIDX, "0")));
  const [basketProgress, setBasketProgress] = useState(() => lsGetJSON(LS_BPROG, {}));
  const [basketDone, setBasketDone] = useState(() => lsGetJSON(LS_BDONE, {}));
  const [basketCustomCounts, setBasketCustomCounts] = useState({});
  const [libraryCounts, setLibraryCounts] = useState({});

  // ── UI ────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState("");
  const toastTimerRef = useRef(null);

  const flash = useCallback((msg) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 1600);
  }, []);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => localStorage.setItem(LS_MODE, mode), [mode]);
  useEffect(() => localStorage.setItem(LS_TARGET, String(target)), [target]);
  useEffect(() => localStorage.setItem(LS_COUNT, String(count)), [count]);
  useEffect(() => localStorage.setItem(LS_BASKET, JSON.stringify(basket)), [basket]);
  useEffect(() => localStorage.setItem(LS_BIDX, String(basketIndex)), [basketIndex]);
  useEffect(() => localStorage.setItem(LS_BPROG, JSON.stringify(basketProgress)), [basketProgress]);
  useEffect(() => localStorage.setItem(LS_BDONE, JSON.stringify(basketDone)), [basketDone]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const selectedIdSet = useMemo(() => new Set(basket), [basket]);
  const completedCount = Object.values(basketDone).filter(Boolean).length;
  const allDone = basket.length > 0 && completedCount >= basket.length;

  const getSlotTarget = useCallback(
    (idx) => {
      if (basketCustomCounts[idx] != null) return basketCustomCounts[idx];
      const preset = ADHKAR_PRESETS.find((p) => p.id === basket[idx]);
      return preset?.count ?? 33;
    },
    [basket, basketCustomCounts]
  );

  // ── Refs for imperative basket increment ──────────────────────────────────
  const bIdxRef = useRef(basketIndex);
  const bDoneRef = useRef(basketDone);
  const bProgRef = useRef(basketProgress);
  const bTgtRef = useRef(target);
  const bRef = useRef(basket);

  useEffect(() => { bIdxRef.current = basketIndex; }, [basketIndex]);
  useEffect(() => { bDoneRef.current = basketDone; }, [basketDone]);
  useEffect(() => { bProgRef.current = basketProgress; }, [basketProgress]);
  useEffect(() => { bTgtRef.current = target; }, [target]);
  useEffect(() => { bRef.current = basket; }, [basket]);

  // ── When entering Wird, sync current slot ─────────────────────────────────
  useEffect(() => {
    if (screen !== "wird") return;
    setCount(Number(basketProgress[basketIndex] ?? 0));
    const t = basket[basketIndex] ? getSlotTarget(basketIndex) : 33;
    setTarget(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, basketIndex]);

  // ── Counter target editor ────────────────────────────────────────────────
  const [targetInput, setTargetInput] = useState(String(target));
  const [editingTarget, setEditingTarget] = useState(false);

  useEffect(() => setTargetInput(String(target)), [target]);

  const applyTarget = () => {
    const val = Math.max(1, Number(targetInput) || 1);
    setTarget(val);
    setEditingTarget(false);
    if (count > val) setCount(0);
  };

  // ── Counter increment/decrement/reset ─────────────────────────────────────
  const increment = useCallback(() => {
    // Wird mode increments the current slot by 1
    if (screen === "wird") {
      const curIdx = bIdxRef.current;
      const curDone = bDoneRef.current;
      const curProg = bProgRef.current;
      const curTarget = bTgtRef.current;
      const curBasket = bRef.current;

      if (!curBasket.length) return;
      if (curDone[curIdx]) return;

      const cur = Number(curProg[curIdx] ?? 0);
      if (cur >= curTarget) return;

      const next = Math.min(cur + 1, curTarget);
      setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
      setCount(next);

      if (next >= curTarget) {
        setBasketDone((bd) => {
          const updated = { ...bd, [curIdx]: true };
          let nextIdx = -1;
          for (let i = curIdx + 1; i < curBasket.length; i++) {
            if (!updated[i]) { nextIdx = i; break; }
          }
          if (nextIdx !== -1) setBasketIndex(nextIdx);
          return updated;
        });
      }
      return;
    }

    // Counter screens
    const step = counterType === "taraweeh" ? 2 : 1;
    setCount((c) => (c >= target ? c : Math.min(target, c + step)));
  }, [screen, counterType, target]);

  const decrement = useCallback(() => {
    if (screen === "wird") {
      const curIdx = bIdxRef.current;
      if (bDoneRef.current[curIdx]) return;
      const cur = Number(bProgRef.current[curIdx] ?? 0);
      if (cur <= 0) return;
      const next = Math.max(0, cur - 1);
      setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
      setCount(next);
      return;
    }

    const step = counterType === "taraweeh" ? 2 : 1;
    setCount((c) => Math.max(0, c - step));
  }, [screen, counterType]);

  const reset = useCallback(() => {
    setCount(0);
    setEditingTarget(false);
    if (screen === "wird") {
      const curIdx = bIdxRef.current;
      setBasketProgress((bp) => ({ ...bp, [curIdx]: 0 }));
      setBasketDone((bd) => { const n = { ...bd }; delete n[curIdx]; return n; });
    }
  }, [screen]);

  // ── Basket helpers ────────────────────────────────────────────────────────
  const addToBasket = (preset, customCount) => {
    const cnt = customCount ?? preset.count;
    setBasket((b) => {
      if (cnt !== preset.count) setBasketCustomCounts((bc) => ({ ...bc, [b.length]: cnt }));
      return [...b, preset.id];
    });
  };

  const removeFromBasket = (index) => {
    setBasket((b) => b.filter((_, i) => i !== index));
    setBasketProgress((bp) => remapObj(bp, index));
    setBasketDone((bd) => remapObj(bd, index));
    setBasketCustomCounts((bc) => remapObj(bc, index));
    if (basketIndex > index) setBasketIndex((i) => i - 1);
    if (basketIndex === index) setBasketIndex((i) => Math.max(0, Math.min(i, basket.length - 2)));
  };

  // 2a feedback: add/remove is instant + toast confirms
  const toggleLibraryItem = (preset) => {
    const customCount = libraryCounts[preset.id] ?? preset.count;
    const entries = basket.map((id, i) => ({ id, i })).filter((x) => x.id === preset.id);

    if (entries.length > 0) {
      removeFromBasket(entries[entries.length - 1].i);
      flash(`Removed: ${preset.transliteration}`);
    } else {
      addToBasket(preset, customCount);
      flash(`Added to Wird: ${preset.transliteration}`);
    }
  };

  const clearBasket = () => {
    setBasket([]);
    setBasketIndex(0);
    setCount(0);
    setBasketProgress({});
    setBasketDone({});
    setBasketCustomCounts({});
  };

  const restartSession = () => {
    setBasketProgress({});
    setBasketDone({});
    setBasketIndex(0);
    setCount(0);
  };

  const applyPack = (pack, { replace }) => {
    const validIds = (pack.items || []).filter((id) => !!getAdhkarById(id));
    if (!validIds.length) return;

    if (replace) {
      setBasket(validIds);
      setBasketIndex(0);
      setBasketProgress({});
      setBasketDone({});
      setBasketCustomCounts({});
      setCount(0);
      const first = ADHKAR_PRESETS.find((p) => p.id === validIds[0]);
      if (first) setTarget(first.count);
      flash(`Wird started: ${pack.title}`);
    } else {
      setBasket((b) => [...b, ...validIds]);
      flash(`Added pack: ${pack.title}`);
    }

    setMode("wird");
    setScreen("wird");
  };

  const finishSession = () => {
    appendHistory({
      mode: "basket",
      items: basket.map((id, idx) => {
        const preset = ADHKAR_PRESETS.find((p) => p.id === id);
        return {
          id,
          transliteration: preset?.transliteration ?? id,
          count: getSlotTarget(idx),
          progress: Number(basketProgress[idx] || 0),
          completed: !!basketDone[idx],
        };
      }),
    });
    clearBasket();
    flash("Saved to History");
    setScreen("home");
  };

  const saveCounterToHistory = () => {
    appendHistory({ mode: counterType === "taraweeh" ? "taraweeh" : "general", totalCount: count, target });
    flash("Saved to History");
    setCount(0);
  };

  // ── Header (safe-area aware; not tight at top) ────────────────────────────
  const Header = ({ title, onBack, right }) => (
    <div
      className="shrink-0 px-4 pb-3"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 12px)",
        borderBottom: `1px solid ${T.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded-2xl text-sm font-semibold active:scale-95 transition"
          style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.text }}
        >
          ← Back
        </button>
        <div className="flex-1 text-center font-extrabold" style={{ color: T.text }}>
          {title}
        </div>
        <div className="shrink-0">{right}</div>
      </div>
    </div>
  );

  // ── Home cards ────────────────────────────────────────────────────────────
  const Home = () => {
    const hasWird = basket.length > 0;

    return (
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-10">
        <div className="mb-4">
          <div className="text-xl font-extrabold" style={{ color: T.text }}>
            Adhkar
          </div>
          <div className="text-sm mt-1" style={{ color: T.muted }}>
            Choose what you want to do.
          </div>
        </div>

        <div className="grid gap-3">
          {/* Wird */}
          <button
            onClick={() => {
              setMode("wird");
              setScreen("wird");
            }}
            className="rounded-2xl p-4 text-left active:scale-[0.99] transition"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold" style={{ color: T.text }}>
                  Daily Routine (Wird)
                </div>
                <div className="text-sm mt-1" style={{ color: T.muted }}>
                  {hasWird ? `Continue your Wird · ${basket.length} items` : "Start with a curated pack or build your own"}
                </div>
              </div>
              <div className="text-2xl">🌙</div>
            </div>
          </button>

          {/* Zikr counter */}
          <button
            onClick={() => {
              setCounterType("dhikr");
              setMode("dhikr");
              setScreen("counter");
              if (!target || target < 1) setTarget(33);
              setCount(0);
            }}
            className="rounded-2xl p-4 text-left active:scale-[0.99] transition"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold" style={{ color: T.text }}>
                  Zikr Counter
                </div>
                <div className="text-sm mt-1" style={{ color: T.muted }}>
                  Simple counter with target + ring
                </div>
              </div>
              <div className="text-2xl">📿</div>
            </div>
          </button>

          {/* Taraweeh */}
          <button
            onClick={() => {
              setCounterType("taraweeh");
              setMode("taraweeh");
              setScreen("counter");
              // default to 20 if last target isn't 8/20
              setTarget((t) => (t === 8 || t === 20 ? t : 20));
              setCount(0);
            }}
            className="rounded-2xl p-4 text-left active:scale-[0.99] transition"
            style={{ background: T.surface, border: `1px solid ${T.border}` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-extrabold" style={{ color: T.text }}>
                  Taraweeh
                </div>
                <div className="text-sm mt-1" style={{ color: T.muted }}>
                  Choose 8 or 20 · tap adds 2 raka’ah
                </div>
              </div>
              <div className="text-2xl">🕌</div>
            </div>
          </button>
        </div>

        {/* Secondary actions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => setScreen("awrad")}
            className="py-3 rounded-2xl text-sm font-bold active:scale-[0.99] transition"
            style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.text }}
          >
            Awrad Packs
          </button>
          <button
            onClick={() => setScreen("library")}
            className="py-3 rounded-2xl text-sm font-bold active:scale-[0.99] transition"
            style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.text }}
          >
            Build Wird
          </button>
        </div>

        <button
          onClick={() => setScreen("history")}
          className="w-full mt-3 py-3 rounded-2xl text-sm font-bold active:scale-[0.99] transition"
          style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.muted }}
        >
          History
        </button>
      </div>
    );
  };

  // ── Wird screen (keeps your existing logic, cleaner wrapper) ───────────────
  const WirdScreen = () => {
    const currentItem =
      basket[basketIndex] ? ADHKAR_PRESETS.find((p) => p.id === basket[basketIndex]) ?? null : null;

    const slotTarget = basket[basketIndex] ? getSlotTarget(basketIndex) : target;
    const progress = slotTarget > 0 ? Math.min((Number(basketProgress[basketIndex] ?? 0) || 0) / slotTarget, 1) : 0;

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header
          title="Wird"
          onBack={() => setScreen("home")}
          right={
            <button
              onClick={() => setScreen("history")}
              className="px-3 py-2 rounded-2xl text-sm font-semibold active:scale-95 transition"
              style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.muted }}
            >
              History
            </button>
          }
        />

        {basket.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
            <div className="text-6xl">🌙</div>
            <div className="text-lg font-extrabold" style={{ color: T.text }}>
              No Wird set up
            </div>
            <div className="text-sm" style={{ color: T.muted }}>
              Start from Awrad Packs or Build Wird.
            </div>

            <div className="w-full max-w-sm grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => setScreen("awrad")}
                className="py-3 rounded-2xl text-sm font-bold active:scale-[0.99] transition"
                style={{ background: T.green, color: "#fff" }}
              >
                Awrad Packs
              </button>
              <button
                onClick={() => setScreen("library")}
                className="py-3 rounded-2xl text-sm font-bold active:scale-[0.99] transition"
                style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.text }}
              >
                Build Wird
              </button>
            </div>
          </div>
        ) : allDone ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
            <div className="text-6xl">🎉</div>
            <div className="text-2xl font-extrabold" style={{ color: T.text }}>
              Session Complete
            </div>
            <div className="text-sm" style={{ color: T.muted }}>
              Alhamdulillah — all adhkar completed.
            </div>

            <div className="w-full max-w-sm space-y-2 mt-4">
              <button
                onClick={finishSession}
                className="w-full py-4 rounded-2xl text-base font-extrabold active:scale-[0.97] transition"
                style={{ background: T.green, color: "#fff" }}
              >
                Finish &amp; Save
              </button>
              <div className="flex gap-2">
                <button
                  onClick={restartSession}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                  style={{ background: T.surfaceHigh, color: T.muted, border: `1px solid ${T.border}` }}
                >
                  Restart
                </button>
                <button
                  onClick={clearBasket}
                  className="flex-1 py-3 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                  style={{ background: T.redDim, color: "#f87171", border: `1px solid rgba(239,68,68,0.2)` }}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3 flex flex-col">
              {/* Progress strip + indicators */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: T.border }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${basket.length > 0 ? (completedCount / basket.length) * 100 : 0}%`,
                      background: T.green,
                    }}
                  />
                </div>
                <span className="text-xs shrink-0" style={{ color: T.muted }}>
                  {completedCount}/{basket.length}
                </span>
                <span
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.faint }}
                >
                  Wird: {basket.length}
                </span>
              </div>

              {/* Current item */}
              {currentItem && (
                <div className="flex-1 flex flex-col justify-center">
                  <div
                    className="text-right leading-loose mb-3"
                    style={{
                      color: T.text,
                      fontFamily: "serif",
                      direction: "rtl",
                      fontSize: "clamp(1.4rem, 5vw, 2rem)",
                      wordBreak: "break-word",
                      lineHeight: 2,
                    }}
                  >
                    {currentItem.arabic}
                  </div>

                  <div className="text-base font-semibold mb-1" style={{ color: T.text }}>
                    {currentItem.transliteration}
                  </div>
                  <div className="text-sm" style={{ color: T.muted }}>
                    {currentItem.translation}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom controls */}
            <div className="shrink-0 px-5 pb-5 pt-4" style={{ borderTop: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-4">
                <Ring
                  progress={progress}
                  size={88}
                  count={Number(basketProgress[basketIndex] ?? 0) || 0}
                  target={slotTarget}
                  label={`${basketIndex + 1}/${basket.length}`}
                />
                <div className="flex-1 ml-4">
                  <div className="text-sm" style={{ color: T.muted }}>
                    <span className="font-extrabold text-base" style={{ color: T.text }}>
                      {slotTarget}×
                    </span>{" "}
                    for this dhikr
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={decrement}
                  disabled={(Number(basketProgress[basketIndex] ?? 0) || 0) === 0}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold transition active:scale-95"
                  style={{
                    background: T.surfaceHigh,
                    border: `1.5px solid ${T.borderMid}`,
                    color: T.text,
                    opacity: (Number(basketProgress[basketIndex] ?? 0) || 0) === 0 ? 0.5 : 1,
                  }}
                >
                  −
                </button>

                <button
                  onClick={increment}
                  disabled={(Number(basketProgress[basketIndex] ?? 0) || 0) >= slotTarget}
                  className="flex-1 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition active:scale-[0.97]"
                  style={{
                    background:
                      (Number(basketProgress[basketIndex] ?? 0) || 0) >= slotTarget
                        ? "rgba(255,255,255,0.05)"
                        : T.green,
                    color:
                      (Number(basketProgress[basketIndex] ?? 0) || 0) >= slotTarget ? T.faint : "#fff",
                    boxShadow:
                      (Number(basketProgress[basketIndex] ?? 0) || 0) >= slotTarget
                        ? "none"
                        : "0 0 32px rgba(34,197,94,0.28)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {(Number(basketProgress[basketIndex] ?? 0) || 0) >= slotTarget ? "✓" : "TAP"}
                </button>

                <button
                  onClick={reset}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-sm font-bold transition active:scale-95"
                  style={{
                    background: T.surfaceHigh,
                    border: `1.5px solid ${T.borderMid}`,
                    color: T.muted,
                  }}
                >
                  ↺
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ── Safe-area wrapper ─────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        height: "100%",
        background: T.bg,
        color: T.text,
        fontFamily: "system-ui,-apple-system,sans-serif",
      }}
    >
      {/* NOTE: We intentionally do NOT put interactive controls at top:0.
              Header handles safe-area padding itself. */}

      {screen === "home" && <Home />}

      {screen === "history" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="History" onBack={() => setScreen("home")} />
          <HistoryTab />
        </div>
      )}

      {screen === "awrad" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header title="Awrad Packs" onBack={() => setScreen("home")} right={
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.faint }}>
              Wird: {basket.length}
            </span>
          }/>
          <AwradTab onApplyPack={applyPack} />
        </div>
      )}

      {screen === "library" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title="Build Wird"
            onBack={() => setScreen("home")}
            right={
              <button
                onClick={() => setScreen("wird")}
                className="px-3 py-2 rounded-2xl text-sm font-semibold active:scale-95 transition"
                style={{ background: T.greenDim, border: `1px solid ${T.greenBord}`, color: T.green }}
              >
                Go to Wird · {basket.length}
              </button>
            }
          />
          <DhikrLibrary
            basket={basket}
            onToggleItem={toggleLibraryItem}
            libraryCounts={libraryCounts}
            onChangeCount={(id, v) => setLibraryCounts((lc) => ({ ...lc, [id]: v }))}
            selectedIdSet={selectedIdSet}
          />
        </div>
      )}

      {screen === "wird" && <WirdScreen />}

      {screen === "counter" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header
            title={counterType === "taraweeh" ? "Taraweeh" : "Zikr"}
            onBack={() => setScreen("home")}
            right={
              <button
                onClick={saveCounterToHistory}
                className="px-3 py-2 rounded-2xl text-sm font-semibold active:scale-95 transition"
                style={{ background: "rgba(255,255,255,0.06)", border: `1px solid ${T.border}`, color: T.muted }}
              >
                Save
              </button>
            }
          />
          <CounterScreen
            type={counterType}
            count={count}
            target={target}
            setTarget={setTarget}
            setTargetInput={setTargetInput}
            increment={increment}
            decrement={decrement}
            reset={reset}
            editingTarget={editingTarget}
            targetInput={targetInput}
            setEditingTarget={setEditingTarget}
            applyTarget={applyTarget}
          />
        </div>
      )}

      <Toast text={toast} />
    </div>
  );
}
