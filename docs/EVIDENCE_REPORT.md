# Evidence report — no assumptions

**Date:** 2026-03-14

---

## 1. Exact repo root where supabase/ lives

**Command run:**
```powershell
cd "c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main"
Get-Location | Select-Object -ExpandProperty Path
Test-Path ".\supabase"
Test-Path ".\supabase\migrations"
Get-ChildItem ".\supabase\migrations\*.sql" | Measure-Object | Select-Object -ExpandProperty Count
```

**Output:**
```
C:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main
True
True
59
```

**Proof:** Repo root is `C:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main`. Folder `supabase` exists, `supabase\migrations` exists, and there are 59 `.sql` files.

---

## 2. Exact current Vite env values

**Source:** `.env` and `.env.local` (Vite loads `.env` then overrides with `.env.local`).

**`.env` contents:**
```
# Forge Ops CRM — Supabase (Vite uses these; do not use NEXT_PUBLIC_* here)
VITE_SUPABASE_PROJECT_ID=jpwameqbirjeomwhxfyh
VITE_SUPABASE_URL=https://jpwameqbirjeomwhxfyh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SLc8fM27WdnkhV7p4dVoZQ_GfYZREfJ
```

**`.env.local` contents:**
```
# Local overrides (optional). This Vite app uses only VITE_* Supabase vars.
# NEXT_PUBLIC_* Supabase vars are not used by the frontend client — safe to ignore or remove.
VITE_SUPABASE_PROJECT_ID=jpwameqbirjeomwhxfyh
VITE_SUPABASE_URL=https://jpwameqbirjeomwhxfyh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_SLc8fM27WdnkhV7p4dVoZQ_GfYZREfJ
```

**Proof:** The app uses (with `.env.local` overriding when present):
- `VITE_SUPABASE_URL` = `https://jpwameqbirjeomwhxfyh.supabase.co`
- `VITE_SUPABASE_PROJECT_ID` = `jpwameqbirjeomwhxfyh`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_SLc8fM27WdnkhV7p4dVoZQ_GfYZREfJ`

---

## 3. Local Supabase CLI installed and version

**Command run:**
```powershell
cd "c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main"
npx supabase --version
```

**Output:**
```
2.78.1
```

**Proof:** CLI runs via `npx supabase`; version **2.78.1**. Exit code 0.

---

## 4. Which Supabase project the repo is linked to

**Check 1 — project-ref file:**
```powershell
if (Test-Path ".supabase\project-ref") { Get-Content ".supabase\project-ref" } else { "No .supabase\project-ref file" }
```
**Output:** `No .supabase\project-ref file`

**Check 2 — db push (requires link):**
```powershell
npx supabase db push
```
**Output:** `Cannot find project ref. Have you run supabase link?`

**Proof:** The repo is **not** linked to any Supabase project. There is no `.supabase\project-ref` file, and `db push` reports that the project ref is missing. `config.toml` has `project_id = "jpwameqbirjeomwhxfyh"` but the CLI does not use that for remote push; it uses the ref stored by `supabase link`.

---

## 5. Exact output of status, projects list, link status

**Command:** `npx supabase status`  
**Exit code:** 1  
**Output:**
```
failed to inspect container health: error during connect: in the default daemon configuration on Windows, the docker client must be run with elevated privileges to connect: Get "http://%2F%2F.%2Fpipe%2Fdocker_engine/v1.51/containers/supabase_db_jpwameqbirjeomwhxfyh/json": open //./pipe/docker_engine: The system cannot find the file specified.
Try rerunning the command with --debug to troubleshoot the error.
```
**Note:** `status` talks to **local** Docker (local Supabase stack). The container name includes `jpwameqbirjeomwhxfyh`, but Docker isn’t available/working here, so this does not prove a remote link.

**Command:** `npx supabase projects list`  
**Exit code:** 1  
**Output:**
```
Access token not provided. Supply an access token by running supabase login or setting the SUPABASE_ACCESS_TOKEN environment variable.
Try rerunning the command with --debug to troubleshoot the error.
```

**Link status:** No separate “link status” command was run. Evidence of no link: missing `.supabase\project-ref` and `db push` error “Cannot find project ref. Have you run supabase link?”

---

## 6–7. Migration push from repo root against jpwameqbirjeomwhxfyh — raw output

**Commands run (in order):**
```powershell
cd "c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main"
npx supabase db push
```

**Exit code:** 1

**Full terminal output:**
```
Cannot find project ref. Have you run supabase link?
Try rerunning the command with --debug to troubleshoot the error.
```

**Proof:** No migrations were applied. Push was not attempted against any remote project because the CLI reported no project ref (link not done).

---

## 8. First failed migration / exact error

**N/A.** Migration push did not reach the stage of running migrations. The failure is **before** any migration file is executed: **“Cannot find project ref. Have you run supabase link?”**

So there is no “first failed migration file” and no migration error message to capture.

---

## 9. CLI cannot link or push — what you must do

**Why:** No Supabase access token in this environment. `supabase link` and `supabase db push` were not run successfully here.

**Exact commands to run yourself (in PowerShell):**

```powershell
cd "c:\Users\drtra\Downloads\PRS\Web Design\Lovable CRM\prsroofwarriorcrm-main\prsroofwarriorcrm-main"

# 1) Log in (opens browser; you must complete login)
npx supabase login

# 2) Link to forge-ops-crm (intended project ref)
npx supabase link --project-ref jpwameqbirjeomwhxfyh

# 3) Push migrations
npx supabase db push
```

**What to expect:**

- **After step 1:** Browser opens; you sign in to Supabase; CLI reports success. No project ref is set yet.
- **After step 2:** CLI writes project ref to `.supabase\project-ref` and fetches DB credentials. You should see output indicating link to project `jpwameqbirjeomwhxfyh` (or forge-ops-crm).
- **After step 3:** CLI applies migrations one by one. You should see lines like “Applying migration …” and finally a success message. If any migration fails, the output will name the **first failed migration file** and the error.

**First thing to check if output is wrong:**

- If **step 2** fails: Confirm you’re logged in (`npx supabase login` again). Confirm the project ref is correct in the dashboard (URL or Settings → General) and matches `jpwameqbirjeomwhxfyh`.
- If **step 3** fails: In the terminal output, find the **first** migration filename mentioned in the error. That is the first failed migration. Copy the full error text and fix that migration (or run any prerequisite it needs); do not skip migrations.

---

## 10. Success not claimed — proof required

**Migrations applied:** No proof. No CLI output showing migrations applied was captured.

**Tables exist in DB:** No proof. Your validation queries returned “Success. No rows returned,” which for `information_schema.tables` (and similar) means **no rows** — i.e. no tables. So the target database is still empty.

**Conclusion:** The migration push has **not** landed on the target database. The repo is not linked; push was never run successfully. To get proof of success you must:

1. Run the three commands in section 9 and capture the **full** terminal output of `npx supabase db push`.
2. If push succeeds, run again the validation query:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
   ORDER BY table_name;
   ```
   and confirm it returns **rows** (e.g. `jobs`, `customers`, `profiles`, …). That is the hard proof that the schema landed.
