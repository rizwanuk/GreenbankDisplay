import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SlideshowScreen from "./Screens/SlideshowScreen";
import EmbedScreen from "./EmbedScreen";
import Embed2Screen from "./Embed2Screen";
import MobileScreen from "./Screens/MobileScreen";

// TEMP: simple admin placeholder (we’ll replace this next)
function AdminScreen() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Admin</h1>
        <p className="opacity-80">Login successful. Admin UI coming next.</p>
      </div>
    </div>
  );
}

// Small wrapper to pull globals (or leave empty if not set)
function MobileRoute() {
  const settings = (typeof window !== "undefined" && window.__SETTINGS__) || {};
  const prayers = (typeof window !== "undefined" && window.__PRAYERS__) || null;
  return <MobileScreen settings={settings} prayers={prayers} />;
}

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/admin", element: <AdminScreen /> },
  { path: "/slideshow", element: <SlideshowScreen /> },
  { path: "/embed", element: <EmbedScreen /> },
  { path: "/embed2", element: <Embed2Screen /> },
  { path: "/mobile", element: <MobileRoute /> },
]);

export default router;
