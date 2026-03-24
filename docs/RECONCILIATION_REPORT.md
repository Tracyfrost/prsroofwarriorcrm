# Supabase reconciliation report — Forge Ops CRM

**Date:** 2026-03-14  
**Target project:** forge-ops-crm (ref `jpwameqbirjeomwhxfyh`)

---

## What was changed

### 1. Env files (Vite)

- **`.env`**  
  - Set `VITE_SUPABASE_PROJECT_ID=jpwameqbirjeomwhxfyh`  
  - Set `VITE_SUPABASE_URL=https://jpwameqbirjeomwhxfyh.supabase.co`  
  - Set `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SLc8fM27WdnkhV7p4dVoZQ_GfYZREfJ`  
  - Added comment that this app uses VITE_* only (not NEXT_PUBLIC_*).

- **`.env.local`**  
  - Aligned with same project ref, URL, and publishable key.  
  - Documented that NEXT_PUBLIC_* Supabase vars are not used by this Vite app and can be ignored or removed.

### 2. Supabase config

- **`supabase/config.toml`**  
  - Updated `project_id` from `whkoyzidbcukwdoqekcm` to `jpwameqbirjeomwhxfyh`  
  - Added comment: Forge Ops CRM — project ref jpwameqbirjeomwhxfyh.

### 3. Documentation

- **`docs/SUPABASE_SETUP.md`** (new)  
  - Source of truth: project name, ref, URL.  
  - Repo root where `supabase/` lives.  
  - Env: only VITE_* used; NEXT_PUBLIC_* obsolete.  
  - Option A: CLI steps (`supabase login`, `supabase link --project-ref jpwameqbirjeomwhxfyh`, `supabase db push`).  
  - Option B: SQL Editor — run migrations in timestamp order; first file named.  
  - What to do if push fails.  
  - After schema: optional types generation command.

---

## What was verified

- **Repo root:** `supabase/` and `supabase/migrations/` live in  
  `prsroofwarriorcrm-main\prsroofwarriorcrm-main` (same folder as `src/`, `package.json`, `.env`).

- **Client:** `src/integrations/supabase/client.ts` reads only `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY` — no hardcoded URLs or keys.

- **No stale project refs:** Grep for old project refs (`whkoyzidbcukwdoqekcm`, `ipwameqbirjeomwhx` without trailing `fyh`) found none after config.toml update.

- **Migrations:** 59 files in `supabase/migrations/`; order is by filename timestamp; first migration creates `profiles`, `user_roles`, `customers`, `audits` (no dependency on other app tables); second creates `jobs` (depends on `customers`). Ordering is valid for an empty DB.

- **Migrations and schema:** No ad hoc schema was added; the app is intended to use the existing migration history only.

---

## What could not be completed (requires you)

### 1. Supabase CLI not in PATH

- **Checked:** `supabase --version` → command not recognized.  
- **Not done:** `supabase link`, `supabase db push`.  
- **You must:** Install Supabase CLI and run the commands in `docs/SUPABASE_SETUP.md`, or apply migrations manually via SQL Editor.

### 2. Apply schema to project `jpwameqbirjeomwhxfyh`

- **Not done:** No schema has been applied from this machine (CLI missing).  
- **You must:** Either run `supabase db push` from the repo root after installing and linking the CLI, or run all 59 migration files in order in the Supabase SQL Editor.

### 3. TypeScript types refresh

- **Not done:** `src/integrations/supabase/types.ts` was not regenerated (no CLI, DB not yet migrated).  
- **Optional:** After migrations are applied, you can regenerate types (see `docs/SUPABASE_SETUP.md`). The existing `types.ts` already includes the tables and columns used by the app (including `jobs` and squares columns); regeneration is for consistency with the live DB.

---

## Exact next commands for you

### If you install Supabase CLI

```bash
# From repo root (folder that contains supabase/)
cd "c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main"

supabase login
supabase link --project-ref jpwameqbirjeomwhxfyh
supabase db push
```

If `supabase` is not in PATH after install, use the full path to the binary or:  
`npm install -g supabase` then run the same commands.

### If you use SQL Editor instead

1. Open https://supabase.com/dashboard → project **jpwameqbirjeomwhxfyh** → SQL Editor.  
2. Run the first migration: open `supabase/migrations/20260209221957_215accab-a3a8-4cd7-9c0d-33caaf8c208f.sql`, copy entire contents, paste in SQL Editor, Run.  
3. Run the next 58 files in the same order (sort by filename; last is `20260314000000_add_squares_tracking.sql`).

### If `db push` or a migration fails

- Note the **exact migration file name** in the error.  
- First file to inspect: `20260209221957_215accab-a3a8-4cd7-9c0d-33caaf8c208f.sql` (creates profiles, user_roles, customers, audits and auth trigger).  
- Typical issues: missing Postgres extension, or a reference to a type/table that does not exist yet; fix that migration or run prerequisites then re-run from that file.

### After schema is applied

- Restart the Vite dev server so it picks up env: `npm run dev`.  
- Optionally regenerate types:  
  `npx supabase gen types typescript --project-id jpwameqbirjeomwhxfyh > src/integrations/supabase/types.ts`  
  (Requires Supabase CLI and linked or connected project.)

---

## Summary

| Item | Status |
|------|--------|
| Env pointed at jpwameqbirjeomwhxfyh | Done |
| config.toml project_id updated | Done |
| Client uses only VITE_* vars | Verified |
| No hardcoded wrong project refs | Verified |
| Migrations present and ordered | Verified |
| CLI available / db push run | Not done (CLI not installed) |
| Schema applied on Supabase | Pending (you) |
| Types regenerated | Optional (you, after push) |

All codebase-side steps that can be done without CLI or manual Supabase access are complete. Apply the schema using one of the options above, then run the app and re-run Reports (and any jobs/saved_reports usage) to confirm.
