'use client';
import { useEffect } from 'react';

/** Registers /sw.js in production builds (it only adds an offline page and caches build files). */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not supported here (e.g. private mode): the app works the same without it.
    });
  }, []);
  return null;
}
