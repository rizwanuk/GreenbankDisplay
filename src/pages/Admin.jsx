import React, { useEffect, useMemo, useState } from "react";

const ALLOWLIST = new Set([
  "rizwan.uk@gmail.com",
  "eid.bristol@gmail.com",
]);

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const existing = document.querySelector('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.dataset.googleIdentity = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google script"));
    document.head.appendChild(s);
  });
}

export default function Admin() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const [idToken, setIdToken] = useState(() => localStorage.getItem("gbm_admin_id_token") || "");
  const [email, setEmail] = useState(() => localStorage.getItem("gbm_admin_email") || "");
  const [error, setError] = useState("");

  const allowed = useMemo(() => ALLOWLIST.has((email || "").toLowerCase()), [email]);

  useEffect(() => {
    if (!clientId) {
      setError("Missing VITE_GOOGLE_CLIENT_ID");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            // NOTE: We *do not trust* the token yet server-side.
            // This step is just UI login; server verification comes next step.
            const token = resp?.credential || "";
            setIdToken(token);
            localStorage.setItem("gbm_admin_id_token", token);

            // Decode email (client-side) for display only
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              const em = (payload?.email || "").toLowerCase();
              setEmail(em);
              localStorage.setItem("gbm_admin_email", em);
            } catch {
              setEmail("");
              localStorage.removeItem("gbm_admin_email");
            }
          },
        });

        window.google.accounts.id.renderButton(
          document.getElementById("googleSignInBtn"),
          {
            theme: "outline",
            size: "large",
            type: "standard",
            shape: "pill",
            text: "signin_with",
            logo_alignment: "left",
          }
        );
      } catch (e) {
        setError(e?.message || String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const signOut = () => {
    setIdToken("");
    setEmail("");
    setError("");
    localStorage.removeItem("gbm_admin_id_token");
    localStorage.removeItem("gbm_admin_email");
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Greenbank Display Admin</h1>
        <p className="text-white/70 mb-6">
          Sign in with Google to manage settings.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-sm">
            {error}
          </div>
        )}

        {!idToken ? (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div id="googleSignInBtn" />
            <div className="mt-3 text-xs text-white/60">
              Only allowlisted accounts can proceed.
            </div>
          </div>
        ) : (
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="text-sm text-white/70">Signed in as</div>
            <div className="text-xl font-semibold mt-1">{email || "(email unknown)"}</div>

            <div
              className={`mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm border ${
                allowed
                  ? "bg-emerald-900/40 border-emerald-600 text-emerald-200"
                  : "bg-red-900/40 border-red-600 text-red-200"
              }`}
            >
              {allowed ? "Allowed" : "Not allowlisted"}
            </div>

            <div className="mt-6">
              <button
                onClick={signOut}
                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10"
              >
                Sign out
              </button>
            </div>

            {!allowed && (
              <div className="mt-4 text-sm text-white/70">
                Ask an admin to add your email to the allow list.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
