import React, { useEffect, useState } from "react";
import moment from "moment";

export default function SlideshowDateInner({ theme = {} }) {
  const [now, setNow] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(moment());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const textColor = theme.textColor || "text-white";
  const fontSize = theme.fontSize || "text-2xl";

  return (
    <div className={`w-full text-center font-semibold tracking-tight ${textColor} ${fontSize}`}>
      {now.format("dddd, D MMMM YYYY")}
    </div>
  );
}
