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

const LS_ADHKAR_MODE     = "gbm_adhkar_mode";
const LS_ADHKAR_TARGET   = "gbm_adhkar_target";
const LS_ADHKAR_COUNT    = "gbm_adhkar_count";
const LS_ADHKAR_BASKET   = "gbm_adhkar_basket";
const LS_BASKET_INDEX    = "gbm_basket_index";
const LS_BASKET_PROGRESS = "gbm_basket_progress_v1";
const LS_BASKET_DONE     = "gbm_basket_done_v1";
const LS_ADHKAR_SPLASH   = "gbm_adhkar_show_splash_v1";

// ─── Design tokens ──────────────────────────────────────────────────────────
const bg         = "#0d1117";
const surface    = "#161b22";
const border     = "rgba(255,255,255,0.08)";
const green      = "#22c55e";
const greenDim   = "rgba(34,197,94,0.12)";
const greenBord  = "rgba(34,197,94,0.28)";
const textPrime  = "#f0f6fc";
const textMuted  = "rgba(240,246,252,0.55)";
const textFaint  = "rgba(240,246,252,0.25)";

// ─── CircleProgress ──────────────────────────────────────────────────────────
function CircleProgress({ progress, size = 200, count, target }) {
  const r    = (size - 24) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - Math.min(progress, 1) * circ;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="14"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={green} strokeWidth="14"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.3s cubic-bezier(.4,0,.2,1)" }}/>
      </svg>
      <div className="flex flex-col items-center z-10">
        <span className="text-6xl font-bold tabular-nums" style={{ color: textPrime, lineHeight: 1 }}>{count}</span>
        <span className="text-sm mt-1" style={{ color: textMuted }}>of {target}</span>
        {progress >= 1 && <span className="text-xs mt-1 font-bold" style={{ color: green }}>Complete ✓</span>}
      </div>
    </div>
  );
}

// ─── Celebration overlay ──────────────────────────────────────────────────────
function CelebrationOverlay({ onNext }) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center"
      style={{ background: "rgba(13,17,23,0.93)", backdropFilter: "blur(10px)" }}>
      <div className="text-center px-8 w-full max-w-sm">
        <div className="text-8xl mb-5">🏆</div>
        <div className="text-3xl font-bold mb-1" style={{ color: textPrime }}>Allahu Akbar!</div>
        <div className="text-base mb-8" style={{ color: textMuted }}>Dhikr complete</div>
        <button onClick={onNext} className="w-full py-4 rounded-2xl text-lg font-bold active:scale-[0.97] transition"
          style={{ background: green, color: "#fff" }}>
          Alhamdulillah
        </button>
      </div>
    </div>
  );
}

// ─── Full-screen panel shell ──────────────────────────────────────────────────
function Panel({ title, onClose, children }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col overflow-hidden" style={{ background: bg }}>
      <div className="shrink-0 flex items-center gap-3 px-4 py-3" style={{ borderBottom: `1px solid ${border}` }}>
        <button onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition"
          style={{ background: "rgba(255,255,255,0.07)", color: textPrime }}>
          ‹
        </button>
        <span className="flex-1 text-base font-bold" style={{ color: textPrime }}>{title}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </div>
  );
}

// ─── History panel ────────────────────────────────────────────────────────────
function HistoryPanel({ onClose }) {
  const [history, setHistory] = useState(() => loadHistory());
  return (
    <Panel title="History" onClose={onClose}>
      {history.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <span className="text-5xl">📖</span>
          <p className="text-sm" style={{ color: textMuted }}>No sessions recorded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <button onClick={() => { clearHistory(); setHistory([]); }}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.98] transition"
            style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
            Clear all history
          </button>
          {history.map((rec) => (
            <div key={rec.id} className="rounded-2xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-bold capitalize" style={{ color: textPrime }}>
                    {rec.mode === "basket" ? "Session" : rec.mode}
                  </span>
                  <span className="text-xs ml-2" style={{ color: textFaint }}>{formatHistoryDate(rec.completedAt)}</span>
                </div>
                <button onClick={() => { deleteHistoryRecord(rec.id); setHistory((h) => h.filter((r) => r.id !== rec.id)); }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-lg"
                  style={{ color: textFaint }}>×</button>
              </div>
              {rec.mode === "basket" && rec.items ? (
                <div className="space-y-1.5">
                  {rec.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs" style={{ color: textMuted }}>{item.transliteration}</span>
                      <span className="text-xs font-semibold" style={{ color: item.completed ? green : textFaint }}>
                        {item.completed ? `✓ ${item.count}×` : `${item.progress || 0}/${item.count}`}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs" style={{ color: textMuted }}>{rec.totalCount} / {rec.target} completed</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Count picker ─────────────────────────────────────────────────────────────
function CountPicker({ value, onChange }) {
  return (
    <div className="mt-2 p-3 rounded-xl" style={{ background: "rgba(0,0,0,0.25)", border: `1px solid ${border}` }}>
      <div className="text-xs mb-2 font-semibold" style={{ color: textMuted }}>Recite count</div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {[1, 3, 7, 10, 33, 34, 100].map((n) => (
          <button key={n} onClick={(e) => { e.stopPropagation(); onChange(n); }}
            className="px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95"
            style={{
              background: value === n ? greenDim : "rgba(255,255,255,0.05)",
              color: value === n ? green : textMuted,
              border: `1px solid ${value === n ? greenBord : "rgba(255,255,255,0.1)"}`,
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
          style={{ background: "rgba(255,255,255,0.08)", border: `1px solid ${border}`, color: textPrime }} />
        <span className="text-xs" style={{ color: textFaint }}>custom</span>
      </div>
    </div>
  );
}

// ─── Add Adhkar panel ─────────────────────────────────────────────────────────
function AddAdhkarPanel({ onClose, onApplyPack, onToggleItem, libraryCounts, onChangeCount, selectedIdSet }) {
  const [tab, setTab] = useState("packs");
  const [expandedPreset, setExpandedPreset] = useState(null);
  const PACKS = useMemo(() => (ADHKAR_PACKS || []).map((pack) => {
    const items = (pack.items || []).map(getAdhkarById).filter(Boolean);
    return { ...pack, itemCount: items.length, preview: items.slice(0, 3).map((a) => a.transliteration) };
  }), []);

  return (
    <Panel title="Add Adhkar" onClose={onClose}>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {["packs", "library"].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2.5 rounded-2xl text-sm font-bold transition active:scale-[0.97]"
            style={{ background: tab === t ? green : "rgba(255,255,255,0.06)", color: tab === t ? "#fff" : textMuted }}>
            {t === "packs" ? "Packs" : "Library"}
          </button>
        ))}
      </div>

      {/* Packs */}
      {tab === "packs" && (
        <div className="space-y-3">
          {PACKS.map((pack) => (
            <div key={pack.id} className="rounded-2xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
              <div className="font-bold mb-0.5" style={{ color: textPrime }}>{pack.title}</div>
              <div className="text-xs mb-3" style={{ color: textMuted }}>{pack.description} · {pack.itemCount} items</div>
              {pack.preview.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {pack.preview.map((p, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(255,255,255,0.06)", color: textFaint }}>{p}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => onApplyPack(pack, { replace: true })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-[0.97] transition"
                  style={{ background: green, color: "#fff" }}>
                  Use this pack
                </button>
                <button onClick={() => onApplyPack(pack, { replace: false })}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold active:scale-[0.97] transition"
                  style={{ background: "rgba(255,255,255,0.07)", color: textMuted, border: `1px solid ${border}` }}>
                  Add
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Library */}
      {tab === "library" && (
        <div className="space-y-2 pb-8">
          {(ADHKAR_PRESETS || []).map((preset) => {
            const isSelected  = selectedIdSet.has(preset.id);
            const isExpanded  = expandedPreset === preset.id;
            const customCount = libraryCounts[preset.id] ?? preset.count;
            return (
              <div key={preset.id} className="rounded-2xl overflow-hidden transition-all"
                style={{
                  background: isSelected ? "rgba(34,197,94,0.07)" : surface,
                  border: `1px solid ${isSelected ? greenBord : border}`,
                }}>
                <button onClick={() => onToggleItem(preset)} className="w-full text-left p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="shrink-0 mt-1 w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{
                        background: isSelected ? green : "rgba(255,255,255,0.06)",
                        border: `1.5px solid ${isSelected ? green : "rgba(255,255,255,0.14)"}`,
                      }}>
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Arabic — wraps, no overflow */}
                      <div className="text-xl leading-relaxed mb-1"
                        style={{ color: textPrime, fontFamily: "serif", direction: "rtl", textAlign: "right", wordBreak: "break-word" }}>
                        {preset.arabic}
                      </div>
                      <div className="text-sm font-semibold" style={{ color: textPrime }}>{preset.transliteration}</div>
                      <div className="text-xs mt-0.5" style={{ color: textMuted }}>{preset.translation}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                          style={{ background: greenDim, color: green }}>{customCount}×</span>
                        {isSelected && <span className="text-xs" style={{ color: green }}>In session · tap to remove</span>}
                      </div>
                    </div>
                  </div>
                </button>
                <div className="px-4 pb-3 pt-0">
                  <button onClick={(e) => { e.stopPropagation(); setExpandedPreset(isExpanded ? null : preset.id); }}
                    className="text-xs underline transition" style={{ color: textFaint }}>
                    {isExpanded ? "Hide" : "Customise count"}
                  </button>
                  {isExpanded && <CountPicker value={customCount} onChange={(v) => onChangeCount(preset.id, v)} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ─── Basket manager panel ─────────────────────────────────────────────────────
function BasketManagerPanel({ onClose, basket, basketIndex, basketDone, basketProgress, getSlotTarget, onRemove, onClear, onAdd, mode, draggedIndex, setDraggedIndex, handleDragOver }) {
  return (
    <Panel title="Session List" onClose={onClose}>
      {basket.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-4">
          <span className="text-5xl">🛒</span>
          <p className="text-sm" style={{ color: textMuted }}>No adhkar in session</p>
          <button onClick={onAdd} className="px-6 py-3 rounded-2xl text-sm font-bold" style={{ background: green, color: "#fff" }}>
            Add Adhkar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs" style={{ color: textMuted }}>{basket.length} items · drag to reorder</span>
            <button onClick={onClear} className="px-3 py-1.5 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,0.08)", color: "#f87171", border: "1px solid rgba(239,68,68,0.18)" }}>
              Clear all
            </button>
          </div>
          {basket.map((presetId, idx) => {
            const preset  = ADHKAR_PRESETS.find((p) => p.id === presetId);
            if (!preset) return null;
            const done     = !!basketDone[idx];
            const prog     = Number(basketProgress[idx] || 0);
            const slotTgt  = getSlotTarget(idx);
            const pct      = slotTgt ? Math.round((Math.min(prog, slotTgt) / slotTgt) * 100) : 0;
            const isCur    = idx === basketIndex && mode === "basket";
            return (
              <div key={`${presetId}-${idx}`} draggable
                onDragStart={() => setDraggedIndex(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={() => setDraggedIndex(null)}
                className="rounded-2xl p-3 transition cursor-move"
                style={{
                  background: isCur ? "rgba(34,197,94,0.1)" : surface,
                  border: `1px solid ${isCur ? greenBord : border}`,
                  opacity: done && !isCur ? 0.5 : 1,
                }}>
                <div className="flex items-center gap-3">
                  <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{ background: "rgba(255,255,255,0.06)", color: textFaint }}>{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: textPrime }}>{preset.transliteration}</div>
                    <div className="text-xs mt-0.5" style={{ color: textMuted }}>
                      {slotTgt}× · {pct}%{done ? " · ✓" : ""}{isCur ? " · current" : ""}
                    </div>
                  </div>
                  <button onClick={() => onRemove(idx)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-xl shrink-0"
                    style={{ color: textFaint }}>×</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// ─── Index helpers ────────────────────────────────────────────────────────────
function remapIndexObject(obj, removedIndex) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const i = Number(k); if (!Number.isFinite(i)) return;
    if (i < removedIndex) out[i] = obj[k];
    if (i > removedIndex) out[i - 1] = obj[k];
  });
  return out;
}
function reorderIndexObject(obj, from, to) {
  const keys = Object.keys(obj || {}).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!keys.length) return obj;
  const max = Math.max(...keys, 0);
  const arr = Array.from({ length: max + 1 }, (_, i) => (obj[i] !== undefined ? obj[i] : undefined));
  const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved);
  const out = {}; arr.forEach((val, i) => { if (val !== undefined) out[i] = val; });
  return out;
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export default function AdhkarTracker() {
  // ── Core state ────────────────────────────────────────────────────────────
  const [showSplash, setShowSplash] = useState(() => localStorage.getItem(LS_ADHKAR_SPLASH) !== "0");
  const [mode,   setMode]   = useState(() => localStorage.getItem(LS_ADHKAR_MODE)   || "general");
  const [target, setTarget] = useState(() => Number(localStorage.getItem(LS_ADHKAR_TARGET)) || 33);
  const [count,  setCount]  = useState(() => Number(localStorage.getItem(LS_ADHKAR_COUNT))  || 0);

  // ── Basket ────────────────────────────────────────────────────────────────
  const [basket,         setBasket]         = useState(() => { try { return JSON.parse(localStorage.getItem(LS_ADHKAR_BASKET) || "[]"); } catch { return []; } });
  const [basketIndex,    setBasketIndex]    = useState(() => Number(localStorage.getItem(LS_BASKET_INDEX)) || 0);
  const [basketProgress, setBasketProgress] = useState(() => { try { return JSON.parse(localStorage.getItem(LS_BASKET_PROGRESS) || "{}"); } catch { return {}; } });
  const [basketDone,     setBasketDone]     = useState(() => { try { return JSON.parse(localStorage.getItem(LS_BASKET_DONE) || "{}"); } catch { return {}; } });
  const [basketCustomCounts, setBasketCustomCounts] = useState({});

  // ── Always-fresh refs (for imperative increment callback) ─────────────────
  const basketIndexRef    = useRef(basketIndex);
  const basketDoneRef     = useRef(basketDone);
  const basketProgressRef = useRef(basketProgress);
  const basketTargetRef   = useRef(target);
  const basketRef         = useRef(basket);
  useEffect(() => { basketIndexRef.current    = basketIndex;    }, [basketIndex]);
  useEffect(() => { basketDoneRef.current     = basketDone;     }, [basketDone]);
  useEffect(() => { basketProgressRef.current = basketProgress; }, [basketProgress]);
  useEffect(() => { basketTargetRef.current   = target;         }, [target]);
  useEffect(() => { basketRef.current         = basket;         }, [basket]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showCelebration,   setShowCelebration]   = useState(false);
  const [targetInput,       setTargetInput]       = useState(String(target));
  const [editingTarget,     setEditingTarget]     = useState(false);
  const [showAddOverlay,    setShowAddOverlay]    = useState(false);
  const [showBasketManager, setShowBasketManager] = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [draggedIndex,      setDraggedIndex]      = useState(null);
  const [libraryCounts,     setLibraryCounts]     = useState({});

  // ── Persist ───────────────────────────────────────────────────────────────
  useEffect(() => localStorage.setItem(LS_ADHKAR_SPLASH,   showSplash ? "1" : "0"), [showSplash]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_MODE,     mode),                   [mode]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_TARGET,   String(target)),          [target]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_COUNT,    String(count)),           [count]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_BASKET,   JSON.stringify(basket)),  [basket]);
  useEffect(() => localStorage.setItem(LS_BASKET_INDEX,    String(basketIndex)),     [basketIndex]);
  useEffect(() => localStorage.setItem(LS_BASKET_PROGRESS, JSON.stringify(basketProgress)), [basketProgress]);
  useEffect(() => localStorage.setItem(LS_BASKET_DONE,     JSON.stringify(basketDone)),     [basketDone]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const currentBasketItem = mode === "basket" && basket[basketIndex]
    ? ADHKAR_PRESETS.find((p) => p.id === basket[basketIndex]) ?? null : null;
  const completedCount = Object.values(basketDone).filter(Boolean).length;
  const allDone        = basket.length > 0 && completedCount >= basket.length;
  const progress       = target > 0 ? Math.min(count / target, 1) : 0;
  const remaining      = Math.max(0, target - count);
  const selectedIdSet  = useMemo(() => new Set(basket), [basket]);

  const getSlotTarget = useCallback((idx) => {
    if (basketCustomCounts[idx] != null) return basketCustomCounts[idx];
    const preset = ADHKAR_PRESETS.find((p) => p.id === basket[idx]);
    return preset?.count ?? 33;
  }, [basket, basketCustomCounts]);

  // ── Sync count/target on index change ─────────────────────────────────────
  useEffect(() => {
    if (mode !== "basket") return;
    setCount(Number(basketProgress[basketIndex] ?? 0));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex]);

  useEffect(() => {
    if (mode !== "basket" || !currentBasketItem) return;
    const t = getSlotTarget(basketIndex);
    setTarget(t); setTargetInput(String(t));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex, currentBasketItem?.id, JSON.stringify(basketCustomCounts)]);

  // ── Celebration (general/taraweeh) ────────────────────────────────────────
  useEffect(() => {
    if (mode === "basket") return;
    if (target > 0 && count >= target && count > 0) setShowCelebration(true);
  }, [count, target, mode]);

  // ── Step & increment ──────────────────────────────────────────────────────
  const step = mode === "taraweeh" ? 2 : 1;

  const increment = useCallback(() => {
    if (mode !== "basket") {
      setCount((c) => (c >= target ? c : Math.min(c + step, target)));
      return;
    }
    const curIdx    = basketIndexRef.current;
    const curDone   = basketDoneRef.current;
    const curProg   = basketProgressRef.current;
    const curTarget = basketTargetRef.current;
    const curBasket = basketRef.current;
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
  }, [mode, step, target]);

  const decrement = useCallback(() => {
    if (mode !== "basket") { setCount((c) => Math.max(0, c - step)); return; }
    const curIdx = basketIndexRef.current;
    if (basketDoneRef.current[curIdx]) return;
    const cur  = Number(basketProgressRef.current[curIdx] ?? 0);
    if (cur <= 0) return;
    const next = Math.max(0, cur - 1);
    setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
    setCount(next);
  }, [mode, step]);

  const reset = useCallback(() => {
    setCount(0); setShowCelebration(false);
    if (mode === "basket") {
      const curIdx = basketIndexRef.current;
      setBasketProgress((bp) => ({ ...bp, [curIdx]: 0 }));
      setBasketDone((bd) => { const n = { ...bd }; delete n[curIdx]; return n; });
    }
  }, [mode]);

  // ── Mode switch ───────────────────────────────────────────────────────────
  const switchMode = (newMode, { fromSplash } = {}) => {
    setMode(newMode); setShowCelebration(false);
    if (newMode === "taraweeh") { setTarget(20); setTargetInput("20"); setCount(0); }
    else if (newMode === "general") { setTarget(33); setTargetInput("33"); setCount(0); }
    else if (newMode === "basket") {
      let idx = Math.min(basketIndex, Math.max(0, basket.length - 1));
      for (let i = 0; i < basket.length; i++) { if (!basketDone[i]) { idx = i; break; } }
      setBasketIndex(idx);
      const item = basket[idx] ? ADHKAR_PRESETS.find((p) => p.id === basket[idx]) : null;
      if (item) { const t = getSlotTarget(idx); setTarget(t); setTargetInput(String(t)); setCount(Number(basketProgress[idx] || 0)); }
      else { setTarget(33); setTargetInput("33"); setCount(0); }
    }
    if (newMode !== "basket") setCount(0);
    if (fromSplash) setShowSplash(false);
  };

  // ── Basket helpers ────────────────────────────────────────────────────────
  const addToBasket = (preset, customCount) => {
    const cnt = customCount ?? preset.count;
    setBasket((b) => {
      if (cnt !== preset.count) setBasketCustomCounts((bc) => ({ ...bc, [b.length]: cnt }));
      return [...b, preset.id];
    });
    if (mode === "basket" && basket.length === 0) {
      setBasketIndex(0); setTarget(cnt); setTargetInput(String(cnt));
      setCount(0); setBasketProgress({}); setBasketDone({});
    }
  };

  const removeFromBasket = (index) => {
    setBasket((b) => b.filter((_, i) => i !== index));
    setBasketProgress((bp) => remapIndexObject(bp, index));
    setBasketDone((bd) => remapIndexObject(bd, index));
    setBasketCustomCounts((bc) => remapIndexObject(bc, index));
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
      setCount(0); setShowCelebration(false); setShowAddOverlay(false); setMode("basket");
      const first = ADHKAR_PRESETS.find((p) => p.id === validIds[0]);
      if (first) { setTarget(first.count); setTargetInput(String(first.count)); }
      return;
    }
    setBasket((b) => [...b, ...validIds]);
    setShowAddOverlay(false);
  };

  const finishSession = () => {
    appendHistory({
      mode: "basket",
      items: basket.map((id, idx) => {
        const preset = ADHKAR_PRESETS.find((p) => p.id === id);
        return { id, transliteration: preset?.transliteration ?? id, count: getSlotTarget(idx), progress: Number(basketProgress[idx] || 0), completed: !!basketDone[idx] };
      }),
    });
    clearBasket(); setShowSplash(true);
  };

  const finishGeneralSession = () => {
    appendHistory({ mode, totalCount: count, target });
    setShowCelebration(false); setCount(0);
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
    setBasketProgress((bp) => reorderIndexObject(bp, draggedIndex, index));
    setBasketDone((bd) => reorderIndexObject(bd, draggedIndex, index));
    setBasketCustomCounts((bc) => reorderIndexObject(bc, draggedIndex, index));
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
    <div className="relative h-full flex flex-col overflow-hidden"
      style={{ background: bg, color: textPrime, fontFamily: "system-ui, -apple-system, sans-serif" }}>

      {/* Safe-area inset for notch/status bar */}
      <div style={{ height: "env(safe-area-inset-top, 0px)", flexShrink: 0 }} />

      {/* ── Full-screen overlays (stack on top) ─────────────────────────── */}
      {showHistory       && <HistoryPanel onClose={() => setShowHistory(false)} />}
      {showAddOverlay    && (
        <AddAdhkarPanel onClose={() => setShowAddOverlay(false)}
          onApplyPack={applyPack} onToggleItem={toggleLibraryItem}
          libraryCounts={libraryCounts}
          onChangeCount={(id, v) => setLibraryCounts((lc) => ({ ...lc, [id]: v }))}
          selectedIdSet={selectedIdSet} />
      )}
      {showBasketManager && (
        <BasketManagerPanel onClose={() => setShowBasketManager(false)}
          basket={basket} basketIndex={basketIndex}
          basketDone={basketDone} basketProgress={basketProgress}
          getSlotTarget={getSlotTarget}
          onRemove={removeFromBasket} onClear={clearBasket}
          onAdd={() => { setShowBasketManager(false); setShowAddOverlay(true); }}
          mode={mode} draggedIndex={draggedIndex}
          setDraggedIndex={setDraggedIndex} handleDragOver={handleDragOver} />
      )}
      {showCelebration && mode !== "basket" && <CelebrationOverlay onNext={finishGeneralSession} />}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* SPLASH SCREEN                                                    */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {showSplash ? (
        <div className="flex-1 overflow-y-auto flex flex-col px-5 pt-10 pb-10">
          <div className="mb-10">
            <h1 className="text-4xl font-black tracking-tight" style={{ color: textPrime }}>Adhkar</h1>
            <p className="text-sm mt-1" style={{ color: textMuted }}>Choose a mode to begin</p>
          </div>

          <div className="space-y-3 mb-4">
            {[
              { id: "general",  emoji: "🧿", title: "General",  sub: "Simple counter with a custom target" },
              { id: "basket",   emoji: "✅", title: "Session",  sub: basket.length > 0 ? `${basket.length} items saved — tap to resume` : "Build a list of adhkar to complete" },
              { id: "taraweeh", emoji: "🕌", title: "Taraweeh", sub: "Tracks rak'ahs in pairs — 8 or 20" },
            ].map((m) => (
              <button key={m.id} onClick={() => switchMode(m.id, { fromSplash: true })}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left active:scale-[0.98] transition"
                style={{
                  background: m.id === "basket" ? "rgba(34,197,94,0.08)" : surface,
                  border: `1px solid ${m.id === "basket" ? greenBord : border}`,
                }}>
                <span className="text-3xl">{m.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold" style={{ color: textPrime }}>{m.title}</div>
                  <div className="text-sm mt-0.5" style={{ color: textMuted }}>{m.sub}</div>
                </div>
                <span className="text-xl shrink-0" style={{ color: textFaint }}>›</span>
              </button>
            ))}
          </div>

          <button onClick={() => { setShowSplash(false); setShowHistory(true); }}
            className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-left active:scale-[0.98] transition"
            style={{ background: surface, border: `1px solid ${border}` }}>
            <span className="text-3xl">📖</span>
            <div className="flex-1">
              <div className="font-bold" style={{ color: textPrime }}>History</div>
              <div className="text-sm" style={{ color: textMuted }}>Past sessions</div>
            </div>
            <span className="text-xl shrink-0" style={{ color: textFaint }}>›</span>
          </button>

          <p className="text-xs text-center mt-10" style={{ color: textFaint }}>Saved locally on this device.</p>
        </div>

      ) : (
        /* ══════════════════════════════════════════════════════════════ */
        /* TRACKER VIEW                                                  */
        /* ══════════════════════════════════════════════════════════════ */
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── Top bar — compact, never overlaps phone chrome ─────────── */}
          <div className="shrink-0 flex items-center gap-2 px-4 py-2.5"
            style={{ borderBottom: `1px solid ${border}` }}>
            <button onClick={() => setShowSplash(true)}
              className="w-9 h-9 flex items-center justify-center rounded-xl active:scale-95 transition text-xl font-bold shrink-0"
              style={{ background: "rgba(255,255,255,0.07)", color: textPrime }}>
              ‹
            </button>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold" style={{ color: textPrime }}>
                {mode === "general" ? "General" : mode === "basket" ? "Session" : "Taraweeh"}
              </span>
              {mode === "basket" && basket.length > 0 && (
                <span className="text-xs ml-1.5" style={{ color: textMuted }}>
                  {completedCount}/{basket.length} done
                </span>
              )}
            </div>
            <button onClick={() => setShowHistory(true)}
              className="px-3 h-9 flex items-center justify-center rounded-xl text-xs font-semibold shrink-0 active:scale-95 transition"
              style={{ background: "rgba(255,255,255,0.07)", color: textMuted }}>
              History
            </button>
          </div>

          {/* ── Scrollable main area ─────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-10 space-y-4">

              {/* Session add/manage */}
              {mode === "basket" && (
                <div className="flex gap-2">
                  <button onClick={() => setShowAddOverlay(true)}
                    className="flex-1 py-3 rounded-2xl text-sm font-bold active:scale-[0.97] transition"
                    style={{ background: greenDim, color: green, border: `1px solid ${greenBord}` }}>
                    + Add Adhkar
                  </button>
                  <button onClick={() => setShowBasketManager(true)}
                    className="px-4 py-3 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                    style={{ background: "rgba(255,255,255,0.06)", color: textMuted, border: `1px solid ${border}` }}>
                    Manage
                  </button>
                </div>
              )}

              {/* Session complete */}
              {mode === "basket" && allDone && (
                <div className="rounded-2xl p-5" style={{ background: "rgba(34,197,94,0.08)", border: `1px solid ${greenBord}` }}>
                  <div className="text-2xl font-bold mb-1" style={{ color: textPrime }}>Session Complete 🎉</div>
                  <div className="text-sm mb-4" style={{ color: textMuted }}>Alhamdulillah — all adhkar completed.</div>
                  <button onClick={finishSession}
                    className="w-full py-3 rounded-2xl text-sm font-bold mb-2 active:scale-[0.97] transition"
                    style={{ background: green, color: "#fff" }}>
                    Finish &amp; Save
                  </button>
                  <div className="flex gap-2">
                    <button onClick={restartSession}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                      style={{ background: "rgba(255,255,255,0.06)", color: textMuted, border: `1px solid ${border}` }}>
                      Restart
                    </button>
                    <button onClick={() => setShowBasketManager(true)}
                      className="flex-1 py-2.5 rounded-2xl text-sm font-semibold active:scale-[0.97] transition"
                      style={{ background: "rgba(255,255,255,0.06)", color: textMuted, border: `1px solid ${border}` }}>
                      Edit list
                    </button>
                  </div>
                </div>
              )}

              {/* Session progress bar */}
              {mode === "basket" && basket.length > 0 && !allDone && (
                <div className="rounded-2xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold" style={{ color: textMuted }}>Progress</span>
                    <span className="text-xs font-bold" style={{ color: green }}>{completedCount}/{basket.length}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(completedCount / basket.length) * 100}%`, background: green }} />
                  </div>
                </div>
              )}

              {/* Current dhikr — Arabic text wraps correctly */}
              {mode === "basket" && !allDone && currentBasketItem && (
                <div className="rounded-2xl p-4" style={{ background: surface, border: `1px solid ${border}` }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.07)", color: textMuted }}>
                      {basketIndex + 1} of {basket.length}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: greenDim, color: green }}>
                      {getSlotTarget(basketIndex)}×
                    </span>
                  </div>
                  {/* Arabic — word-break so long duas wrap, no horizontal overflow */}
                  <div className="text-2xl leading-loose mb-3 text-right"
                    style={{ color: textPrime, fontFamily: "serif", direction: "rtl", wordBreak: "break-word", overflowWrap: "break-word", lineHeight: 2 }}>
                    {currentBasketItem.arabic}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: textPrime }}>{currentBasketItem.transliteration}</div>
                  <div className="text-xs mt-1" style={{ color: textMuted }}>{currentBasketItem.translation}</div>
                </div>
              )}

              {/* Target — general */}
              {mode === "general" && !editingTarget && (
                <button onClick={() => setEditingTarget(true)}
                  className="w-full py-3 rounded-2xl text-sm text-center active:scale-[0.98] transition"
                  style={{ background: surface, border: `1px solid ${border}`, color: textMuted }}>
                  Target: <span style={{ color: textPrime, fontWeight: 700 }}>{target}</span>
                  <span className="ml-1" style={{ color: textFaint }}>· tap to change</span>
                </button>
              )}
              {mode === "general" && editingTarget && (
                <div className="flex gap-2">
                  <input type="number" value={targetInput} autoFocus
                    onChange={(e) => setTargetInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && applyTarget()}
                    className="flex-1 px-4 py-3 rounded-2xl text-center text-base outline-none"
                    style={{ background: surface, border: `1px solid ${greenBord}`, color: textPrime }} />
                  <button onClick={applyTarget}
                    className="px-5 py-3 rounded-2xl text-sm font-bold active:scale-[0.97] transition"
                    style={{ background: green, color: "#fff" }}>
                    Set
                  </button>
                </div>
              )}

              {/* Taraweeh picker */}
              {mode === "taraweeh" && (
                <div className="flex gap-2">
                  {[8, 20].map((n) => (
                    <button key={n} onClick={() => { setTarget(n); setTargetInput(String(n)); setCount(0); }}
                      className="flex-1 py-3 rounded-2xl text-sm font-bold active:scale-[0.97] transition"
                      style={{
                        background: target === n ? green : surface,
                        color: target === n ? "#fff" : textMuted,
                        border: `1px solid ${target === n ? green : border}`,
                      }}>
                      {n} rak'ahs
                    </button>
                  ))}
                </div>
              )}

              {/* ── Progress ring ────────────────────────────────────────── */}
              <div className="flex justify-center py-4">
                <CircleProgress progress={progress} size={200} count={count} target={target} />
              </div>

              {mode === "taraweeh" && (
                <div className="text-center" style={{ color: textMuted }}>
                  <span className="text-2xl font-bold" style={{ color: green }}>{remaining}</span>
                  <span className="text-sm ml-1">remaining</span>
                </div>
              )}

              {/* ── Tap controls ─────────────────────────────────────────── */}
              <div className="flex items-center justify-center gap-5 pt-2">
                {/* − */}
                <button onClick={decrement} disabled={count === 0}
                  className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-3xl font-bold active:scale-90 transition"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${count === 0 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.15)"}`,
                    color: count === 0 ? "rgba(255,255,255,0.1)" : textPrime,
                  }}>
                  −
                </button>

                {/* Big tap */}
                <button onClick={increment} disabled={count >= target}
                  className="w-[112px] h-[112px] rounded-full flex items-center justify-center text-5xl font-black active:scale-95 transition"
                  style={{
                    background: count >= target ? "rgba(255,255,255,0.05)" : green,
                    color: count >= target ? "rgba(255,255,255,0.15)" : "#fff",
                    boxShadow: count >= target ? "none" : "0 0 48px rgba(34,197,94,0.35)",
                  }}>
                  +
                </button>

                {/* Reset */}
                <button onClick={reset}
                  className="w-[60px] h-[60px] rounded-full flex items-center justify-center text-xs font-bold active:scale-90 transition"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    color: textMuted,
                  }}>
                  Reset
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}