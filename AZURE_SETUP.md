# KlonOS — Azure Deployment Setup
## Subscription: a5d0d823-7416-4a84-bb44-5f38118c0627

---

## ✅ HECHO
- [x] Resource group `klonosai-rg` creado
- [x] Service Principal `klonosai-github-deploy` creado (credenciales obtenidas)
- [ ] Container Registry — pendiente
- [ ] Static Web App — falló por región, re-crear con eastus2
- [ ] GitHub repo — pendiente
- [ ] GitHub Secrets — pendiente

---

## PASO 1 — Completar recursos en Azure Cloud Shell

Copia y pega todo esto junto en Cloud Shell:

```bash
# Container Registry
az acr create \
  --resource-group klonosai-rg \
  --name klonosairegistry \
  --sku Basic \
  --admin-enabled true

# Static Web App (eastus2 — región correcta para SWA)
az staticwebapp create \
  --name klonosai-web \
  --resource-group klonosai-rg \
  --location eastus2 \
  --sku Free

# Obtener token de deployment del Static Web App
az staticwebapp secrets list \
  --name klonosai-web \
  --resource-group klonosai-rg \
  --query "properties.apiKey" \
  --output tsv
```

**Guarda el token que devuelva el último comando.**

---

## PASO 2 — Crear repositorio en GitHub

1. Ve a [github.com/new](https://github.com/new)
2. Nombre: `klonosai`
3. Privado o público — tu elección
4. Crear repositorio

---

## PASO 3 — Agregar estos secrets en GitHub

Ve al repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret Name | Valor |
|---|---|
| `AZURE_SUBSCRIPTION_ID` | `a5d0d823-7416-4a84-bb44-5f38118c0627` |
| `AZURE_TENANT_ID` | `08b93dd8-1e5e-4d25-9136-ff8127eea864` |
| `AZURE_CLIENT_ID` | `28c058c7-626b-46ea-a548-67c007cea42d` |
| `AZURE_CLIENT_SECRET` | *(el clientSecret del JSON que obtuviste)* |
| `AZURE_CREDENTIALS` | *(el JSON completo que obtuviste del SP)* |
| `AZURE_SWA_TOKEN` | *(el token del último comando del Paso 1)* |

---

## PASO 4 — Conectar Replit → GitHub

Dime tu usuario de GitHub y yo ejecuto el push desde aquí.

---

## Arquitectura final
```
klonosai.io     → Azure Static Web Apps FREE (eastus2)
api.klonosai.io → Azure Container Apps (scale to 0)
                → Azure DB PostgreSQL (free 12 meses)
```
