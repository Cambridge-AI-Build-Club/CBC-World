import { Minus, Pause, Play, Plus, RotateCcw } from 'lucide-react';

interface Props {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  autoRotate: boolean;
  onToggleRotate: () => void;
}

export function MapControls({ onZoomIn, onZoomOut, onReset, autoRotate, onToggleRotate }: Props) {
  const items = [
    { label: 'Zoom in', icon: Plus, onClick: onZoomIn },
    { label: 'Zoom out', icon: Minus, onClick: onZoomOut },
    { label: 'Reset view', icon: RotateCcw, onClick: onReset },
    { label: autoRotate ? 'Pause rotation' : 'Resume rotation', icon: autoRotate ? Pause : Play, onClick: onToggleRotate },
  ];
  return (
    <div className="glass pointer-events-auto flex flex-col p-1" role="toolbar" aria-label="Globe controls">
      {items.map(({ label, icon: Icon, onClick }, i) => (
        <div key={i} className="flex flex-col">
          {i === 2 && <div className="mx-2 my-1 h-px bg-white/[0.08]" />}
          <button type="button" onClick={onClick} aria-label={label} title={label} className="icon-btn rounded-xl">
            <Icon className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
