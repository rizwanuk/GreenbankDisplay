import React, { useEffect, useRef, useState } from "react";

const TOKEN_KEY = "gbm_admin_id_token";

function loadGsiScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Failed to load Google GSI script")));
      return;
    }

    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google GSI script"));
    document.head.appendChild(s);
  });
}

export default function SignInPanel({ onSignedIn }) {
  const btnRef = useRef(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      setErr("");

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        setErr("Missing VITE_GOOGLE_CLIENT_ID in .env.local");
        return;
      }

      try {
        await loadGsiScript();
        if (cancelled) return;

        // Initialise Google Identity Services
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (resp) => {
            try {
              if (!resp?.credential) throw new Error("No credential returned");
              localStorage.setItem(TOKEN_KEY, resp.credential);
              onSignedIn?.();
            } catch (e) {
              setErr(e?.message || String(e));
            }
          },
        });

        // Render the button
        if (btnRef.current) {
          btnRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(btnRef.current, {
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "signin_with",
            width: 260,
          });
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [onSignedIn]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-lg font-semibold">Admin sign-in</div>
      <div className="text-sm opacity-80 mt-1">
        Sign in with Google to manage settings.
      </div>

      <div className="mt-4">
        <div ref={btnRef} />
      </div>

      {err ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-600/20 p-3 text-sm">
          {err}
          <div className="mt-2 opacity-80">
            If you&apos;re using Brave, turn Shields off for localhost, or test in Chrome.
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
          onClick={() => {
            localStorage.removeItem(TOKEN_KEY);
            location.reload();
          }}
        >
          Clear token
        </button>
      </div>
    </div>
  );
}
