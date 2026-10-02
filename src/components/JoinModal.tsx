import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpRight, X } from 'lucide-react';
import { FORM_EMBED_URL, FORM_LINK } from '../config';
import { ClawdLogo } from './ClawdLogo';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function JoinModal({ open, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoaded(false);
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="join-title"
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="glass relative flex h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-b-none bg-ink-900/95 sm:h-[86vh] sm:rounded-b-2xl"
          >
            <header className="flex items-center gap-3 border-b border-white/[0.06] px-5 py-3">
              <ClawdLogo size={36} />
              <h2 id="join-title" className="min-w-0 flex-1 truncate font-serif text-xl text-cream-50">
                Join the map
              </h2>
              <button ref={closeRef} type="button" onClick={onClose} className="icon-btn -mr-2 shrink-0" aria-label="Close">
                <X className="h-[18px] w-[18px]" />
              </button>
            </header>

            <div className="relative min-h-0 flex-1 bg-cream-50">
              {FORM_EMBED_URL ? (
                <>
                  {!loaded && (
                    <div className="absolute inset-0 grid place-items-center bg-ink-900">
                      <div className="flex flex-col items-center gap-3 text-sm text-cream-400">
                        <span className="h-6 w-6 animate-spin rounded-full border-2 border-clay-500/30 border-t-clay-500" />
                        Loading form…
                      </div>
                    </div>
                  )}
                  <iframe
                    src={FORM_EMBED_URL}
                    title="Claude Ambassador sign-up form"
                    className="h-full w-full"
                    onLoad={() => setLoaded(true)}
                  >
                    Loading…
                  </iframe>
                </>
              ) : (
                <div className="grid h-full place-items-center bg-ink-900 p-8">
                  <div className="max-w-md text-center">
                    <p className="font-serif text-xl text-cream-50">Form not connected yet</p>
                    <p className="mt-2 text-sm leading-relaxed text-cream-400">
                      Set <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-clay-300">VITE_FORM_EMBED_URL</code>{' '}
                      in <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-clay-300">.env</code> to the
                      embed URL of a Google Form or Microsoft Form. See the README for details.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {FORM_LINK && (
              <footer className="flex items-center justify-between gap-4 border-t border-white/[0.06] px-6 py-3 text-xs text-cream-400">
                <span>Having trouble with the embedded form?</span>
                <a href={FORM_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-clay-300 hover:text-clay-300/80">
                  Open in a new tab <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </footer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
