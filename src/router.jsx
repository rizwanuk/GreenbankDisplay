import React from "react";
import { createBrowserRouter } from "react-router-dom";

import App from "./App";
import AdminScreen from "./Screens/AdminScreen";
import SlideshowScreen from "./Screens/SlideshowScreen";
import MessagesSlidesScreen from "./Screens/MessagesSlidesScreen";
import MobileScreen from "./Screens/MobileScreen";
import EmbedScreen from "./EmbedScreen";
import Embed2Screen from "./Embed2Screen";

import ErrorPage from "./ErrorPage";

function MobileRoute() {
  const settings = (typeof window !== "undefined" && window.__SETTINGS__) || {};
  const prayers = (typeof window !== "undefined" && window.__PRAYERS__) || null;
  return <MobileScreen settings={settings} prayers={prayers} />;
}

const router = createBrowserRouter([
  { path: "/", element: <App />, errorElement: <ErrorPage /> },
  { path: "/admin", element: <AdminScreen />, errorElement: <ErrorPage /> },
  { path: "/slideshow", element: <SlideshowScreen />, errorElement: <ErrorPage /> },
  { path: "/messages", element: <MessagesSlidesScreen />, errorElement: <ErrorPage /> },

  // These are SPA routes (NOT the embed.html entry)
  { path: "/embed", element: <EmbedScreen />, errorElement: <ErrorPage /> },
  { path: "/embed2", element: <Embed2Screen />, errorElement: <ErrorPage /> },

  { path: "/mobile", element: <MobileRoute />, errorElement: <ErrorPage /> },

  // ✅ Catch-all
  { path: "*", element: <ErrorPage /> },
]);

export default router;