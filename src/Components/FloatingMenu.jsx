// src/Components/FloatingMenu.jsx
import React, { useEffect, useState } from 'react';
import { Settings2 } from 'lucide-react';

export default function FloatingMenu({ themeName, setThemeName, zoom, setZoom, themeOptions = [] }) {
  const [visible, setVisible] = useState(true);
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hovering) setVisible(false);
    }, 10000); // hide after 10s
    return () => clearTimeout(timer);
  }, [hovering]);

  const toggleVisibility = () => setVisible((v) => !v);

  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      {!visible && (
        <button
          className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition"
          onClick={toggleVisibility}
          title="Settings"
        >
          <Settings2 className="w-5 h-5 text-white" />
        </button>
      )}

      {visible && (
        <div className="bg-black/80 text-white p-4 rounded-xl shadow-xl space-y-3 w-64">
          <div className="flex justify-between items-center">
            <span className="font-bold text-sm">Display Settings</span>
            <button
              className="text-sm bg-white/10 px-2 py-1 rounded hover:bg-white/20"
              onClick={toggleVisibility}
            >
              ✕
            </button>
          </div>

          <div>
            <label className="block text-sm mb-1">Theme</label>
            <select
              className="w-full p-1 rounded bg-white/10"
              value={themeName}
              onChange={(e) => setThemeName(e.target.value)}
            >
              {themeOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Zoom</label>
            <div className="flex items-center space-x-2">
              <button
                className="bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
              >
                ＋
              </button>
              <span className="text-sm">{Math.round(zoom * 100)}%</span>
              <button
                className="bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
              >
                －
              </button>
              <button
                className="bg-white/10 px-2 py-1 rounded hover:bg-white/20"
                onClick={() => setZoom(1)}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
