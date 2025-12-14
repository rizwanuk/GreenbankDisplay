import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SlideshowScreen from "./Screens/SlideshowScreen";
import EmbedScreen from "./EmbedScreen";
import Embed2Screen from "./Embed2Screen";
import MobileScreen from "./Screens/MobileScreen";

// Small wrapper to pull globals (or leave empty if not set)
function MobileRoute() {
  const settings = (typeof window !== "undefined" && window.__SETTINGS__) || {};
  const prayers = (typeof window !== "undefined" && window.__PRAYERS__) || null;
  return <MobileScreen settings={settings} prayers={prayers} />;
}

const router = createBrowserRouter([
  { path: "/", element: <App /> },
  { path: "/slideshow", element: <SlideshowScreen /> },
  { path: "/embed", element: <EmbedScreen /> },
  { path: "/embed2", element: <Embed2Screen /> },
  { path: "/mobile", element: <MobileRoute /> },
]);

export default router;
