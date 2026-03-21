# PRS Roof Warrior CRM

Vite + React + Supabase app. The **application root** (where `package.json` and `vite.config.ts` live) is the **`prsroofwarriorcrm-main`** subdirectory of this repository.

## Vercel

1. Import this GitHub repo in [Vercel](https://vercel.com) → **Add New Project**.
2. Set **Root Directory** to: `prsroofwarriorcrm-main`
3. Framework: Vite (auto). Build: `npm run build` · Output: `dist`
4. Add **Environment Variables** (Production & Preview):

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID` (if used)

   Use the same values as local `.env.local`.

5. Deploy. `vercel.json` in the app folder enables client-side routing (SPA).

## Supabase (not deployed by Vercel)

- Run migrations: `supabase db push` (from machine with CLI linked to project).
- Deploy Edge Function: `npm run deploy:user-admin` from `prsroofwarriorcrm-main` (requires Supabase CLI).

See `prsroofwarriorcrm-main/docs/SUPABASE_SETUP.md` for details.
