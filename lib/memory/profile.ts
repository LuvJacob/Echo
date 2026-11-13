/**
 * Survivor profile: just a first name, remembered in this browser (no login).
 */
const KEY = 'echo_user_name_v1';

export function getUserName(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const n = window.localStorage.getItem(KEY);
    return n && n.trim() ? n.trim() : null;
  } catch {
    return null;
  }
}

export function setUserName(raw: string): string | null {
  const name = raw.replace(/[^\p{L}\p{M}' \-]/gu, '').trim().slice(0, 30);
  if (!name) return null;
  const nice = name
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
  try {
    window.localStorage.setItem(KEY, nice);
  } catch {}
  return nice;
}

/** Tool: set_user_name */
export function answerUserName(args: unknown): Record<string, unknown> {
  const n = typeof (args as { name?: unknown })?.name === 'string' ? setUserName((args as { name: string }).name) : null;
  return n ? { ok: true, name: n } : { ok: false, message: 'No name heard.' };
}

/** Time-aware, varied greeting, e.g. "Good afternoon, James. Exploring again?" */
export function greetingFor(name: string, now = new Date(), rand = Math.random): string {
  const h = now.getHours();
  const time = h < 5 ? 'Late night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  const lines = [
    `${time}, ${name}. Exploring again?`,
    `${time}, ${name}. Good to see you.`,
    `Welcome back, ${name}. Systems are ready.`,
    `${time}, ${name}. Safe travels out there.`,
    `Great to see you, ${name}. What are we checking today?`,
    `${time}, ${name}. Nice day to restock.`,
  ];
  return lines[Math.floor(rand() * lines.length)];
}
