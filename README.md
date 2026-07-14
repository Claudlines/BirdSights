# BirdSights

A beginner-friendly bird discovery web application that helps birdwatchers quickly locate recent eBird reports of a selected bird species near a chosen location — and helps beginners discover birds even when they don't know any bird names.

> **Penn State IST 440W Capstone Project**

BirdSights is **not a replacement for eBird**. It is a lightweight discovery layer on top of eBird data.

**Live app:** [https://birdsights.vercel.app](https://birdsights.vercel.app)
**Backend API:** [https://birdsights-api.onrender.com](https://birdsights-api.onrender.com)
**GitHub:** [https://github.com/Claudlines/BirdSights](https://github.com/Claudlines/BirdSights)

---

## Project Overview

BirdSights answers questions like:
**"Has this bird been reported near me recently, and where?"** — and, for beginners — **"I don't know any birds. What birds are reported near me?"**

Users can:

1. **Standard search** — select a bird species, specify a location (manually or via GPS), choose a search radius and timeframe, and view recent eBird sighting locations on an interactive map;
2. **Ask BirdSights** — type a plain-English question and get a safely worded answer built from the same eBird data; or
3. **Explore Birds Near You** — enter a location (or use current location) and get a beginner-friendly list of birds recently reported nearby.

---

## Features

### Core search

- Bird species search with full eBird taxonomy autocomplete (when the backend API key is configured)
- Local fallback species list when taxonomy lookup is unavailable
- Bird thumbnails in autocomplete for curated species; "Pending" placeholders for birds without local images
- Selected bird reference image card on the results page (also shown when no sightings are found)
- Manual location search (city, ZIP code, park, address, landmark)
- GPS / current location detection
- Radius filtering: 5, 10, 25, 50 km
- Timeframe filtering: 7, 14, 30 days
- eBird API integration (recent nearby observations)
- Backend geocoding via OpenStreetMap Nominatim

### Map and results

- Interactive map (React Leaflet + OpenStreetMap tiles) with clickable pins
- **Map pins colored by report freshness** (returned report age — see below)
- Search radius boundary displayed on the map
- Map key explaining pin colors, selected location, and search radius boundary
- Recent eBird Sighting Locations list with checklist links and freshness badges
- SummaryPanel with nearby sighting locations and individuals in returned eBird reports
- Bird Activity Summary (recent activity label, most recent report, closest report, radius, timeframe)
- Newest/oldest sorting and pagination
- Saved searches stored locally in the browser using localStorage, with one-click rerun
- Search inputs preserved when returning from the results page
- Responsive layout (desktop + mobile), dark mode, BirdSights logo and favicon
- Balanced desktop landing layout — Explore Birds Near You (left), standard search + Ask BirdSights (center), Saved Searches (right) — stacking cleanly on mobile

### Explore Birds Near You (July 12 enhancement)

A beginner-focused discovery feature for users who do not know bird names.

- Enter a city, ZIP code, park, town, or address — or use current location — plus a radius (default 25 km) and timeframe (default last 30 days).
- BirdSights returns up to 10 birds recently reported nearby, organized into beginner-friendly categories:
  - **Frequently reported nearby** — 10+ returned report locations
  - **Occasionally reported nearby** — 3–9 returned report locations
  - **Notable or uncommon nearby** — reports flagged as notable by eBird
  - **Few recent reports** — 1–2 returned report locations
- Categories are based on **recent returned eBird data** — they do not measure true abundance or true rarity, and they do not guarantee any bird is currently present.
- Each suggested bird shows a local image when available, or a "Pending" placeholder.
- **"Search this bird"** opens the normal BirdSights results page (map, freshness pins, Bird Activity Summary) using the same location, radius, and timeframe.
- Bird selection is randomized within categories so repeat visits feel fresh.
- Powered by a new `GET /api/explore` endpoint with **short-term in-memory caching (about 10 minutes)** to reduce repeated eBird API calls. No database is used, and **EBD is not used** for this feature.

### Ask BirdSights (AI-assisted discovery agent)

A landing-page natural-language assistant. The backend uses the **OpenAI API only to interpret and route the question** — OpenAI never creates bird data. Each question is classified into one of four actions:

| Action | When it applies | Example |
|--------|-----------------|---------|
| `species_search` | A specific bird near a place | *"Have there been any Barn Owls in ZIP code 10468 recently?"* |
| `explore_location` | The user doesn't know bird names and wants suggestions | *"I don't know any birds. What birds are reported near me?"* |
| `explain_feature` | The user asks what an app feature means | *"What do the colored pins mean?"* |
| `clarification` | Incomplete, unrelated, or broad/ambiguous input | *"What birds are in New Jersey?"* |

How the answers work:

- **Species answers** show a structured card: nearby sighting locations, most recent returned report, closest returned report, top returned locations, a limitation note, "View map results", and quick actions ("Try 50 km", "Try last 7 days") that rerun without another OpenAI call.
- **Explore answers** show suggested birds with category labels, reasons, local images or "Pending" placeholders, and a per-bird "Search this bird" button — reusing the same backend logic as `/api/explore`.
- **Explanation answers** are deterministic, safely worded texts (freshness pin colors, category labels, and report limitations such as whether a bird is guaranteed to be present) — no eBird call is needed.
- **Current-location questions** ("near me", "my location") prompt a "Use my current location" button that uses browser geolocation.
- `POST /api/ask` is **rate-limited** (default 20 requests per 15 minutes per IP) to protect the paid OpenAI endpoint; exceeding it returns a friendly HTTP 429 message.
- **`OPENAI_API_KEY` is backend-only — never exposed to the frontend and never committed.** If it is not configured, Ask BirdSights returns a friendly "not configured" message and every other feature keeps working.
- The card includes an AI/data disclaimer: Ask BirdSights uses AI to interpret the question, then searches recent eBird data — verify important details with the linked eBird checklists.

### Broad-location clarification

Both the standard search form and Ask BirdSights detect broad or ambiguous locations — such as **New York, New Jersey, Pennsylvania, USA, Canada** — and ask the user for a more specific place instead of running a misleading single-point radius search. Detection uses a known state/province/country list plus Nominatim's own area classification.

Specific places still work normally: **New York City, Philadelphia, 10468, 19153, Cape May NJ, Central Park**, parks, addresses, and GPS/current location.

### Map pin freshness colors

Pins are colored by the age of the returned report:

| Pin color | Category | Returned report age |
|-----------|----------------|---------------------|
| Green     | Fresh report   | 0–7 days old        |
| Amber     | Recent report  | 8–14 days old       |
| Red       | Older report   | 15+ days old        |
| Blue      | Selected location | —                |

**These colors show how old the returned report is only. They do not indicate the likelihood that the bird is still present.** The map legend states this, and result cards show matching freshness badges. The selected marker turns blue, and the search radius boundary is drawn around the search center.

### Bird Activity Summary

The results page interprets recent returned eBird activity for the searched bird using safe labels based on the number of returned results: **No recent nearby reports** (0), **Rarely reported nearby** (1–2), **Occasionally reported nearby** (3–9), and **Frequently reported nearby** (10+). It also shows the most recent returned report, the closest returned report, the search radius, and the timeframe. These labels reflect recent returned eBird reports — not true abundance and not guaranteed presence.

---

## Technology Stack

| Layer    | Technology                                      |
|----------|-------------------------------------------------|
| Frontend | React 18, Vite 8, React Leaflet, CSS            |
| Backend  | Node.js ≥ 18, Express, node-fetch, express-rate-limit |
| AI       | OpenAI API (backend-only question interpretation) |
| Map      | Leaflet + OpenStreetMap tiles                   |
| Data     | eBird API v2, Nominatim Geocoding API           |
| Deploy   | Frontend → Vercel · Backend → Render            |

**Node.js 18 or newer is required.**

---

## Folder Structure

```
BirdSightsProject/
  .gitignore
  README.md
  client/
    package.json
    index.html
    vite.config.js
    .env.example
    src/
      main.jsx
      App.jsx
      api/
        searchApi.js
        askApi.js
        exploreApi.js
      components/
        AskBirdSights.jsx
        ExploreBirdsNearYou.jsx
        BirdAutocomplete.jsx
        BirdActivitySummary.jsx
        BirdImageCard.jsx
        SearchForm.jsx
        ResultsPage.jsx
        MapView.jsx
        SelectedReportPanel.jsx
        SavedSearchesPanel.jsx
        SummaryPanel.jsx
        ReportList.jsx
        LegendPanel.jsx
        ErrorMessage.jsx
        LoadingIndicator.jsx
      data/
        supportedBirds.js
      utils/
        activitySummary.js
        birdImages.js
        groupReports.js
        reportFreshness.js
        savedSearches.js
        sortReports.js
      styles/
        main.css
  server/
    package.json
    server.js
    .env.example
    routes/
      searchRoutes.js
      speciesRoutes.js
      askRoutes.js
      exploreRoutes.js
    services/
      ebirdService.js
      geocodingService.js
      taxonomyService.js
      openaiService.js
      exploreService.js
    utils/
      askExplanations.js
      broadLocations.js
      distance.js
      formatAskAnswer.js
      groupReports.js
      locationNames.js
      normalizeObservation.js
      sortReports.js
      validateSearchParams.js
```

---

## Backend API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health`  | GET  | Health check |
| `/api/species` | GET  | eBird taxonomy autocomplete search |
| `/api/search`  | GET  | Recent nearby eBird observations for a species |
| `/api/ask`     | POST | Ask BirdSights natural-language question with action routing (rate-limited) |
| `/api/explore` | GET  | Beginner bird suggestions near a location (short-term in-memory cache) |

---

## Required Environment Variables

### Backend (`server/.env`)

| Variable                         | Description                                                          |
|----------------------------------|----------------------------------------------------------------------|
| `EBIRD_API_KEY`                  | Your eBird API key (never commit this)                               |
| `PORT`                           | Port for local dev (default: 5000)                                   |
| `CLIENT_ORIGIN`                  | Allowed frontend origin for CORS                                     |
| `NOMINATIM_USER_AGENT`           | User-Agent header sent to Nominatim geocoder                         |
| `OPENAI_API_KEY`                 | OpenAI API key for Ask BirdSights (optional; never commit this)      |
| `OPENAI_MODEL`                   | OpenAI model name (optional; defaults to `gpt-4o-mini`)              |
| `ASK_RATE_LIMIT_WINDOW_MINUTES`  | Ask BirdSights rate-limit window (optional; default 15)              |
| `ASK_RATE_LIMIT_MAX`             | Max Ask BirdSights requests per window per IP (optional; default 20) |

### Frontend (`client/.env`)

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `VITE_API_BASE_URL` | Base URL of the Express backend          |

**Never place `EBIRD_API_KEY` or `OPENAI_API_KEY` in any `client/` file or commit them to GitHub.** Both `.env` files are gitignored; `.env.example` files contain placeholder names only.

---

## API Key Setup

### eBird API key

1. Obtain your eBird API key at [https://ebird.org/api/keygen](https://ebird.org/api/keygen).
2. Create `server/.env` (copy from `server/.env.example`).
3. Replace `your_ebird_api_key_here` with your real key.
4. For Render deployment: add `EBIRD_API_KEY` as a Render environment variable — **not** on Vercel.

If no key is configured, the backend returns:
```
The eBird API key is not configured. Please add EBIRD_API_KEY to the backend environment variables.
```

### OpenAI API key (Ask BirdSights)

1. Create an API key in your OpenAI account.
2. Add `OPENAI_API_KEY` to `server/.env` locally, and to Render environment variables for deployment.
3. Optionally set `OPENAI_MODEL` (defaults to `gpt-4o-mini`).
4. **The key must NOT be placed in any `client/` files or committed.**

Without the key, Ask BirdSights returns a friendly "not configured" message and every other feature keeps working.

---

## Local Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd BirdSightsProject
```

### 2. Backend setup

```bash
cd server
cp .env.example .env
# Edit server/.env and add your real EBIRD_API_KEY (and OPENAI_API_KEY for Ask BirdSights)
npm install
npm start
```

The backend runs on `http://localhost:5000`.

### 3. Frontend setup

In a separate terminal:

```bash
cd client
cp .env.example .env
# .env already points to http://localhost:5000 — no changes needed for local dev
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`.

### 4. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) in your browser.

---

## How to Run

### Backend

```bash
cd server
npm start          # production
npm run dev        # development (auto-restart on file changes, Node 18+)
```

### Frontend

```bash
cd client
npm run dev        # development server
npm run build      # production build
npm run preview    # preview production build locally
```

---

## Frontend API Base URL

The frontend reads `VITE_API_BASE_URL` from `client/.env`.

- **Local development:** `VITE_API_BASE_URL=http://localhost:5000`
- **Production (Vercel):** Set to your Render backend URL, e.g. `https://birdsights-api.onrender.com`

---

## CORS / CLIENT_ORIGIN Configuration

The backend's `CLIENT_ORIGIN` environment variable controls which frontend origin is allowed via CORS.

- **Local development:** `CLIENT_ORIGIN=http://localhost:5173`
- **Production (Render):** Set to your Vercel frontend URL, e.g. `https://birdsights.vercel.app`

This ensures the backend only accepts requests from the approved frontend origin.

---

## eBird Endpoints Used

All bird data comes from the **live eBird API v2** (no EBD downloads are used):

```
GET https://api.ebird.org/v2/data/obs/geo/recent/{speciesCode}   # per-species recent nearby (search, Ask, Explore counts)
GET https://api.ebird.org/v2/data/obs/geo/recent                 # all-species recent nearby (Explore species pool)
GET https://api.ebird.org/v2/data/obs/geo/recent/notable         # locally notable recent reports (Explore "Notable or uncommon nearby")
GET https://api.ebird.org/v2/ref/taxonomy/ebird                  # species taxonomy (autocomplete + name matching)
```

Common parameters:
- `lat`, `lng` — search center coordinates
- `dist` — radius in kilometers (max 50)
- `back` — 7, 14, or 30 days depending on the selected timeframe
- `maxResults=10000`
- `includeProvisional=false` (search endpoints)

Header: `x-ebirdapitoken: <EBIRD_API_KEY>`

---

## eBird Response Fields Used

| eBird Field      | App Field                 |
|------------------|---------------------------|
| `speciesCode`    | `speciesCode`             |
| `comName`        | `commonName`              |
| `sciName`        | `scientificName`          |
| `locId`          | `locationId`              |
| `locName`        | `locationName`            |
| `obsDt`          | `observationDateTime`     |
| `howMany`        | `numberObserved`          |
| `lat`, `lng`     | `latitude`, `longitude`   |
| `obsValid`       | `observationValid`        |
| `obsReviewed`    | `observationReviewed`     |
| `locationPrivate`| `locationPrivate`         |
| `subId`          | `checklistSubmissionId`   |

Checklist URL: `https://ebird.org/checklist/{subId}` (only when `subId` is present)

---

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Set **Root Directory** to `client`.
4. Add environment variable:
   - `VITE_API_BASE_URL` = your Render backend URL
5. Deploy.

**Do NOT add `EBIRD_API_KEY` or `OPENAI_API_KEY` to Vercel.**

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com).
2. Set **Root Directory** to `server`.
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Add environment variables:
   - `EBIRD_API_KEY` = your real eBird API key
   - `CLIENT_ORIGIN` = your Vercel frontend URL (e.g. `https://birdsights.vercel.app`)
   - `NOMINATIM_USER_AGENT` = `BirdSights/1.0 student-capstone-project`
   - `OPENAI_API_KEY` = your OpenAI API key (for Ask BirdSights)
   - `OPENAI_MODEL` = optional model override
   - `ASK_RATE_LIMIT_WINDOW_MINUTES` / `ASK_RATE_LIMIT_MAX` = optional rate-limit overrides
6. Do NOT set `PORT` — Render provides it automatically via `process.env.PORT`.

The backend sets `trust proxy` for Render so the rate limiter sees real client IPs.

---

## Important Limitations

- **BirdSights uses live eBird API recent report data.** It shows the most recent returned eBird report for a bird at each returned location within the selected timeframe.
- It does not show every checklist from each location.
- It does not prove true abundance.
- It does not prove true rarity — Explore categories and activity labels describe report frequency in recent returned data only.
- It does not guarantee the bird is currently present.
- Broad/statewide search is not fully supported yet — the live app is radius-based, so broad locations trigger a clarification instead of a search.
- Map pin colors and freshness badges reflect returned report age only, not sighting likelihood.
- The app depends on public eBird API availability and rate limits.
- **OpenAI is used to interpret questions and route actions in Ask BirdSights. It does not create bird data** — all sighting data comes from eBird.
- **EBD historical analytics are not included in the July 12 live implementation** (see Future Work).
- Timeframes are preset recent windows (7, 14, 30 days), not custom date ranges.
- The curated bird image library includes a starter set of species; other species display a "Pending" placeholder.
- Saved searches are stored locally in the browser and are not synced across devices.
- Nominatim geocoding is public and rate-limited, suitable for a student prototype.
- There are no user accounts, no database, and user questions are not stored.

---

## Future Work

### Planned EBD (eBird Basic Dataset) expansion

EBD historical analytics are planned as a future expansion. Download requests have been submitted for **Pennsylvania, New York, New Jersey, and the Bahamas**. Once the downloads are available, BirdSights could add historical analytics such as:

- Seasonal reporting patterns
- Monthly activity trends
- Historical context for recent reports
- Regional comparisons
- Broader historical bird activity summaries

**EBD is not used in the current July 12 live implementation** — every feature runs on the live eBird API.

### Other future ideas

- True region/statewide search using appropriate eBird region data
- Full checklist-history analysis
- More formal birder usability testing
- Expanded bird image library
- More advanced seasonal trend analysis
