import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SlideshowScreen from "./Screens/SlideshowScreen";
import EmbedScreen from "./EmbedScreen"; // ✅ Added import

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/slideshow",
    element: <SlideshowScreen />,
  },
  {
    path: "/embed", // ✅ New route for the embed screen
    element: <EmbedScreen />,
  },
]);

export default router;
