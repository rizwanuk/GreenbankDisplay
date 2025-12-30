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

  const mainTime = time.format(use24Hour ? 'HH:mm:ss' : 'hh:mm:ss');
  const ampm = use24Hour ? '' : time.format('A');

  return (
    <div className={`w-full text-center font-bold ${textColor} ${fontSize}`}>
      <span
        className="inline-flex items-baseline justify-center"
        style={{
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        }}
      >
        {/* Fixed width time block prevents shifting as digits change */}
        <span className="inline-block text-right" style={{ width: '8ch' }}>
          {mainTime}
        </span>

        {!use24Hour && (
          <span className="ml-2 text-[0.6em] align-baseline">
            {ampm}
          </span>
        )}
      </span>
    </div>
  );
}
