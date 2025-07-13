import React, { useEffect, useState } from 'react';
import moment from 'moment';

export default function SlideshowClockInner({ theme = {}, settingsMap = {} }) {
  const [time, setTime] = useState(moment());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(moment());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const use24Hour = settingsMap?.clock24Hours === 'TRUE';
  const fontSize = settingsMap?.clockFontSize || 'text-5xl';
  const textColor = theme?.textColor || 'text-white';

  return (
    <div className={`w-full text-center font-bold ${textColor} ${fontSize}`}>
      {time.format(use24Hour ? 'HH:mm:ss' : 'hh:mm:ss')}
    </div>
  );
}
