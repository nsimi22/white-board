# Jira Roadmap

A fast, drag-and-drop product roadmap timeline that pulls directly from your Jira project — epics, stories, owners, and statuses, all on a zoomable timeline you control.

## Features

- **Jira-native** — connects to your Jira Cloud via API token; no third-party service involved
- **Interactive timeline** — drag epics/stories to move them; drag the left/right edges to resize
- **Live date sync** — changes are written back to Jira automatically
- **Expandable epics** — click an epic to reveal its stories on the same timeline
- **Zoom levels** — Day / Week / Month / Quarter
- **Filters** — filter by status, assignee, or label
- **Dark UI** — easy on the eyes during long planning sessions

## Quick start

### 1. Install

```bash
npm install
```

### 2. Run (dev mode — starts both proxy server and Vite)

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### 3. Connect Jira

Click **Connect Jira** and enter:

| Field | Example |
|-------|---------|
| Jira Domain | `acme.atlassian.net` |
| Email | `you@company.com` |
| API Token | Generate at id.atlassian.com → Security → API tokens |

Pick a project and click **Save & Load Roadmap**.

## How it works

- The **Vite dev server** serves the React app on port 5173.
- A lightweight **Express proxy** runs on port 3001 and forwards `/proxy/*` requests to your Jira instance, injecting Basic auth headers. Your credentials never leave your machine.
- Epic dates map to `customfield_10015` (start date) and `duedate`. If an epic has no dates, it appears as a dashed placeholder bar that can still be dragged into position.
- Story children are fetched on demand when you expand an epic (supports both classic "Epic Link" and next-gen `parent` fields).

## Tech stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Zustand (state + localStorage persistence)
- date-fns
- Express (proxy server)
