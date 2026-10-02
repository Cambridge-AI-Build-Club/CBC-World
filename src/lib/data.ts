import ambassadorsJson from '../data/ambassadors.json';
import universitiesJson from '../data/universities.json';
import type { Ambassador, UniversityHub, UniversityInfo } from '../types';

const universities = universitiesJson as Record<string, UniversityInfo>;
const ambassadors = ambassadorsJson as Ambassador[];

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

function buildHubs(): UniversityHub[] {
  const byName = new Map<string, UniversityHub>();
  for (const a of ambassadors) {
    const info = universities[a.university];
    if (!info) {
      console.warn(`[ambassadors] No coordinates for "${a.university}". Run \`npm run geocode\`.`);
      continue;
    }
    let hub = byName.get(a.university);
    if (!hub) {
      hub = { id: slugify(a.university), name: a.university, ...info, ambassadors: [] };
      byName.set(a.university, hub);
    }
    hub.ambassadors.push(a);
  }
  for (const hub of byName.values()) hub.ambassadors.sort((x, y) => x.name.localeCompare(y.name));
  return [...byName.values()].sort((x, y) => y.ambassadors.length - x.ambassadors.length || x.name.localeCompare(y.name));
}

export const hubs = buildHubs();

export const stats = {
  ambassadors: hubs.reduce((n, h) => n + h.ambassadors.length, 0),
  universities: hubs.length,
  countries: new Set(hubs.map((h) => h.country)).size,
};
