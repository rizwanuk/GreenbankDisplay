import React, { useState } from "react";

export default function AdminSection({ title, subtitle, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-4 flex items-start justify-between gap-3 hover:bg-white/5"
      >
        <div className="min-w-0">
          <div className="text-base sm:text-lg font-semibold">{title}</div>
          {subtitle ? <div className="text-sm text-white/60 mt-1">{subtitle}</div> : null}
        </div>
        <div className="text-white/70 text-xl leading-none">{open ? "–" : "+"}</div>
      </button>

      {open ? <div className="px-4 pb-4">{children}</div> : null}
    </div>
  );
}
