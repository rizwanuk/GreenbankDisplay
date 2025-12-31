import React from "react";

export function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      {label ? <div className="text-sm text-white/70">{label}</div> : null}
      {children}
      {hint ? <div className="text-xs text-white/50">{hint}</div> : null}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
  disabled,
}) {
  return (
    <input
      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-white/30"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      disabled={disabled}
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 6,
  disabled,
}) {
  return (
    <textarea
      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-white/30"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
    />
  );
}

export function SelectInput({ value, onChange, options = [], disabled }) {
  return (
    <select
      className="w-full rounded-lg bg-black/40 border border-white/15 px-3 py-2 outline-none focus:border-white/30"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
    >
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}
