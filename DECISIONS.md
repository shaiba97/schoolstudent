# Student portal decisions

## 2026-10-07 — Scaffold (Phase 4)

- **Port 5200.** Bare `next dev` defaulted to 3000 and squatted the backend's
  port. `dev`/`start` are pinned to `-p 5200` (academic 5000, teacher 5100).
- **npm, not pnpm, for this app.** `node_modules/next` was a pnpm junction
  pointing outside the project, which Turbopack refuses to resolve at build
  time ("files outside of the workspace root are not compiled"). Both working
  Next apps (academic, teacher) use npm with real directories, so this app
  matches them. Backend stays pnpm.
- **Indigo theme, not teal.** Teacher is teal (hue ~190); student is indigo
  (hue ~275) on the same token structure so the two portals are separable at
  a glance. Also added the missing `--color-info` theme mapping that teacher's
  `@theme inline` block lacks (it defines `--info` but never maps it).
- **Deleted the scaffolded `components/ui/*` set (46 files) plus `hooks/`.**
  The generated set pointed `cn` at the `cn` npm package, diverging from the
  `clsx`+`tailwind-merge` convention everything else uses. Replaced with the
  9 proven hand-written primitives ported from teacher.
- **`sp_` cookie prefix** (`sp_token`, `sp_tenant`) and `STUDENT_*` env names,
  mirroring teacher's `tp_`/`TEACHER_*`. No shared session between portals.
- **Socket ticket, not token-in-JS.** The session JWT is httpOnly and Lax
  cookies don't ride a cross-origin socket handshake, so
  `GET /api/students/me/socket-ticket` mints a 120s audience-scoped ticket.
  The badge bumps optimistically on push and reconciles from REST on every
  route change.
- **Bottom nav holds 5 of 7 sections** (Dashboard, Results, Timetable,
  Attendance, Cases); Notifications bell + profile live in the top bar —
  the same split the teacher shell settled on.
- **No React Query.** Matches the repo: `useState` + promise-continuation
  fetching, per the `react-hooks/set-state-in-effect` lint rule.
