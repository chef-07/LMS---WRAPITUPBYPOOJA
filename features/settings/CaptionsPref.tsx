'use client';
import { useEffect, useState } from 'react';
import { readCaptionPref, writeCaptionPref, type CaptionPref } from './prefs';

const OPTIONS: [CaptionPref, string][] = [
  ['off', 'Off'],
  ['en', 'English'],
  ['hi', 'हिन्दी Hindi'],
];

export function CaptionsPref() {
  const [value, setValue] = useState<CaptionPref>('off');
  // Read after mount: localStorage doesn't exist on the server.
  useEffect(() => {
    const t = setTimeout(() => setValue(readCaptionPref()), 0);
    return () => clearTimeout(t);
  }, []);
  return (
    <section className="card">
      <h2 style={{ margin: '0 0 4px', fontSize: 16 }}>Video captions</h2>
      <p className="muted small" style={{ margin: '0 0 10px' }}>Turn subtitles on for every training video on this phone or computer, when the video has them.</p>
      <div className="pills" role="radiogroup" aria-label="Video captions">
        {OPTIONS.map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            className="pill-btn"
            onClick={() => {
              setValue(v);
              writeCaptionPref(v);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}
