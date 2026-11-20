# Journal v3

A private, editorial journal built with the latest Next.js. This is a full
redesign of the v2 journal: new information architecture, new type system, new
palette, server-verified PIN gate, and a Netlify-ready deployment.

## Design direction

Generated with the `ui-ux-pro-max` skill (`design-system/journal-v3/MASTER.md`):

| Role | Light | Dark |
|---|---|---|
| Background | `#FFFBEB` | `#171310` |
| Foreground | `#0F172A` | `#F4EDE4` |
| Card | `#FFFFFF` | `#211B15` |
| Primary | `#92400E` | `#E6B17E` |
| Secondary | `#A16207` | `#E0A458` |
| Accent | `#6366F1` | `#A5B4FC` |
| Destructive | `#DC2626` | `#F87171` |

- **UI:** Inter, tight tracking, 44px controls.
- **Reading surface:** Source Serif 4, 19px / 1.8, 68ch measure
  (`design-system/journal-v3/pages/editor.md`).
- **Labels, dates, counts:** JetBrains Mono, uppercase, wide tracking.
- **Surfaces:** warm cream paper, soft 16–24px radii, restrained shadows.
- **Motion:** 200–280ms ease-out; opacity/transform only; reduced-motion
  disables animation.
- **Icons:** Lucide, 1.75 stroke, never emoji.

## Features

- Server-verified 4-digit PIN (`APP_PIN` + signed httpOnly cookie).
- Optional “remember this device” for 30 days.
- Real-time Firestore journal index grouped by month, newest first.
- Full-text search across titles, bodies, and tags.
- Date-range and tag filters in a native, accessible dialog.
- Editor with autosizing title/body, tag chips, word count, reading time,
  manual save, `⌘S` / `Ctrl+S`, and `⌘N` / `Ctrl+N`.
- Persistent suggested-tag buttons (🧐 serious, 🗑️ dump, 😤 vent, 💡 idea,
  ❓ question, ☀️ positivity, 🎯 goal, 🍔 Mugshots, 🌙 dream, 💬 quote) that
  add/remove tags in one click.
- Delete confirmation and unsaved-change guards.
- AI title and tag suggestions through the server-only DeepSeek API
  (`deepseek-flash`, DeepSeek-V4.1-Flash).
- Light/dark theme with no-flash initialization.
- Responsive layouts at 375, 768, 1024, and 1440px; no horizontal scroll.
- Accessible focus rings, labelled controls, native dialogs, live status
  regions, safe-area padding, and reduced-motion support.

## Stack

- Next.js `16.4.6` (App Router, Turbopack)
- React `19.3`
- Tailwind CSS `4.3`
- Firebase `13` (Firestore client SDK)
- Lucide React
- `@netlify/plugin-nextjs` `5.16.7`

## Getting started

```bash
npm install
cp .env.example .env.local
# fill in the values below
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

| Variable | Scope | Purpose |
|---|---|---|
| `APP_PIN` | server | 4-digit journal PIN |
| `AUTH_SECRET` | server | HMAC key for session cookies (`openssl rand -hex 32`) |
| `NEXT_PUBLIC_FIREBASE_*` | public | Firebase web app config |
| `DEEPSEEK_API_KEY` | server | AI title/tag generation |
| `DEEPSEEK_MODEL` | server | defaults to `deepseek-flash` |

`AUTH_SECRET` is required in production. Without it the PIN route fails closed
with a configuration error. In development it can fall back to `APP_PIN`.

## AI

Title and tag suggestions call DeepSeek directly at
`https://api.deepseek.com/chat/completions` using `DEEPSEEK_MODEL`
(default `deepseek-flash`, currently DeepSeek-V4.1-Flash-1017). Thinking mode is
disabled for these short, latency-sensitive generations. Add `DEEPSEEK_API_KEY`
to `.env.local` for local development and to Netlify's environment variables for
production.

## Netlify deployment

`netlify.toml` is included and sets:

- build command: `npm run build`
- publish directory: `.next`
- Node `22`
- Next.js runtime plugin: `@netlify/plugin-nextjs`
- baseline security headers

Steps:

1. Push the repository to GitHub/GitLab/Bitbucket.
2. Create a Netlify site from the repo.
3. Add every variable from `.env.example` under **Site configuration →
   Environment variables**. Set a real `AUTH_SECRET` and `APP_PIN`.
4. Deploy. Netlify runs the plugin automatically from `netlify.toml`.

The production build can be checked locally with:

```bash
npm run build
npm run start
```

## Data model

Firestore collection: `journal_entries`

| Field | Type | Notes |
|---|---|---|
| `title` | string | empty means “Untitled entry” |
| `content` | string | plain text |
| `tags` | string | comma-separated |
| `strict_date` | string | `YYYY-MM-DD`, America/Chicago |
| `created_at` | Timestamp | sort key |
| `updated_at` | Timestamp | null until first save |

The v3 app reads and writes the same collection as v2, so existing entries and
the mobile app remain compatible.

## Security notes

- The PIN is verified on the server; it is not shipped in the client bundle.
- AI routes require the session cookie and use a server-only key.
- PIN attempts are rate-limited per client (best effort, in-memory).
- Session cookies are `httpOnly`, `SameSite=Lax`, and `Secure` in production.
- **Firestore rules matter.** The PIN gates this UI and its API routes, but the
  Firebase web config is public. Lock down `journal_entries` with Firestore
  rules (or add Firebase Auth) if the data must be protected from direct
  database access. The v3 UI alone is not encryption.

## Scripts

```bash
npm run dev        # development server
npm run build      # production build
npm run start      # production server
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Project layout

```
app/
  api/auth/                  server PIN + session cookie
  api/ai/                    server-only DeepSeek routes
  components/                lock screen, index, editor, dialogs, rail
  hooks/useJournal.ts        Firestore subscription, filters, save/delete
  lib/                       auth, AI, Firebase, dates, types
  globals.css                tokens, typography, component classes
design-system/journal-v3/    persisted skill output + editor override
.agents/skills/              local ui-ux-pro-max skill set (git-ignored)
```
