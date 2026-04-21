# 🏆 Tournament Hub

Office Sports Championship management app built with Vue 3 + TypeScript + Vite. Reads player/team data from Google Sheets and writes match results back via Google Apps Script.

## Live

Deployed on GitHub Pages: `https://<username>.github.io/tournament-app/`

## Features

- **Multi-game support** — TT Doubles, TT Singles, Carrom Doubles, Carrom Singles, Chess, Foosball Doubles, Foosball Singles, Dart
- **Google Sheets as database** — live data, no backend needed
- **Drag & drop match creation** — drag teams into slots, confirm with date
- **Knockout bracket** — visual bracket view with round progression
- **Click to set winner** — select winner, add score/remarks, saves to sheet
- **Results tab** — completed matches with stats
- **Auto team pairing** — fuzzy name matching for doubles partners
- **Dark mode** — automatic based on system preference
- **Responsive** — works on mobile

## Tech Stack

- Vue 3 (Composition API, `<script setup>`)
- TypeScript
- Vite
- Google Sheets (read via gviz CSV API)
- Google Apps Script (write-back)

## Google Sheet Structure

Each game has a tab (e.g. `TT_Doubles`) with columns:

| Team ID | Players Name | Partner | Days Available at Office | Remarks | Completed On |
|---------|-------------|---------|--------------------------|---------|--------------|
| T1 | Player A | Player B | Mon,Tue | | |

Matches are stored in auto-created `_Matches` tabs (e.g. `TT_Doubles_Matches`):

| Match ID | Team 1 | Team 2 | Scheduled Date | Winner | Remarks |
|----------|--------|--------|----------------|--------|---------|
| M1 | T1 | T2 | 23-Apr | T1 | 3-1 |

## Setup

### 1. Google Sheet

- Create a Google Sheet with game tabs
- **File → Share → Publish to web** (entire document)
- Copy the Sheet ID from the URL

### 2. Google Apps Script

- Open the sheet → **Extensions → Apps Script**
- Paste the code from `apps-script.js`
- **Deploy → New deployment → Web app**
  - Execute as: **Me**
  - Who has access: **Anyone**
- Copy the deployment URL

### 3. Local Development

```bash
# Clone
git clone https://github.com/<username>/tournament-app.git
cd tournament-app

# Install
npm install

# Create .env (see .env.example)
cp .env.example .env
# Edit .env and add your Apps Script URL

# Run
npm run dev
```

### 4. Deploy to GitHub Pages

1. Push to GitHub
2. Go to repo **Settings → Secrets and variables → Actions**
3. Add secret: `VITE_APPS_SCRIPT_URL` = your Apps Script URL
4. Go to **Settings → Pages** → Source: **GitHub Actions**
5. Push to `main` — auto deploys

## Adding New Games

1. Add a new tab in the Google Sheet with the same column structure
2. Add the tab name to `sheetNames` array in `src/App.vue`
3. Add an icon mapping in `gameIcon()` if needed

## Updating Apps Script

After editing `apps-script.js`, paste it in Apps Script editor and create a **new deployment version** (Deploy → Manage deployments → Edit → New version).
