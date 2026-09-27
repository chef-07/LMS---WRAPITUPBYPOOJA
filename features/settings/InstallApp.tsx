'use client';
import { Download, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };
type Mode = 'unknown' | 'installed' | 'prompt' | 'ios' | 'manual';

/** "Add to home screen": Android/desktop Chrome get a button; iPhone gets the two taps to do. */
export function InstallApp() {
  const [mode, setMode] = useState<Mode>('unknown');
  const [evt, setEvt] = useState<PromptEvent | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const t = setTimeout(() => setMode(standalone ? 'installed' : ios ? 'ios' : 'manual'), 0);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as PromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => setMode('installed');
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      clearTimeout(t);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return (
    <section className="card">
      <h2 style={{ margin: '0 0 4px', fontSize: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Smartphone size={18} aria-hidden="true" /> Put the university on your phone
      </h2>
      {mode === 'installed' ? (
        <p className="notice ok" style={{ margin: '8px 0 0' }}>Installed. Open it from your home screen like any other app.</p>
      ) : mode === 'prompt' ? (
        <>
          <p className="muted small" style={{ margin: '0 0 10px' }}>It opens full screen from your home screen, with no browser bars.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={async () => {
              if (!evt) return;
              await evt.prompt();
              const { outcome } = await evt.userChoice;
              if (outcome === 'accepted') setMode('installed');
              setEvt(null);
            }}
          >
            <Download size={16} aria-hidden="true" /> Install the app
          </button>
        </>
      ) : mode === 'ios' ? (
        <ol className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>Open this page in <b>Safari</b>.</li>
          <li>Tap the <b>Share</b> button (the square with an arrow).</li>
          <li>Choose <b>Add to Home Screen</b>, then <b>Add</b>.</li>
        </ol>
      ) : (
        <ol className="small" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
          <li>
            On Android, open this page in <b>Chrome</b>, tap <b>⋮</b>, then <b>Install app</b> (or <b>Add to Home screen</b>).
          </li>
          <li>On a computer, click the install icon at the right end of Chrome’s address bar.</li>
        </ol>
      )}
    </section>
  );
}
