# Deployment Plan — Expense Tracker

**Status:** Ready for Validation
**Created:** 2026-07-08
**Owner:** antoinewang

---

## 1. Mode & scope

**MODIFY** — extend the existing local-first React SPA with:
- Per-user server-side persistence
- Sign-in with GitHub via Azure Static Web Apps built-in auth ("Easy Auth")
- Reproducible Azure infrastructure as Bicep
- GitHub Actions CI/CD (test → build → deploy on push to `main`, preview environments on PRs)
- Preserve current local-first / PWA / offline behavior for anonymous users (guest mode)

## 2. Requirements

- Personal use; ~1 user today, occasional family additions later
- Cost target ≈ $0/month using Azure free tiers
- Zero long-lived secrets in the repo — SWA deployment API token stored as a repo secret; Cosmos accessed from Functions via managed identity + data-plane RBAC (no connection strings)
- All infra is code — no click-ops in the Azure portal after the one-time bootstrap

## 3. Codebase (scan)

- Vite + React 18 + TypeScript + Tailwind + Zustand + RHF/Zod + Recharts + React Router
- Persistence: Zustand `persist` → `localStorage` (`expense-tracker-v1`)
- PWA via `vite-plugin-pwa`; SW precache
- 33 Vitest unit tests already green (`npm test`)
- Domain: `Expense`, `Category`, `RecurringExpense`, `BudgetMap`

## 4. Recipe

**Bicep + `azure.yaml`.** `azd up` for local end-to-end. GitHub Actions handles CI/CD in the cloud.

## 5. Architecture

```
   ┌────────────────┐      GitHub Actions
   │  GitHub repo   │──push─▶  CI: npm test + npm build
   └────────────────┘         CD: azure/static-web-apps-deploy@v1
                                        │
                                        ▼
                        ┌──────────────────────────────────┐
                        │  Azure Static Web Apps (Free)    │
                        │  ├─ SPA (dist/)                  │
                        │  └─ Managed API (api/) ────────── ┼──▶ Azure Cosmos DB (Free tier)
                        │         (managed identity)       │      NoSQL API, container
                        │  Easy Auth: /.auth/login/github  │      pk /userId, 1 doc / user
                        └──────────────────────────────────┘
```

## 6. Resources & choices

| Concern | Choice | Notes |
|---|---|---|
| SPA + API hosting | **Static Web Apps — Free** | 100 GB bandwidth/month, unlimited SSL, PR preview envs |
| Auth | **SWA built-in GitHub provider** | Zero app registration; header `x-ms-client-principal` |
| Backend | **SWA Managed Functions** (Node 20, v4 model, TS) | Same repo, `/api/*`, cold start acceptable for personal use |
| Datastore | **Cosmos DB — Free Tier, NoSQL API** | 1000 RU/s + 25 GiB free forever, one per subscription |
| Data model | Single doc per user (`id = userId`, pk `/userId`) | Simplest sync; whole-doc PUT on any mutation; debounced 500 ms |
| Auth from Functions → Cosmos | **Managed identity + Cosmos data-plane RBAC** | No connection strings in code |
| Region | **eastus2** | Both SWA Free & Cosmos free tier available, broad latency |
| IaC | **Bicep** in `infra/`, `azd`-compatible via `azure.yaml` | Also supports `az deployment sub create` if user prefers manual |
| CI/CD | **GitHub Actions** — `.github/workflows/ci-cd.yml` | `azure/static-web-apps-deploy@v1` with SWA API token as repo secret |

## 7. API contract (v1)

Single "user data doc" endpoint — small enough for personal scale, dead simple.

| Method | Route | Body | Response |
|---|---|---|---|
| `GET` | `/api/data` | — | `{ userId, data, updatedAt }` — creates default seed doc if none exists |
| `PUT` | `/api/data` | `{ data: { expenses, categories, recurring, budgets } }` | `{ updatedAt }` — replaces doc |
| `GET` | `/api/me` | — | Passthrough of `/.auth/me`. Useful for the SPA to detect sign-in state |

Protected by SWA `staticwebapp.config.json` routes → `authenticated` role required.

## 8. Client changes

- `src/lib/api.ts` — thin fetch wrapper for `/api/data`, `/api/me`, `/.auth/*`
- `src/hooks/useAuth.ts` — resolves current user (or `null` for guests) from `/.auth/me`
- `src/lib/sync.ts` — subscribes to the Zustand store; when signed in, debounced-PUTs the full doc; hydrates from the server on sign-in
- `src/store/expenseStore.ts` — adds `replaceAll(state)`, `syncStatus`, `lastSyncedAt`
- `src/components/Layout.tsx` — auth badge (sign in / user handle + sign out)
- `src/components/ImportPrompt.tsx` — first-sign-in banner: "You have local data. Import to your account?" (Import / Discard / Later)

Guest mode (signed-out) is unchanged: localStorage via existing `persist` middleware.

## 9. IaC (`infra/main.bicep`)

Resources:
- `Microsoft.Web/staticSites@2023-01-01` — Free SKU, system-assigned identity
- `Microsoft.DocumentDB/databaseAccounts@2024-05-15` — SQL/NoSQL API, `enableFreeTier: true`, one write region
- Cosmos DB SQL database `expense-tracker`
- Cosmos DB container `userData` — pk `/userId`
- `Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15` — `Cosmos DB Built-in Data Contributor` to SWA identity

Parameters:
- `location` (default `eastus2`)
- `envName` (from `azd`)
- `enableCosmosFreeTier` (default `true`) — set to `false` if the subscription already has a free-tier account

Outputs:
- SWA default hostname
- Cosmos endpoint
- Resource group name

## 10. CI/CD

Single workflow `.github/workflows/ci-cd.yml`:
```
on: push (main), pull_request
jobs:
  test:  npm ci → npm test → npm run build
  deploy (main + PR): azure/static-web-apps-deploy@v1
```

Uses repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (fetched once with `az staticwebapp secrets list` after the first `azd up`).

PRs automatically get a preview URL from SWA — no extra config.

## 11. Bootstrap runbook (one-time, user runs after review)

1. `git init && git add -A && git commit -m "initial commit"`
2. Create GitHub repo → `git remote add origin … && git push -u origin main`
3. `azd auth login && azd env new expense-tracker-prod && azd up`
   (provisions SWA + Cosmos; deploys code)
4. Fetch SWA deployment token:
   `az staticwebapp secrets list -n <swaName> -g <rg> --query "properties.apiKey" -o tsv`
5. Add it as GitHub repo secret `AZURE_STATIC_WEB_APPS_API_TOKEN`
6. Subsequent pushes to `main` deploy via GitHub Actions.

## 12. Fallbacks / risks

| Risk | Mitigation |
|---|---|
| Subscription already has a Cosmos free-tier account | `azd up` will fail on second free-tier account; set `enableCosmosFreeTier` to `false` in `main.parameters.json` and re-provision (~$25/mo minimum for provisioned throughput) or use the Table Storage alternative below |
| SPA uses `BrowserRouter` history routing | Handled by `staticwebapp.config.json` `navigationFallback` rewriting to `/index.html`, excluding `/api/*` and static assets |
| Deployment token rotates | Re-fetchable with the CLI command; update the repo secret |
| First cold start of Functions | Acceptable for personal use; keep-alive not worth it |

## 13. Deferred / out of scope

- Multi-currency
- Cloud-side reconciliation for concurrent multi-device edits (currently last-writer-wins per user)
- Playwright end-to-end test
- Cosmos → Dexie migration (still not needed at personal scale)
- Push notifications for budget overruns

---

## Alternative datastore (Table Storage)

If Cosmos free tier is unavailable and the user prefers strictly $0/month, swap:
- `Microsoft.Storage/storageAccounts` (Standard_LRS)
- Table `UserData`, partition key = provider, row key = userId, blob column = compressed JSON
- Functions use `@azure/data-tables` with `DefaultAzureCredential`
- Role: `Storage Table Data Contributor` on the storage account for SWA identity
- Everything else in the plan stays identical.

---

## 14. Progress log

- [x] Skeleton written
- [x] Plan finalized
- [x] IaC generated (`infra/main.bicep`, `resources.bicep`, `main.parameters.json`, `azure.yaml`)
- [x] API generated (`api/` with 2 Functions — `GET/PUT /api/data`; `/api/me` deferred to native `/.auth/me`)
- [x] SWA config (`staticwebapp.config.json`)
- [x] Client refactor (`src/lib/api.ts`, `src/hooks/useAuth.ts`, `src/lib/sync.ts`, store `replaceAll` + sync state, `Layout` auth badge)
- [x] GitHub Actions workflow (`.github/workflows/ci-cd.yml`)
- [x] Build + tests still green (SPA build clean, API tsc clean, 33/33 Vitest tests pass)
- [x] Bicep `az bicep build` compiles clean
- [x] Ready for Validation

**Not done (by design — user runs these):**
- `git commit` and `git push` (initial commit — repo is initialized, 58 files staged)
- `azd auth login && azd up` (needs user's Azure credentials + subscription context)
- Fetching SWA deploy token and setting the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`
