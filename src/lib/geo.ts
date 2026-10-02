import type { Cluster, UniversityHub } from '../types';

const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Great-circle distance in degrees of arc. */
export function arcDistance(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return toDeg(2 * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** Spherical centroid of points, so clusters straddling the antimeridian stay correct. */
function centroid(points: { lat: number; lng: number }[]) {
  let x = 0, y = 0, z = 0;
  for (const p of points) {
    const la = toRad(p.lat), lo = toRad(p.lng);
    x += Math.cos(la) * Math.cos(lo);
    y += Math.cos(la) * Math.sin(lo);
    z += Math.sin(la);
  }
  return { lat: toDeg(Math.atan2(z, Math.hypot(x, y))), lng: toDeg(Math.atan2(y, x)) };
}

/**
 * Greedy clustering: universities closer than `radiusDeg` share one marker.
 * The caller derives the radius from how many screen pixels a degree spans at the
 * current zoom, so markers merge exactly when they would visually overlap.
 */
export function clusterHubs(hubs: UniversityHub[], radiusDeg: number): Cluster[] {
  const sorted = [...hubs].sort((a, b) => b.ambassadors.length - a.ambassadors.length);
  const groups: UniversityHub[][] = [];
  const seeds: UniversityHub[] = [];
  for (const hub of sorted) {
    const i = seeds.findIndex((s) => arcDistance(s.lat, s.lng, hub.lat, hub.lng) < radiusDeg);
    if (i === -1) {
      seeds.push(hub);
      groups.push([hub]);
    } else {
      groups[i].push(hub);
    }
  }
  return groups.map((g) => {
    const c = g.length === 1 ? g[0] : centroid(g);
    return {
      id: g.map((h) => h.id).sort().join('+'),
      lat: c.lat,
      lng: c.lng,
      hubs: g,
      count: g.reduce((n, h) => n + h.ambassadors.length, 0),
    };
  });
}

/** Smallest distance between any two of the given hubs, in degrees. */
export function minPairDistance(hubs: UniversityHub[]) {
  let min = Infinity;
  for (let i = 0; i < hubs.length; i++)
    for (let j = i + 1; j < hubs.length; j++)
      min = Math.min(min, arcDistance(hubs[i].lat, hubs[i].lng, hubs[j].lat, hubs[j].lng));
  return min;
}
