# BirdsNearMe

A lightweight birding web application that helps birdwatchers quickly locate recent eBird reports of a selected bird species near a chosen location.

> **Penn State IST 440W Capstone Project**

---

## Project Overview

BirdsNearMe acts as a discovery layer on top of eBird, answering the question:
**"Where have people recently reported this bird near me?"**

Users select a bird species, specify a location (manually or via GPS), choose a search radius, and view recent eBird observation reports on an interactive map.

---

## MVP Features

- Bird species autocomplete (full eBird taxonomy when API key is configured; 10 demo species as fallback)
- Manual location search (address, ZIP, city/state, landmark)
- GPS / current location detection
- Radius filtering: 5, 10, 25, 50 km
- eBird API integration (recent nearby observations)
- Backend geocoding via OpenStreetMap Nominatim
- Interactive map (React Leaflet + OpenStreetMap tiles)
- Search radius circle overlay
- Hotspot/location grouping (deduplicated by default)
- "Show All Individual Reports" toggle
- Selected report detail panel
- Recent report locations list with checklist links
- Responsive layout (desktop + mobile)

---

## Technology Stack

| Layer    | Technology                                |
|----------|-------------------------------------------|
| Frontend | React 18, Vite 8, React Leaflet, CSS      |
| Backend  | Node.js ≥ 18, Express, node-fetch         |
| Map      | Leaflet + OpenStreetMap tiles             |
| Data     | eBird API v2, Nominatim Geocoding API     |
| Deploy   | Frontend → Vercel · Backend → Render      |

**Node.js 18 or newer is required.**

---

## Folder Structure

```
BirdsNearMeProject/
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
      components/
        BirdAutocomplete.jsx
        SearchForm.jsx
        ResultsPage.jsx
        MapView.jsx
        SelectedReportPanel.jsx
        ReportList.jsx
        LegendPanel.jsx
        ErrorMessage.jsx
        LoadingIndicator.jsx
      data/
        supportedBirds.js
      styles/
        main.css
  server/
    package.json
    server.js
    .env.example
    routes/
      searchRoutes.js
    services/
      ebirdService.js
      geocodingService.js
    utils/
      distance.js
      groupReports.js
      sortReports.js
      normalizeObservation.js
      validateSearchParams.js
```

---

## Required Environment Variables

### Backend (`server/.env`)

| Variable               | Description                                         |
|------------------------|-----------------------------------------------------|
| `EBIRD_API_KEY`        | Your eBird API key (never commit this)              |
| `PORT`                 | Port for local dev (default: 5000)                 |
| `CLIENT_ORIGIN`        | Allowed frontend origin for CORS                   |
| `NOMINATIM_USER_AGENT` | User-Agent header sent to Nominatim geocoder        |

### Frontend (`client/.env`)

| Variable            | Description                              |
|---------------------|------------------------------------------|
| `VITE_API_BASE_URL` | Base URL of the Express backend          |

---

## eBird API Key Setup

1. Obtain your eBird API key at [https://ebird.org/api/keygen](https://ebird.org/api/keygen).
2. Create `server/.env` (copy from `server/.env.example`).
3. Replace `your_ebird_api_key_here` with your real key.
4. **The key must NOT be placed in any `client/` files.**
5. **The key must NOT be committed to GitHub.** (`server/.env` is gitignored.)
6. The Express backend uses the key when calling eBird.
7. For Render deployment: add `EBIRD_API_KEY` as a Render environment variable — **not** on Vercel.

If no key is configured, the backend returns:
```
The eBird API key is not configured. Please add EBIRD_API_KEY to the backend environment variables.
```

---

## Local Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd BirdsNearMeProject
```

### 2. Backend setup

```bash
cd server
cp .env.example .env
# Edit server/.env and add your real EBIRD_API_KEY
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
- **Production (Vercel):** Set to your Render backend URL, e.g. `https://birdsnearme-api.onrender.com`

---

## CORS / CLIENT_ORIGIN Configuration

The backend's `CLIENT_ORIGIN` environment variable controls which frontend origin is allowed via CORS.

- **Local development:** `CLIENT_ORIGIN=http://localhost:5173`
- **Production (Render):** Set to your Vercel frontend URL, e.g. `https://birdsnearme.vercel.app`

This ensures the backend only accepts requests from the approved frontend origin.

---

## eBird Endpoint Used

```
GET https://api.ebird.org/v2/data/obs/geo/recent/{speciesCode}
```

Parameters:
- `lat`, `lng` — search center coordinates
- `dist` — radius in kilometers (max 50)
- `back=30` — reports from the last 30 days
- `maxResults=100`
- `includeProvisional=false`

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

## eBird Report-Count Limitation

The eBird geo/recent species endpoint may already return only the **most recent observation per location**. Therefore:

- `reportCountAtLocation` reflects only the records actually returned by the API, not all real-world sightings at that hotspot.
- `additionalReturnedReports` = `reportCountAtLocation - 1`.
- `numberObserved` (from eBird's `howMany`) is the count from that specific report/checklist, not a total count of all birds ever seen there.
- Grouped mode and individual mode may look similar because the API already deduplicates by location.

The UI labels these values clearly as "Returned" values, not "All Real-World" values.

---

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. Import the project on [vercel.com](https://vercel.com).
3. Set **Root Directory** to `client`.
4. Add environment variable:
   - `VITE_API_BASE_URL` = your Render backend URL
5. Deploy.

**Do NOT add `EBIRD_API_KEY` to Vercel.**

### Backend → Render

1. Create a new **Web Service** on [render.com](https://render.com).
2. Set **Root Directory** to `server`.
3. Set **Build Command:** `npm install`
4. Set **Start Command:** `npm start`
5. Add environment variables:
   - `EBIRD_API_KEY` = your real eBird API key
   - `CLIENT_ORIGIN` = your Vercel frontend URL (e.g. `https://birdsnearme.vercel.app`)
   - `NOMINATIM_USER_AGENT` = `BirdsNearMe/1.0 student-capstone-project`
6. Do NOT set `PORT` — Render provides it automatically via `process.env.PORT`.

---

## Known MVP Limitations

- No user accounts or saved searches
- No weather integration
- No AI recommendations or migration forecasting
- Species autocomplete uses full eBird taxonomy (11 000+ species) when the API key is configured, and falls back to 10 demo species when the taxonomy is unavailable
- eBird nearby species observations may already return only the most recent report per location
- "Reports Returned At This Location" reflects only records returned by the eBird endpoint, not all real-world reports
- "Number Observed In Latest Report" comes from eBird's `howMany` field and does not represent a total sighting count
- Grouped mode and individual mode may look similar due to eBird's endpoint behavior
- Nominatim geocoding is public and rate-limited — suitable for a small student demo
- The app depends on eBird public observation data which may be incomplete or delayed
- The app does not guarantee a bird is currently present at any location

---

## Future Enhancement Ideas

- Full eBird taxonomy lookup for complete species autocomplete
- Bird photos via Flickr / Macaulay Library
- AI assistant for interpreting eBird results
- Weather context for planned birding trips
- Saved searches and favorites
- Advanced filtering (date range, observer count, rarity flags)
- Optional checklist detail view for a single user-selected report
- Optional hotspot enrichment via eBird hotspot info endpoint
- Improved mobile UX
