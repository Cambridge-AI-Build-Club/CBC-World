import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import { MeshPhongMaterial, Color, type PerspectiveCamera } from 'three';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';
import type { Topology } from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-110m.json';
import { arcDistance, clusterHubs, minPairDistance } from '../lib/geo';
import type { Cluster, UniversityHub } from '../types';

const countries = feature(
  countriesTopo as unknown as Topology,
  (countriesTopo as unknown as Topology).objects.countries,
) as unknown as FeatureCollection<Polygon | MultiPolygon>;

// h3 (used for the dot grid) throws on degenerate triangles in the 110m data, e.g. North Korea.
// Rings that small are invisible at this hex resolution anyway, so drop them.
const landFeatures = countries.features
  .map((f): Feature<Polygon | MultiPolygon> | null => {
    if (f.geometry.type === 'Polygon') return f.geometry.coordinates[0].length > 4 ? f : null;
    const polys = f.geometry.coordinates.filter((p) => p[0].length > 4);
    return polys.length ? { ...f, geometry: { type: 'MultiPolygon', coordinates: polys } } : null;
  })
  .filter((f): f is Feature<Polygon | MultiPolygon> => f !== null);

const MIN_ALT = 0.15;
const MAX_ALT = 4.5;
/** Two markers closer than this on screen merge into one (dot + halo is ~28px). */
const MARKER_GAP_PX = 30;
/** Never zoom closer than this when flying to a selection; the dot grid gets coarse. */
const FOCUS_MIN_ALT = 0.3;
const FOCUS_MAX_ALT = 1.0;
/** Below this altitude the arcs read as clutter, so they are hidden. */
const ARC_MAX_ZOOM_ALT = 1.1;

// Stable accessors: new function identities would make globe.gl re-process layers each render.
const hexColor = () => 'rgba(240, 238, 230, 0.55)';
const arcColor = () => ['rgba(217,119,87,0.0)', 'rgba(217,119,87,0.55)', 'rgba(217,119,87,0.0)'];
const arcInitialGap = () => Math.random();
const ringColor = () => (t: number) => `rgba(240,169,138,${1 - t})`;
const markerVisibility = (el: HTMLElement, visible: boolean) => {
  el.dataset.hidden = String(!visible);
};

export interface GlobeHandle {
  flyTo: (lat: number, lng: number, altitude?: number, ms?: number) => void;
  /** Fly to universities, zooming in far enough to separate them from neighbours when possible. */
  focus: (hubs: UniversityHub[]) => void;
  zoomBy: (factor: number) => void;
  reset: () => void;
}

interface Props {
  hubs: UniversityHub[];
  selectedIds: string[];
  onSelect: (hubs: UniversityHub[]) => void;
  offset: [number, number];
  autoRotate: boolean;
  onUserInteract: () => void;
  onReady?: () => void;
}

interface Arc {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

/** Connect each hub to its two nearest neighbours for a subtle "network" feel. */
function buildArcs(hubs: UniversityHub[]): Arc[] {
  const seen = new Set<string>();
  const arcs: Arc[] = [];
  for (const a of hubs) {
    const nearest = hubs
      .filter((b) => b !== a)
      .map((b) => ({ b, d: arcDistance(a.lat, a.lng, b.lat, b.lng) }))
      .filter(({ d }) => d > 2)
      .sort((x, y) => x.d - y.d)
      .slice(0, 2);
    for (const { b } of nearest) {
      const key = [a.id, b.id].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      arcs.push({ startLat: a.lat, startLng: a.lng, endLat: b.lat, endLng: b.lng });
    }
  }
  return arcs;
}

const EMPTY: never[] = [];

const plural = (n: number, word: string) =>
  `${n} ${n === 1 ? word : word.endsWith('y') ? `${word.slice(0, -1)}ies` : `${word}s`}`;

function renderLabel(el: HTMLElement, c: Cluster, selectedIds: string[], separable: boolean) {
  const label = el.querySelector('.marker-label');
  if (!label) return;
  const selected = c.hubs.filter((h) => selectedIds.includes(h.id));
  let title: string;
  let sub: string;
  if (c.hubs.length === 1) {
    title = c.hubs[0].name;
    sub = `${c.hubs[0].city}, ${c.hubs[0].country} · ${plural(c.count, 'ambassador')}`;
  } else if (selected.length) {
    const others = c.hubs.length - selected.length;
    title = selected.map((h) => h.name).join(' & ');
    sub = others
      ? `+ ${plural(others, 'university')} nearby${separable ? ' · zoom in to separate' : ''}`
      : `${selected[0].city}, ${selected[0].country}`;
  } else {
    title = plural(c.hubs.length, 'university');
    sub = `${plural(c.count, 'ambassador')} · ${separable ? 'click to zoom' : 'click to view'}`;
  }
  const small = document.createElement('small');
  small.textContent = sub;
  label.replaceChildren(title, small);
  el.setAttribute('aria-label', `${title}. ${sub}`);
}

function useInitialAltitude() {
  return typeof window !== 'undefined' && window.innerWidth < 768 ? 3.4 : 2.3;
}

export const GlobeView = forwardRef<GlobeHandle, Props>(function GlobeView(
  { hubs, selectedIds, onSelect, offset, autoRotate, onUserInteract, onReady },
  ref,
) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const initialAlt = useInitialAltitude();
  // Quantised altitude drives re-clustering so we don't recompute every frame.
  const [altBucket, setAltBucket] = useState(() => Math.round(Math.log(initialAlt) * 6));

  // Screen pixels spanned by one degree of arc at the centre of view, at altitude 1.
  // The camera sits `altitude` globe radii above the surface, so this scales with 1/altitude.
  const pxPerDegAtAlt1 = useMemo(() => {
    const fov = (globeRef.current?.camera() as PerspectiveCamera | undefined)?.fov ?? 50;
    return (size.h / 2 / Math.tan((fov * Math.PI) / 360)) * (Math.PI / 180);
  }, [size.h]);
  /** Altitude at which two points `deg` apart sit just far enough apart on screen not to overlap. */
  const altToSeparate = useCallback((deg: number) => (deg * pxPerDegAtAlt1) / (MARKER_GAP_PX * 1.2), [pxPerDegAtAlt1]);

  const isSeparable = useCallback((c: Cluster) => altToSeparate(minPairDistance(c.hubs)) >= MIN_ALT, [altToSeparate]);

  const clusterRadius = (MARKER_GAP_PX * Math.exp(altBucket / 6)) / pxPerDegAtAlt1;
  const clusters = useMemo(() => clusterHubs(hubs, clusterRadius), [hubs, clusterRadius]);
  const allArcs = useMemo(() => buildArcs(hubs), [hubs]);
  const showArcs = Math.exp(altBucket / 6) > ARC_MAX_ZOOM_ALT;
  const arcs = showArcs ? allArcs : EMPTY;
  const selectedHubs = useMemo(() => hubs.filter((h) => selectedIds.includes(h.id)), [hubs, selectedIds]);

  const globeMaterial = useMemo(
    () =>
      new MeshPhongMaterial({
        color: new Color('#1d1c1a'),
        emissive: new Color('#0f0e0d'),
        shininess: 6,
        transparent: true,
        opacity: 0.96,
      }),
    [],
  );

  // Keep the latest callbacks available to the long-lived DOM markers.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const onInteractRef = useRef(onUserInteract);
  onInteractRef.current = onUserInteract;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const flyTo = useCallback((lat: number, lng: number, altitude?: number, ms = 1200) => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat, lng, altitude: altitude ?? g.pointOfView().altitude }, ms);
  }, []);

  const focus = useCallback(
    (picked: UniversityHub[]) => {
      if (!picked.length) return;
      const lat = picked.reduce((n, h) => n + h.lat, 0) / picked.length;
      const lng = picked.reduce((n, h) => n + h.lng, 0) / picked.length;
      const ids = new Set(picked.map((h) => h.id));
      let nearest = Infinity;
      for (const p of picked)
        for (const h of hubs) if (!ids.has(h.id)) nearest = Math.min(nearest, arcDistance(p.lat, p.lng, h.lat, h.lng));
      const needed = altToSeparate(nearest);
      // Close enough in to give the selection its own marker; if neighbours are too close
      // to ever separate comfortably, settle for a metro-level view of the shared marker.
      const altitude = needed >= FOCUS_MIN_ALT ? Math.min(FOCUS_MAX_ALT, needed) : 0.6;
      flyTo(lat, lng, altitude, 1300);
    },
    [hubs, altToSeparate, flyTo],
  );

  useImperativeHandle(
    ref,
    () => ({
      flyTo,
      focus,
      zoomBy: (factor) => {
        const g = globeRef.current;
        if (!g) return;
        const pov = g.pointOfView();
        g.pointOfView({ altitude: Math.min(MAX_ALT, Math.max(MIN_ALT, pov.altitude * factor)) }, 450);
      },
      reset: () => flyTo(22, 10, initialAlt, 1400),
    }),
    [flyTo, focus, initialAlt],
  );

  const handleClusterClick = useCallback(
    (c: Cluster) => {
      onInteractRef.current();
      if (c.hubs.length === 1) {
        onSelectRef.current(c.hubs);
        return;
      }
      if (!isSeparable(c)) {
        // Too close to ever separate on screen (e.g. same city): show them together.
        onSelectRef.current(c.hubs);
      } else {
        flyTo(c.lat, c.lng, Math.max(MIN_ALT, altToSeparate(minPairDistance(c.hubs)) * 0.85), 1100);
      }
    },
    [flyTo, altToSeparate, isSeparable],
  );

  // Marker DOM nodes are cached per cluster id so globe.gl can reuse them; they reach the
  // latest handlers through refs so cached nodes never act on stale zoom maths.
  const markerCache = useRef(new Map<string, HTMLElement>());
  const clusterClickRef = useRef(handleClusterClick);
  clusterClickRef.current = handleClusterClick;
  const isSeparableRef = useRef(isSeparable);
  isSeparableRef.current = isSeparable;
  const makeMarker = useCallback(
    (d: object) => {
      const c = d as Cluster;
      const cached = markerCache.current.get(c.id);
      if (cached) return cached;

      const el = document.createElement('div');
      el.className = 'marker';
      el.dataset.cluster = String(c.hubs.length > 1);
      el.setAttribute('role', 'button');
      el.tabIndex = 0;

      const pulse = document.createElement('span');
      pulse.className = 'marker-pulse';
      const dot = document.createElement('span');
      dot.className = 'marker-dot';
      dot.textContent = String(c.count);
      const label = document.createElement('span');
      label.className = 'marker-label';
      el.append(pulse, dot, label);
      renderLabel(el, c, [], isSeparableRef.current(c));
      const activate = (e: Event) => {
        e.stopPropagation();
        clusterClickRef.current(c);
      };
      el.addEventListener('click', activate);
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate(e);
        }
      });
      markerCache.current.set(c.id, el);
      return el;
    },
    [],
  );

  // Reflect selection on markers: highlight, and name the selected university even
  // when it shares a marker with neighbours.
  useEffect(() => {
    for (const c of clusters) {
      const el = markerCache.current.get(c.id);
      if (!el) continue;
      el.dataset.active = String(c.hubs.some((h) => selectedIds.includes(h.id)));
      renderLabel(el, c, selectedIds, isSeparable(c));
    }
  }, [clusters, selectedIds, isSeparable]);

  // Auto-rotation + interaction hooks on the orbit controls.
  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;
  }, [autoRotate]);

  const handleZoom = useCallback((pov: { altitude: number }) => {
    const b = Math.round(Math.log(pov.altitude) * 6);
    setAltBucket((prev) => (prev === b ? prev : b));
  }, []);

  const handleReady = useCallback(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.9;
    controls.minDistance = 100 * (1 + MIN_ALT);
    controls.maxDistance = 100 * (1 + MAX_ALT);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.35;
    controls.addEventListener('start', () => onInteractRef.current());
    g.pointOfView({ lat: 22, lng: 10, altitude: initialAlt }, 0);
    onReady?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 isolate z-0">
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        globeOffset={offset}
        backgroundColor="rgba(0,0,0,0)"
        globeMaterial={globeMaterial}
        showAtmosphere
        atmosphereColor="#d97757"
        atmosphereAltitude={0.2}
        onGlobeReady={handleReady}
        onZoom={handleZoom}
        // Land as a field of dots
        hexPolygonsData={landFeatures}
        hexPolygonResolution={3}
        hexPolygonMargin={0.42}
        hexPolygonUseDots
        hexPolygonColor={hexColor}
        hexPolygonAltitude={0.004}
        // Network arcs
        arcsData={arcs}
        arcColor={arcColor}
        arcStroke={0.35}
        arcAltitudeAutoScale={0.35}
        arcDashLength={0.4}
        arcDashGap={0.6}
        arcDashInitialGap={arcInitialGap}
        arcDashAnimateTime={4500}
        // Ripple under selected universities
        ringsData={selectedHubs}
        ringLat="lat"
        ringLng="lng"
        ringColor={ringColor}
        ringMaxRadius={3.2}
        ringPropagationSpeed={1.6}
        ringRepeatPeriod={1100}
        // Clickable markers
        htmlElementsData={clusters}
        htmlLat="lat"
        htmlLng="lng"
        htmlAltitude={0.012}
        htmlElement={makeMarker}
        htmlElementVisibilityModifier={markerVisibility}
        htmlTransitionDuration={0}
      />
    </div>
  );
});
