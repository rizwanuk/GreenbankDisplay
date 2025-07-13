import React from "react";
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import SlideshowScreen from "./Screens/SlideshowScreen";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/slideshow",
    element: <SlideshowScreen />,
  },
]);

export default router;
