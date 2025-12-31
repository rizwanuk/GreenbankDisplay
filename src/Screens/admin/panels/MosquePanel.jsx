// src/Screens/admin/panels/MosquePanel.jsx
import React, { useMemo } from "react";

function getGroup(groups, key) {
  const g = groups?.[key];
  return g && typeof g === "object" ? g : {};
}

function Field({ label, help, value, onChange, placeholder = "" }) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
      <div className="text-sm font-semibold">{label}</div>
      {help ? <div className="mt-1 text-xs opacity-70">{help}</div> : null}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
      />
    </label>
  );
}

export default function MosquePanel({ groups, setValue }) {
  const mosque = getGroup(groups, "mosque");

  const name = useMemo(() => mosque?.name ?? "", [mosque?.name]);
  const address = useMemo(() => mosque?.address ?? "", [mosque?.address]);
  const webpage = useMemo(() => mosque?.webpage ?? "", [mosque?.webpage]);
  const logoUrl = useMemo(() => mosque?.logoUrl ?? "", [mosque?.logoUrl]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Field
          label="Mosque name"
          value={name}
          onChange={(v) => setValue("mosque", "name", v)}
          placeholder="e.g. Greenbank Masjid"
        />

        <Field
          label="Webpage"
          help="Just the domain is fine (e.g. greenbankbristol.org)."
          value={webpage}
          onChange={(v) => setValue("mosque", "webpage", v)}
          placeholder="e.g. greenbankbristol.org"
        />

        <label className="block md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3 md:p-4">
          <div className="text-sm font-semibold">Address</div>
          <div className="mt-1 text-xs opacity-70">
            Shows in the header on the display screens.
          </div>
          <textarea
            rows={3}
            value={address}
            onChange={(e) => setValue("mosque", "address", e.target.value)}
            placeholder="e.g. Castle Green Buildings, Greenbank Road, Bristol, BS5 6HE"
            className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/25"
          />
        </label>

        <Field
          label="Logo URL"
          help="Paste a full https:// URL. We’ll show a preview below."
          value={logoUrl}
          onChange={(v) => setValue("mosque", "logoUrl", v)}
          placeholder="https://..."
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
        <div className="text-sm font-semibold">Preview</div>
        <div className="mt-3 flex items-center gap-3">
          <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white/5 grid place-items-center overflow-hidden">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo preview"
                className="h-full w-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span className="text-xs opacity-60">No logo</span>
            )}
          </div>

          <div className="min-w-0">
            <div className="text-base font-semibold truncate">{name || "—"}</div>
            <div className="text-xs opacity-75 truncate">{address || "—"}</div>
            <div className="text-xs opacity-75 truncate">{webpage || "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
