# Mission Control

A unified dashboard for managing tasks, content pipelines, calendar events, team members, agent status, and memory — built with Next.js 15, TypeScript, and Tailwind CSS v4.

![Stack](https://img.shields.io/badge/Next.js-15-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind-v4-38bdf8)

## Features

- **Tasks** — Kanban board with drag-and-drop (Backlog → In Progress → Review → Done)
- **Content Pipeline** — 8-stage content creation workflow with script editor and file attachments
- **Calendar** — Monthly grid with recurring events, cron job sidebar, and event filtering
- **Team** — Org chart with departments, member cards, skills, and spawn labels
- **Digital Office** — Pixel art office showing agent workstations with real-time status via canvas rendering
- **Memory** — Browse and search markdown files with rendered document viewer

## Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Data**: JSON file storage (no database required)
- **Auth**: Password-based with scrypt hashing, session cookies
- **Real-time**: Server-Sent Events (SSE)
- **Package Manager**: Bun

Zero external UI libraries — all components built from scratch with Tailwind.

## Getting Started

```bash
# Install dependencies
bun install

# Create data directory
mkdir -p data

# Start dev server
bun run dev

# Build for production
bun run build
bun run start
```

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `DATA_DIR` | `./data` | Path to JSON data files |
| `MEMORY_DIR` | `../memory` | Path to memory markdown files |
| `MEMORY_MD` | `../MEMORY.md` | Path to main memory file |

## API Routes

| Route | Methods | Description |
|---|---|---|
| `/api/auth` | GET, POST | Auth status, login, setup, logout |
| `/api/tasks` | GET, POST, PUT, DELETE | Task CRUD |
| `/api/content` | GET, POST, PUT, DELETE | Content pipeline CRUD |
| `/api/calendar` | GET, POST, PUT, DELETE | Calendar event CRUD |
| `/api/team` | GET, POST, PUT, DELETE | Team member CRUD |
| `/api/office` | GET, POST | Agent office status |
| `/api/memory` | GET | Memory files and search |
| `/api/events` | GET | SSE stream for real-time updates |

## Auth

- First visit prompts password setup
- Localhost requests bypass auth (for CLI tools)
- Bearer API key also accepted for programmatic access
- Sessions last 7 days

## Mobile

Fully responsive — bottom tab bar navigation, swipeable kanban columns, slide-up modals, and compact calendar on phone screens.

## License

MIT
