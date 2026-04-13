// Log Analytics Workspace — required by Container Apps
param location string

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'klonosai-logs'
  location: location
  properties: { sku: { name: 'PerGB2018' }, retentionInDays: 30 }
}

output workspaceId  string = workspace.properties.customerId
output workspaceKey string = listKeys(workspace.id, workspace.apiVersion).primarySharedKey
