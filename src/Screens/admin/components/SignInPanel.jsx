import React, { useEffect, useState } from "react";
import { PublicClientApplication } from "@azure/msal-browser";

const TOKEN_KEY = "gbm_admin_id_token";

const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_MICROSOFT_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_MICROSOFT_TENANT_ID}`,
    redirectUri: window.location.origin + "/admin",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

let _msalInstance = null;
async function getMsal() {
  if (!_msalInstance) {
    _msalInstance = new PublicClientApplication(msalConfig);
    await _msalInstance.initialize();
  }
  return _msalInstance;
}

export default function SignInPanel({ onSignedIn }) {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle redirect response on page load
  useEffect(() => {
    async function handleRedirect() {
      try {
        const msal = await getMsal();
        const result = await msal.handleRedirectPromise();
        if (result?.idToken) {
          localStorage.setItem(TOKEN_KEY, result.idToken);
          onSignedIn?.();
        }
      } catch (e) {
        setErr(e?.message || String(e));
      }
    }
    handleRedirect();
  }, [onSignedIn]);

  const handleSignIn = async () => {
    setErr("");
    setLoading(true);
    try {
      const msal = await getMsal();
      await msal.loginRedirect({ scopes: ["openid", "profile", "email"] });
    } catch (e) {
      setErr(e?.message || String(e));
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-lg font-semibold">Admin sign-in</div>
      <div className="text-sm opacity-80 mt-1">
        Sign in with your Microsoft account to manage settings.
      </div>
      <div className="mt-4">
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          {loading ? "Redirecting…" : "Sign in with Microsoft"}
        </button>
      </div>
      {err ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-600/20 p-3 text-sm">
          {err}
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
