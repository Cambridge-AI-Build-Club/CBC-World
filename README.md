# Claude Ambassadors · World Map

An interactive 3D globe showing where Claude Ambassadors are around the world. Ambassadors are placed by **university**, not by personal location. Click a university to see who's there and how to contact them.

**Stack:** Vite · React 18 · TypeScript · [react-globe.gl](https://github.com/vasturiano/react-globe.gl) (three.js / WebGL) · Tailwind CSS · Framer Motion

## Quick start

```bash
npm install
cp .env.example .env     # then paste your form's embed URL (see below)
npm run dev              # http://localhost:5173
npm run build            # static site in dist/
```

The output is a fully static site, so no server is needed.

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`. It detects the right base path automatically, so it works for `<user>.github.io/<repo>/`, `<user>.github.io`, and custom domains.

One-time setup:

1. Create an empty repository on GitHub and push this project to it (see the commands below).
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Optional: to use a different form than the one in `src/config.ts`, add `VITE_FORM_EMBED_URL` under **Settings → Secrets and variables → Actions → Variables**.
4. Push to `main` and watch the **Actions** tab. The site appears at `https://<user>.github.io/<repo>/`.

```bash
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/<user>/<repo>.git
git push -u origin main
```

After that, updating the map is: run `npm run import`, commit the changed JSON files, and push.

## Features

- A globe you can rotate and zoom (drag, scroll or pinch, plus on-screen controls). Land is drawn as a dot field and the atmosphere glows in Claude's coral.
- Markers cluster by zoom level: nearby universities merge into one numbered pin when you zoom out and split apart as you zoom in. Clicking a cluster zooms in on it.
- A searchable directory grouped by country. Press <kbd>/</kbd> to search by university, city or ambassador name.
- An ambassador panel with name, role, course, a copyable email, and LinkedIn, GitHub and website links. Ambassadors who give a GitHub handle get their GitHub avatar.
- A **Join the map** dialog that embeds a Google Form or Microsoft Form.
- An animated Clawd logo walking on a spinning pixel-art globe. The continents come from Natural Earth data.
- A responsive layout with bottom sheets on mobile. The site respects `prefers-reduced-motion`.

## Connecting the sign-up form

The form is set in `src/config.ts` (`DEFAULT_FORM_LINK`). To switch forms, change it there, or override it with `VITE_FORM_EMBED_URL` in `.env` or as a GitHub Actions variable:

| Provider | Where to find the embed URL | Looks like |
|---|---|---|
| Google Forms | **Send** → `< >` tab → copy the `src="…"` value | `https://docs.google.com/forms/d/e/<ID>/viewform?embedded=true` |
| Microsoft Forms | **Collect responses** → **Embed** → copy the `src="…"` value | `https://forms.office.com/Pages/ResponsePage.aspx?id=<ID>&embed=true` |

Essential questions (titles in bold; the import script matches on these words):

1. **Full name**
2. **University**, with the subtitle "Full official name, e.g. University of Cambridge". This keeps one university from turning into several pins.
3. **Email**, shown publicly as the contact method
4. **Consent**: "I agree to my name, university, email and any links being shown publicly on the map." Make it required.

Optional extras: **LinkedIn**, and **Role** (a Choice question, e.g. Campus Ambassador or Builder Club Lead). The script also understands **GitHub**, **Website**, **Course** and **Bio** if you add them later.

For Microsoft Forms, set **Settings → Who can fill out this form** to **Anyone can respond**. The extra Name and Email columns Microsoft adds to the export are ignored automatically.

## Updating the map

Ambassador data lives in two files:

- `src/data/ambassadors.json` holds the people. Each person's `university` must match a key in `universities.json`.
- `src/data/universities.json` maps each university name to its city, country and coordinates.

### From form responses (recommended)

1. Download the responses.
   - Microsoft Forms: **Responses → Open results in Excel**. Use the downloaded `.xlsx` as is.
   - Google Forms: link the form to a Sheet, then **File → Download → CSV**.
2. Optional: add an **Approved** column in the spreadsheet and put `yes` next to the rows you've reviewed.
3. Build the list from the responses:

   ```bash
   npm run import -- ~/Downloads/responses.xlsx --replace
   ```

   - `--replace` rebuilds the list from this file only. This also removes the sample data. Leave it out to merge into the existing list instead.
   - `--approved-only` imports only the rows marked `yes` in the Approved column.
   - Rows with an empty consent answer are always skipped. New universities are geocoded automatically.
4. Preview with `npm run dev`, then commit `src/data/` and push. GitHub Actions rebuilds and redeploys the site.

The form's export always contains every response so far, so running with `--replace` each time keeps the site exactly in sync with the form.

### By hand

Add an entry to `ambassadors.json`. If the university is new, run `npm run geocode` to look up its coordinates with OpenStreetMap Nominatim, or add it to `universities.json` yourself.

```json
{
  "id": "ada-lovelace",
  "name": "Ada Lovelace",
  "university": "University of Cambridge",
  "role": "Claude Campus Ambassador",
  "field": "MPhil Advanced Computer Science",
  "email": "ada@example.com",
  "linkedin": "https://www.linkedin.com/in/…",
  "github": "ada",
  "website": "ada.dev",
  "bio": "Runs the weekly Claude build night."
}
```

> **Note:** The ambassadors that ship with this repo are fictional sample data with `example.com` emails. Your first `npm run import -- <file> --replace` removes them.

## Privacy

Contact details shown on the site are public. Only publish what ambassadors have explicitly agreed to share. The `--approved-only` import flag lets you review each submission before it appears.

## Project layout

```
src/
  App.tsx                 layout, selection state, camera moves
  components/
    GlobeView.tsx         the 3D globe: dot-land, arcs, rings, clustered HTML markers
    ClawdLogo.tsx         animated Clawd-on-a-globe SVG
    Directory.tsx         searchable university list
    DetailPanel.tsx       ambassadors at the selected university
    AmbassadorCard.tsx    one ambassador's contact card
    JoinModal.tsx         embedded sign-up form
  lib/
    data.ts               joins ambassadors with university coordinates
    geo.ts                great-circle maths and zoom-aware clustering
scripts/
  import-responses.mjs    CSV → ambassadors.json
  geocode.mjs             university name → coordinates (Nominatim)
```
