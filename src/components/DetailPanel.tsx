import { AnimatePresence, motion, useDragControls } from 'framer-motion';
import { MapPin, X } from 'lucide-react';
import type { UniversityHub } from '../types';
import { AmbassadorCard } from './AmbassadorCard';

interface Props {
  hubs: UniversityHub[];
  desktop: boolean;
  onClose: () => void;
}

export function DetailPanel({ hubs, desktop, onClose }: Props) {
  const dragControls = useDragControls();
  const open = hubs.length > 0;
  const key = hubs.map((h) => h.id).join('+');
  const total = hubs.reduce((n, h) => n + h.ambassadors.length, 0);
  const first = hubs[0];

  const variants = desktop
    ? { hidden: { opacity: 0, x: 24 }, shown: { opacity: 1, x: 0 } }
    : { hidden: { y: '100%' }, shown: { y: 0 } };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <motion.aside
          key={key}
          initial="hidden"
          animate="shown"
          exit="hidden"
          variants={variants}
          transition={{ type: 'spring', stiffness: 380, damping: 36 }}
          drag={desktop ? false : 'y'}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.6 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120 || info.velocity.y > 600) onClose();
          }}
          aria-label={`Ambassadors at ${hubs.map((h) => h.name).join(', ')}`}
          className={
            desktop
              ? 'glass pointer-events-auto absolute bottom-4 right-4 top-4 z-20 flex w-[400px] flex-col overflow-hidden'
              : 'glass pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[72dvh] flex-col overflow-hidden rounded-b-none pb-[env(safe-area-inset-bottom)]'
          }
        >
          {!desktop && <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-white/20" />}
          <header
            onPointerDown={(e) => !desktop && dragControls.start(e)}
            className="flex touch-none items-start gap-3 border-b border-white/[0.06] px-5 pb-4 pt-4 lg:touch-auto"
          >
            <div className="min-w-0 flex-1">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-clay-400">
                <MapPin className="h-3.5 w-3.5" />
                {first.city}, {first.country}
              </p>
              <h2 className="font-serif text-[22px] leading-tight text-cream-50">
                {hubs.length === 1 ? first.name : `${hubs.length} universities`}
              </h2>
              <p className="mt-1 text-sm text-cream-400">
                {total} ambassador{total === 1 ? '' : 's'} available to connect
              </p>
            </div>
            <button type="button" onClick={onClose} className="icon-btn -mr-2 -mt-1" aria-label="Close panel">
              <X className="h-[18px] w-[18px]" />
            </button>
          </header>

          <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">
            {hubs.map((hub) => (
              <section key={hub.id} className="mb-5 last:mb-0">
                {hubs.length > 1 && (
                  <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.1em] text-cream-400">{hub.name}</h3>
                )}
                <ul className="space-y-2.5">
                  {hub.ambassadors.map((a, i) => (
                    <AmbassadorCard key={a.id} person={a} index={i} />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
