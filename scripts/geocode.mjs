#!/usr/bin/env node
// Looks up coordinates for every university in src/data/ambassadors.json that is
// missing from src/data/universities.json, using OpenStreetMap Nominatim.
// Usage: npm run geocode
import { readFile, writeFile } from 'node:fs/promises';

const AMBASSADORS = new URL('../src/data/ambassadors.json', import.meta.url);
const UNIVERSITIES = new URL('../src/data/universities.json', import.meta.url);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function lookup(name) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: name, format: 'jsonv2', limit: '5', addressdetails: '1', 'accept-language': 'en' });
  const res = await fetch(url, { headers: { 'User-Agent': 'claude-ambassadors-world-map/1.0 (geocoding university names)' } });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const results = await res.json();
  // Prefer results tagged as universities / colleges.
  const hit = results.find((r) => ['university', 'college'].includes(r.type) || r.category === 'amenity') ?? results[0];
  if (!hit) return null;
  const a = hit.address ?? {};
  return {
    city: a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? a.state ?? '',
    country: a.country ?? '',
    lat: Number(Number(hit.lat).toFixed(4)),
    lng: Number(Number(hit.lon).toFixed(4)),
  };
}

const ambassadors = JSON.parse(await readFile(AMBASSADORS, 'utf8'));
const universities = JSON.parse(await readFile(UNIVERSITIES, 'utf8'));
const missing = [...new Set(ambassadors.map((a) => a.university))].filter((u) => u && !universities[u]);

if (!missing.length) {
  console.log('✓ Every university already has coordinates.');
  process.exit(0);
}

let failed = 0;
for (const name of missing) {
  try {
    const info = await lookup(name);
    if (info) {
      universities[name] = info;
      console.log(`✓ ${name} → ${info.city}, ${info.country} (${info.lat}, ${info.lng})`);
    } else {
      failed++;
      console.warn(`✗ ${name}: no match. Add it to src/data/universities.json by hand.`);
    }
  } catch (err) {
    failed++;
    console.warn(`✗ ${name}: ${err.message}`);
  }
  await sleep(1100); // Nominatim usage policy: max 1 request per second
}

const sorted = Object.fromEntries(Object.entries(universities).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(UNIVERSITIES, JSON.stringify(sorted, null, 2) + '\n');
console.log(`\nSaved ${missing.length - failed} new location(s). Please spot-check them on the map.`);
if (failed) process.exitCode = 1;
