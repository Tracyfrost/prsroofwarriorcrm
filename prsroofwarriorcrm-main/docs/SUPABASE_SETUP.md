# Supabase setup — Forge Ops CRM

## Source of truth (forge-ops-crm)

- **Project name:** forge-ops-crm  
- **Project ref:** `jpwameqbirjeomwhxfyh`  
- **URL:** `https://jpwameqbirjeomwhxfyh.supabase.co`  
- **Publishable key:** set in `.env` as `VITE_SUPABASE_PUBLISHABLE_KEY` (do not commit real keys).

## Repo layout

- **Repo root (where `supabase/` lives):**  
  `c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main`  
  (This folder contains `supabase/`, `src/`, `package.json`, `.env`.)

- **Migrations:** `supabase/migrations/` — 59 files, run in **timestamp order** (filename prefix).

## Env (Vite)

This app uses **only** `VITE_*` Supabase vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

**Obsolete / unused:** `NEXT_PUBLIC_SUPABASE_*` and `SUPABASE_SECRET_KEY` are not used by the frontend client. Safe to remove from `.env.local` or leave as placeholders; they do not affect the app.

## Apply full schema (empty database)

### Option A: Supabase CLI (recommended)

From the **repo root** (the folder that contains `supabase/`):

```bash
# 1. Install CLI if needed: https://supabase.com/docs/guides/cli
# 2. Log in (browser)
supabase login

# 3. Link to project (use ref from dashboard URL or Settings → General)
supabase link --project-ref jpwameqbirjeomwhxfyh

# 4. Push all migrations
supabase db push
```

If `supabase` is not in PATH, use the full path or install via npm:  
`npm install -g supabase`

### Option B: SQL Editor (manual)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → project **jpwameqbirjeomwhxfyh** → **SQL Editor**.
2. Run migration files **in order** (oldest first). First file to run:
   - `supabase/migrations/20260209221957_215accab-a3a8-4cd7-9c0d-33caaf8c208f.sql`
3. Then run every subsequent file in the same numeric order (e.g. 20260209225551, 20260209231358, … through 20260314000000).
4. Run each file as one script; do not reorder or skip.

**If push fails:** Inspect the **first** migration that errors (the filename is in the error). Common causes: missing extension (e.g. `uuid-ossp`), or a type/table that a later migration expects. Fix that migration or run any required setup (e.g. enable extension) then re-run from that file onward.

**Migration order (run in this order if using SQL Editor):**  
First file: `20260209221957_215accab-a3a8-4cd7-9c0d-33caaf8c208f.sql`  
Then every other file in `supabase/migrations/` sorted by filename (timestamp prefix). Last file: `20260314000000_add_squares_tracking.sql`.

## After schema is applied

- **Types:** The repo uses `src/integrations/supabase/types.ts`. If you use Supabase codegen, regenerate from the linked project:
  - `npx supabase gen types typescript --project-id jpwameqbirjeomwhxfyh > src/integrations/supabase/types.ts`
  - (Requires Supabase CLI and `supabase link` or `--project-id` and DB connection.)
- **App:** Restart dev server after changing `.env`. The client in `src/integrations/supabase/client.ts` reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` only.
