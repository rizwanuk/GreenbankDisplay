// src/Components/adhkar/AdhkarTracker.jsx
import React, { useState, useEffect, useMemo } from "react";
import {
  ADHKAR_PRESETS,
  ADHKAR_PACKS,
  getAdhkarByCategory,
  getAdhkarById,
} from "../../utils/adhkarPresets";

const LS_ADHKAR_MODE = "gbm_adhkar_mode"; // "general" | "taraweeh" | "basket"
const LS_ADHKAR_TARGET = "gbm_adhkar_target";
const LS_ADHKAR_COUNT = "gbm_adhkar_count";
const LS_ADHKAR_BASKET = "gbm_adhkar_basket"; // array of preset IDs in order (can have duplicates)
const LS_BASKET_INDEX = "gbm_basket_index"; // current position in basket

// per-item progress tracking for basket/session
const LS_BASKET_PROGRESS = "gbm_basket_progress_v1"; // { [index:number]: number }
const LS_BASKET_DONE = "gbm_basket_done_v1"; // { [index:number]: true }

// splash screen state
const LS_ADHKAR_SPLASH = "gbm_adhkar_show_splash_v1"; // "1" | "0"

// Circular progress
function CircleProgress({ progress, size = 220 }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - progress * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="16"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#10b981"
        strokeWidth="16"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.25s ease" }}
      />
    </svg>
  );
}

// Celebration with Next button (used for general/taraweeh only)
function CelebrationOverlay({ onNext, hasNext }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-20">
      <div className="text-center px-4">
        <div className="text-7xl mb-4 animate-bounce">🏆</div>
        <div className="text-2xl font-bold text-white mb-2">Allahu Akbar!</div>
        <div className="text-lg text-white/80 mb-6">Completed</div>
        <button
          onClick={onNext}
          className="px-6 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition"
        >
          {hasNext ? "Next" : "Alhamdulillah"}
        </button>
      </div>
    </div>
  );
}

function buildPackView(pack) {
  const items = (pack.items || []).map(getAdhkarById).filter(Boolean);
  const preview = items.slice(0, 4).map((a) => `${a.transliteration} ${a.count}×`);
  return {
    ...pack,
    itemCount: items.length,
    preview,
  };
}

export default function AdhkarTracker() {
  const adhkarByCategory = useMemo(() => getAdhkarByCategory(), []);
  const PACKS = useMemo(() => (ADHKAR_PACKS || []).map(buildPackView), []);

  // Splash (default true unless user turned it off previously)
  const [showSplash, setShowSplash] = useState(() => {
    const saved = localStorage.getItem(LS_ADHKAR_SPLASH);
    if (saved === "0") return false;
    return true;
  });

  const [mode, setMode] = useState(() => localStorage.getItem(LS_ADHKAR_MODE) || "general");
  const [target, setTarget] = useState(() => Number(localStorage.getItem(LS_ADHKAR_TARGET)) || 33);
  const [count, setCount] = useState(() => Number(localStorage.getItem(LS_ADHKAR_COUNT)) || 0);

  // Basket: array of preset IDs (can have duplicates)
  const [basket, setBasket] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_ADHKAR_BASKET);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [basketIndex, setBasketIndex] = useState(() => Number(localStorage.getItem(LS_BASKET_INDEX)) || 0);

  // basket progress per index (so duplicates work properly)
  const [basketProgress, setBasketProgress] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_BASKET_PROGRESS);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [basketDone, setBasketDone] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_BASKET_DONE);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showCelebration, setShowCelebration] = useState(false);
  const [targetInput, setTargetInput] = useState(String(target));
  const [editingTarget, setEditingTarget] = useState(false);

  // Unified "Add Adhkar" overlay (Packs + Library)
  const [showAddOverlay, setShowAddOverlay] = useState(false);
  const [addTab, setAddTab] = useState("packs"); // "packs" | "library"

  const [showBasketManager, setShowBasketManager] = useState(false);

  // Dragging state for basket reorder
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => localStorage.setItem(LS_ADHKAR_SPLASH, showSplash ? "1" : "0"), [showSplash]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_MODE, mode), [mode]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_TARGET, String(target)), [target]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_COUNT, String(count)), [count]);
  useEffect(() => localStorage.setItem(LS_ADHKAR_BASKET, JSON.stringify(basket)), [basket]);
  useEffect(() => localStorage.setItem(LS_BASKET_INDEX, String(basketIndex)), [basketIndex]);
  useEffect(() => localStorage.setItem(LS_BASKET_PROGRESS, JSON.stringify(basketProgress)), [basketProgress]);
  useEffect(() => localStorage.setItem(LS_BASKET_DONE, JSON.stringify(basketDone)), [basketDone]);

  // Resolve current basket item
  const currentBasketItem =
    mode === "basket" && basket[basketIndex]
      ? ADHKAR_PRESETS.find((p) => p.id === basket[basketIndex])
      : null;

  // Basket helper: find next undone index from startFrom (inclusive)
  const getNextUndoneIndex = (startFrom) => {
    if (!basket.length) return -1;
    for (let i = startFrom; i < basket.length; i++) {
      if (!basketDone[i]) return i;
    }
    return -1;
  };

  const completedCount = Object.keys(basketDone || {}).filter((k) => basketDone[k]).length;
  const allDone = basket.length > 0 && completedCount >= basket.length;

  const restartSession = () => {
    setBasketProgress({});
    setBasketDone({});
    setBasketIndex(0);
    setCount(0);
    setShowCelebration(false);
  };

  // In basket mode, the counter should reflect the current basket item's stored progress
  useEffect(() => {
    if (mode !== "basket") return;
    const saved = Number(basketProgress[basketIndex] || 0);
    setCount(saved);
  }, [mode, basketIndex]); // intentional

  // In basket mode, target should be the current basket item's count
  useEffect(() => {
    if (mode !== "basket") return;
    if (!currentBasketItem) return;
    setTarget(currentBasketItem.count);
    setTargetInput(String(currentBasketItem.count));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, basketIndex, currentBasketItem?.id]);

  // Completion check:
  // - General/Taraweeh: show trophy overlay
  // - Session: NO trophy overlay (we auto-advance instead)
  useEffect(() => {
    if (target <= 0) return;
    if (count >= target && count > 0) {
      if (mode === "basket") return;
      setShowCelebration(true);
    }
  }, [count, target, mode]);

  // Auto-advance in Session mode when an item completes (no trophy spam)
  useEffect(() => {
    if (mode !== "basket") return;
    if (!currentBasketItem) return;
    if (allDone) return;
    if (basketDone[basketIndex]) return;

    if (target > 0 && count >= target) {
      // mark current done
      setBasketDone((bd) => ({ ...bd, [basketIndex]: true }));

      // move to next undone
      const nextIdx = getNextUndoneIndex(basketIndex + 1);
      if (nextIdx === -1) {
        // finished - stop here; Session Complete panel will show
        return;
      }
      setBasketIndex(nextIdx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, count, target, basketIndex, currentBasketItem?.id]);

  // Helpers
  const step = mode === "taraweeh" ? 2 : 1;

  const increment = () => {
    setCount((c) => {
      const next = Math.min(c + step, target);
      if (mode === "basket") {
        setBasketProgress((bp) => ({ ...bp, [basketIndex]: next }));
      }
      return next;
    });
  };

  const decrement = () => {
    setCount((c) => {
      const next = Math.max(0, c - step);
      if (mode === "basket") {
        setBasketProgress((bp) => ({ ...bp, [basketIndex]: next }));
      }
      return next;
    });
  };

  const reset = () => {
    setCount(0);
    setShowCelebration(false);
    if (mode === "basket") {
      setBasketProgress((bp) => ({ ...bp, [basketIndex]: 0 }));
      setBasketDone((bd) => {
        const next = { ...bd };
        delete next[basketIndex];
        return next;
      });
    }
  };

  const applyTarget = () => {
    const val = Math.max(1, Number(targetInput) || 1);
    setTarget(val);
    setEditingTarget(false);
    if (count > val) setCount(0);
  };

  const switchMode = (newMode, { fromSplash } = { fromSplash: false }) => {
    setMode(newMode);

    if (newMode === "taraweeh") {
      setTarget(20);
      setTargetInput("20");
    } else if (newMode === "general") {
      setTarget(33);
      setTargetInput("33");
    } else if (newMode === "basket") {
      // when entering session mode, go to first undone if possible
      let idx = Math.min(basketIndex, Math.max(0, basket.length - 1));
      const firstUndone = getNextUndoneIndex(0);
      if (firstUndone !== -1) idx = firstUndone;

      setBasketIndex(idx);
      const item = basket[idx] ? ADHKAR_PRESETS.find((p) => p.id === basket[idx]) : null;

      if (item) {
        setTarget(item.count);
        setTargetInput(String(item.count));
        setCount(Number(basketProgress[idx] || 0));
      } else {
        setTarget(33);
        setTargetInput("33");
        setCount(0);
      }
    }

    if (newMode !== "basket") {
      setCount(0);
    }
    setShowCelebration(false);

    if (fromSplash) {
      setShowSplash(false);
    }
  };

  // Basket actions
  const addToBasket = (preset) => {
    setBasket((b) => [...b, preset.id]);

    // If we are in session mode and it was empty, initialise
    if (mode === "basket" && basket.length === 0) {
      setBasketIndex(0);
      setTarget(preset.count);
      setTargetInput(String(preset.count));
      setCount(0);
      setBasketProgress({});
      setBasketDone({});
      setShowCelebration(false);
    }
  };

  const removeFromBasket = (index) => {
    setBasket((b) => b.filter((_, i) => i !== index));
    setBasketProgress((bp) => remapIndexObject(bp, index));
    setBasketDone((bd) => remapIndexObject(bd, index));

    if (basketIndex > index) setBasketIndex((i) => i - 1);
    if (basketIndex === index) {
      setBasketIndex((i) => Math.max(0, Math.min(i, basket.length - 2)));
    }
    setShowCelebration(false);
  };

  const clearBasket = () => {
    setBasket([]);
    setBasketIndex(0);
    setCount(0);
    setShowCelebration(false);
    setBasketProgress({});
    setBasketDone({});
  };

  // Trophy overlay button action (only used in general/taraweeh)
  const handleNext = () => {
    setShowCelebration(false);
    setCount(0);
  };

  // Drag and drop for basket reorder
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newBasket = [...basket];
    const [dragged] = newBasket.splice(draggedIndex, 1);
    newBasket.splice(index, 0, dragged);
    setBasket(newBasket);

    setBasketProgress((bp) => reorderIndexObject(bp, draggedIndex, index));
    setBasketDone((bd) => reorderIndexObject(bd, draggedIndex, index));

    setBasketIndex((current) => {
      if (current === draggedIndex) return index;
      if (draggedIndex < current && index >= current) return current - 1;
      if (draggedIndex > current && index <= current) return current + 1;
      return current;
    });

    setDraggedIndex(index);
  };

  const openAddAdhkar = (tab = "packs") => {
    setAddTab(tab);
    setShowAddOverlay(true);
  };

  const closeAddAdhkar = () => {
    setShowAddOverlay(false);
  };

  const applyPack = (pack, { replace }) => {
    const ids = pack.items || [];
    if (!ids.length) return;

    // filter invalid ids safely
    const validIds = ids.filter((id) => !!getAdhkarById(id));
    if (!validIds.length) return;

    if (replace) {
      setBasket(validIds);
      setBasketIndex(0);
      setBasketProgress({});
      setBasketDone({});
      setCount(0);
      setShowCelebration(false);
      closeAddAdhkar();
      setMode("basket");

      const first = ADHKAR_PRESETS.find((p) => p.id === validIds[0]);
      if (first) {
        setTarget(first.count);
        setTargetInput(String(first.count));
      }
      return;
    }

    setBasket((b) => [...b, ...validIds]);
    closeAddAdhkar();
  };

  // Progress numbers
  const progress = target > 0 ? Math.min(count / target, 1) : 0;
  const remaining = Math.max(0, target - count);

  const hasNextInBasket = mode === "basket" && basketIndex < basket.length - 1;

  // Close any overlays and return to splash
  const goToSplash = () => {
    closeAddAdhkar();
    setShowBasketManager(false);
    setShowCelebration(false);
    setEditingTarget(false);
    setShowSplash(true);
  };

  return (
    <div
      className="relative h-full flex flex-col"
      style={{ background: "linear-gradient(to bottom, #1e293b, #0f172a)" }}
    >
      {/* Splash Screen */}
      {showSplash ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <div className="text-white text-3xl font-extrabold tracking-tight">Adhkar</div>
              <div className="text-white/70 mt-1">Choose a mode to begin</div>
            </div>

            <div className="grid gap-3">
              <button
                onClick={() => switchMode("general", { fromSplash: true })}
                className="w-full p-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/12 text-left transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-bold text-lg">General</div>
                    <div className="text-white/60 text-sm mt-0.5">Simple counter with a target</div>
                  </div>
                  <div className="text-2xl">🧿</div>
                </div>
              </button>

              <button
                onClick={() => switchMode("basket", { fromSplash: true })}
                className="w-full p-4 rounded-2xl bg-green-500/12 hover:bg-green-500/18 border border-green-500/20 text-left transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-bold text-lg">Session</div>
                    <div className="text-white/70 text-sm mt-0.5">
                      Select adhkar & complete them one by one
                    </div>
                    {basket.length ? (
                      <div className="text-white/60 text-xs mt-1">{basket.length} items saved</div>
                    ) : null}
                  </div>
                  <div className="text-2xl">✅</div>
                </div>
              </button>

              <button
                onClick={() => switchMode("taraweeh", { fromSplash: true })}
                className="w-full p-4 rounded-2xl bg-white/8 hover:bg-white/12 border border-white/12 text-left transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-white font-bold text-lg">Taraweeh</div>
                    <div className="text-white/60 text-sm mt-0.5">Counts in 2 rak’ahs with 8/20 preset</div>
                  </div>
                  <div className="text-2xl">🕌</div>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center text-white/40 text-xs">Progress is saved locally on this device.</div>
          </div>
        </div>
      ) : (
        <>
          {/* Trophy only for general/taraweeh */}
          {showCelebration && mode !== "basket" && (
            <CelebrationOverlay onNext={handleNext} hasNext={false} />
          )}

          {/* Top bar */}
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={goToSplash}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm border border-white/20"
              >
                ← Back
              </button>
              <div className="text-white/80 text-sm font-semibold">
                {mode === "general" ? "General" : mode === "basket" ? "Session" : "Taraweeh"}
              </div>
              <div className="w-[78px]" />
            </div>
          </div>

          {/* Add Adhkar Overlay (Packs + Library) */}
          {showAddOverlay && (
            <div className="absolute inset-0 bg-slate-900 z-30 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-white">Add Adhkar</h2>
                <button
                  onClick={closeAddAdhkar}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                >
                  Close
                </button>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setAddTab("packs")}
                  className={[
                    "flex-1 px-3 py-2 rounded-xl font-semibold text-xs transition border-2",
                    addTab === "packs"
                      ? "bg-white/20 text-white border-white/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  Packs
                </button>
                <button
                  onClick={() => setAddTab("library")}
                  className={[
                    "flex-1 px-3 py-2 rounded-xl font-semibold text-xs transition border-2",
                    addTab === "library"
                      ? "bg-white/20 text-white border-white/40"
                      : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10",
                  ].join(" ")}
                >
                  Library
                </button>
              </div>

              {/* Packs tab */}
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
                          <button
                            onClick={() => applyPack(pack, { replace: true })}
                            className="px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 text-sm font-semibold border border-green-500/30"
                          >
                            Replace
                          </button>
                          <button
                            onClick={() => applyPack(pack, { replace: false })}
                            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/20"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {pack.preview?.length ? (
                        <div className="mt-3 space-y-1">
                          {pack.preview.map((line, i) => (
                            <div key={i} className="text-xs text-white/60">
                              • {line}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              {/* Library tab */}
              {addTab === "library" && (
                <div>
                  {Object.entries(adhkarByCategory).map(([category, presets]) => (
                    <div key={category} className="mb-6">
                      <h3 className="text-sm font-bold text-white/60 mb-2 uppercase tracking-wide">{category}</h3>
                      <div className="space-y-2">
                        {presets.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => addToBasket(preset)}
                            className="w-full text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-lg text-white font-arabic" dir="rtl">
                                {preset.arabic}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold">
                                  {preset.count}×
                                </span>
                                <span className="text-xl">+</span>
                              </div>
                            </div>
                            <div className="text-sm text-white/80">{preset.transliteration}</div>
                            <div className="text-xs text-white/50 mt-0.5">{preset.translation}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Basket Manager */}
          {showBasketManager && (
            <div className="absolute inset-0 bg-slate-900 z-30 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Your Adhkar List</h2>
                <button
                  onClick={() => setShowBasketManager(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm"
                >
                  Done
                </button>
              </div>

              {basket.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">🛒</div>
                  <div className="text-white/60">No adhkar selected</div>
                  <button
                    onClick={() => {
                      setShowBasketManager(false);
                      openAddAdhkar("packs");
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold"
                  >
                    Add Adhkar
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex justify-between items-center">
                    <div className="text-sm text-white/60">{basket.length} items</div>
                    <button
                      onClick={clearBasket}
                      className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-semibold"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-2">
                    {basket.map((presetId, idx) => {
                      const preset = ADHKAR_PRESETS.find((p) => p.id === presetId);
                      if (!preset) return null;

                      const done = !!basketDone[idx];
                      const doneCount = Number(basketProgress[idx] || 0);
                      const pct = preset.count
                        ? Math.round((Math.min(doneCount, preset.count) / preset.count) * 100)
                        : 0;

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
                              : done
                              ? "bg-white/5 border-white/10 opacity-50"
                              : "bg-white/5 border-white/10",
                          ].join(" ")}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-white/40 font-bold text-sm shrink-0 w-6">{idx + 1}.</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-white font-arabic text-base" dir="rtl">
                                {preset.arabic}
                              </div>
                              <div className="text-xs text-white/60 mt-0.5">
                                {preset.transliteration} · {preset.count}× · {pct}%{done ? " · ✅" : ""}
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromBasket(idx)}
                              className="text-white/40 hover:text-red-400 text-xl shrink-0"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Main UI */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Session actions */}
            {mode === "basket" && (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => openAddAdhkar("packs")}
                  className="flex-1 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-300 font-semibold text-sm border border-green-500/30"
                >
                  + Add Adhkar
                </button>
                <button
                  onClick={() => setShowBasketManager(true)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20"
                >
                  Manage ({basket.length})
                </button>
              </div>
            )}

            {/* Session progress */}
            {mode === "basket" && basket.length > 0 && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Session Progress</div>
                <div className="text-lg font-bold text-white">
                  {completedCount} of {basket.length} completed
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300 rounded-full"
                    style={{ width: `${basket.length > 0 ? (completedCount / basket.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Session Complete */}
            {mode === "basket" && allDone && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/15 border border-green-500/30">
                <div className="text-white font-extrabold text-xl">Session Complete ✅</div>
                <div className="text-white/70 text-sm mt-1">
                  Alhamdulillah — you’ve completed all adhkar in this session.
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={restartSession}
                    className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm"
                  >
                    Restart Session
                  </button>
                  <button
                    onClick={() => setShowBasketManager(true)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm border border-white/20"
                  >
                    Edit Session
                  </button>
                </div>
              </div>
            )}

            {/* Current item (hidden when all done) */}
            {mode === "basket" && !allDone && currentBasketItem && (
              <div className="mb-4 p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-white/40">
                    Current ({basketIndex + 1}/{basket.length})
                  </div>
                  {basketDone[basketIndex] ? (
                    <div className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300 font-semibold">
                      Completed ✓
                    </div>
                  ) : null}
                </div>
                <div className="text-2xl text-white font-arabic text-center mb-2" dir="rtl">
                  {currentBasketItem.arabic}
                </div>
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
                    <input
                      type="number"
                      value={targetInput}
                      onChange={(e) => setTargetInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyTarget();
                      }}
                      className="flex-1 px-3 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-center outline-none"
                      autoFocus
                    />
                    <button
                      onClick={applyTarget}
                      className="px-4 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white font-semibold text-sm"
                    >
                      Set
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingTarget(true)}
                    className="w-full px-4 py-2 rounded-xl bg-white/10 border border-white/20 hover:bg-white/15 text-white text-sm font-semibold transition"
                  >
                    Target: {target}
                  </button>
                )}
              </div>
            )}

            {/* Taraweeh picker */}
            {mode === "taraweeh" && (
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => {
                    setTarget(8);
                    setTargetInput("8");
                    setCount(0);
                  }}
                  className={[
                    "flex-1 px-4 py-2 rounded-xl font-semibold transition",
                    target === 8 ? "bg-green-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/15",
                  ].join(" ")}
                >
                  8 rak'ahs
                </button>
                <button
                  onClick={() => {
                    setTarget(20);
                    setTargetInput("20");
                    setCount(0);
                  }}
                  className={[
                    "flex-1 px-4 py-2 rounded-xl font-semibold transition",
                    target === 20 ? "bg-green-500 text-white" : "bg-white/10 text-white/60 hover:bg-white/15",
                  ].join(" ")}
                >
                  20 rak'ahs
                </button>
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
              <button
                onClick={decrement}
                disabled={count === 0}
                className={[
                  "w-14 h-14 rounded-full border-2 font-bold text-2xl transition active:scale-95",
                  count === 0 ? "border-white/10 text-white/20 cursor-not-allowed" : "border-white/30 text-white hover:bg-white/10",
                ].join(" ")}
              >
                −
              </button>

              <button
                onClick={increment}
                disabled={count >= target}
                className={[
                  "w-24 h-24 rounded-full font-bold text-4xl transition active:scale-95 shadow-lg",
                  count >= target ? "bg-gray-500 text-gray-300 cursor-not-allowed" : "bg-green-500 hover:bg-green-600 text-white",
                ].join(" ")}
              >
                +
              </button>

              <button
                onClick={reset}
                className="w-14 h-14 rounded-full border-2 border-white/30 text-white hover:bg-white/10 font-semibold text-xs transition active:scale-95"
              >
                Reset
              </button>
            </div>

            {/* Progress bar */}
            <div className="px-2">
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>

            {/* Tiny hint if all done (avoid confusion) */}
            {mode === "basket" && basket.length > 0 && allDone && (
              <div className="mt-4 text-center text-white/40 text-xs">
                Tip: use “Restart Session” to repeat the same list.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

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
  const keys = Object.keys(obj || {})
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);

  if (!keys.length) return obj;

  const max = Math.max(...keys, 0);
  const arr = Array.from({ length: max + 1 }, (_, i) => (obj[i] !== undefined ? obj[i] : undefined));

  const [moved] = arr.splice(from, 1);
  arr.splice(to, 0, moved);

  const out = {};
  arr.forEach((val, i) => {
    if (val !== undefined) out[i] = val;
  });
  return out;
}
