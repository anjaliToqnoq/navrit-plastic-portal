# Plastic Rate Management Portal — NAVRIT

Lightweight bilingual (English / Hindi) web app for **NAVRIT** (*Turning Waste into Value.*) to publish daily plastic purchase rates.

## Stack

- **Next.js 15** (App Router) — SEO-friendly public pages
- **SQLite** via Node built-in `node:sqlite` — single file DB, tiny footprint
- **Tailwind CSS 4** — mobile-first UI
- **Chart.js** — lightweight analytics charts
- **jose + bcryptjs** — admin session auth

Designed for **10–50 users/day**. No Redis, no Postgres, no heavy enterprise stack.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Admin:** [http://localhost:3000/admin](http://localhost:3000/admin)  
Default login (from `.env.local`): `admin` / `admin123`

## Features

### Public
- About & Contact pages remain available
- Home `/` currently redirects to admin login (internal ops app first)

### Admin (dual modes: PET / PLASTIC)
- Secure login; mode toggle isolates every ledger row
- Inventory & finance: purchases, sales, expenses, borrowings, vendor credit/advances
- Labour management / processing batches (PET)
- Material & profit analysis, accounts by person (Rahul / Devesh / Nitin)
- Backup create / download / restore (both modes)
- Rates catalog + historical `rate_snapshots` still available under admin

### Verified business rules (local smoke)
- Purchase → inventory_transactions (+kg); sale → adjustment (−kg) using the same stock key
- Natural bottles stock keys: `Natural Bottles - Green|White|White Milk`; red: `Red Bottles`
- Oversell rejected; supplier credit payment cannot exceed outstanding
- Sale labour = ₹2/kg + optional loading; PLASTIC figures stay isolated from PET
- Build uses in-memory SQLite; runtime production DB is only `/app/data/plastic-rates.db`

## Data model

| Table | Purpose |
|-------|---------|
| `categories` | PET, PP, HDPE, … (EN + HI) |
| `materials` | Plastic items under categories |
| `rate_snapshots` | One row per material **per date** (unique index) |
| `admins` | Login accounts |

DB file: `data/plastic-rates.db`

## Configure business info

Edit `.env.local`:

- `NEXT_PUBLIC_BUSINESS_NAME`
- `NEXT_PUBLIC_BUSINESS_TAGLINE`
- `NEXT_PUBLIC_PHONE`, `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_EMAIL`
- `NEXT_PUBLIC_ADDRESS`, `NEXT_PUBLIC_MAPS_EMBED_URL`
- `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `AUTH_SECRET`

## Production

```bash
npm run build
npm start
```

Requires **Node.js 22+** (for built-in `node:sqlite`). Change `AUTH_SECRET` and admin password before deploying.

## Backup & safe upgrades

Your live data lives in **`data/plastic-rates.db`**. Backups go to **`data/backups/`** (admin-only, not in git, SHA-256 checksum).

| Command | What it does |
|---------|----------------|
| `npm run db:backup` | Snapshot DB now |
| `npm run db:restore:list` | List backups |
| `npm run db:restore -- <file.db>` | Restore (creates safety backup first) |
| `npm run deploy:safe` | Backup → install → build (then restart) |

**Admin UI:** `/admin/backup` — create, download, restore.

**Upgrade checklist**
1. `npm run db:backup` (or use Admin → Backup)
2. Download a copy to your laptop
3. `git pull` (or upload new code)
4. `npm run deploy:safe`
5. Restart: `pm2 restart navrit` (or `npm start`)

Never delete `data/` on the server when deploying code.

## Hosting (low cost, easy upgrades)

This app uses **SQLite on disk**, so it needs a small VPS / cloud VM with **persistent storage** — not pure serverless (Vercel alone) unless you move the DB elsewhere.

### Recommended (simplest + cheap)

**Option A — Small VPS (~₹400–800/month)**  
Examples: Contabo, Hetzner CX22, DigitalOcean Droplet, Hostinger VPS, AWS Lightsail.

1. Create Ubuntu 22.04+ VM  
2. Install Node 22 + nginx + pm2  
3. Point domain DNS to the VM  
4. Clone repo, copy `.env.local`, seed once, run with pm2  
5. Nginx reverse-proxy to `localhost:3000` + free HTTPS (Let’s Encrypt)

```bash
# on server (after first setup)
cd /var/www/navrit
git pull
npm run deploy:safe
pm2 restart navrit
```

**Option B — Railway / Render with a volume**  
Deploy the Next.js app and attach a **persistent volume**. On Railway the app expects the DB at **`/app/data/plastic-rates.db`**, so mount the volume at **`/app/data`** (not `/data`).

#### Railway data safety (do not skip)

Live inventory, purchases, sales, and rates live only on the Railway volume. Code deploys must never wipe that file.

1. In Railway → service → **Volumes**: mount path must be `/app/data`.
2. **Never** set the start command to `npm run db:seed` or `db:seed:prod`. Seed is for first local/dev setup only. Production schema migrates additively on boot via `CREATE TABLE IF NOT EXISTS` / safe `ALTER`s.
3. Before every production deploy:
   - Open Admin → **Backup** (available in both PET and PLASTIC modes) → Create backup → Download a copy to your laptop
   - Or take a Railway volume snapshot if your plan supports it
4. Deploy code (GitHub → Railway). Build uses an in-memory SQLite (`NAVRIT_SQLITE_MEMORY=1`) and does not touch the volume.
5. After deploy: log in → confirm stock kg, recent purchases, and sale counts still match → create another backup.

Optional env overrides (only if you intentionally change the mount): `NAVRIT_DATA_DIR`, `NAVRIT_DB_PATH`. In production, if `/app/data` is missing the app **refuses to start** rather than creating a new empty DB on ephemeral disk.

**Option C — Free tier experiments**  
Oracle Cloud free ARM VM can work if you are comfortable with setup. Still use pm2 + backups.

### What not to do

- Do **not** deploy to Vercel/Netlify **without** an external DB — the filesystem is ephemeral and your rates would reset.
- Do **not** commit `.env.local` or `data/*.db` to git.
- Do **not** delete or remount the Railway volume when redeploying.
- Do **not** run seed against the production volume.

**Stock naming:** Purchases of Natural/Red bottles must include a colour variant so inventory keys match sales (`Natural Bottles - Green`, `Natural Bottles - White`, `Natural Bottles - White Milk`, `Red Bottles`). If an older purchase was saved as plain `Natural Bottles`, use **Inventory → adjustment** to move kg into the correct variant name before selling — do not delete historical purchase rows.

### Minimal server setup (pm2)

```bash
npm i -g pm2
npm run build
pm2 start npm --name navrit -- start -- -p 3000 -H 127.0.0.1
pm2 save
pm2 startup
```

Cron daily backup (optional):

```bash
0 2 * * * cd /var/www/navrit && npm run db:backup -- cron >> /var/log/navrit-backup.log 2>&1
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run db:seed` | Create tables + sample 30-day rates |
| `npm run db:backup` | Create DB backup |
| `npm run db:restore` | Restore from backup |
| `npm run deploy:safe` | Backup + install + build |
