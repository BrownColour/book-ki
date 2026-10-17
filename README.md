# Book

A household expense tracker built for everyday use on a phone. Designed for non-technical users with Hinglish autocorrect, cash ledger management, monthly records, and a clean dark-mode interface.

---

## Features

- **Add expenses** — item name with autocorrect for common spelling mistakes and Hinglish words (e.g. "tameto" suggests "tomato", "dhaniya" is understood)
- **Categories** — Fruits, Vegetables, Others by default; add or remove from Settings
- **Dashboard** — Monthly spending summary, daily bar chart, category breakdown, top items
- **Records** — List view grouped by date, filter by category, export to CSV; long-press an item to edit
- **Ledger** — Cash accounts for H, S, L; track amounts given and returned, see outstanding balance
- **Dark mode** — Default dark, switch to light; preference is remembered
- **Mobile-first** — Optimised for phone use with bottom navigation and large tap targets

---

## Tech Stack

| Layer | Service |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Autocorrect | Fuse.js (fuzzy search) |

---

## Setup Guide

### Step 1 — GitHub

1. Create a new repository on [github.com](https://github.com) — name it `book-app` or anything you like
2. On your computer, open a terminal in the project folder and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

---

### Step 2 — Supabase

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click **New project** — give it a name like `book-app`, choose a region close to you, set a database password (save it somewhere)
3. Wait for the project to be ready (about 1–2 minutes)
4. In the left sidebar go to **SQL Editor**
5. Copy the entire contents of `supabase-schema.sql` from this project and paste it into the SQL editor
6. Click **Run** — you should see "Success" messages
7. Go to **Project Settings → API**
8. Copy two values:
   - **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
   - **anon / public** key (a long string starting with `eyJ...`)

---

### Step 3 — Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with your GitHub account
2. Click **Add New → Project**
3. Find and import your `book-app` repository
4. Before clicking Deploy, click **Environment Variables** and add:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL from Step 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key from Step 2 |

5. Click **Deploy**
6. Wait about 2 minutes — Vercel will give you a URL like `https://book-app-xyz.vercel.app`
7. Open that URL on your phone — it works like an app

---

### Step 4 — Add to Phone Home Screen (Optional but recommended)

**iPhone:**
1. Open the app URL in Safari
2. Tap the Share button (box with arrow at the bottom)
3. Scroll down and tap **Add to Home Screen**
4. Tap **Add** — the app icon appears on your home screen

**Android:**
1. Open the app URL in Chrome
2. Tap the three-dot menu
3. Tap **Add to Home screen**

---

## Local Development

1. Copy the environment file:
```bash
cp .env.local.example .env.local
```

2. Fill in your Supabase credentials in `.env.local`

3. Install dependencies and run:
```bash
npm install
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
src/
  pages/
    index.tsx          — Add expense (landing page)
    dashboard.tsx      — Monthly summary and charts
    records.tsx        — List view with edit and CSV export
    ledger.tsx         — Cash accounts for H, S, L
    settings.tsx       — Categories and theme settings
    _app.tsx           — App wrapper
    _document.tsx      — HTML document (dark mode init)
  components/
    BottomNav.tsx      — Phone-style bottom navigation
    PageHeader.tsx     — Sticky header with theme toggle
    AutocorrectInput.tsx — Item input with Hinglish fuzzy suggestions
    EditModal.tsx      — Edit/delete with confirmation step
    Toast.tsx          — Temporary success/error messages
  hooks/
    useAutocorrect.ts  — Fuse.js powered suggestion engine
    useTheme.ts        — Dark/light mode with localStorage
  lib/
    supabase.ts        — Supabase client and type definitions
    dictionary.ts      — Grocery and household word list (Hinglish)
    export.ts          — CSV export utility
  styles/
    globals.css        — CSS variables, base styles

supabase-schema.sql    — Run this in Supabase SQL Editor
```

---

## How Autocorrect Works

When typing an item name, the app:

1. Checks a direct corrections map (e.g. `tometo` → `tomato`, `dhaniya` → recognised as is)
2. If not found, uses Fuse.js fuzzy search against a dictionary of ~200 grocery and household words in both English and common Hinglish spellings
3. Shows up to 4 suggestion chips below the input — tap one to apply it
4. Suggestions appear after 2 characters, with a 250ms debounce

To add more words to the dictionary, edit `src/lib/dictionary.ts`.

---

## Editing Records

Records are intentionally not easy to edit accidentally:

1. In the Records tab, **long-press** (hold for 1 second) any item
2. A "Tap to edit" hint appears — then tap the item
3. A confirmation sheet asks "Are you sure you want to edit this?" — choose Yes
4. Only then does the edit form open

Deletion also requires a second confirmation inside the edit form.

---

## Ledger

The ledger tracks cash given to three people: **H**, **S**, and **L**.

- Each person has their own tab with total given, returned, and outstanding amounts
- Add a transaction by tapping the button — choose "given" or "returned"
- The outstanding balance shows how much cash is currently with that person
- All history is shown in chronological order

---

## Updating the App

Whenever you make changes to the code:

```bash
git add .
git commit -m "describe what changed"
git push
```

Vercel automatically rebuilds and deploys within 1–2 minutes.

---

## Troubleshooting

**App shows a blank page or error**
- Check that your environment variables are set correctly in Vercel
- Go to Vercel → your project → Settings → Environment Variables

**Data is not saving**
- Check that the SQL schema was run successfully in Supabase
- Go to Supabase → Table Editor and check if the `expenses` table exists

**Autocorrect is not showing suggestions**
- Make sure you have typed at least 2 characters
- The word may already be correct — suggestions only appear for unrecognised words

---

## Adding More Categories

Go to the **Settings** tab in the app → type a new category name → tap Add. The default categories (fruits, vegetables, others) cannot be removed.
