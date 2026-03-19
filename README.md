# Hitachi Solutions — Sales Arena 🏆

A gamified sales leaderboard for the Hitachi Solutions team. Built with React + Vite + Supabase, deployed on Render.

## Features

- Google OAuth login (restricted to `@hitachisolutions.com`)
- Real-time leaderboard with points, deals, and revenue
- Package tracker (Cloud Assessment, Modern Workplace, SAP Migration, etc.)
- Achievement badges (Cloud Ace, Streak ×5, Rising Star, etc.)
- Live activity feed — updates instantly when deals are logged
- Log a deal modal with point calculation

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase (Postgres) |
| Realtime | Supabase Realtime |
| Hosting | Render (Static Site) |

---

## Setup — Step by Step

### 1. Clone and install

```bash
git clone https://github.com/jgiordi/hitachi-arena
cd hitachi-arena
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → New project
2. Choose a region close to your team (e.g. eu-west-2 London)
3. Once created, go to **SQL Editor** and paste + run the contents of `supabase-schema.sql`
4. In **Database > Replication**, enable the `deals` table for Realtime

### 3. Set up Google OAuth in Supabase

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → APIs & Services → Credentials → Create OAuth 2.0 Client ID
3. Application type: **Web application**
4. Authorized redirect URIs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
5. Copy the **Client ID** and **Client Secret**
6. In Supabase → **Authentication > Providers > Google** → paste them in, enable

### 4. Configure environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ALLOWED_DOMAIN=hitachisolutions.com
```

Find your URL and anon key in Supabase → **Settings > API**.

### 5. Run locally

```bash
npm run dev
```

Visit `http://localhost:5173`

---

## Deploy to Render

1. Push this repo to GitHub: `https://github.com/jgiordi/hitachi-arena`
2. Go to [render.com](https://render.com) → New → **Static Site**
3. Connect your GitHub repo
4. Set:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
5. Add environment variables in Render dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ALLOWED_DOMAIN`
6. Click **Deploy** — done! 🚀

> Render will auto-deploy every time you push to `main`.

### Add your Render URL to Supabase

Once deployed, go to:
- Supabase → **Authentication > URL Configuration**
- Add your Render URL to **Redirect URLs**: `https://your-app.onrender.com`
- Also update the Google OAuth redirect URI in Google Cloud Console

---

## Project structure

```
hitachi-arena/
├── src/
│   ├── lib/
│   │   └── supabase.js          # Supabase client
│   ├── pages/
│   │   └── LoginPage.jsx        # Google login screen
│   ├── components/
│   │   ├── Leaderboard.jsx      # Main leaderboard table
│   │   ├── LogDealModal.jsx     # Log a deal form + packages list
│   │   ├── PackagesPage.jsx     # Package values + badges
│   │   └── ActivityFeed.jsx     # Real-time activity feed
│   ├── App.jsx                  # Root — auth gate + layout
│   ├── main.jsx
│   └── index.css
├── supabase-schema.sql          # Run this in Supabase SQL editor
├── .env.example                 # Copy to .env.local
└── vite.config.js
```

---

## Customising packages & points

Edit the `PACKAGES` array in `src/components/LogDealModal.jsx`:

```js
const PACKAGES = [
  { id: 'cloud-assessment', name: 'Cloud Assessment', points: 320, color: '#185FA5' },
  // add your own...
]
```

---

## Customising the allowed domain

Change `VITE_ALLOWED_DOMAIN` in your `.env.local` (or Render env vars) to restrict login to a different email domain, e.g. `hitachi.com`.

Set it to empty string `""` to allow any Google account (useful for testing).
