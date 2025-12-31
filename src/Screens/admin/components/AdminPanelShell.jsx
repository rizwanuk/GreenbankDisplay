// src/Screens/admin/components/AdminPanelShell.jsx
import React from "react";

export default function AdminPanelShell({
  title,
  description,
  icon,
  children,
  isOpen,
  onToggle,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full text-left px-4 md:px-5 py-4 flex items-start justify-between gap-3 hover:bg-white/5"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                {icon}
              </span>
            ) : null}

            <div className="text-base md:text-lg font-semibold tracking-tight">
              {title}
            </div>

            <span className="ml-2 hidden md:inline text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 opacity-70">
              Tap to {isOpen ? "collapse" : "expand"}
            </span>
          </div>

          {description ? (
            <div className="mt-1 text-xs md:text-sm opacity-70">
              {description}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-xs opacity-70 hidden sm:inline">
            {isOpen ? "Hide" : "Show"}
          </span>
          <span
            className={
              "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform " +
              (isOpen ? "rotate-180" : "")
            }
            aria-hidden="true"
          >
            ▾
          </span>
        </div>
      </button>

      {isOpen ? (
        <div className="border-t border-white/10 px-4 md:px-5 py-4 bg-black/10">
          {children}
        </div>
      ) : null}
    </div>
  );
}
