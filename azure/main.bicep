// ─── KlonOS ZeroLag — Azure Infrastructure ───────────────────────────────────
// Subscription: a5d0d823-7416-4a84-bb44-5f38118c0627
// Deploys: Static Web App + Container App + PostgreSQL + DNS

targetScope = 'subscription'

@description('Azure region')
param location string = 'eastus'

@description('Environment tag')
param env string = 'prod'

// ── Resource Group ────────────────────────────────────────────────────────────
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'klonosai-rg'
  location: location
  tags: { project: 'klonosai', env: env }
}

// ── Static Web App (ClonEngine + ZeroLag landing) ────────────────────────────
module swa 'modules/swa.bicep' = {
  name: 'klonosai-swa'
  scope: rg
  params: { location: location }
}

// ── Log Analytics (required by Container Apps) ────────────────────────────────
module logs 'modules/logs.bicep' = {
  name: 'klonosai-logs'
  scope: rg
  params: { location: location }
}

// ── Container Apps Environment + API ─────────────────────────────────────────
module api 'modules/api.bicep' = {
  name: 'klonosai-api'
  scope: rg
  params: {
    location: location
    logWorkspaceId: logs.outputs.workspaceId
    logWorkspaceKey: logs.outputs.workspaceKey
  }
}

// ── PostgreSQL Flexible Server ────────────────────────────────────────────────
module db 'modules/db.bicep' = {
  name: 'klonosai-db'
  scope: rg
  params: { location: location }
}

// ── Outputs ───────────────────────────────────────────────────────────────────
output swaHostname string = swa.outputs.hostname
output apiUrl      string = api.outputs.url
output dbHost      string = db.outputs.host
