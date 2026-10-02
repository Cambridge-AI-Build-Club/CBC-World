import { useState } from 'react';
import type { Ambassador } from '../types';

const PALETTE = ['#d97757', '#c6613f', '#b8a07e', '#8fb573', '#7c9fb0', '#a58bc4', '#d4a24c', '#6fa89a'];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

export function githubHandle(github?: string) {
  if (!github) return undefined;
  return github.replace(/^https?:\/\/(www\.)?github\.com\//i, '').replace(/\/.*$/, '').replace(/^@/, '') || undefined;
}

export function Avatar({ person, size = 44 }: { person: Ambassador; size?: number }) {
  const handle = githubHandle(person.github);
  const [failed, setFailed] = useState(false);
  const bg = PALETTE[hash(person.name) % PALETTE.length];

  if (handle && !failed) {
    return (
      <img
        src={`https://github.com/${handle}.png?size=${size * 2}`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full bg-ink-700 object-cover ring-1 ring-white/10"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full font-semibold text-ink-950 ring-1 ring-white/10"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.36 }}
    >
      {initials(person.name)}
    </div>
  );
}
