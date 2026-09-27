'use client';
/**
 * A YouTube lesson with this app's controls instead of YouTube's.
 *
 * Ported from Eternal Bonds `shared/ui/YouTubePlayer.tsx`. What matters:
 * - Watch time is credited only while the position moves forward by less
 *   than a second per 250 ms tick, so scrubbing or a paused tab earns nothing.
 *   That is what makes "watch 80% to complete" meaningful.
 * - Progress is reported every 15 watched seconds, on pause, on end, on
 *   unmount, and via sendBeacon when the tab is hidden.
 * - The player is rebuilt only when the video changes; the resume point is
 *   read once.
 *
 * Kept for YouTube's terms: the logo and the title overlay are not hidden,
 * and nothing covers the player during playback except a faint name tag in
 * the left margin. Unlisted videos are reachable by anyone with the link.
 */
import { Maximize, Pause, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { clock } from '@/lib/format';

type YTPlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  setPlaybackRate: (rate: number) => void;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  destroy: () => void;
};

declare global {
  interface Window {
    YT?: {
      Player: new (el: HTMLElement, opts: Record<string, unknown>) => YTPlayer;
      PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<void> | null = null;
function loadApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
  return apiPromise;
}

const SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

export type ProgressReport = { position: number; watched: number; beacon?: boolean };

export function YouTubePlayer({
  videoId,
  startAt,
  title,
  watermark,
  onProgress,
  onEnded,
  onDurationKnown,
  reportEverySeconds = 15,
}: {
  videoId: string;
  startAt: number;
  title: string;
  watermark: string;
  onProgress: (r: ProgressReport) => void;
  onEnded: () => void;
  onDurationKnown?: (seconds: number) => void;
  reportEverySeconds?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [muted, setMuted] = useState(false);
  const [scrubbing, setScrubbing] = useState<number | null>(null);

  const watched = useRef(0);
  const lastTick = useRef(0);
  const progressRef = useRef(onProgress);
  const endedRef = useRef(onEnded);
  const durationRef = useRef(onDurationKnown);
  useEffect(() => {
    progressRef.current = onProgress;
    endedRef.current = onEnded;
    durationRef.current = onDurationKnown;
  }, [onProgress, onEnded, onDurationKnown]);
  const durationReported = useRef(false);
  const resumeAt = useRef(startAt);

  const flush = useCallback((beacon = false) => {
    const p = player.current;
    if (!p) return;
    try {
      const at = Math.floor(p.getCurrentTime());
      const w = Math.floor(watched.current);
      if (at > 0 || w > 0) progressRef.current({ position: at, watched: w, beacon });
      watched.current -= w;
    } catch {
      // The iframe may already be gone.
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let ticker: ReturnType<typeof setInterval> | null = null;

    void loadApi().then(() => {
      if (disposed || !host.current || !window.YT) return;
      player.current = new window.YT.Player(host.current, {
        videoId,
        playerVars: {
          controls: 0,
          disablekb: 1,
          iv_load_policy: 3,
          fs: 0,
          rel: 0,
          playsinline: 1,
          cc_load_policy: 0,
          hl: 'en',
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (disposed || !player.current) return;
            const total = player.current.getDuration();
            setDuration(total);
            if (total > 0 && !durationReported.current) {
              durationReported.current = true;
              durationRef.current?.(Math.round(total));
            }
            setMuted(player.current.isMuted());
            const at = resumeAt.current;
            if (at > 2 && total > 0 && at < total - 5) {
              player.current.seekTo(at, true);
              setPosition(at);
              lastTick.current = at;
            }
            setReady(true);
          },
          onStateChange: (event: { data: number }) => {
            if (!window.YT || !player.current) return;
            const state = event.data;
            setPlaying(state === window.YT.PlayerState.PLAYING);
            if (state === window.YT.PlayerState.PLAYING) {
              const total = player.current.getDuration();
              if (total > 0) setDuration(total);
              if (total > 0 && !durationReported.current) {
                durationReported.current = true;
                durationRef.current?.(Math.round(total));
              }
            }
            if (state === window.YT.PlayerState.ENDED) {
              flush();
              endedRef.current();
            }
            if (state === window.YT.PlayerState.PAUSED) flush();
          },
          onError: () => {
            setFailed('This video is unavailable. It may be private, deleted, or have embedding turned off. Ask Pooja to check the YouTube settings (Unlisted + Allow embedding).');
          },
        },
      });

      lastTick.current = 0;
      ticker = setInterval(() => {
        const p = player.current;
        if (!p || typeof p.getCurrentTime !== 'function') return;
        const now = p.getCurrentTime();
        const delta = now - lastTick.current;
        if (delta > 0 && delta < 1) watched.current += delta;
        lastTick.current = now;
        setPosition(now);
        if (watched.current >= reportEverySeconds) flush();
      }, 250);
    });

    const onHide = () => {
      if (document.visibilityState === 'hidden') flush(true);
    };
    const onPageHide = () => flush(true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      disposed = true;
      if (ticker) clearInterval(ticker);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      flush();
      player.current?.destroy();
      player.current = null;
    };
  }, [videoId, reportEverySeconds, flush]);

  const toggle = useCallback(() => {
    const p = player.current;
    if (!p || !window.YT) return;
    if (p.getPlayerState() === window.YT.PlayerState.PLAYING) p.pauseVideo();
    else p.playVideo();
  }, []);

  const seekTo = useCallback((to: number) => {
    const p = player.current;
    if (!p) return;
    const next = Math.max(0, Math.min(p.getDuration() || 0, to));
    p.seekTo(next, true);
    setPosition(next);
    // A jump is not watching; the ticker would otherwise credit the gap.
    lastTick.current = next;
  }, []);

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length]!;
    setSpeed(next);
    player.current?.setPlaybackRate(next);
  }, [speed]);

  const toggleMute = useCallback(() => {
    const p = player.current;
    if (!p) return;
    const next = !p.isMuted();
    if (next) p.mute();
    else p.unMute();
    setMuted(next);
  }, []);

  const fullscreen = useCallback(() => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  const commitScrub = () => {
    if (scrubbing === null) return;
    seekTo(scrubbing);
    setScrubbing(null);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (key === ' ' || key === 'k') {
      e.preventDefault();
      toggle();
    } else if (key === 'arrowright') {
      e.preventDefault();
      seekTo((player.current?.getCurrentTime() ?? 0) + 10);
    } else if (key === 'arrowleft') {
      e.preventDefault();
      seekTo((player.current?.getCurrentTime() ?? 0) - 10);
    } else if (key === 'f') fullscreen();
    else if (key === 'm') toggleMute();
  };

  if (failed) {
    return (
      <div className="player-empty">
        <p className="muted" style={{ maxWidth: 420 }}>
          {failed}
        </p>
      </div>
    );
  }

  const shown = scrubbing ?? position;
  const pct = duration ? (shown / duration) * 100 : 0;

  return (
    <div ref={frame} className="player" tabIndex={0} onKeyDown={onKeyDown} aria-label={`Video: ${title}`}>
      <div className="player-frame">
        <div ref={host} />
      </div>
      <span className="watermark" aria-hidden="true">
        {watermark}
      </span>
      {ready && !playing && (
        <button type="button" className="player-big" onClick={toggle} aria-label="Play">
          <span>
            <Play size={28} fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
      <div className="player-bar">
        <input
          type="range"
          min={0}
          max={1000}
          value={Math.round(pct * 10)}
          aria-label="Seek"
          disabled={!duration}
          onChange={(e) => setScrubbing((Number(e.target.value) / 1000) * duration)}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
        />
        <div className="player-ctrls">
          <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button type="button" onClick={() => seekTo((player.current?.getCurrentTime() ?? 0) - 10)} aria-label="Back ten seconds">
            <RotateCcw size={18} />
          </button>
          <span className="player-time">
            {clock(shown)} / {clock(duration)}
          </span>
          <span style={{ flex: 1 }} />
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button type="button" onClick={cycleSpeed} aria-label={`Playback speed ${speed}×`} style={{ fontSize: 12, fontWeight: 700 }}>
            {speed}×
          </button>
          <button type="button" onClick={fullscreen} aria-label="Full screen">
            <Maximize size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
