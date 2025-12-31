// src/Screens/admin/components/AdminShell.jsx
import React from "react";

export default function AdminShell({ children }) {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
          <div className="text-lg font-semibold">Greenbank Display Admin</div>
          <div className="text-sm text-white/70">
            Manage settings from the Google Sheet.
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
