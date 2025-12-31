import React from "react";
import { useRouteError, isRouteErrorResponse, Link } from "react-router-dom";

export default function ErrorPage() {
  const error = useRouteError();

  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Something went wrong";

  const message = isRouteErrorResponse(error)
    ? "The page could not be found."
    : (error?.message || String(error));

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full rounded-2xl bg-white/5 border border-white/10 p-6">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-white/70 whitespace-pre-wrap">{message}</p>

        <div className="mt-6 flex gap-3">
          <Link
            to="/"
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600"
          >
            Go home
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
