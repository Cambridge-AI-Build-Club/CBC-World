import { useMemo } from 'react';

// Keep in sync with the .clawd-land keyframes in index.css (strip width = 48 × CELL = 60).
// 48×24 equirectangular land mask (7.5° cells), generated from Natural Earth 110m land.
const WORLD = [
  '................................................',
  '........#.############....#...#.....###.........',
  '..#############.#####.....###..#################',
  '###############..##..#..########################',
  '...#..###########......#.##################..#..',
  '.......##########......####################.....',
  '.......########........####################.....',
  '........######........##################..#.....',
  '.........##..#........##################........',
  '..........#####.......##########.######.#.......',
  '............#.##......#########...#..##.#.......',
  '.............#####....#########......#.#........',
  '.............#######.....#####.......###.###....',
  '.............#######.....#####...........#.#....',
  '..............#####......####.#........#####....',
  '..............####........###.#........######...',
  '..............###.........##...........######...',
  '..............##...........................#..##',
  '..............#.................................',
  '..............#.................................',
  '................................................',
  '..........#...##......#########################.',
  '..##############.#.###########################..',
  '################################################',
];

const GLOBE_R = 15;
const CELL = (GLOBE_R * 2) / 24;
const CX = 32;
const CY = 48;
const SPRITE_SCALE = 1.35; // sprite is 22×14 units before scaling
const STRIP_W = WORLD[0].length * CELL;

function landPath() {
  let d = '';
  WORLD.forEach((row, r) => {
    const re = /#+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(row))) {
      d += `M${m.index * CELL} ${r * CELL}h${m[0].length * CELL}v${CELL}h-${m[0].length * CELL}z`;
    }
  });
  return d;
}

/** Clawd, the Claude Code mascot, strolling around a tiny spinning pixel globe. */
export function ClawdLogo({ size = 56 }: { size?: number }) {
  const land = useMemo(landPath, []);
  const top = CY - GLOBE_R;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Clawd travelling around the globe"
      className="clawd-logo overflow-visible"
    >
      <defs>
        <clipPath id="clawd-globe-clip">
          <circle cx={CX} cy={CY} r={GLOBE_R} />
        </clipPath>
        <radialGradient id="clawd-globe-shade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.55" />
        </radialGradient>
        <radialGradient id="clawd-globe-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="70%" stopColor="#d97757" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#d97757" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Atmosphere */}
      <circle cx={CX} cy={CY} r={GLOBE_R + 3.5} fill="url(#clawd-globe-glow)" />

      {/* Globe */}
      <g clipPath="url(#clawd-globe-clip)">
        <rect x={CX - GLOBE_R} y={top} width={GLOBE_R * 2} height={GLOBE_R * 2} fill="#1f3a4d" />
        <g transform={`translate(${CX - GLOBE_R} ${top})`}>
          <g className="clawd-land" shapeRendering="crispEdges">
            <path d={land} fill="#8fb573" />
            <path d={land} fill="#8fb573" transform={`translate(${STRIP_W} 0)`} />
          </g>
        </g>
        <circle cx={CX} cy={CY} r={GLOBE_R} fill="url(#clawd-globe-shade)" />
      </g>
      <circle cx={CX} cy={CY} r={GLOBE_R} fill="none" stroke="#f0eee6" strokeOpacity="0.18" strokeWidth="0.6" />

      {/* Clawd: 11×7 pixel sprite at 2 units per pixel, feet resting on the north pole */}
      <g
        transform={`translate(${CX - 11 * SPRITE_SCALE} ${top - 13.6 * SPRITE_SCALE}) scale(${SPRITE_SCALE})`}
        shapeRendering="crispEdges"
      >
        <g className="clawd-body">
          {/* torso + arms */}
          <path fill="#d97757" d="M4 0h14v10H4z" />
          <path className="clawd-arms" fill="#d97757" d="M0 4h4v2H0zM18 4h4v2h-4z" />
          {/* eyes */}
          <g className="clawd-eyes" fill="#141413">
            <rect x="6" y="2" width="2" height="2" />
            <rect x="14" y="2" width="2" height="2" />
          </g>
        </g>
        {/* legs, in two alternating pairs */}
        <g fill="#d97757">
          <g className="clawd-legs-a">
            <rect x="5" y="10" width="2" height="4" />
            <rect x="13" y="10" width="2" height="4" />
          </g>
          <g className="clawd-legs-b">
            <rect x="9" y="10" width="2" height="4" />
            <rect x="17" y="10" width="2" height="4" />
          </g>
        </g>
      </g>
    </svg>
  );
}
