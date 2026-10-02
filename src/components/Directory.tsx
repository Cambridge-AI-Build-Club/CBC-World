import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { UniversityHub } from '../types';

interface Props {
  hubs: UniversityHub[];
  selectedIds: string[];
  onPick: (hub: UniversityHub) => void;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export function Directory({ hubs, selectedIds, onPick }: Props) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(target.tagName)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = useMemo(() => {
    const q = norm(query.trim());
    const results = hubs
      .map((hub) => {
        if (!q) return { hub, people: [] as string[] };
        const hubHit = [hub.name, hub.city, hub.country].some((f) => norm(f).includes(q));
        const people = hub.ambassadors.filter((a) => norm(a.name).includes(q)).map((a) => a.name);
        return hubHit || people.length ? { hub, people } : null;
      })
      .filter(Boolean) as { hub: UniversityHub; people: string[] }[];

    const byCountry = new Map<string, typeof results>();
    for (const r of results) {
      const list = byCountry.get(r.hub.country) ?? [];
      list.push(r);
      byCountry.set(r.hub.country, list);
    }
    return [...byCountry.entries()]
      .map(([country, items]) => ({
        country,
        items: items.sort((a, b) => b.hub.ambassadors.length - a.hub.ambassadors.length || a.hub.name.localeCompare(b.hub.name)),
        total: items.reduce((n, i) => n + i.hub.ambassadors.length, 0),
      }))
      .sort((a, b) => b.total - a.total || a.country.localeCompare(b.country));
  }, [hubs, query]);

  const resultCount = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-4 pb-3 pt-4">
        <label className="group relative flex items-center">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-cream-400 transition group-focus-within:text-clay-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search university, city, or name"
            aria-label="Search ambassadors"
            className="h-10 w-full rounded-xl border border-white/[0.08] bg-ink-950/60 pl-9 pr-9 text-sm text-cream-50 placeholder:text-cream-400/70 outline-none transition focus:border-clay-500/60 focus:ring-2 focus:ring-clay-500/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 grid h-6 w-6 place-items-center rounded-md text-cream-400 hover:text-cream-50"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 hidden rounded border border-white/10 px-1.5 font-mono text-[10px] text-cream-400 lg:block">
              /
            </kbd>
          )}
        </label>
      </div>

      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        <AnimatePresence initial={false}>
          {resultCount === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-10 text-center text-sm text-cream-400"
            >
              No ambassadors match “{query}”.
              <br />
              Know someone who should be here? Invite them to join the map.
            </motion.div>
          )}
        </AnimatePresence>

        {groups.map((g) => (
          <section key={g.country} className="mb-2">
            <h3 className="sticky top-0 z-10 flex items-center justify-between bg-gradient-to-b from-ink-900 via-ink-900/95 to-ink-900/0 px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-cream-400">
              <span>{g.country}</span>
              <span className="font-mono font-normal tabular-nums">{g.total}</span>
            </h3>
            <ul>
              {g.items.map(({ hub, people }) => {
                const active = selectedIds.includes(hub.id);
                return (
                  <li key={hub.id}>
                    <button
                      type="button"
                      onClick={() => onPick(hub)}
                      aria-current={active || undefined}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? 'bg-clay-500/[0.12]' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span
                        className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 font-mono text-xs tabular-nums transition ${
                          active ? 'bg-clay-500 text-ink-950' : 'bg-white/[0.06] text-cream-200 group-hover:bg-clay-500/20'
                        }`}
                      >
                        {hub.ambassadors.length}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm ${active ? 'text-cream-50' : 'text-cream-100'}`}>{hub.name}</span>
                        <span className="block truncate text-xs text-cream-400">
                          {people.length ? `Matches: ${people.join(', ')}` : hub.city}
                        </span>
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 shrink-0 transition ${active ? 'text-clay-400' : 'text-cream-400/0 group-hover:text-cream-400'}`}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
