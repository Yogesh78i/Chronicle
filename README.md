# Chronicle — a Life RPG

Turn real tasks into quests. Chronicle is a full-stack "Life RPG" web app: you log real-world
to-dos as **quests**, complete them to earn **XP** and **gold**, level up on a non-linear curve,
build a daily **streak**, grow four character **attributes**, and spend gold in a small
**market** for cosmetic themes, badges, and titles.

Everything that affects your stats is calculated and validated on the **backend**, so the
XP/gold/level math can't be tampered with from the browser.

---

## Stack

| Layer     | Choice |
|-----------|--------|
| Frontend  | Plain HTML/CSS/JavaScript (no build step, no framework) |
| Backend   | Node.js + Express |
| Database  | SQLite (via `better-sqlite3`) |
| Auth      | JWT (JSON Web Tokens) + bcrypt password hashing |

No bundler is required for the frontend — it's static files you can open with any static file
server (or deploy to Vercel/Netlify/GitHub Pages). The backend is a standard Express API you can
deploy to Render, Railway, Fly.io, or similar.

---

## Project structure

```
lifeRPG/
├── backend/
│   ├── server.js         # Express app entry point
│   ├── db.js             # SQLite connection + schema + shop seed data
│   ├── engine.js         # The RPG progression engine (XP curve, streaks, rewards)
│   ├── middleware/auth.js
│   ├── routes/
│   │   ├── auth.js       # register / login / me
│   │   ├── tasks.js      # quest CRUD + "complete quest" endpoint
│   │   └── shop.js       # market catalog + purchases
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── config.js     # API base URL
        ├── api.js        # fetch() wrapper
        └── app.js         # UI state + rendering + interactions
```

---

## Running locally

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# open .env and set JWT_SECRET to a long random string, e.g.:
# node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
npm start
```

The API starts on `http://localhost:4000` by default (configurable via `PORT` in `.env`).
A SQLite file is created automatically at `backend/data/chronicle.db` on first run, along with
a seeded shop catalog.

Health check: `GET http://localhost:4000/api/health`

### 2. Frontend

The frontend is static files — serve them with anything:

```bash
cd frontend
python3 -m http.server 5173
# or: npx serve .
```

Then open `http://localhost:5173`. If your backend runs somewhere other than
`http://localhost:4000/api`, update `frontend/js/config.js`.

> CORS: the backend's `.env` has a `CORS_ORIGIN` list. Make sure it includes whatever origin
> you're serving the frontend from (it defaults to `http://localhost:5173` and `:3000`).

---

## Environment variables (`backend/.env`)

See `.env.example` for the full list with comments. The only one you must change is
`JWT_SECRET`.

---

## Core systems

- **Auth & security** — passwords are hashed with bcrypt (12 rounds); sessions are JWTs sent as
  `Authorization: Bearer <token>`. Every task/shop route is scoped to `req.userId`, so a user can
  only ever see or modify their own data.
- **Progression engine** (`backend/engine.js`) — XP required for level `n → n+1` follows
  `100 × n^1.5`, so each level costs more than the last. Leveling, streaks, gold, and attribute
  gains are all computed server-side inside the `/tasks/:id/complete` endpoint — the client never
  sends stat values directly.
- **Streaks** — comparing a UTC "last completion date" against today: same day keeps the streak,
  the very next day increments it, any gap resets it to 1.
- **Attributes** — each quest is tagged with one of four attributes (Intellect, Strength, Spirit,
  Discipline); completing it nudges that attribute up.
- **Economy** — five difficulty tiers each award a fixed XP/gold amount; gold can be spent in the
  Market on cosmetic themes, badges, and unlockable titles.
- **Optimistic, tactile UI** — completing a quest seals a wax-stamp checkbox and fades the row out
  immediately, before the network round-trip resolves; the XP bar animates its fill; leveling up
  triggers an unfurling gold banner.

---

## Deployment notes

- **Backend**: any Node host works (Render, Railway, Fly.io, a VPS). Set the same environment
  variables from `.env.example` in your host's dashboard. SQLite is file-based, so make sure your
  host gives you a persistent disk/volume for `backend/data/` — on ephemeral filesystems the
  database will reset on redeploy.
- **Frontend**: any static host (Vercel, Netlify, GitHub Pages, S3). Update
  `frontend/js/config.js` to point at your deployed backend's URL, and add that frontend's origin
  to `CORS_ORIGIN` in the backend's environment variables.

---

## Accessibility & responsiveness

- Fully keyboard-navigable (Tab/Shift+Tab/Enter/Space); visible focus rings throughout.
- Semantic roles for tabs (`role="tab"`/`"tabpanel"`), the XP bar (`role="progressbar"`), and live
  regions for toasts/errors (`aria-live`).
- `prefers-reduced-motion` is respected — all animations collapse to near-instant.
- Layout reflows from a two-column desktop layout down to a single stacked column on mobile.

---

## License

MIT — do whatever you like with this.
# Chronicle
