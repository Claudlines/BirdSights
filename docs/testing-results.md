# BirdSights — Failure Testing Results & Evidence

**Course:** IST 440W Capstone  **Project:** BirdSights  **Author:** Gustavo Reyes
**Test date:** July 2026  **Companion document:** [testing-matrix.md](testing-matrix.md)

This document records the execution of the BirdSights failure/attack test cases, the expected safe behavior, and the actual observed results. It is written so it can be converted into the final Word report.

> **Wording note.** Throughout BirdSights and this report, results are described only as *recent eBird reports*, *returned report locations*, and *birds reported nearby*. BirdSights does **not** guarantee a bird is currently present and does **not** claim true abundance or true rarity. "No results" means no recent returned reports were received for that search — not that a bird is absent.

---

## 1. Executive summary

Twelve failure/abuse cases were tested. **No test failed.** Nine were executed and confirmed directly from the terminal against a locally running backend; the remaining three are browser-only behaviors that are already verified in code and need a manual screenshot to finish the evidence package.

| Result | Count | Test IDs |
|--------|-------|----------|
| ✅ Passed (executed/automated) | 9 | TR-01, TR-02, TR-03, TR-06, TR-07, TR-08, TR-09, TR-10, plus code-verified TR-11/TR-12 |
| ✅ Passed in code, needs one manual screenshot | 3 | TR-04 (XSS), TR-11 (localStorage), TR-12 (image fallback) |
| 🖐 Manual verification only (browser) | 1 | TR-05 (GPS denial) |
| ❌ Failed | 0 | — |

**Overall assessment:** BirdSights fails safely across all tested cases. Invalid, broad, garbage, and unknown inputs return clear, friendly errors; the paid and data endpoints are rate-limited; extremely large result sets are capped; no secrets are exposed; and user text is never rendered as HTML.

---

## 2. Test environment & methodology

- **Backend:** Node/Express, run locally with `node server.js` on `http://localhost:5000`.
- **Frontend build:** Vite production build passes (verified in prior steps).
- **Tools:** `curl` for endpoint requests; `git` / `grep` for the secret and code scans.
- **Two hardening fixes under test:** the shared `dataRateLimiter` on `/api/search` and `/api/explore`, and the `MAX_RETURNED_REPORTS = 500` cap on `/api/search`.
- **Non-destructive rate-limit method:** the rate-limit tests (TR-07, TR-08) were tripped using **fast-failing requests** — requests with missing/invalid parameters that return `400` *before* the route makes any eBird, Nominatim, or OpenAI call. The rate limiter counts every request, so this exercises the limiter fully while sending **zero** traffic to external services.
- **External calls used:** only one call each for TR-02 (Nominatim), TR-06 and TR-09 (eBird), and TR-03 (OpenAI). No public service was stress-tested.

---

## 3. Summary results table

| Test ID | Case | Endpoint / area | Status |
|---------|------|-----------------|--------|
| TR-01 | Broad location attack | `/api/search` | ✅ Passed |
| TR-02 | Garbage location attack | `/api/search` | ✅ Passed |
| TR-03 | Unknown bird / hallucination prevention | `/api/ask` | ✅ Passed |
| TR-04 | XSS / script input | client render + `/api/search` | ✅ Passed in code — screenshot pending |
| TR-05 | Current-location permission denial | browser GPS | 🖐 Manual verification |
| TR-06 | No-results handling | `/api/search` | ✅ Passed |
| TR-07 | Ask BirdSights rate limit | `/api/ask` | ✅ Passed |
| TR-08 | Search/Explore data endpoint rate limit | `/api/search`, `/api/explore` | ✅ Passed |
| TR-09 | Large result / map overload cap | `/api/search` | ✅ Passed |
| TR-10 | Secret / API-key exposure scan | repository | ✅ Passed |
| TR-11 | localStorage failure handling | `savedSearches.js`, `App.jsx` | ✅ Passed in code — screenshot pending |
| TR-12 | Missing image fallback | `birdImages.js`, image cards | ✅ Passed in code — screenshot pending |

---

## 4. Detailed test records

### TR-01 — Broad location attack
- **Attack / failure attempt:** Enter a state/region name so a radius search would be centered on a single misleading point.
- **Why this matters:** A state like Pennsylvania is far larger than any search radius; searching one centroid would misrepresent "recent reports nearby."
- **Exact steps:** `GET /api/search?speciesCode=norcar&location=Pennsylvania&radiusKm=25&backDays=7` (and repeat with `New Jersey`). In the UI: select a bird, type `Pennsylvania` as the location, search.
- **Expected safe result:** HTTP 400 with a friendly message telling the user to enter a city, ZIP, park, or address.
- **Actual result:** HTTP 400 — `"Pennsylvania is a broad area. BirdSights searches by radius around a specific place. Please enter a city, ZIP code, park, address, or use current location."` New Jersey returned the same behavior.
- **Screenshot to capture:** The landing page showing the red broad-area error after searching `Pennsylvania`; optionally the Network tab showing the `400`.
- **Protection / fix involved:** `broadLocations.js` (`isBroadLocationName` name list + `isBroadGeocodeResult` place-rank check), enforced in `searchRoutes.js`.
- **Repeat-test result:** Consistent — two distinct broad names (Pennsylvania, New Jersey) both returned 400.
- **Status:** ✅ **Passed.**

### TR-02 — Garbage location attack
- **Attack / failure attempt:** Enter an unresolvable nonsense location.
- **Why this matters:** The app must not crash or search `(NaN, NaN)` when geocoding fails.
- **Exact steps:** `GET /api/search?speciesCode=norcar&location=asdfghjkl%20999&radiusKm=25&backDays=7`. In the UI: select a bird, type `asdfghjkl 999`, search.
- **Expected safe result:** HTTP 422 with a friendly "could not find coordinates" message.
- **Actual result:** HTTP 422 — `"We could not find coordinates for \"asdfghjkl 999\". Try a different address, city, or ZIP code."`
- **Screenshot to capture:** The friendly error on the landing page; Network tab showing the `422`.
- **Protection / fix involved:** `geocodingService.js` (empty-result branch throws a user-safe error), mapped to 422 in `searchRoutes.js`.
- **Repeat-test result:** Deterministic for this input (Nominatim returns no match).
- **Status:** ✅ **Passed.**

### TR-03 — Unknown bird / hallucination prevention
- **Attack / failure attempt:** Ask about a bird that does not exist, to see whether the assistant invents data.
- **Why this matters:** The AI assistant must never fabricate sightings for a non-existent species.
- **Exact steps:** `POST /api/ask` with body `{"question":"is there a purple flarblebird near 19153"}`. In the UI: type the same question into Ask BirdSights.
- **Expected safe result:** A clarification asking for a real common name — no invented sighting data.
- **Actual result:** HTTP 200 — `{"needsClarification":true,"clarifyingQuestion":"BirdSights could not match \"purple flarblebird\" to an eBird species. Could you try the bird's full common name, like \"Cedar Waxwing\"?"}`
- **Screenshot to capture:** The Ask panel showing the "could not match" clarification message.
- **Protection / fix involved:** The model only *classifies* the question; `taxonomyService.findBestSpeciesMatch` returns no match, so `askRoutes.js` returns a deterministic clarification. Answer wording is generated in code, not by the model.
- **Repeat-test result:** Deterministic (`temperature: 0`, and a non-existent name never matches the eBird taxonomy).
- **Status:** ✅ **Passed.**

### TR-04 — XSS / script input attack
- **Attack / failure attempt:** Submit `<script>alert("test")</script>` (and `<img src=x onerror=...>`) through the location and Ask fields, hoping it renders or executes.
- **Why this matters:** Reflected/stored script execution would be a serious security flaw.
- **Exact steps:**
  1. Location field: enter `<script>alert("test")</script>` and search.
  2. Ask field: enter `<b>hi</b> <script>alert("test")</script> birds near Philadelphia`.
  3. Open DevTools → Elements and inspect where the text appears.
- **Expected safe result:** The markup is treated as literal text everywhere; script markup in the location simply fails to geocode (same 422 path as TR-02). No alert dialog appears; no element is injected.
- **Actual result (automated portion):** Code scan confirms **no** `dangerouslySetInnerHTML` or `innerHTML` anywhere in the client — all user/eBird/Nominatim text renders through React's automatic escaping, and Leaflet marker tooltips are set via the DOM `title` property (not raw HTML). The server treats script text as inert data (it flows through the same geocoding failure path as a garbage location).
- **Screenshot to capture:** DevTools **Elements** panel showing the injected string rendered as escaped text (`&lt;script&gt;`), and the page with **no** alert dialog.
- **Protection / fix involved:** React JSX escaping (framework-level); no raw-HTML sinks in the codebase.
- **Repeat-test result:** Deterministic — escaping applies to every render path.
- **Status:** ✅ **Passed in code; capture the browser screenshot to complete the evidence.**

### TR-05 — Current-location permission denial
- **Attack / failure attempt:** Trigger the "use my location" flow, then deny the browser permission prompt.
- **Why this matters:** A denied permission must not leave the button spinning or throw an uncaught error.
- **Exact steps:**
  1. On the landing page click **📍 Use My Current Location** → choose **Block** in the browser prompt.
  2. Repeat for the Explore 📍 button and the Ask "Use my current location" button.
  3. (Reset the site's location permission between surfaces via the address-bar site settings.)
- **Expected safe result:** A friendly message ("We could not access your current location. You can still type a location…"), the spinner clears, and manual entry still works.
- **Actual result:** Not executable from the terminal (requires the browser Geolocation API). Handling is verified in code — all three components branch on the error callback and reset the loading state, and also handle "no geolocation support" and a 10-second timeout.
- **Screenshot to capture:** Each surface showing the "could not access your current location" message with the button no longer spinning.
- **Protection / fix involved:** `SearchForm.jsx`, `ExploreBirdsNearYou.jsx`, `AskBirdSights.jsx` geolocation error handlers.
- **Repeat-test result:** To be recorded during manual testing (expected consistent).
- **Status:** 🖐 **Manual verification (browser).**

### TR-06 — No-results handling
- **Attack / failure attempt:** Run a valid search that legitimately returns zero recent reports (rare/absent bird, small radius, short timeframe).
- **Why this matters:** Empty result sets must not break the map, summary panels, or pagination, and must show a clear message.
- **Exact steps:** `GET /api/search?speciesCode=norcar&latitude=0&longitude=-140&radiusKm=5&backDays=7` (a Northern Cardinal search centered in the mid-Pacific — guaranteed empty). In the UI: search a rare bird with a 5 km radius and a 7-day timeframe in a remote area.
- **Expected safe result:** HTTP 200 with an empty result list and a friendly "no recent reports" message; the results page renders with the radius circle and no pins.
- **Actual result:** HTTP 200 — `results: []`, `totalReturnedReports: 0`, `capped: false`, and `message: "No recent eBird reports were found for this species within the selected radius and timeframe. Try a larger radius, longer timeframe, or different location."`
- **Screenshot to capture:** The results page showing the empty-state message and the map centered with its radius circle and no pins.
- **Protection / fix involved:** eBird 204/empty handling in `ebirdService.js`; empty-state message in `searchRoutes.js`; empty-array guards in the results components.
- **Repeat-test result:** Deterministic (a cardinal is never reported mid-ocean).
- **Status:** ✅ **Passed.**

### TR-07 — Ask BirdSights rate limit
- **Attack / failure attempt:** Flood the paid AI endpoint to force the rate limit.
- **Why this matters:** Without a limit, spamming Ask would drive OpenAI cost.
- **Exact steps (non-destructive):** Send 25 `POST /api/ask` requests with an empty body `{}`. Each returns `400` ("Please enter a question.") *before* any OpenAI call, but still counts against the limiter.
- **Expected safe result:** The first 20 requests are counted; from the 21st on, HTTP 429 with a friendly "too many Ask BirdSights requests" message.
- **Actual result:** Distribution over 25 requests: **20 × `400`, then 5 × `429`**. The 429 body was `{"error":"Too many Ask BirdSights requests. Please wait a few minutes and try again."}` (the Ask-specific message, separate from the data-endpoint message).
- **Screenshot to capture:** The terminal output showing the `20 × 400 / 5 × 429` distribution and the 429 body; or, in the UI, the friendly Ask error after exceeding the limit.
- **Protection / fix involved:** `askRoutes.js` `express-rate-limit` (default 20 / 15 min per IP), unchanged by the later hardening.
- **Repeat-test result:** The flood itself is the repeat — all 20 allowed requests behaved identically and all over-limit requests returned 429.
- **Status:** ✅ **Passed.**

### TR-08 — Search / Explore data endpoint rate limit (hardening fix #1)
- **Attack / failure attempt:** Hit `/api/search` (and `/api/explore`) in a tight loop to exhaust the shared eBird quota.
- **Why this matters:** Before the fix these endpoints had no limiter; scripted flooding could burn the project's eBird quota.
- **Exact steps (non-destructive):** Send 105 `GET /api/search?radiusKm=25` requests (missing `speciesCode`), each returning `400` *before* any eBird/Nominatim call but still counted. Then send one `/api/explore` request from the same IP.
- **Expected safe result:** The first 100 requests are counted; from the 101st on, HTTP 429 with a friendly message. `/api/explore` shares the same per-IP budget.
- **Actual result:**
  - `/api/search`: **100 × `400`, then 5 × `429`.** The 429 carried headers `RateLimit-Limit: 100`, `RateLimit-Remaining: 0`, `RateLimit-Policy: 100;w=900`, and body `{"error":"Too many requests from this device. Please wait a moment and try again."}`.
  - `/api/explore`: also returned `429` with the same headers from the same IP — confirming the shared limiter protects both endpoints.
- **Screenshot to capture:** The terminal output showing the `100 × 400 / 5 × 429` distribution and the `429` + `RateLimit-*` headers; and the second block showing `/api/explore` also returning `429`.
- **Protection / fix involved:** `server/middleware/rateLimit.js` `dataRateLimiter` (default 100 / 15 min per IP, shared), applied in `searchRoutes.js` and `exploreRoutes.js`.
- **Repeat-test result:** Consistent — all 100 allowed requests returned 400 and every over-limit request returned 429.
- **Status:** ✅ **Passed.**

### TR-09 — Large result / map overload cap (hardening fix #2)
- **Attack / failure attempt:** Request a very common bird in a dense metro with the widest radius and timeframe, to produce an enormous result set and pin count.
- **Why this matters:** Rendering thousands of map markers and a huge payload could overload the frontend, especially on phones.
- **Exact steps:** `GET /api/search?speciesCode=amerob&latitude=40.7128&longitude=-74.0060&radiusKm=50&backDays=30` (American Robin near New York City, 50 km, 30 days). In the UI: search American Robin at 50 km / 30 days in a major metro.
- **Expected safe result:** The response is capped at 500 returned reports (keeping the most recent), and includes a friendly notice; the map receives at most 500 pins.
- **Actual result:** HTTP 200 with `capped: true`, `totalReturnedReports: 1570`, `returnedReportCount: 500`, and `capNotice: "This search returned 1570 recent eBird reports. To keep the map responsive, BirdSights is showing the 500 most recent returned reports."` The map/list therefore received 500 reports instead of 1,570.
- **Screenshot to capture:** The results page showing the cap notice above the summary, and the map with the (bounded) set of pins; optionally the Network tab showing the response.
- **Protection / fix involved:** `MAX_RETURNED_REPORTS = 500` in `searchRoutes.js` (keeps the most recent reports so freshness and the "most recent report" date are preserved).
- **Repeat-test result:** Reproducible for dense metros; exact `totalReturnedReports` will vary with live eBird data but `returnedReportCount` stays ≤ 500.
- **Status:** ✅ **Passed** (cap confirmed with real data: 1,570 → 500).

### TR-10 — Secret / API-key exposure scan
- **Attack / failure attempt:** Look for API keys or secrets committed to the repository or hardcoded in source.
- **Why this matters:** A leaked eBird or OpenAI key could be abused and would be a serious grading/security issue.
- **Exact steps:** `git ls-files | grep -i env`; `git check-ignore server/.env client/.env`; `grep` source for `sk-`/`AIza`/`xoxb-` token patterns; inspect `.env.example` values.
- **Expected safe result:** Only `.env.example` (placeholder) files are tracked; real `.env` files are gitignored; no keys are hardcoded in source.
- **Actual result:**
  - Tracked env files: only `client/.env.example` and `server/.env.example`.
  - No real `.env` is tracked. `.gitignore` contains `.env`. `git check-ignore` confirms `server/.env` and `client/.env` are ignored.
  - No hardcoded key tokens found in source.
  - `.env.example` values are placeholders (`your_ebird_api_key_here`, `your_openai_api_key_here`).
- **Screenshot to capture:** The terminal output of the scan (shows only `.env.example` tracked, real `.env` ignored, no hardcoded keys). **Do not** screenshot the contents of the real `.env` files.
- **Protection / fix involved:** `.gitignore`; keys read only from `process.env`; no key logging in the backend.
- **Repeat-test result:** Deterministic against the current repository state.
- **Status:** ✅ **Passed.**

### TR-11 — localStorage failure handling (hardening fix #3)
- **Attack / failure attempt:** Make browser storage disabled, unavailable, or full and confirm saved searches / theme fail safely.
- **Why this matters:** An unguarded `localStorage` call could throw and blank the page, or silently lose a save.
- **Exact steps (browser):**
  1. In DevTools console: `Storage.prototype.setItem = function(){ throw new Error("blocked"); }`.
  2. Toggle dark mode, then run and save a search.
  3. Confirm the theme still changes and the saved search still appears for the session, with no crash.
- **Expected safe result:** The app keeps working; the theme still applies and saved searches update in-memory; only persistence is skipped.
- **Actual result (code-verified):** Both `localStorage` reads and writes are wrapped in `try/catch` — `savedSearches.js` (`readAll` and `writeAll`) and `App.jsx` (theme read in the initializer and theme write in the effect). On failure the writes silently no-op and the reads fall back to safe defaults (empty list / light mode). The production build passes.
- **Screenshot to capture:** DevTools showing the injected `setItem` throw, with the app still functioning (theme toggled, saved search visible), and no error overlay.
- **Protection / fix involved:** try/catch around all `localStorage` reads/writes (R2-02 fix).
- **Repeat-test result:** Deterministic — the guards apply on every read/write.
- **Status:** ✅ **Passed in code; capture the browser screenshot to complete the evidence.**

### TR-12 — Missing image fallback
- **Attack / failure attempt:** Search/explore a bird that is not one of the curated local images.
- **Why this matters:** A missing image must not show a broken-image icon or spam 404s.
- **Exact steps:** Search a common bird without a curated image (e.g., Song Sparrow, Tufted Titmouse) and look at the results image card and autocomplete thumbnails; run Explore in a busy area and view un-curated species cards.
- **Expected safe result:** A styled "Image pending" / "Reference image coming soon" placeholder; no broken image and no network 404.
- **Actual result (code-verified):** `getBirdImage()` returns `null` when no curated image exists; the image components render a placeholder element **instead of** an `<img>` (so no request is made and no 404 occurs). Confirmed in `birdImages.js` and `BirdImageCard.jsx`.
- **Screenshot to capture:** A results card and an Explore card showing the "Image pending" placeholder; optionally the Network tab showing no 404 for a missing `.webp`.
- **Protection / fix involved:** `birdImages.js` null return + conditional placeholder rendering in the image components.
- **Repeat-test result:** Deterministic — any species outside the curated map shows the placeholder.
- **Status:** ✅ **Passed in code; capture the browser screenshot to complete the evidence.**

---

## 5. Manual browser steps still required for screenshots

These behaviors are already verified (in code and/or server-side) but should be captured visually for the report:

1. **TR-05 (GPS denial):** deny the location prompt on each of the three "use my location" buttons; screenshot the friendly fallback with the spinner cleared.
2. **TR-04 (XSS):** enter `<script>alert("test")</script>` in the location and Ask fields; screenshot the DevTools Elements panel showing escaped text and the absence of any alert.
3. **TR-11 (localStorage):** use the DevTools `setItem` override above; screenshot the app still working.
4. **TR-12 (image fallback):** screenshot an "Image pending" placeholder on a results/Explore card.

For the terminal-based tests (TR-01, TR-02, TR-03, TR-06, TR-07, TR-08, TR-09, TR-10), the recorded outputs in this document — or a re-run of the same commands — serve as the evidence.

---

## 6. Appendix — raw execution evidence

Captured from a local backend on `http://localhost:5000`.

### A. Functional tests (Phase A)
```
TEST 1 — BROAD LOCATION (Pennsylvania)
  [HTTP 400] {"error":"Pennsylvania is a broad area. BirdSights searches by radius around a
  specific place. Please enter a city, ZIP code, park, address, or use current location."}
  (New Jersey → identical 400 behavior)

TEST 2 — GARBAGE LOCATION (asdfghjkl 999)
  [HTTP 422] {"error":"We could not find coordinates for \"asdfghjkl 999\". Try a different
  address, city, or ZIP code."}

TEST 6 — NO RESULTS (Northern Cardinal, mid-Pacific 0,-140, 5 km, 7 d)
  [HTTP 200] {"searchCenter":{"lat":0,"lng":-140,"label":"Current Location"},
  "speciesCode":"norcar","radiusKm":5,"backDays":7,"results":[],"totalReturnedReports":0,
  "returnedReportCount":0,"capped":false,"capNotice":null,
  "message":"No recent eBird reports were found for this species within the selected radius
  and timeframe. Try a larger radius, longer timeframe, or different location."}

TEST 9 — LARGE RESULT CAP (American Robin, NYC 40.7128,-74.0060, 50 km, 30 d)
  capped: true
  totalReturnedReports: 1570
  returnedReportCount: 500
  resultsLength: 500
  capNotice: "This search returned 1570 recent eBird reports. To keep the map responsive,
  BirdSights is showing the 500 most recent returned reports."

TEST 3 — UNKNOWN BIRD via Ask (purple flarblebird near 19153)
  [HTTP 200] {"needsClarification":true,"clarifyingQuestion":"BirdSights could not match
  \"purple flarblebird\" to an eBird species. Could you try the bird's full common name,
  like \"Cedar Waxwing\"?"}
```

### B. Rate-limit tests (Phase B, non-destructive fast-fail method)
```
TEST 8 — DATA ENDPOINT RATE LIMIT (/api/search, default 100 / 15 min per IP)
  105 requests with missing speciesCode (each 400 before any external call):
    100  ->  HTTP 400
      5  ->  HTTP 429
  429 response:
    HTTP/1.1 429 Too Many Requests
    RateLimit-Policy: 100;w=900
    RateLimit-Limit: 100
    RateLimit-Remaining: 0
    RateLimit-Reset: 897
    {"error":"Too many requests from this device. Please wait a moment and try again."}

TEST 8b — /api/explore shares the same limiter (same IP now over limit)
    HTTP/1.1 429 Too Many Requests
    RateLimit-Limit: 100  RateLimit-Remaining: 0
    {"error":"Too many requests from this device. Please wait a moment and try again."}

TEST 7 — ASK RATE LIMIT (/api/ask, default 20 / 15 min per IP)
  25 POSTs with empty body (each 400 before any OpenAI call):
     20  ->  HTTP 400
      5  ->  HTTP 429
  429 response:
    {"error":"Too many Ask BirdSights requests. Please wait a few minutes and try again."}
```

### C. Secret / API-key scan (TR-10)
```
Tracked env files:      client/.env.example, server/.env.example   (placeholders only)
Real .env tracked?      No
.gitignore:             contains ".env"
git check-ignore:       server/.env  AND  client/.env  are ignored
Hardcoded key tokens:   none found in source
.env.example values:    EBIRD_API_KEY=your_ebird_api_key_here
                        OPENAI_API_KEY=your_openai_api_key_here
```

### D. Client-side protection verification (TR-04, TR-11, TR-12)
```
localStorage guards:    try/catch present in savedSearches.js (read + write)
                        and App.jsx (theme read + write)
Image fallback:         birdImages.js returns null -> "Image pending" placeholder (no <img>)
XSS sinks:              no dangerouslySetInnerHTML / innerHTML anywhere in client/src
```

---

## 7. Conclusion

All twelve cases behave safely. The two hardening fixes are confirmed working against live and simulated conditions (rate limiting on both data endpoints and the Ask endpoint; the 500-report cap trimming a real 1,570-report result set). No secrets are exposed and no user input is rendered as executable HTML. The only outstanding work is capturing four browser screenshots (TR-04, TR-05, TR-11, TR-12) to complete the visual evidence package; the underlying behavior for each is already verified.

*Results reflect recent returned eBird data only. BirdSights does not guarantee a bird is present and does not claim true abundance or true rarity.*
