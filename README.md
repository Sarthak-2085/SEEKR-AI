# SEEKR

**Seek. Discover. Build.**

SEEKR helps you discover new technologies and choose tools for a project. You can search by name, describe what you want to build, or compare tools side by side. Each technology page links to its sources so you can check the details yourself.

## What you can do

| Feature | What it does |
| --- | --- |
| Launch Radar | Browse technology releases and filter by category, price, status, or date. |
| AI Tool Finder | Describe a task and see matching tools with an explanation for each match. |
| Compare | Compare two or three technologies by features, pricing, and limitations. |
| Technology Explained | Learn how a technology works, who it helps, and what its limitations are. |
| Daily Briefing | Read short summaries of announcements and open the original sources. |
| Upcoming Radar | Track announced technologies and see expected release dates when available. |
| My Library | Bookmark tools, briefings, and comparisons, then organize them into collections. |

## Run SEEKR on your computer

Install **Node.js 24 or newer** and **Git**. Then open a terminal and run:

```bash
git clone https://github.com/Sarthak-2085/SEEKR-AI.git
cd SEEKR-AI
npm ci
npm start
```

Open **http://127.0.0.1:4173** in your browser. The first run creates the local SQLite database and loads the starter catalog. You can browse, search, and compare tools without an account or an AI API key.

To stop the app, press `Ctrl+C`. To start it again, run `npm start` from the `SEEKR-AI` folder.

## Try it

1. Open **AI Tool Finder** and type “I need an open-source language model I can run locally.”
2. Open a result to check its capabilities, pricing, limitations, and sources.
3. Select **Compare** to see how it differs from another tool, or use the bookmark button to save it to **My Library**.

## Where the data comes from

SEEKR starts with 20 technologies and six briefings. It also checks official feeds for updates and queues new stories for editorial review before publication. When a release date is unknown, SEEKR says so.

When you run SEEKR locally, the catalog lives in SQLite and your bookmarks and collections are saved in your browser.

## For developers

The frontend uses **React and TypeScript**. The backend runs on **Node.js with SQLite** locally and supports **Cloudflare Workers with D1** for hosting.

```bash
npm test       # Run backend tests
npm run build  # Check TypeScript and build the app
```

The interface is in `src/`, the API is in `server/`, and the starter catalog is in `data/catalog.json`.
