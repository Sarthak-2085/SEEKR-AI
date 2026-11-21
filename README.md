# SEEKR

**Seek. Discover. Build.** SEEKR is a technology discovery workspace with a source-linked catalog, task-based recommendations, comparisons, original-source briefings and a personal library.

## Run locally

Install Node.js 24 LTS or newer, then run these commands from the project directory.

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:4173**. The first request populates the local SQLite database from the reviewed catalog. No account, paid service, API key or GPU is required. For another port, run `npm start -- --port 4200`. To read optional settings from a local file, copy `.env.example` to `.env` and run `node --env-file=.env scripts/dev.mjs`. Restart after changing source. Back up `.local/seekr.sqlite` with SQLite's backup command before upgrading.

## Included features

- Search across tools, companies, descriptions, capability tags and news. Browse releases by status, category, price and date, with sorting and pagination.
- Get explainable task matches. Free access, open-source licensing and local execution act as constraints. Capability groups and keyword matches determine rank. An unsupported task can return zero matches.
- Read beginner-friendly technology profiles, sourced version changes, price limitations, related products and an explained editorial significance score.
- Compare two or three entries and share the resulting URL. Save technologies, comparisons and briefings. Create, rename, populate and delete personal collections.
- Read original-source briefings and confirmed upcoming releases. Announcement, actual release, expected release and verification dates are separate fields.
- Browse use-case collections, follow companies/categories/technologies, and select a default pricing filter. Weekly trending uses observed detail views. The dashboard shows an empty state until a visit is recorded.

The initial edition contains 20 technologies and six briefings checked on 21 November 2026 UTC. Software release dates describe the listed version. Editorial priority uses the stated reasoning and score. Availability and pricing belong to the specific product or version, including model hosting and compute caveats.

## Architecture

The initial audit found an empty workspace. The implementation uses a React and TypeScript client, one Fetch-compatible JavaScript API, and SQLite-compatible storage. A local Node adapter and hosted D1 use the same queries. A second Python web service or an external identity service would require another deployment. This setup keeps the whole application runnable on one machine at zero service cost.

- `src/` contains navigation, shared controls, views, accessibility behavior and original artwork.
- `server/api.mjs` handles validated requests. `server/catalog.mjs` owns ranking and catalog loading. `server/ingest.mjs` implements ingestion and the optional summary provider.
- `db/schema.js` and `drizzle/` define versioned database migrations. Catalog attributes have indexed, relational columns. Editorial copy and variable product-specific facts are stored together as JSON. Sources, owners' collections, collection memberships, bookmarks, follows, view counts and ingestion records are separate tables.
- `data/catalog.json` is the initial evidence-backed edition. Seed insertion is idempotent. An interrupted seed can resume. Editorial corrections survive a restart.
- `scripts/build.mjs` builds the client and a self-contained ESM Worker. The local adapter strips identity headers supplied by browser clients. Hosted identity comes from the Sites dispatch layer. Every private query is scoped to that identity. Guest data stays in the current browser. Local and account libraries are separate.

## API

All routes below are relative to `/api`. Responses use JSON. Errors include an `error` message and a suitable HTTP status. List endpoints return `items`, `page`, `limit` and `total`.

| Method | Route | Behavior |
| --- | --- | --- |
| GET | /session, /dashboard | Caller identity and discovery overview |
| GET | /technologies, /launches, /upcoming, /news | Filtered, paginated records |
| GET | /technologies/{id}, /news/{id} | Detailed evidence and editorial content |
| GET | /search?q=... | Technologies and news matching search terms |
| GET | /recommendations?q=...&pricing=... | Ranked matches and explanations |
| GET | /compare?ids=codex,gemini-cli | Two or three distinct technology IDs |
| POST | /views | Record a detail view with an id |
| GET | /library | Account bookmarks, collections, follows and preferences |
| POST, DELETE | /bookmarks | Add or remove a key such as tech:codex, news:{id} or compare:{ids} |
| POST, PATCH, DELETE | /collections | Create by name, rename by id/name, add or remove by id/key/add, delete by id |
| POST, DELETE | /follows | Follow or unfollow a topic |
| PUT | /preferences | Save the pricing filter |
| GET, POST | /admin/ingestion | Review source names, logs and pending items, or fetch one named source |
| PATCH | /admin/review | Approve or reject a pending item by id and action, with an editorial why for approval |
| POST, PATCH | /admin/technology | Add a complete sourced record, or correct an existing record with a sourceUrl |

Catalog lists accept `q`, `category`, `company`, `status`, `pricing`, `from`, `to`, `sort`, `page` and `limit` where applicable. Dates are ISO calendar dates. Sort values are latest, oldest and name. The limit is capped at 100. Mutations are same-origin by default and rate-limited. The administration API requires an operator-configured `INGEST_TOKEN` in the Authorization bearer header. Keep server settings outside source control.

## Ingestion and editorial review

The pipeline fetches an allowlisted official RSS feed or GitHub release API with a timeout and size cap. It normalizes source URLs, verifies publisher hosts and dates, classifies the story, and deduplicates by canonical URL. It stores a summary and original source for review. Feed publication dates become news dates. A curator must supply technology release dates separately. Review decisions and fetch failures leave the existing catalog available.

```sh
node scripts/curate.mjs fetch
node scripts/curate.mjs pending
node scripts/curate.mjs approve RECORD_ID "Why this update matters to users."
node scripts/curate.mjs logs
```

Use `fetch pytorch`, `fetch transformers` or `fetch huggingface` to request one feed. Use `reject RECORD_ID` to dismiss an item. To add a technology, follow the full record shape in `data/catalog.json` and run `node scripts/curate.mjs add record.json`. Correct a published technology via the authenticated PATCH endpoint with its ID, evidence URL and changed fields. Unknown values belong in nullable fields.

The local server checks official feeds in the background at startup and once per day while running. A database lease prevents simultaneous refreshes. On Sites, opening the dashboard starts a due refresh without delaying the page. The Worker also supports a cron trigger for unattended checks on compatible hosts. Set SEEKR_AUTO_INGEST=0 to disable automatic checks. No paid scheduler or external model is provisioned.

On the hosted Site, the owner configured in CURATOR_EMAIL can review pending items in Settings, edit headlines and summaries, and publish or dismiss stories. Sites supplies the verified identity server-side. The optional administration bearer token remains available for independent integrations.

If a local OpenAI-compatible inference server is already available, optionally set the summary URL and model in the server environment. Its failure, timeout or HTTP rate limit falls back to a bounded extract from the source. Approved summaries are stored in the database. Developers can run all other features without inference.

## Verification

```sh
npm test
npm run build
python tests/browser.py
```

For browser tests install Python Playwright and Chromium, or set `CHROMIUM_PATH`. The suite drives Chromium against the built Worker with a fresh SQLite database through a test transport. It covers navigation, search, filters, details, anonymous persistence, comparisons, collection edits, source links, error and empty states, and mobile width. The Node tests separately verify database relationships, seed retries, recommendation relevance, auth isolation, input validation, ingestion deduplication and provider fallback. Test data stays out of production storage.

## Deployment

A local or self-hosted deployment can use `npm ci && npm run build && npm start` with persistent storage for `.local/`. Use a TLS reverse proxy and keep the local adapter's header stripping when exposing it to visitors. It provides guest libraries. Account-backed identity is integrated with Sites.

For Sites, retain the registered identity in `.openai/hosting.json`, bind D1 as DB, include the generated schema migration and deploy `dist/server/index.js`. Configure optional secrets in the hosting settings. The supplied Site starts owner-private. Signed-in library storage uses the stable Site user ID. Enable an audience appropriate to the deployment before inviting other visitors. For a separately deployed Worker, use a trusted identity gateway that removes incoming identity headers before setting its own.

The project needs no external billing to run locally. Source hosting, audience, optional services and scheduler limits depend on the operator's deployment. The code does not create paid resources or configure paid API access.

### Feed import for restricted hosts

When the hosted runtime cannot reach a publisher, a trusted machine can fetch the same official sources and stage them in the hosted editorial queue. Configure a matching `FEED_IMPORT_TOKEN` on the Site and the importer. Set `SEEKR_SITE_URL` to the Site origin. Owner-private Sites also require a Sites service-access token in `SEEKR_SITE_ACCESS`. Run `node scripts/sync-feeds.mjs` or schedule that command on the trusted machine. The importer uses HTTPS, avoids redirects, and sends credentials only to the configured Site. Imported candidates use the same deduplication, publisher validation and editorial review as direct fetches.
