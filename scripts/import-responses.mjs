#!/usr/bin/env node
// Imports sign-up form responses into src/data/ambassadors.json, then geocodes new universities.
//
// Usage:
//   npm run import -- responses.xlsx --replace         # build the list from these responses only
//   npm run import -- responses.csv                    # merge into the existing list
//   npm run import -- "https://docs.google.com/spreadsheets/d/e/<ID>/pub?output=csv"
//   npm run import -- responses.xlsx --approved-only   # only rows whose "Approved" column is yes/true/x
//
// Microsoft Forms: Responses → Open results in Excel → use the downloaded .xlsx as is.
// Google Forms: link the form to a Sheet, then File → Download → CSV (or Publish to web → CSV).
// Columns are matched by header keywords, so question wording can vary (see FIELDS below).
// When merging, existing ambassadors are matched by email (or name + university) and updated in place.
// Rows that leave a consent question (header containing "agree"/"consent") blank are skipped.
import { readFile, writeFile } from 'node:fs/promises';
import { readSheet } from 'read-excel-file/node';
import { spawnSync } from 'node:child_process';

const AMBASSADORS = new URL('../src/data/ambassadors.json', import.meta.url);

const FIELDS = {
  name: [/full name/i, /^name/i, /your name/i],
  university: [/universit/i, /college/i, /school/i, /institution/i],
  email: [/e-?mail/i],
  role: [/role/i, /position/i, /title/i],
  field: [/course/i, /degree/i, /program/i, /study/i, /major/i, /subject/i],
  linkedin: [/linkedin/i],
  github: [/github/i],
  website: [/website/i, /portfolio/i, /personal (site|page)/i],
  bio: [/bio/i, /about/i, /introduc/i],
  approved: [/approv/i, /publish/i],
};

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
// Placeholder answers people type into optional questions count as blank.
const PLACEHOLDER = /^(n\/?a|none|nil|null|no|-+|\.+|—)$/i;
const clean = (s) => {
  const v = (s ?? '').trim().replace(/\s+/g, ' ');
  return PLACEHOLDER.test(v) ? '' : v;
};

const args = process.argv.slice(2);
const source = args.find((a) => !a.startsWith('--'));
const approvedOnly = args.includes('--approved-only');
const replace = args.includes('--replace');
if (!source) {
  console.error('Usage: npm run import -- <responses.xlsx | responses.csv | published CSV URL> [--replace] [--approved-only]');
  process.exit(1);
}

async function loadRows(src) {
  if (/\.xlsx$/i.test(src)) {
    const data = await readSheet(src);
    return data.map((row) => row.map((v) => (v == null ? '' : v instanceof Date ? v.toISOString() : String(v))));
  }
  const text = /^https?:\/\//.test(src) ? await (await fetch(src)).text() : await readFile(src, 'utf8');
  return parseCsv(text.replace(/^\uFEFF/, ''));
}

const [header, ...rows] = (await loadRows(source)).filter((r) => r.some((c) => c.trim()));
if (!header) {
  console.error('No rows found in', source);
  process.exit(1);
}
// Columns the form tools add themselves. Microsoft Forms puts the respondent's account
// "Name"/"Email" (often "anonymous") before the questions, so prefer question columns.
const METADATA = /^(id|start time|completion time|last modified time|timestamp|name|email|total points|quiz feedback)$/i;
// A consent question like "I agree to my name and email being shown" must not match those fields.
const CONSENT = /agree|consent/i;
const col = {};
for (const [key, patterns] of Object.entries(FIELDS)) {
  const candidates = header
    .map((h, i) => ({ h: h.trim(), i }))
    .filter(({ h, i }) => patterns.some((p) => p.test(h)) && !Object.values(col).includes(i))
    .filter(({ h }) => key === 'approved' || !CONSENT.test(h));
  const pick = candidates.find(({ h }) => !METADATA.test(h)) ?? candidates[candidates.length - 1];
  if (pick) col[key] = pick.i;
}
for (const required of ['name', 'university']) {
  if (col[required] === undefined) {
    console.error(`Could not find a "${required}" column. Headers were:\n  ${header.join('\n  ')}`);
    process.exit(1);
  }
}
console.log('Column mapping:', Object.fromEntries(Object.entries(col).map(([k, i]) => [k, header[i]])));

const consentCol = header.findIndex((h) => CONSENT.test(h));
const ambassadors = replace ? [] : JSON.parse(await readFile(AMBASSADORS, 'utf8'));
let added = 0, updated = 0, skipped = 0;

for (const r of rows) {
  const get = (k) => (col[k] === undefined ? '' : clean(r[col[k]]));
  if (approvedOnly && !/^(y|yes|true|x|✓|approved)$/i.test(get('approved'))) { skipped++; continue; }
  if (consentCol !== -1 && !clean(r[consentCol])) { skipped++; continue; }
  const name = get('name'), university = get('university');
  if (!name || !university) { skipped++; continue; }

  const entry = { id: slug(name), name, university };
  for (const k of ['role', 'field', 'email', 'linkedin', 'github', 'website', 'bio']) if (get(k)) entry[k] = get(k);

  const i = ambassadors.findIndex((a) =>
    entry.email ? a.email?.toLowerCase() === entry.email.toLowerCase() : a.name === name && a.university === university,
  );
  if (i === -1) {
    let id = entry.id, n = 2;
    while (ambassadors.some((a) => a.id === id)) id = `${entry.id}-${n++}`;
    ambassadors.push({ ...entry, id });
    added++;
  } else {
    ambassadors[i] = { ...ambassadors[i], ...entry, id: ambassadors[i].id };
    updated++;
  }
}

await writeFile(AMBASSADORS, JSON.stringify(ambassadors, null, 2) + '\n');
console.log(
  `\n${replace ? 'Replaced the list with' : 'Added'} ${added}${replace ? ' ambassadors' : `, updated ${updated}`}, skipped ${skipped}. Now geocoding any new universities…\n`,
);
spawnSync(process.execPath, [new URL('./geocode.mjs', import.meta.url).pathname], { stdio: 'inherit' });
