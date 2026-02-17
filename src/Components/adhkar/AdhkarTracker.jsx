// src/Components/adhkar/AdhkarTracker.jsx
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  ADHKAR_PRESETS,
  ADHKAR_PACKS,
  getAdhkarByCategory,
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

// ---------------------------------------------------------------------------
// Circular progress ring
// ---------------------------------------------------------------------------
function CircleProgress({ progress, size = 220 }) {
  const radius        = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset        = circumference - progress * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="16" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#10b981" strokeWidth="16"
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.25s ease" }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Celebration overlay (general / taraweeh only)
// ---------------------------------------------------------------------------
function CelebrationOverlay({ onNext }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
      <div className="text-center px-4">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <div className="text-2xl font-bold text-white mb-2">Allahu Akbar!</div>
        <div className="text-lg text-white/80 mb-6">Completed</div>
        <button onClick={onNext} className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition">
          Alhamdulillah
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper: build pack view
// ---------------------------------------------------------------------------
function buildPackView(pack) {
  const items   = (pack.items || []).map(getAdhkarById).filter(Boolean);
  const preview = items.slice(0, 4).map((a) => `${a.transliteration} ${a.count}×`);
  return { ...pack, itemCount: items.length, preview };
}

// ---------------------------------------------------------------------------
// Helper: remap index-keyed object after splice
// ---------------------------------------------------------------------------
function remapIndexObject(obj, removedIndex) {
  const out = {};
  Object.keys(obj || {}).forEach((k) => {
    const i = Number(k);
    if (!Number.isFinite(i)) return;
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
  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);
  const out = {};
  arr.forEach((val, i) => { if (val !== undefined) out[i] = val; });
  return out;
}

// ---------------------------------------------------------------------------
// History panel component
// ---------------------------------------------------------------------------
function HistoryPanel({ onClose }) {
  const [history, setHistory] = useState(() => loadHistory());

  const handleClearAll = () => {
    clearHistory();
    setHistory([]);
  };

  const handleDelete = (id) => {
    deleteHistoryRecord(id);
    setHistory((h) => h.filter((r) => r.id !== id));
  };

  return (
    <div className="absolute inset-0 bg-slate-900 z-30 overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">History</h2>
          <div className="flex gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
              Done
            </button>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📖</div>
            <div className="text-white/60">No completed sessions yet.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((rec) => (
              <div key={rec.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div>
                    <span className="text-white font-semibold capitalize">{rec.mode === "basket" ? "Session" : rec.mode}</span>
                    <span className="text-white/40 text-xs ml-2">{formatHistoryDate(rec.completedAt)}</span>
                  </div>
                  <button onClick={() => handleDelete(rec.id)} className="text-white/30 hover:text-red-400 text-lg leading-none">×</button>
                </div>

                {rec.mode === "basket" && rec.items ? (
                  <div className="space-y-1 mt-2">
                    {rec.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs text-white/60">
                        <span>{item.transliteration}</span>
                        <span className={item.completed ? "text-green-400" : "text-white/30"}>
                          {item.completed ? `✓ ${item.count}×` : `${item.progress || 0}/${item.count}`}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/60 mt-1">
                    {rec.totalCount} / {rec.target} completed
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Count customiser (used in Library tab)
// ---------------------------------------------------------------------------
function CountPicker({ value, onChange }) {
  const presets = [1, 3, 7, 10, 33, 34, 100];
  return (
    <div className="mt-2 p-2 rounded-xl bg-black/30 border border-white/10">
      <div className="text-xs text-white/50 mb-2">Recite count:</div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {presets.map((n) => (
          <button
            key={n}
            onClick={(e) => { e.stopPropagation(); onChange(n); }}
            className={[
              "px-2 py-1 rounded-lg text-xs font-semibold border transition",
              value === n
                ? "bg-green-500/30 border-green-400/50 text-green-200"
                : "bg-white/5 border-white/15 text-white/60 hover:bg-white/10",
            ].join(" ")}
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
            const v = Math.max(1, Math.min(999, Number(e.target.value) || 1));
            onChange(v);
          }}
          className="w-20 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-white text-xs text-center outline-none"
        />
        <span className="text-xs text-white/40">custom</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AdhkarTracker() {
  const PACKS = useMemo(() => (ADHKAR_PACKS || []).map(buildPackView), []);

  // ---------- Splash ----------
  const [showSplash, setShowSplash] = useState(() => {
    const saved = localStorage.getItem(LS_ADHKAR_SPLASH);
    return saved !== "0";
  });

  // ---------- Core state ----------
  const [mode,   setMode]   = useState(() => localStorage.getItem(LS_ADHKAR_MODE) || "general");
  const [target, setTarget] = useState(() => Number(localStorage.getItem(LS_ADHKAR_TARGET)) || 33);
  const [count,  setCount]  = useState(() => Number(localStorage.getItem(LS_ADHKAR_COUNT))  || 0);

  // ---------- Basket ----------
  const [basket, setBasket] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_ADHKAR_BASKET) || "[]"); }
    catch { return []; }
  });
  const [basketIndex, setBasketIndex] = useState(() => Number(localStorage.getItem(LS_BASKET_INDEX)) || 0);
  const [basketProgress, setBasketProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_BASKET_PROGRESS) || "{}"); }
    catch { return {}; }
  });
  const [basketDone, setBasketDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_BASKET_DONE) || "{}"); }
    catch { return {}; }
  });

  // Refs that mirror key state so increment() always reads the latest values
  // without needing them in its dependency array (avoids stale closures + re-firing).
  const basketIndexRef    = useRef(basketIndex);
  const basketDoneRef     = useRef(basketDone);
  const basketProgressRef = useRef(basketProgress);
  const basketTargetRef   = useRef(target);
  const basketRef         = useRef(basket);

  // ---------- UI state ----------
  const [showCelebration,    setShowCelebration]    = useState(false);
  const [targetInput,        setTargetInput]        = useState(String(target));
  const [editingTarget,      setEditingTarget]      = useState(false);
  const [showAddOverlay,     setShowAddOverlay]     = useState(false);
  const [addTab,             setAddTab]             = useState("packs");
  const [showBasketManager,  setShowBasketManager]  = useState(false);
  const [showHistory,        setShowHistory]        = useState(false);
  const [draggedIndex,       setDraggedIndex]       = useState(null);

  // Library: per-preset custom counts (separate from basket — just for the "add" UI)
  const [libraryCounts, setLibraryCounts] = useState({});
  // Library: which preset has the count picker open
  const [expandedPreset, setExpandedPreset] = useState(null);

  // ---------- Persist ----------
  useEffect(() => localStorage.setItem(LS_ADHKAR_SPLASH,    showSplash ? "1" : "0"), [showSplash]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_MODE,      mode),                   [mode]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_TARGET,    String(target)),          [target]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_COUNT,     String(count)),           [count]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_BASKET,    JSON.stringify(basket)),  [basket]);
  useEffect(() => localStorage.setItem(LS_BASKET_INDEX,     String(basketIndex)),     [basketIndex]);
  useEffect(() => localStorage.setItem(LS_BASKET_PROGRESS,  JSON.stringify(basketProgress)), [basketProgress]);
  useEffect(() => localStorage.setItem(LS_BASKET_DONE,      JSON.stringify(basketDone)),     [basketDone]);

  // Keep refs in sync
  useEffect(() => { basketIndexRef.current    = basketIndex;    }, [basketIndex]);
  useEffect(() => { basketDoneRef.current     = basketDone;     }, [basketDone]);
  useEffect(() => { basketProgressRef.current = basketProgress; }, [basketProgress]);
  useEffect(() => { basketTargetRef.current   = target;         }, [target]);
  useEffect(() => { basketRef.current         = basket;         }, [basket]);

  // ---------- Derived ----------
  const currentBasketItem = mode === "basket" && basket[basketIndex]
    ? ADHKAR_PRESETS.find((p) => p.id === basket[basketIndex]) ?? null
    : null;

  const completedCount = Object.values(basketDone).filter(Boolean).length;
  const allDone        = basket.length > 0 && completedCount >= basket.length;

  const getNextUndoneIndex = useCallback((startFrom) => {
    for (let i = startFrom; i < basket.length; i++) {
      if (!basketDone[i]) return i;
    }
    return -1;
  }, [basket, basketDone]);

  // ---------- Sync count when basket index changes ----------
  useEffect(() => {
    if (mode !== "basket") return;
    setCount(Number(basketProgress[basketIndex] ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex]);

  // ---------- Sync target when basket item changes ----------
  useEffect(() => {
    if (mode !== "basket" || !currentBasketItem) return;
    setTarget(currentBasketItem.count);
    setTargetInput(String(currentBasketItem.count));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex, currentBasketItem?.id]);

  // ---------- Celebration for general / taraweeh ----------
  useEffect(() => {
    if (mode === "basket") return;
    if (target > 0 && count >= target && count > 0) {
      setShowCelebration(true);
    }
  }, [count, target, mode]);

  // ---------- Step ----------
  const step = mode === "taraweeh" ? 2 : 1;

  // ---------- Increment — handles basket auto-advance imperatively ----------
  // Doing this here (not in a useEffect) avoids the cascade:
  //   count→effect fires→setBasketIndex→count reset to 0→effect fires again→skips item.
  const increment = useCallback(() => {
    if (mode !== "basket") {
      // General / taraweeh: simple clamp
      setCount((c) => (c >= target ? c : Math.min(c + step, target)));
      return;
    }

    // Basket mode — read latest index/done from refs so closure is always fresh
    const curIdx = basketIndexRef.current;
    const curDone = basketDoneRef.current;
    const curProgress = basketProgressRef.current;

    if (curDone[curIdx]) return; // already done, ignore taps

    const curTarget = basketTargetRef.current;
    const currentCount = Number(curProgress[curIdx] ?? 0);
    if (currentCount >= curTarget) return;

    const next = Math.min(currentCount + 1, curTarget);

    // Save progress
    setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
    setCount(next);

    // Check completion
    if (next >= curTarget) {
      // Mark done
      setBasketDone((bd) => {
        const updated = { ...bd, [curIdx]: true };
        // Find next undone using the updated map
        let nextIdx = -1;
        for (let i = curIdx + 1; i < basketRef.current.length; i++) {
          if (!updated[i]) { nextIdx = i; break; }
        }
        if (nextIdx !== -1) {
          // Advance index; the sync-count useEffect will set count for the new index
          setBasketIndex(nextIdx);
        }
        return updated;
      });
    }
  }, [mode, step, target]); // target here is for general/taraweeh only

  const decrement = useCallback(() => {
    if (mode !== "basket") {
      setCount((c) => (c <= 0 ? 0 : Math.max(0, c - step)));
      return;
    }
    const curIdx = basketIndexRef.current;
    if (basketDoneRef.current[curIdx]) return;
    const currentCount = Number(basketProgressRef.current[curIdx] ?? 0);
    if (currentCount <= 0) return;
    const next = Math.max(0, currentCount - 1);
    setBasketProgress((bp) => ({ ...bp, [curIdx]: next }));
    setCount(next);
  }, [mode, step]);

  const reset = useCallback(() => {
    setCount(0);
    setShowCelebration(false);
    if (mode === "basket") {
      const curIdx = basketIndexRef.current;
      setBasketProgress((bp) => ({ ...bp, [curIdx]: 0 }));
      setBasketDone((bd) => { const n = { ...bd }; delete n[curIdx]; return n; });
    }
  }, [mode]);

  const applyTarget = () => {
    const val = Math.max(1, Number(targetInput) || 1);
    setTarget(val);
    setEditingTarget(false);
    if (count > val) setCount(0);
  };

  // ---------- Mode switch ----------
  const switchMode = (newMode, { fromSplash } = {}) => {
    setMode(newMode);
    setShowCelebration(false);

    if (newMode === "taraweeh") {
      setTarget(20); setTargetInput("20"); setCount(0);
    } else if (newMode === "general") {
      setTarget(33); setTargetInput("33"); setCount(0);
    } else if (newMode === "basket") {
      let idx = Math.min(basketIndex, Math.max(0, basket.length - 1));
      const firstUndone = getNextUndoneIndex(0);
      if (firstUndone !== -1) idx = firstUndone;
      setBasketIndex(idx);
      const item = basket[idx] ? ADHKAR_PRESETS.find((p) => p.id === basket[idx]) : null;
      if (item) {
        setTarget(item.count); setTargetInput(String(item.count));
        setCount(Number(basketProgress[idx] || 0));
      } else {
        setTarget(33); setTargetInput("33"); setCount(0);
      }
    }

    if (fromSplash) setShowSplash(false);
  };

  // ---------- Basket helpers ----------
  const addToBasket = (preset, customCount) => {
    const count_ = customCount ?? preset.count;
    // Clone preset with possibly overridden count
    const entry = count_ !== preset.count ? { ...preset, count: count_ } : preset;
    // Store as {id, count} pair — basket stores plain IDs; to support custom count we store as "id:count"
    // To avoid breaking existing logic, we'll store "id" normally but track custom counts separately via basketCustomCounts
    setBasket((b) => [...b, entry.id]);
    setBasketCustomCounts((bc) => {
      if (count_ === preset.count) return bc; // default — no need to store
      return { ...bc, [basket.length]: count_ };
    });

    if (mode === "basket" && basket.length === 0) {
      setBasketIndex(0);
      setTarget(count_);
      setTargetInput(String(count_));
      setCount(0);
      setBasketProgress({});
      setBasketDone({});
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
    advancingRef.current = false;
  };

  // ---------- Custom counts per basket slot ----------
  const [basketCustomCounts, setBasketCustomCounts] = useState({});

  // Helper: get effective target for a basket slot
  const getSlotTarget = useCallback((idx) => {
    if (basketCustomCounts[idx] != null) return basketCustomCounts[idx];
    const preset = ADHKAR_PRESETS.find((p) => p.id === basket[idx]);
    return preset?.count ?? 33;
  }, [basket, basketCustomCounts]);

  // Override currentBasketItem target with custom count if set
  useEffect(() => {
    if (mode !== "basket") return;
    const slotTarget = getSlotTarget(basketIndex);
    setTarget(slotTarget);
    setTargetInput(String(slotTarget));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex, JSON.stringify(basketCustomCounts)]);

  // ---------- Library: toggle selection ----------
  // FIX #5: clicking a selected item removes it (from the last occurrence), not adds another
  const toggleLibraryItem = (preset) => {
    const customCount = libraryCounts[preset.id] ?? preset.count;
    // Check if this preset already exists in basket
    const lastIdx = [...basket].reverse().findIndex((id) => id === preset.id);
    if (lastIdx !== -1) {
      // Remove the last occurrence
      const realIdx = basket.length - 1 - lastIdx;
      removeFromBasket(realIdx);
    } else {
      addToBasket(preset, customCount);
    }
  };

  // FIX #3: Save session to history before finishing
  const finishSession = () => {
    const items = basket.map((id, idx) => {
      const preset = ADHKAR_PRESETS.find((p) => p.id === id);
      return {
        id,
        transliteration: preset?.transliteration ?? id,
        count: getSlotTarget(idx),
        progress: Number(basketProgress[idx] || 0),
        completed: !!basketDone[idx],
      };
    });
    appendHistory({ mode: "basket", items });
    clearBasket();
    switchMode("basket");
    setShowSplash(true);
  };

  const finishGeneralSession = () => {
    appendHistory({ mode, totalCount: count, target });
    setShowCelebration(false);
    setCount(0);
  };

  // ---------- Packs ----------
  const applyPack = (pack, { replace }) => {
    const validIds = (pack.items || []).filter((id) => !!getAdhkarById(id));
    if (!validIds.length) return;

    if (replace) {
      setBasket(validIds);
      setBasketIndex(0);
      setBasketProgress({}); setBasketDone({}); setBasketCustomCounts({});
      setCount(0); setShowCelebration(false);
      closeAddAdhkar(); setMode("basket");
      const first = ADHKAR_PRESETS.find((p) => p.id === validIds[0]);
      if (first) { setTarget(first.count); setTargetInput(String(first.count)); }
      return;
    }
    setBasket((b) => [...b, ...validIds]);
    closeAddAdhkar();
  };

  const openAddAdhkar  = (tab = "packs") => { setAddTab(tab); setShowAddOverlay(true); };
  const closeAddAdhkar = () => setShowAddOverlay(false);

  // ---------- Drag/drop ----------
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const newBasket = [...basket];
    const [dragged] = newBasket.splice(draggedIndex, 1);
    newBasket.splice(index, 0, dragged);
    setBasket(newBasket);
    setBasketProgress((bp) => reorderIndexObject(bp, draggedIndex, index));
    setBasketDone((bd) => reorderIndexObject(bd, draggedIndex, index));
    setBasketCustomCounts((bc) => reorderIndexObject(bc, draggedIndex, index));
    setBasketIndex((current) => {
      if (current === draggedIndex) return index;
      if (draggedIndex < current && index >= current) return current - 1;
      if (draggedIndex > current && index <= current) return current + 1;
      return current;
    });
    setDraggedIndex(index);
  };

  // ---------- Misc ----------
  const progress  = target > 0 ? Math.min(count / target, 1) : 0;
  const remaining = Math.max(0, target - count);
  const libraryList = useMemo(() => ADHKAR_PRESETS || [], []);
  // FIX #5: selectedIdSet is used only to know if an id is "in basket"
  const selectedIdSet = useMemo(() => new Set(basket), [basket]);

  const goToSplash = () => {
    closeAddAdhkar();
    setShowBasketManager(false);
    setShowHistory(false);
    setShowCelebration(false);
    setEditingTarget(false);
    setShowSplash(true);
  };

  // ---------------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------------
  return (
    <div
      className="relative h-full flex flex-col"
      style={{ background: "linear-gradient(to bottom, #1e293b, #0f172a)" }}
    >
      {/* FIX #2: safe area top padding so content doesn't hide under phone notch/toolbar */}
      <div style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} />

      {/* ── Splash ─────────────────────────────────────────────────────────── */}
      {showSplash ? (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
              <div className="text-center mb-6">
                <div className="text-white text-3xl font-extrabold tracking-tight">Adhkar</div>
                <div className="text-white/70 mt-1">Choose a mode to begin</div>
              </div>

              <div className="grid gap-3">
                <button onClick={() => switchMode("general", { fromSplash: true })}
                  className="w-full p-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/12 text-left transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-lg">General</div>
                      <div className="text-white/60 text-sm mt-0.5">Simple counter with a target</div>
                    </div>
                    <div className="text-2xl">🧿</div>
                  </div>
                </button>

                <button onClick={() => switchMode("basket", { fromSplash: true })}
                  className="w-full p-4 rounded-2xl bg-green-500/12 hover:bg-green-500/18 border border-green-500/20 text-left transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-lg">Session</div>
                      <div className="text-white/70 text-sm mt-0.5">Select adhkar & complete them one by one</div>
                      {basket.length > 0 && (
                        <div className="text-white/60 text-xs mt-1">{basket.length} items saved</div>
                      )}
                    </div>
                    <div className="text-2xl">✅</div>
                  </div>
                </button>

                <button onClick={() => switchMode("taraweeh", { fromSplash: true })}
                  className="w-full p-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/12 text-left transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-white font-bold text-lg">Taraweeh</div>
                      <div className="text-white/60 text-sm mt-0.5">Counts in 2 rak'ahs with 8/20 preset</div>
                    </div>
                    <div className="text-2xl">🕌</div>
                  </div>
                </button>
              </div>

              {/* History shortcut */}
              <button onClick={() => { setShowSplash(false); setShowHistory(true); }}
                className="mt-4 w-full p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition flex items-center gap-3">
                <span className="text-xl">📖</span>
                <div>
                  <div className="text-white font-semibold text-sm">View History</div>
                  <div className="text-white/50 text-xs">Past sessions</div>
                </div>
              </button>

              <div className="mt-6 text-center text-white/40 text-xs">Progress is saved locally on this device.</div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Trophy only for general/taraweeh */}
          {showCelebration && mode !== "basket" && (
            <CelebrationOverlay onNext={() => { finishGeneralSession(); }} />
          )}

          {/* ── Top bar ─────────────────────────────────────────────────────── */}
          <div className="px-4 pt-3 pb-1 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <button onClick={goToSplash}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm border border-white/20">
                ← Back
              </button>
              <div className="text-white/80 text-sm font-semibold">
                {mode === "general" ? "General" : mode === "basket" ? "Session" : "Taraweeh"}
              </div>
              <button onClick={() => setShowHistory(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm border border-white/20">
                History
              </button>
            </div>
          </div>

          {/* ── History panel ─────────────────────────────────────────────── */}
          {showHistory && <HistoryPanel onClose={() => setShowHistory(false)} />}

          {/* ── Add Adhkar Overlay ────────────────────────────────────────── */}
          {showAddOverlay && (
            <div className="absolute inset-0 bg-slate-900 z-30 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">Add Adhkar</h2>
                <button onClick={closeAddAdhkar} className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
                  Close
                </button>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-2">
                {["packs", "library"].map((tab) => (
                  <button key={tab} onClick={() => setAddTab(tab)}
                    className={[
                      "flex-1 px-3 py-2 rounded-xl font-semibold text-xs transition border-2",
                      addTab === tab
                        ? "bg-white/20 text-white border-white/40"
                        : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10",
                    ].join(" ")}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Packs */}
              {addTab === "packs" && (
                <div className="space-y-3">
                  {PACKS.map((pack) => (
                    <div key={pack.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-white font-bold">{pack.title}</div>
                          <div className="text-white/60 text-sm mt-0.5">{pack.description}</div>
                          <div className="text-white/50 text-xs mt-1">{pack.itemCount} items</div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => applyPack(pack, { replace: true })}
                            className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-semibold border border-green-500/30">
                            Replace
                          </button>
                          <button onClick={() => applyPack(pack, { replace: false })}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20">
                            Add
                          </button>
                        </div>
                      </div>
                      {pack.preview?.length ? (
                        <div className="mt-3 space-y-1">
                          {pack.preview.map((line, i) => (
                            <div key={i} className="text-xs text-white/60">• {line}</div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Library — FIX #5: toggle (remove if present) + custom count */}
              {addTab === "library" && (
                <div className="space-y-2 pb-8">
                  {libraryList.map((preset) => {
                    const isSelected    = selectedIdSet.has(preset.id);
                    const isExpanded    = expandedPreset === preset.id;
                    const customCount   = libraryCounts[preset.id] ?? preset.count;

                    return (
                      <div
                        key={preset.id}
                        className={[
                          "rounded-xl border transition",
                          isSelected
                            ? "bg-green-500/10 border-green-500/30"
                            : "bg-white/5 border-white/10",
                        ].join(" ")}
                      >
                        <button
                          onClick={() => toggleLibraryItem(preset)}
                          className="w-full text-left p-3"
                        >
                          <div className="flex items-start gap-3">
                            {/* tick */}
                            <div className="pt-1 shrink-0">
                              <div className={[
                                "w-5 h-5 rounded-md border flex items-center justify-center text-xs font-bold",
                                isSelected
                                  ? "border-green-400/60 bg-green-500/20 text-green-200"
                                  : "border-white/20 bg-white/5 text-white/30",
                              ].join(" ")} aria-hidden="true">
                                {isSelected ? "✓" : ""}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3">
                                <span className="text-lg text-white font-arabic leading-snug" dir="rtl">
                                  {preset.arabic}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold">
                                    {customCount}×
                                  </span>
                                  <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white/70 border border-white/10">
                                    {preset.category ?? (preset.groups?.[0] ?? "")}
                                  </span>
                                </div>
                              </div>
                              <div className="text-sm text-white/80 mt-1">{preset.transliteration}</div>
                              <div className="text-xs text-white/50 mt-0.5">{preset.translation}</div>
                              {isSelected && <div className="text-[11px] text-green-300/80 mt-1">In session — tap to remove ✓</div>}
                            </div>
                          </div>
                        </button>

                        {/* Count customiser toggle */}
                        <div className="px-3 pb-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedPreset(isExpanded ? null : preset.id);
                            }}
                            className="text-xs text-white/40 hover:text-white/70 underline transition"
                          >
                            {isExpanded ? "Hide count picker" : "Customise count"}
                          </button>
                          {isExpanded && (
                            <CountPicker
                              value={customCount}
                              onChange={(v) => setLibraryCounts((lc) => ({ ...lc, [preset.id]: v }))}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Basket Manager ────────────────────────────────────────────── */}
          {showBasketManager && (
            <div className="absolute inset-0 bg-slate-900 z-30 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Your Adhkar List</h2>
                <button onClick={() => setShowBasketManager(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm">
                  Done
                </button>
              </div>

              {basket.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🛒</div>
                  <div className="text-white/60">No adhkar selected</div>
                  <button onClick={() => { setShowBasketManager(false); openAddAdhkar("packs"); }}
                    className="mt-4 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold">
                    Add Adhkar
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-white/60">{basket.length} items</div>
                    <button onClick={clearBasket}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold">
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {basket.map((presetId, idx) => {
                      const preset    = ADHKAR_PRESETS.find((p) => p.id === presetId);
                      if (!preset) return null;
                      const done      = !!basketDone[idx];
                      const doneCount = Number(basketProgress[idx] || 0);
                      const slotTgt   = getSlotTarget(idx);
                      const pct       = slotTgt ? Math.round((Math.min(doneCount, slotTgt) / slotTgt) * 100) : 0;

                      return (
                        <div
                          key={`${presetId}-${idx}`}
                          draggable
                          onDragStart={() => setDraggedIndex(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={() => setDraggedIndex(null)}
                          className={[
                            "p-3 rounded-xl border transition cursor-move",
                            idx === basketIndex && mode === "basket"
                              ? "bg-green-500/20 border-green-500/40"
                              : done ? "bg-white/5 border-white/10 opacity-50" : "bg-white/5 border-white/10",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-white/40 font-bold text-sm shrink-0 w-6">{idx + 1}.</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-arabic text-base" dir="rtl">{preset.arabic}</div>
                              <div className="text-xs text-white/60 mt-0.5">
                                {preset.transliteration} · {slotTgt}× · {pct}%{done ? " · ✅" : ""}
                              </div>
                            </div>
                            <button onClick={() => removeFromBasket(idx)} className="text-white/40 hover:text-red-400 text-xl shrink-0">×</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Main UI ───────────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4">

            {/* Session actions */}
            {mode === "basket" && (
              <div className="mb-4 flex gap-2">
                <button onClick={() => openAddAdhkar("packs")}
                  className="flex-1 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 font-semibold text-sm border border-green-500/30">
                  + Add Adhkar
                </button>
                <button onClick={() => setShowBasketManager(true)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20">
                  Manage ({basket.length})
                </button>
              </div>
            )}

            {/* Session progress */}
            {mode === "basket" && basket.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Session Progress</div>
                <div className="text-lg font-bold text-white">{completedCount} of {basket.length} completed</div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-300 rounded-full"
                    style={{ width: `${basket.length > 0 ? (completedCount / basket.length) * 100 : 0}%` }} />
                </div>
              </div>
            )}

            {/* FIX #3: Session Complete — add Finish button */}
            {mode === "basket" && allDone && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/15 border border-green-500/30">
                <div className="text-white font-extrabold text-xl">Session Complete ✅</div>
                <div className="text-white/70 text-sm mt-1">
                  Alhamdulillah — you've completed all adhkar in this session.
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={finishSession}
                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm">
                    Finish & Save ✓
                  </button>
                  <button onClick={restartSession}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20">
                    Restart
                  </button>
                  <button onClick={() => setShowBasketManager(true)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20">
                    Edit Session
                  </button>
                </div>
              </div>
            )}

            {/* Current basket item */}
            {mode === "basket" && !allDone && currentBasketItem && (
              <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-white/40">Current ({basketIndex + 1}/{basket.length})</div>
                  {basketDone[basketIndex] && (
                    <div className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold">Completed ✓</div>
                  )}
                </div>
                <div className="text-2xl text-white font-arabic text-center mb-2" dir="rtl">{currentBasketItem.arabic}</div>
                <div className="text-sm text-white/80 text-center">{currentBasketItem.transliteration}</div>
                <div className="text-xs text-white/50 text-center mt-1">{currentBasketItem.translation}</div>
              </div>
            )}

            {/* Target (General mode) */}
            {mode === "general" && (
              <div className="mb-4">
                {editingTarget ? (
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 text-sm">Target:</span>
                    <input type="number" value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") applyTarget(); }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center outline-none"
                      autoFocus />
                    <button onClick={applyTarget}
                      className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm">
                      Set
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setEditingTarget(true)}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-white text-sm font-semibold transition">
                    Target: {target} — tap to change
                  </button>
                )}
              </div>
            )}

            {/* Taraweeh picker */}
            {mode === "taraweeh" && (
              <div className="mb-4 flex gap-2">
                {[8, 20].map((n) => (
                  <button key={n} onClick={() => { setTarget(n); setTargetInput(String(n)); setCount(0); }}
                    className={[
                      "flex-1 px-4 py-2 rounded-xl font-semibold transition",
                      target === n ? "bg-green-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/15",
                    ].join(" ")}>
                    {n} rak'ahs
                  </button>
                ))}
              </div>
            )}

            {/* Progress circle */}
            <div className="flex flex-col items-center justify-center mb-6">
              <div className="relative">
                <CircleProgress progress={progress} size={220} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold text-white">{count}</div>
                  <div className="text-sm text-white/60 mt-1">of {target}</div>
                </div>
              </div>
              {mode === "taraweeh" && (
                <div className="mt-4 text-lg text-white/80">
                  <span className="font-semibold text-green-400">{remaining}</span> remaining
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <button onClick={decrement} disabled={count === 0}
                className={[
                  "w-14 h-14 rounded-full border-2 font-bold text-2xl transition active:scale-95",
                  count === 0 ? "border-white/10 text-white/20 cursor-not-allowed" : "border-white/30 text-white hover:bg-white/10",
                ].join(" ")}>
                −
              </button>

              <button onClick={increment} disabled={count >= target}
                className={[
                  "w-24 h-24 rounded-full font-bold text-4xl transition active:scale-95 shadow-lg",
                  count >= target ? "bg-gray-500 text-gray-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white",
                ].join(" ")}>
                +
              </button>

              <button onClick={reset}
                className="w-14 h-14 rounded-full border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-xs transition active:scale-95">
                Reset
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-2">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress * 100}%` }} />
              </div>
            </div>

            {mode === "basket" && basket.length > 0 && allDone && (
              <div className="mt-4 text-center text-white/40 text-xs">
                Tip: "Finish &amp; Save" records this session in your history.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}