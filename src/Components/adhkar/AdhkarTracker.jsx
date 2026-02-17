// src/Components/adhkar/AdhkarTracker.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ADHKAR_PRESETS,
  ADHKAR_PACKS,
  getAdhkarById,
} from "../../utils/adhkarPresets";
import {
  loadHistory,
  appendHistory,
  clearHistory,
  deleteHistoryRecord,
  formatHistoryDate,
} from "../../utils/adhkarHistory";

// ── LocalStorage keys ────────────────────────────────────────────────────────
const LS_MODE     = "gbm_adhkar_mode";
const LS_TARGET   = "gbm_adhkar_target";
const LS_COUNT    = "gbm_adhkar_count";
const LS_BASKET   = "gbm_adhkar_basket";
const LS_BIDX     = "gbm_basket_index";
const LS_BPROG    = "gbm_basket_progress_v1";
const LS_BDONE    = "gbm_basket_done_v1";

// ── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:          "#0a0e14",
  surface:     "#13181f",
  surfaceHigh: "#1c232d",
  border:      "rgba(255,255,255,0.07)",
  borderMid:   "rgba(255,255,255,0.12)",
  green:       "#22c55e",
  greenDim:    "rgba(34,197,94,0.13)",
  greenBord:   "rgba(34,197,94,0.3)",
  gold:        "#f59e0b",
  text:        "#eef2f7",
  muted:       "rgba(238,242,247,0.5)",
  faint:       "rgba(238,242,247,0.22)",
};

// ── Bottom nav tabs ───────────────────────────────────────────────────────────
// Bilingual labels as requested
const TABS = [
  { id: "wird",     ar: "وِرد",    en: "Daily Routine" },
  { id: "dhikr",    ar: "ذِكر",    en: "Dhikr"         },
  { id: "awrad",    ar: "أوراد",   en: "Awrad"         },
  { id: "history",  ar: "سِجِل",   en: "History"       },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function remapObj(obj, removed) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const i = Number(k); if (!Number.isFinite(i)) return;
    if (i < removed) out[i] = obj[k];
    if (i > removed) out[i - 1] = obj[k];
  });
  return out;
}
function reorderObj(obj, from, to) {
  const keys = Object.keys(obj || {}).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!keys.length) return obj;
  const max = Math.max(...keys, 0);
  const arr = Array.from({ length: max + 1 }, (_, i) => obj[i]);
  const [m] = arr.splice(from, 1); arr.splice(to, 0, m);
  const out = {}; arr.forEach((v, i) => { if (v !== undefined) out[i] = v; });
  return out;
}
function lsGet(key, fallback) {
  try { const v = localStorage.getItem(key); return v !== null ? v : fallback; } catch { return fallback; }
}
function lsGetJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

// ── Small ring (compact, used inside counter) ─────────────────────────────────
function Ring({ progress, size = 120, count, target }) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const off = c - Math.min(progress, 1) * c;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.border} strokeWidth="10"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={T.green} strokeWidth="10"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.25s ease" }}/>
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-3xl font-bold tabular-nums" style={{ color: T.text, lineHeight: 1 }}>{count}</span>
        <span className="text-xs mt-0.5" style={{ color: T.muted }}>/ {target}</span>
      </div>
    </div>
  );
}

// ── Dot navigator (prev / position dots / next) ───────────────────────────────
function DotNav({ total, current, onPrev, onNext }) {
  const MAX_DOTS = 7;
  const dots = Math.min(total, MAX_DOTS);
  return (
    <div className="flex items-center gap-3">
      {/* Prev */}
      <button onClick={onPrev} disabled={current === 0}
        className="w-9 h-9 flex items-center justify-center rounded-full transition active:scale-90"
        style={{
          background: current === 0 ? "rgba(255,255,255,0.04)" : T.surfaceHigh,
          border: `1px solid ${current === 0 ? T.border : T.borderMid}`,
          color: current === 0 ? T.faint : T.text,
        }}>
        ‹
      </button>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: dots }).map((_, i) => {
          // Map dot index to actual basket index when > MAX_DOTS
          const idx = total <= MAX_DOTS ? i : Math.round(i * (total - 1) / (MAX_DOTS - 1));
          const isCur = idx === current;
          return (
            <div key={i} className="rounded-full transition-all duration-200"
              style={{
                width:  isCur ? 20 : 6,
                height: 6,
                background: isCur ? T.green : T.faint,
              }} />
          );
        })}
      </div>

      {/* Next */}
      <button onClick={onNext} disabled={current === total - 1}
        className="w-9 h-9 flex items-center justify-center rounded-full transition active:scale-90"
        style={{
          background: current === total - 1 ? "rgba(255,255,255,0.04)" : T.surfaceHigh,
          border: `1px solid ${current === total - 1 ? T.border : T.borderMid}`,
          color: current === total - 1 ? T.faint : T.text,
        }}>
        ›
      </button>
    </div>
  );
}

// ── Celebration overlay ───────────────────────────────────────────────────────
function Celebration({ onNext }) {
  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center pb-32"
      style={{ background: "rgba(10,14,20,0.92)", backdropFilter: "blur(12px)" }}>
      <div className="text-center px-8 w-full">
        <div className="text-8xl mb-4">✨</div>
        <div className="text-2xl font-bold mb-1" style={{ color: T.text }}>Allahu Akbar!</div>
        <div className="text-base mb-8" style={{ color: T.muted }}>Dhikr complete</div>
        <button onClick={onNext}
          className="w-full py-4 rounded-2xl text-lg font-bold active:scale-[0.97] transition"
          style={{ background: T.green, color: "#fff" }}>
          Alhamdulillah
        </button>
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
          <p className="text-sm" style={{ color: T.muted }}>No sessions recorded yet.</p>
        </div>
      ) : (
        <>
          <button onClick={() => { clearHistory(); setHistory([]); }}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
            Clear all
          </button>
          {history.map((rec) => (
            <div key={rec.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold capitalize" style={{ color: T.text }}>
                    {rec.mode === "basket" ? "Daily Routine (Wird)" : rec.mode === "general" ? "Dhikr" : "Taraweeh"}
                  </span>
                  <span className="text-xs ml-2" style={{ color: T.faint }}>{formatHistoryDate(rec.completedAt)}</span>
                </div>
                <button onClick={() => { deleteHistoryRecord(rec.id); setHistory((h) => h.filter((r) => r.id !== rec.id)); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-lg" style={{ color: T.faint }}>×</button>
              </div>
              {rec.mode === "basket" && rec.items ? (
                <div className="space-y-1.5">
                  {rec.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: T.muted }}>{item.transliteration}</span>
                      <span className="text-xs font-semibold" style={{ color: item.completed ? T.green : T.faint }}>
                        {item.completed ? `✓ ${item.count}×` : `${item.progress || 0}/${item.count}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs" style={{ color: T.muted }}>{rec.totalCount} / {rec.target} completed</div>
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
      <div className="text-xs mb-2 font-semibold" style={{ color: T.muted }}>Recite count</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[1, 3, 7, 10, 33, 34, 100].map((n) => (
          <button key={n} onClick={(e) => { e.stopPropagation(); onChange(n); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
            style={{
              background: value === n ? T.greenDim : "rgba(255,255,255,0.05)",
              color: value === n ? T.green : T.muted,
              border: `1px solid ${value === n ? T.greenBord : T.border}`,
            }}>
            {n}×
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" min={1} max={999} value={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => { e.stopPropagation(); onChange(Math.max(1, Math.min(999, Number(e.target.value) || 1))); }}
          className="w-20 px-3 py-1.5 rounded-xl text-xs text-center outline-none"
          style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${T.border}`, color: T.text }} />
        <span className="text-xs" style={{ color: T.faint }}>custom</span>
      </div>
    </div>
  );
}

// ── Awrad tab (curated collections) ──────────────────────────────────────────
function AwradTab({ onApplyPack }) {
  const PACKS = useMemo(() => (ADHKAR_PACKS || []).map((pack) => {
    const items = (pack.items || []).map(getAdhkarById).filter(Boolean);
    return { ...pack, itemCount: items.length, preview: items.slice(0, 3).map((a) => a.transliteration) };
  }), []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-3">
      <p className="text-xs pb-1" style={{ color: T.muted }}>
        Curated collections of adhkar — أوراد مختارة
      </p>
      {PACKS.map((pack) => (
        <div key={pack.id} className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="font-bold mb-0.5" style={{ color: T.text }}>{pack.title}</div>
          <div className="text-xs mb-3" style={{ color: T.muted }}>{pack.description} · {pack.itemCount} adhkar</div>
          {pack.preview.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {pack.preview.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.06)", color: T.faint }}>{p}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => onApplyPack(pack, { replace: true })}
              className="flex-1 py-3 rounded-xl text-sm font-bold active:scale-[0.97] transition"
              style={{ background: T.green, color: "#fff" }}>
              Start this Wird
            </button>
            <button onClick={() => onApplyPack(pack, { replace: false })}
              className="px-4 py-3 rounded-xl text-sm font-semibold active:scale-[0.97] transition"
              style={{ background: "rgba(255,255,255,0.07)", color: T.muted, border: `1px solid ${T.border}` }}>
              Add
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Dhikr tab (individual browse / أذكار) ────────────────────────────────────
function DhikrTab({ basket, onToggleItem, libraryCounts, onChangeCount, selectedIdSet }) {
  const [expandedPreset, setExpandedPreset] = useState(null);
  const list = useMemo(() => ADHKAR_PRESETS || [], []);

  return (
    <div className="flex-1 overflow-y-auto px-4 pt-4 pb-6 space-y-2">
      <p className="text-xs pb-1" style={{ color: T.muted }}>
        Individual adhkar — أذكار فردية · tap to add to your Wird
      </p>
      {list.map((preset) => {
        const isSelected  = selectedIdSet.has(preset.id);
        const isExpanded  = expandedPreset === preset.id;
        const customCount = libraryCounts[preset.id] ?? preset.count;
        return (
          <div key={preset.id} className="rounded-2xl overflow-hidden transition-all"
            style={{
              background: isSelected ? "rgba(34,197,94,0.07)" : T.surface,
              border: `1px solid ${isSelected ? T.greenBord : T.border}`,
            }}>
            <button onClick={() => onToggleItem(preset)} className="w-full text-left p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-1 w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{
                    background: isSelected ? T.green : "rgba(255,255,255,0.06)",
                    border: `1.5px solid ${isSelected ? T.green : T.border}`,
                  }}>
                  {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xl leading-loose mb-1 text-right"
                    style={{ color: T.text, fontFamily: "serif", direction: "rtl", wordBreak: "break-word" }}>
                    {preset.arabic}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: T.text }}>{preset.transliteration}</div>
                  <div className="text-xs mt-0.5" style={{ color: T.muted }}>{preset.translation}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                      style={{ background: T.greenDim, color: T.green }}>{customCount}×</span>
                    {isSelected && <span className="text-xs" style={{ color: T.green }}>In Wird · tap to remove</span>}
                  </div>
                </div>
              </div>
            </button>
            <div className="px-4 pb-3">
              <button onClick={(e) => { e.stopPropagation(); setExpandedPreset(isExpanded ? null : preset.id); }}
                className="text-xs underline" style={{ color: T.faint }}>
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

// ── Wird tab (session / daily routine) ───────────────────────────────────────
// This is the main counter view + session management
function WirdTab({
  basket, basketIndex, basketDone, basketProgress, basketCustomCounts,
  allDone, completedCount, getSlotTarget,
  count, target, progress,
  increment, decrement, reset,
  onGoToIndex, onRemove, onClear, onRestart, onFinish,
  draggedIndex, setDraggedIndex, handleDragOver,
  showCelebration, onCelebrationNext,
  // general/taraweeh mode
  mode, editingTarget, targetInput, setTargetInput, setEditingTarget, applyTarget,
}) {
  const currentItem = basket[basketIndex]
    ? ADHKAR_PRESETS.find((p) => p.id === basket[basketIndex]) ?? null : null;

  const [showManage, setShowManage] = useState(false);

  // Navigate to a previous dhikr (re-opens it even if done)
  const goToPrev = () => {
    if (basketIndex > 0) onGoToIndex(basketIndex - 1);
  };
  const goToNext = () => {
    if (basketIndex < basket.length - 1) onGoToIndex(basketIndex + 1);
  };

  if (basket.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
        <span className="text-6xl">🌙</span>
        <div className="text-center">
          <div className="text-lg font-bold mb-1" style={{ color: T.text }}>No Wird set up</div>
          <div className="text-sm" style={{ color: T.muted }}>
            Go to Awrad (أوراد) to start with a curated collection,{"\n"}or browse Adhkar (أذكار) to build your own.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {showCelebration && <Celebration onNext={onCelebrationNext} />}

      {/* ── Manage sheet ──────────────────────────────────────────────── */}
      {showManage && (
        <div className="absolute inset-0 z-30 flex flex-col overflow-hidden"
          style={{ background: T.bg }}>
          <div className="shrink-0 flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${T.border}` }}>
            <span className="font-bold" style={{ color: T.text }}>Manage Wird</span>
            <button onClick={() => setShowManage(false)}
              className="px-3 py-1.5 rounded-xl text-sm font-semibold"
              style={{ background: T.surfaceHigh, color: T.muted }}>Done</button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: T.muted }}>{basket.length} adhkar · drag to reorder</span>
              <button onClick={() => { onClear(); setShowManage(false); }}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.15)" }}>
                Clear all
              </button>
            </div>
            {basket.map((presetId, idx) => {
              const preset = ADHKAR_PRESETS.find((p) => p.id === presetId);
              if (!preset) return null;
              const done    = !!basketDone[idx];
              const prog    = Number(basketProgress[idx] || 0);
              const slotTgt = getSlotTarget(idx);
              const pct     = slotTgt ? Math.round((Math.min(prog, slotTgt) / slotTgt) * 100) : 0;
              const isCur   = idx === basketIndex;
              return (
                <div key={`${presetId}-${idx}`} draggable
                  onDragStart={() => setDraggedIndex(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className="rounded-2xl p-3 transition cursor-move"
                  style={{
                    background: isCur ? "rgba(34,197,94,0.1)" : T.surface,
                    border: `1px solid ${isCur ? T.greenBord : T.border}`,
                    opacity: done && !isCur ? 0.5 : 1,
                  }}>
                  <div className="flex items-center gap-3">
                    <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ background: "rgba(255,255,255,0.06)", color: T.faint }}>{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate" style={{ color: T.text }}>{preset.transliteration}</div>
                      <div className="text-xs mt-0.5" style={{ color: T.muted }}>
                        {slotTgt}× · {pct}%{done ? " · ✓" : ""}{isCur ? " · current" : ""}
                      </div>
                    </div>
                    <button onClick={() => onRemove(idx)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-xl shrink-0"
                      style={{ color: T.faint }}>×</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Session complete ────────────────────────────────────────────── */}
      {allDone ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4 text-center">
          <div className="text-6xl">🎉</div>
          <div className="text-2xl font-bold" style={{ color: T.text }}>Session Complete</div>
          <div className="text-sm" style={{ color: T.muted }}>Alhamdulillah — all adhkar completed.</div>
          <div className="w-full space-y-2 mt-4">
            <button onClick={onFinish}
              className="w-full py-4 rounded-2xl text-base font-bold active:scale-[0.97] transition"
              style={{ background: T.green, color: "#fff" }}>
              Finish &amp; Save
            </button>
            <div className="flex gap-2">
              <button onClick={onRestart}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                style={{ background: T.surfaceHigh, color: T.muted, border: `1px solid ${T.border}` }}>
                Restart
              </button>
              <button onClick={() => setShowManage(true)}
                className="flex-1 py-3 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                style={{ background: T.surfaceHigh, color: T.muted, border: `1px solid ${T.border}` }}>
                Edit list
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Main counter layout ──────────────────────────────────────── */
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Arabic dhikr text — scrollable if very long ─────────────── */}
          <div className="flex-1 overflow-y-auto px-5 pt-3 pb-2 flex flex-col">

            {/* Session progress strip */}
            <div className="flex items-center gap-2 mb-3 shrink-0">
              <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: T.border }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${basket.length > 0 ? (completedCount / basket.length) * 100 : 0}%`, background: T.green }} />
              </div>
              <span className="text-xs shrink-0" style={{ color: T.muted }}>
                {completedCount}/{basket.length}
              </span>
              <button onClick={() => setShowManage(true)}
                className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold"
                style={{ background: T.surfaceHigh, color: T.muted, border: `1px solid ${T.border}` }}>
                Manage
              </button>
            </div>

            {/* Arabic text — the star of the show */}
            {currentItem && (
              <div className="flex-1 flex flex-col justify-center">
                <div className="text-right leading-loose mb-3"
                  style={{
                    color: T.text, fontFamily: "serif", direction: "rtl",
                    fontSize: "clamp(1.4rem, 5vw, 2rem)",
                    wordBreak: "break-word", lineHeight: 2,
                  }}>
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

            {/* Dot nav — tap to go prev/next dhikr */}
            <div className="flex justify-center mt-4 mb-1 shrink-0">
              <DotNav
                total={basket.length}
                current={basketIndex}
                onPrev={goToPrev}
                onNext={goToNext}
              />
            </div>
          </div>

          {/* ── Bottom controls — pinned, thumb-reachable ────────────────── */}
          <div className="shrink-0 px-5 pb-4 pt-3" style={{ borderTop: `1px solid ${T.border}` }}>

            {/* Ring + count display row */}
            <div className="flex items-center justify-between mb-4">
              <Ring progress={progress} size={88} count={count} target={target} />

              {/* Right side: target controls */}
              <div className="flex-1 ml-4">
                {mode === "taraweeh" && (
                  <div className="flex gap-2">
                    {[8, 20].map((n) => (
                      <button key={n} onClick={() => { /* handled by parent */ }}
                        className="flex-1 py-2 rounded-xl text-sm font-bold transition"
                        style={{
                          background: target === n ? T.green : T.surfaceHigh,
                          color: target === n ? "#fff" : T.muted,
                          border: `1px solid ${target === n ? T.green : T.border}`,
                        }}>
                        {n} rak'ahs
                      </button>
                    ))}
                  </div>
                )}
                {mode === "dhikr" && (
                  editingTarget ? (
                    <div className="flex gap-2">
                      <input type="number" value={targetInput} autoFocus
                        onChange={(e) => setTargetInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && applyTarget()}
                        className="flex-1 px-3 py-2 rounded-xl text-sm text-center outline-none"
                        style={{ background: T.surfaceHigh, border: `1px solid ${T.greenBord}`, color: T.text }} />
                      <button onClick={applyTarget}
                        className="px-4 py-2 rounded-xl text-sm font-bold"
                        style={{ background: T.green, color: "#fff" }}>Set</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingTarget(true)}
                      className="w-full py-2 rounded-xl text-sm text-center"
                      style={{ background: T.surfaceHigh, border: `1px solid ${T.border}`, color: T.muted }}>
                      Target: <span style={{ color: T.text, fontWeight: 700 }}>{target}</span>
                      <span className="ml-1 text-xs" style={{ color: T.faint }}>· tap to change</span>
                    </button>
                  )
                )}
                {mode === "wird" && (
                  <div className="text-sm" style={{ color: T.muted }}>
                    <span className="font-bold text-base" style={{ color: T.text }}>{getSlotTarget(basketIndex)}×</span>
                    {" "}for this dhikr
                  </div>
                )}
              </div>
            </div>

            {/* Main tap controls */}
            <div className="flex items-center gap-3">
              {/* − */}
              <button onClick={decrement} disabled={count === 0}
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold transition active:scale-90"
                style={{
                  background: T.surfaceHigh,
                  border: `1.5px solid ${count === 0 ? T.border : T.borderMid}`,
                  color: count === 0 ? T.faint : T.text,
                }}>−</button>

              {/* BIG TAP */}
              <button onClick={increment} disabled={count >= target}
                className="flex-1 h-16 rounded-2xl flex items-center justify-center text-2xl font-black transition active:scale-[0.96]"
                style={{
                  background: count >= target ? "rgba(255,255,255,0.05)" : T.green,
                  color: count >= target ? T.faint : "#fff",
                  boxShadow: count >= target ? "none" : "0 0 32px rgba(34,197,94,0.3)",
                  fontSize: "1.5rem",
                  letterSpacing: "0.05em",
                }}>
                {count >= target ? "✓" : "TAP"}
              </button>

              {/* Reset */}
              <button onClick={reset}
                className="w-14 h-14 rounded-full flex items-center justify-center text-xs font-bold transition active:scale-90"
                style={{
                  background: T.surfaceHigh,
                  border: `1.5px solid ${T.borderMid}`,
                  color: T.muted,
                }}>↺</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdhkarTracker() {
  // Active bottom tab
  const [activeTab, setActiveTab] = useState("wird");

  // ── Core state ────────────────────────────────────────────────────────────
  const [mode,   setMode]   = useState(() => lsGet(LS_MODE, "wird"));
  const [target, setTarget] = useState(() => Number(lsGet(LS_TARGET, "33")));
  const [count,  setCount]  = useState(() => Number(lsGet(LS_COUNT,  "0")));

  // ── Basket ────────────────────────────────────────────────────────────────
  const [basket,             setBasket]             = useState(() => lsGetJSON(LS_BASKET, []));
  const [basketIndex,        setBasketIndex]        = useState(() => Number(lsGet(LS_BIDX, "0")));
  const [basketProgress,     setBasketProgress]     = useState(() => lsGetJSON(LS_BPROG, {}));
  const [basketDone,         setBasketDone]         = useState(() => lsGetJSON(LS_BDONE, {}));
  const [basketCustomCounts, setBasketCustomCounts] = useState({});

  // ── Refs (always fresh for imperative callbacks) ──────────────────────────
  const bIdxRef  = useRef(basketIndex);
  const bDoneRef = useRef(basketDone);
  const bProgRef = useRef(basketProgress);
  const bTgtRef  = useRef(target);
  const bRef     = useRef(basket);
  useEffect(() => { bIdxRef.current  = basketIndex;    }, [basketIndex]);
  useEffect(() => { bDoneRef.current = basketDone;     }, [basketDone]);
  useEffect(() => { bProgRef.current = basketProgress; }, [basketProgress]);
  useEffect(() => { bTgtRef.current  = target;         }, [target]);
  useEffect(() => { bRef.current     = basket;         }, [basket]);

  // ── UI ────────────────────────────────────────────────────────────────────
  const [showCelebration, setShowCelebration] = useState(false);
  const [targetInput,     setTargetInput]     = useState(String(target));
  const [editingTarget,   setEditingTarget]   = useState(false);
  const [libraryCounts,   setLibraryCounts]   = useState({});
  const [draggedIndex,    setDraggedIndex]    = useState(null);

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => localStorage.setItem(LS_MODE,   mode),                   [mode]);
  useEffect(() => localStorage.setItem(LS_TARGET, String(target)),          [target]);
  useEffect(() => localStorage.setItem(LS_COUNT,  String(count)),           [count]);
  useEffect(() => localStorage.setItem(LS_BASKET, JSON.stringify(basket)),  [basket]);
  useEffect(() => localStorage.setItem(LS_BIDX,   String(basketIndex)),     [basketIndex]);
  useEffect(() => localStorage.setItem(LS_BPROG,  JSON.stringify(basketProgress)), [basketProgress]);
  useEffect(() => localStorage.setItem(LS_BDONE,  JSON.stringify(basketDone)),     [basketDone]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const completedCount = Object.values(basketDone).filter(Boolean).length;
  const allDone        = basket.length > 0 && completedCount >= basket.length;
  const progress       = target > 0 ? Math.min(count / target, 1) : 0;
  const selectedIdSet  = useMemo(() => new Set(basket), [basket]);

  const getSlotTarget = useCallback((idx) => {
    if (basketCustomCounts[idx] != null) return basketCustomCounts[idx];
    const preset = ADHKAR_PRESETS.find((p) => p.id === basket[idx]);
    return preset?.count ?? 33;
  }, [basket, basketCustomCounts]);

  // ── Sync count/target when basket index changes ───────────────────────────
  useEffect(() => {
    if (activeTab !== "wird") return;
    setCount(Number(basketProgress[basketIndex] ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIndex, activeTab]);

  useEffect(() => {
    if (activeTab !== "wird" || !basket[basketIndex]) return;
    const t = getSlotTarget(basketIndex);
    setTarget(t); setTargetInput(String(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [basketIndex, activeTab, JSON.stringify(basketCustomCounts)]);

  // ── Celebration (dhikr / taraweeh general modes — not wird) ──────────────
  useEffect(() => {
    if (activeTab === "wird") return;
    if (target > 0 && count >= target && count > 0) setShowCelebration(true);
  }, [count, target, activeTab]);

  // ── Increment (imperative — avoids cascade skip bug) ─────────────────────
  const increment = useCallback(() => {
    if (activeTab !== "wird") {
      setCount((c) => (c >= target ? c : c + (mode === "taraweeh" ? 2 : 1)));
      return;
    }
    const curIdx    = bIdxRef.current;
    const curDone   = bDoneRef.current;
    const curProg   = bProgRef.current;
    const curTarget = bTgtRef.current;
    const curBasket = bRef.current;
    if (curDone[curIdx]) return;
    const cur  = Number(curProg[curIdx] ?? 0);
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
  }, [activeTab, mode, target]);

  const decrement = useCallback(() => {
    if (activeTab !== "wird") {
      setCount((c) => Math.max(0, c - (mode === "taraweeh" ? 2 : 1)));
      return;
    }
    const curIdx = bIdxRef.current;
    if (bDoneRef.current[curIdx]) return;
    const cur  = Number(bProgRef.current[curIdx] ?? 0);
    if (cur <= 0) return;
    const next = Math.max(0, cur - 1);
    setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
    setCount(next);
  }, [activeTab, mode]);

  const reset = useCallback(() => {
    setCount(0); setShowCelebration(false);
    if (activeTab === "wird") {
      const curIdx = bIdxRef.current;
      setBasketProgress((bp) => ({ ...bp, [curIdx]: 0 }));
      setBasketDone((bd) => { const n = { ...bd }; delete n[curIdx]; return n; });
    }
  }, [activeTab]);

  // ── Navigate to a specific basket index (prev/next) ───────────────────────
  const goToIndex = useCallback((idx) => {
    if (idx < 0 || idx >= basket.length) return;
    setBasketIndex(idx);
    // If going back to a completed item, un-complete it so they can redo it
    if (basketDone[idx]) {
      setBasketDone((bd) => { const n = { ...bd }; delete n[idx]; return n; });
    }
  }, [basket.length, basketDone]);

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
    setShowCelebration(false);
  };

  const clearBasket = () => {
    setBasket([]); setBasketIndex(0); setCount(0);
    setBasketProgress({}); setBasketDone({}); setBasketCustomCounts({});
    setShowCelebration(false);
  };

  const restartSession = () => {
    setBasketProgress({}); setBasketDone({});
    setBasketIndex(0); setCount(0); setShowCelebration(false);
  };

  const toggleLibraryItem = (preset) => {
    const customCount = libraryCounts[preset.id] ?? preset.count;
    const entries = basket.map((id, i) => ({ id, i })).filter((x) => x.id === preset.id);
    if (entries.length > 0) removeFromBasket(entries[entries.length - 1].i);
    else addToBasket(preset, customCount);
  };

  const applyPack = (pack, { replace }) => {
    const validIds = (pack.items || []).filter((id) => !!getAdhkarById(id));
    if (!validIds.length) return;
    if (replace) {
      setBasket(validIds); setBasketIndex(0);
      setBasketProgress({}); setBasketDone({}); setBasketCustomCounts({});
      setCount(0); setShowCelebration(false);
      const first = ADHKAR_PRESETS.find((p) => p.id === validIds[0]);
      if (first) { setTarget(first.count); setTargetInput(String(first.count)); }
    } else {
      setBasket((b) => [...b, ...validIds]);
    }
    setActiveTab("wird");
  };

  const finishSession = () => {
    appendHistory({
      mode: "basket",
      items: basket.map((id, idx) => {
        const preset = ADHKAR_PRESETS.find((p) => p.id === id);
        return { id, transliteration: preset?.transliteration ?? id, count: getSlotTarget(idx), progress: Number(basketProgress[idx] || 0), completed: !!basketDone[idx] };
      }),
    });
    clearBasket();
  };

  const applyTarget = () => {
    const val = Math.max(1, Number(targetInput) || 1);
    setTarget(val); setEditingTarget(false);
    if (count > val) setCount(0);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const nb = [...basket]; const [d] = nb.splice(draggedIndex, 1); nb.splice(index, 0, d);
    setBasket(nb);
    setBasketProgress((bp) => reorderObj(bp, draggedIndex, index));
    setBasketDone((bd) => reorderObj(bd, draggedIndex, index));
    setBasketCustomCounts((bc) => reorderObj(bc, draggedIndex, index));
    setBasketIndex((cur) => {
      if (cur === draggedIndex) return index;
      if (draggedIndex < cur && index >= cur) return cur - 1;
      if (draggedIndex > cur && index <= cur) return cur + 1;
      return cur;
    });
    setDraggedIndex(index);
  };

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col overflow-hidden"
      style={{ height: "100%", background: T.bg, color: T.text, fontFamily: "system-ui,-apple-system,sans-serif" }}>

      {/* Safe area for notch — minimal, just the env inset */}
      <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />

      {/* ── Ultra-slim top bar ────────────────────────────────────────── */}
      {/* Max 44px, no title (bottom nav provides context) */}
      <div className="shrink-0 flex items-center justify-between px-4"
        style={{ height: 44, borderBottom: `1px solid ${T.border}` }}>
        {/* Left: mode indicator dot for Wird */}
        <div className="flex items-center gap-2">
          {activeTab === "wird" && basket.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: allDone ? T.green : T.gold }} />
              <span className="text-xs" style={{ color: T.muted }}>
                {allDone ? "Complete" : `${completedCount}/${basket.length}`}
              </span>
            </div>
          )}
        </div>

        {/* Right: history shortcut */}
        <button onClick={() => setActiveTab("history")}
          className="px-3 h-8 flex items-center rounded-xl text-xs font-semibold active:scale-95 transition"
          style={{ background: "rgba(255,255,255,0.06)", color: T.muted }}>
          سِجِل · History
        </button>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeTab === "wird" && (
          <WirdTab
            basket={basket} basketIndex={basketIndex}
            basketDone={basketDone} basketProgress={basketProgress}
            basketCustomCounts={basketCustomCounts}
            allDone={allDone} completedCount={completedCount}
            getSlotTarget={getSlotTarget}
            count={count} target={target} progress={progress}
            increment={increment} decrement={decrement} reset={reset}
            onGoToIndex={goToIndex}
            onRemove={removeFromBasket} onClear={clearBasket}
            onRestart={restartSession} onFinish={finishSession}
            draggedIndex={draggedIndex} setDraggedIndex={setDraggedIndex}
            handleDragOver={handleDragOver}
            showCelebration={showCelebration}
            onCelebrationNext={() => { appendHistory({ mode: "general", totalCount: count, target }); setShowCelebration(false); setCount(0); }}
            mode={activeTab}
            editingTarget={editingTarget} targetInput={targetInput}
            setTargetInput={setTargetInput} setEditingTarget={setEditingTarget}
            applyTarget={applyTarget}
          />
        )}

        {activeTab === "dhikr" && (
          <DhikrTab
            basket={basket}
            onToggleItem={toggleLibraryItem}
            libraryCounts={libraryCounts}
            onChangeCount={(id, v) => setLibraryCounts((lc) => ({ ...lc, [id]: v }))}
            selectedIdSet={selectedIdSet}
          />
        )}

        {activeTab === "awrad" && (
          <AwradTab onApplyPack={applyPack} />
        )}

        {activeTab === "history" && <HistoryTab />}
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────── */}
      <div className="shrink-0 flex"
        style={{
          borderTop: `1px solid ${T.border}`,
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          background: T.surface,
        }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition active:scale-95"
              style={{ color: isActive ? T.green : T.faint }}>
              <span className="text-base font-bold" style={{ fontFamily: "serif" }}>{tab.ar}</span>
              <span className="text-[10px] font-semibold tracking-wide">{tab.en}</span>
              {isActive && (
                <div className="w-5 h-0.5 rounded-full mt-0.5" style={{ background: T.green }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}