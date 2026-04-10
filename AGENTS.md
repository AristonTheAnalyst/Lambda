# Lambda — Agent / Cursor context

## How this repo talks to Cursor

- **`CLAUDE.md`** (repo root) is the **full** project handbook: stack, routing, components, DB, sync, quirks.
- In Cursor, that file is typically attached as a **workspace rule** so agents see it **automatically**—you do **not** need a Skill for day-to-day work on this repo.
- **Skills** (in your user `skills` folder) are optional extras for specialized workflows (e.g. Supabase Postgres tuning). They are **not** a substitute for `CLAUDE.md` and are **not** loaded unless the task matches or you invoke them.

## If you only read one file

Open [`CLAUDE.md`](./CLAUDE.md).

## Cursor Rules (optional duplicate)

[`.cursor/rules/lambda.mdc`](./.cursor/rules/lambda.mdc) repeats **short** must-follow constraints so Cursor applies them even when workspace rule wiring changes. It intentionally stays small; details live in `CLAUDE.md`.

## Offline QA checklist (preview / device)

Use **airplane mode** or disable **both** Wi‑Fi and cellular so `NetInfo` reports disconnected.

1. **Logged in, online once** → then offline cold start: app should reach tabs (not infinite loading); banner shows “Offline”.
2. **Start workout, add sets, end or cancel** offline → data visible in UI; go online → `SyncStatusIcon` clears pending / sync runs.
3. **Cancel in-progress workout that already synced** offline → after reconnect, server workout should reflect `is_active: false` (queued mutation path).
4. **Fresh install, offline**: expect login to fail until network; first-time onboarding still needs server.

## When things are “ready to test”

After a build that includes the latest `main` (or your branch): run an **EAS preview** (or dev client), install on device, run the checklist above plus your other features.
