/**
 * Turns whatever the admin pasted (address bar, Share button, mobile app,
 * embed snippet, or a bare id) into an 11-character YouTube video id.
 *
 * The host check matters: a link that merely looks like YouTube must be
 * refused, or a lesson could end up embedding somebody else's page.
 *
 * Ported from Eternal Bonds `services/api/src/lib/video-provider.ts`.
 */
const ID = /^[\w-]{11}$/;

export function youtubeId(input: string): string | null {
  const raw = input.trim();
  if (ID.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '');
  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    return id && ID.test(id) ? id : null;
  }
  if (!/(^|\.)youtube(-nocookie)?\.com$/.test(host)) return null;

  const v = url.searchParams.get('v');
  if (v && ID.test(v)) return v;

  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => ['embed', 'live', 'shorts', 'v'].includes(p));
  if (idx >= 0) {
    const id = parts[idx + 1];
    if (id && ID.test(id)) return id;
  }
  return null;
}

export function youtubeThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
