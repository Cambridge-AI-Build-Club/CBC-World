import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { List, Plus, X } from 'lucide-react';
import { ClawdLogo } from './components/ClawdLogo';
import { DetailPanel } from './components/DetailPanel';
import { Directory } from './components/Directory';
import { GlobeView, type GlobeHandle } from './components/GlobeView';
import { JoinModal } from './components/JoinModal';
import { MapControls } from './components/MapControls';
import { hubs, stats } from './lib/data';
import { useIsDesktop } from './lib/useMediaQuery';
import type { UniversityHub } from './types';

const LEFT_COL = 356; // directory width + gutter
const RIGHT_COL = 416; // detail panel width + gutter

export default function App() {
  const desktop = useIsDesktop();
  const globe = useRef<GlobeHandle>(null);
  const [ready, setReady] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [joinOpen, setJoinOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [interacted, setInteracted] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(true);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const selectedHubs = useMemo(() => hubs.filter((h) => selectedIds.includes(h.id)), [selectedIds]);

  const select = useCallback((picked: UniversityHub[]) => {
    setSelectedIds(picked.map((h) => h.id));
    setAutoRotate(false);
    setMobileListOpen(false);
    globe.current?.focus(picked);
  }, []);

  const handleInteract = useCallback(() => {
    setInteracted(true);
    setAutoRotate(false);
  }, []);

  const closeDetail = useCallback(() => setSelectedIds([]), []);

  // Shift the globe so it stays centred in the space the panels leave free.
  const hasSelection = selectedHubs.length > 0;
  const offsetX = desktop ? ((directoryOpen ? LEFT_COL : 0) - (hasSelection ? RIGHT_COL : 0)) / 2 : 0;
  const offsetY = !desktop && hasSelection ? -Math.round(window.innerHeight * 0.2) : 0;
  const offset = useMemo<[number, number]>(() => [offsetX, offsetY], [offsetX, offsetY]);

  return (
    <div className="space-bg relative h-full w-full overflow-hidden">
      <GlobeView
        ref={globe}
        hubs={hubs}
        selectedIds={selectedIds}
        onSelect={select}
        offset={offset}
        autoRotate={autoRotate}
        onUserInteract={handleInteract}
        onReady={() => setReady(true)}
      />

      {/* Loading screen */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            className="absolute inset-0 z-40 grid place-items-center bg-ink-900"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex flex-col items-center gap-4">
              <ClawdLogo size={96} />
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-cream-400">Loading the world…</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UI overlay */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {/* Left column: brand + directory */}
        <div className="absolute left-3 top-3 flex max-h-[calc(100%-1.5rem)] w-[calc(100%-7.5rem)] flex-col gap-3 sm:left-4 sm:top-4 lg:bottom-4 lg:w-[340px]">
          <header className="glass pointer-events-auto flex items-center gap-2.5 py-1.5 pl-1.5 pr-4 max-lg:self-start lg:gap-3 lg:py-2 lg:pl-2">
            <ClawdLogo size={desktop ? 64 : 48} />
            <div className="min-w-0 flex-1">
              <h1 className="whitespace-nowrap font-serif text-[18px] leading-tight text-cream-50 lg:text-[21px]">Claude Ambassadors</h1>
              <p className="truncate text-[12px] text-cream-400 lg:text-[13px]">
                {desktop ? (
                  'Find an ambassador near you'
                ) : (
                  <>
                    <span className="tabular-nums text-cream-200">{stats.ambassadors}</span> ambassadors ·{' '}
                    <span className="tabular-nums text-cream-200">{stats.countries}</span> countries
                  </>
                )}
              </p>
            </div>
            {desktop && (
              <button
                type="button"
                className="icon-btn -mr-2"
                onClick={() => setDirectoryOpen((o) => !o)}
                aria-label={directoryOpen ? 'Hide directory' : 'Show directory'}
                aria-expanded={directoryOpen}
                title={directoryOpen ? 'Hide directory' : 'Show directory'}
              >
                {directoryOpen ? <X className="h-4 w-4" /> : <List className="h-4 w-4" />}
              </button>
            )}
          </header>

          <AnimatePresence initial={false}>
            {desktop && directoryOpen && (
              <motion.div
                className="glass pointer-events-auto min-h-0 flex-1 overflow-hidden"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex h-full flex-col">
                  <dl className="grid grid-cols-3 border-b border-white/[0.06]">
                    {[
                      ['Ambassadors', stats.ambassadors],
                      ['Universities', stats.universities],
                      ['Countries', stats.countries],
                    ].map(([label, value], i) => (
                      <div key={label} className={`px-2 py-3 text-center ${i ? 'border-l border-white/[0.06]' : ''}`}>
                        <dd className="font-serif text-2xl tabular-nums text-cream-50">{value}</dd>
                        <dt className="text-[10.5px] uppercase tracking-[0.08em] text-cream-400">{label}</dt>
                      </div>
                    ))}
                  </dl>
                  <div className="min-h-0 flex-1">
                    <Directory hubs={hubs} selectedIds={selectedIds} onPick={(h) => select([h])} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top right: join CTA */}
        <div
          className="absolute right-3 top-3 sm:right-4 sm:top-4"
          style={desktop && hasSelection ? { right: RIGHT_COL + 4 } : undefined}
        >
          <button type="button" onClick={() => setJoinOpen(true)} className="btn-primary pointer-events-auto shadow-lg shadow-clay-900/30">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Join the map</span>
            <span className="sm:hidden">Join</span>
          </button>
        </div>

        {/* Bottom right: controls (desktop) */}
        {desktop && (
          <div
            className="absolute bottom-4 transition-[right] duration-300"
            style={{ right: hasSelection ? RIGHT_COL + 4 : 16 }}
          >
            <MapControls
              onZoomIn={() => globe.current?.zoomBy(0.65)}
              onZoomOut={() => globe.current?.zoomBy(1.5)}
              onReset={() => {
                setSelectedIds([]);
                globe.current?.reset();
              }}
              autoRotate={autoRotate}
              onToggleRotate={() => setAutoRotate((r) => !r)}
            />
          </div>
        )}

        {/* Bottom centre: hint */}
        <div
          className="absolute inset-x-0 bottom-20 flex justify-center px-4 lg:bottom-6"
          style={desktop ? { paddingLeft: directoryOpen ? LEFT_COL : 0 } : undefined}
        >
          <AnimatePresence>
            {!interacted && !hasSelection && (
              <motion.p
                className="rounded-full border border-white/[0.06] bg-ink-900/60 px-4 py-2 text-center text-xs text-cream-300 backdrop-blur"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                {desktop ? 'Drag to rotate · Scroll to zoom · Click a marker to meet ambassadors' : 'Drag to rotate · Pinch to zoom · Tap a marker'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: browse list */}
        {!desktop && !hasSelection && (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-[calc(env(safe-area-inset-bottom)+1rem)]">
            <button type="button" onClick={() => setMobileListOpen(true)} className="btn-ghost pointer-events-auto bg-ink-900/80 px-5 py-2.5 backdrop-blur">
              <List className="h-4 w-4" />
              Browse all universities
            </button>
          </div>
        )}
      </motion.div>

      {/* Mobile directory sheet */}
      <AnimatePresence>
        {!desktop && mobileListOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-30 bg-ink-950/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileListOpen(false)}
            />
            <motion.div
              className="glass fixed inset-x-0 bottom-0 z-30 flex h-[80dvh] flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              role="dialog"
              aria-label="All universities"
            >
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <p className="font-serif text-lg text-cream-50">All universities</p>
                <button type="button" className="icon-btn -mr-2" onClick={() => setMobileListOpen(false)} aria-label="Close list">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <Directory hubs={hubs} selectedIds={selectedIds} onPick={(h) => select([h])} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <DetailPanel hubs={selectedHubs} desktop={desktop} onClose={closeDetail} />
      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}
