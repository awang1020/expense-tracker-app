# Expense Tracker

[![CI-CD](https://github.com/awang1020/expense-tracker-app/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/awang1020/expense-tracker-app/actions/workflows/ci-cd.yml)

A local-first personal expense tracker (React + TypeScript + Vite + Tailwind) with optional per-user cloud sync via Azure Static Web Apps + Cosmos DB.

**Repository:** https://github.com/awang1020/expense-tracker-app

## Features

- **Local-first / PWA** — installable, works offline, data lives in `localStorage` for guests
- **Recurring expenses** (daily / weekly / monthly) with auto-materialization
- **Per-category monthly budgets** with progress bars on the dashboard
- **Insights** — daily spending line chart, category donut, monthly totals bar
- **CSV export**
- **Dark mode** (light / dark / follows system)
- **Sign in with GitHub** → cross-device sync via Azure Functions + Cosmos DB (managed-identity, no secrets in the app)

## Local development

```powershell
npm install
npm run dev          # http://localhost:5173
npm test             # 33 Vitest unit tests
npm run build        # production bundle in dist/
```

For local API development against a real Cosmos instance:

```powershell
cd api
npm install
Copy-Item local.settings.json.sample local.settings.json
# Fill in COSMOS_ENDPOINT, run `az login` for the DefaultAzureCredential
npm run start        # requires Azure Functions Core Tools v4
```

## One-time Azure bootstrap

Prerequisites: [Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli), [Azure Developer CLI](https://learn.microsoft.com/azure/developer/azure-developer-cli/install-azd), [GitHub CLI](https://cli.github.com/) (for setting repo secrets).

```powershell
# Repo already exists at https://github.com/awang1020/expense-tracker-app
git clone https://github.com/awang1020/expense-tracker-app.git
cd expense-tracker-app

azd auth login
azd env new expense-tracker-prod
# If your subscription already has a Cosmos free-tier account,
# set enableCosmosFreeTier: false in infra/main.parameters.json first.
azd up               # provisions Static Web App + Cosmos DB and deploys the app
```

Then wire GitHub Actions once:

```powershell
$name  = az staticwebapp list --query "[?tags.\"azd-env-name\"=='expense-tracker-prod'].name"          -o tsv
$rg    = az staticwebapp list --query "[?tags.\"azd-env-name\"=='expense-tracker-prod'].resourceGroup" -o tsv
$token = az staticwebapp secrets list -n $name -g $rg --query "properties.apiKey" -o tsv

# Requires `gh auth login` first
gh secret set AZURE_STATIC_WEB_APPS_API_TOKEN --body $token --repo awang1020/expense-tracker-app
```

Every subsequent push to `main` triggers GitHub Actions to run tests, build, and deploy. PRs get automatic preview environments.

## Auth model

- Guest (default): everything works client-side, `localStorage` persistence, offline PWA.
- Signed in with GitHub via SWA "Easy Auth": your data lives in Cosmos DB, keyed by your GitHub user id.
- On first sign-in, if the server is empty and you have local data, it's uploaded automatically. If the server has data, it overwrites local (server wins).

## Cost

Free tier for both Static Web Apps and Cosmos DB (1000 RU/s + 25 GiB free forever). Personal use should stay at $0/month.

## Repository layout

```
.
├─ src/                       # React SPA
├─ api/                       # Azure Functions (Node 20, v4 model)
├─ infra/                     # Bicep (subscription-scope main + resources)
├─ .github/workflows/         # CI-CD (tests + build + SWA deploy)
├─ .azure/deployment-plan.md  # Deployment plan (source of truth for azd/CI)
├─ azure.yaml                 # azd service map
└─ staticwebapp.config.json   # SWA routes + auth
```
