# KlonOS — Azure Deployment Setup Guide
## klonosai.io en Azure (gratis año 1)

### Datos de tu cuenta
- **Subscription ID**: `a5d0d823-7416-4a84-bb44-5f38118c0627`
- **Subscription name**: Azure subscription 1

---

## PASO 1 — Crear Service Principal

Abre **Azure Cloud Shell** en portal.azure.com (ícono `>_` arriba a la derecha) y ejecuta:

```bash
az ad sp create-for-rbac \
  --name "klonosai-github-deploy" \
  --role contributor \
  --scopes /subscriptions/a5d0d823-7416-4a84-bb44-5f38118c0627 \
  --json-auth
```

Te dará un JSON así — **cópialo completo**:
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "a5d0d823-7416-4a84-bb44-5f38118c0627",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "...",
  "resourceManagerEndpointUrl": "...",
  ...
}
```

---

## PASO 2 — Crear Container Registry

```bash
az group create --name klonosai-rg --location eastus

az acr create \
  --resource-group klonosai-rg \
  --name klonosai \
  --sku Basic \
  --admin-enabled true
```

---

## PASO 3 — Crear Static Web App y obtener token

```bash
az staticwebapp create \
  --name klonosai-web \
  --resource-group klonosai-rg \
  --location eastus \
  --sku Free

# Obtener token de deployment
az staticwebapp secrets list \
  --name klonosai-web \
  --resource-group klonosai-rg \
  --query "properties.apiKey" -o tsv
```

---

## PASO 4 — Crear repositorio en GitHub

1. Ve a github.com → New repository → nombre: `klonosai`
2. En Replit Terminal ejecuta:

```bash
git remote add github https://github.com/TU_USUARIO/klonosai.git
git push github main
```

---

## PASO 5 — Agregar secrets a GitHub

Ve a tu repo GitHub → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Valor |
|---|---|
| `AZURE_CREDENTIALS` | El JSON completo del Paso 1 |
| `AZURE_SUBSCRIPTION_ID` | `a5d0d823-7416-4a84-bb44-5f38118c0627` |
| `AZURE_SWA_TOKEN` | El token del Paso 3 |

---

## PASO 6 — Primer deploy

```bash
# En GitHub Actions → Run workflow → azure-infra.yml (infraestructura)
# Luego → azure-frontend.yml (landing)
# Luego → azure-api.yml (API)
```

---

## PASO 7 — Dominio klonosai.io

### Registrar dominio
Ir a [porkbun.com](https://porkbun.com) → buscar `klonosai.io` → comprar (~$12/año)

### Conectar a Azure Static Web Apps
```bash
az staticwebapp hostname set \
  --name klonosai-web \
  --resource-group klonosai-rg \
  --hostname klonosai.io
```

### DNS Records en tu registrador
| Tipo | Nombre | Valor |
|---|---|---|
| CNAME | `www` | `klonosai-web.azurestaticapps.net` |
| ALIAS/ANAME | `@` | `klonosai-web.azurestaticapps.net` |
| CNAME | `api` | `klonosai-api.{hash}.eastus.azurecontainerapps.io` |

---

## Arquitectura final

```
klonosai.io          → Azure Static Web Apps (FREE)
www.klonosai.io      → Azure Static Web Apps (FREE)  
api.klonosai.io      → Azure Container Apps (scale to 0)
db: PostgreSQL       → Azure DB Flexible Server (free 12 meses)
```

## Costo estimado año 1
- Static Web Apps Free: $0
- Container Apps (low traffic): ~$0–5/mes
- PostgreSQL Flexible Server: $0 (free 12 meses)
- Container Registry Basic: ~$5/mes
- DNS Zone klonosai.io: ~$0.50/mes
- **TOTAL: cubierto por los $200 de crédito inicial**
