/** Per-device preferences, kept in the browser (nothing sensitive). */
export type CaptionPref = 'off' | 'en' | 'hi';
const KEY = 'wiu:captions';

export function readCaptionPref(): CaptionPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'en' || v === 'hi' ? v : 'off';
  } catch {
    return 'off';
  }
}

export function writeCaptionPref(v: CaptionPref) {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    // Private mode: the choice just won't be remembered.
  }
}
