// src/utils/getSettingsUrl.js
import { tab } from "../constants/sheets";

export function getSettingsUrl() {
  // Detect local / dev environments where Vercel API routes are NOT available
  const host = window.location.hostname;

  const isLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".local");

  // Vercel dev also runs the frontend on localhost but does NOT proxy serverless
  const isVercelDev =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.DEV === true;

  if (isLocal || isVercelDev) {
    // Public, unauthenticated settings feed
    return tab("settings");
  }

  // Production (Vercel): go through API route (auth, caching, write-through, etc.)
  return "/api/settings";
}
