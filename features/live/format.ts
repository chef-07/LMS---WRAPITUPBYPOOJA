export function sessionWhen(startsAt: string, endsAt: string): string {
  const tz = 'Asia/Kolkata';
  const day = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(new Date(startsAt));
  const t = (iso: string) => new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso));
  return `${day} · ${t(startsAt)} – ${t(endsAt)}`;
}

export function isLiveNow(startsAt: string, endsAt: string, now: number = Date.now()): boolean {
  return now >= new Date(startsAt).getTime() && now <= new Date(endsAt).getTime();
}
