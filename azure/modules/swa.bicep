// Static Web App — ClonEngine ZeroLag landing (FREE tier)
param location string

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'klonosai-web'
  location: location
  sku: { name: 'Free', tier: 'Free' }
  properties: {
    buildProperties: {
      appLocation: 'artifacts/clonengine'
      outputLocation: 'dist/public'
    }
  }
  tags: { project: 'klonosai' }
}

output hostname string = swa.properties.defaultHostname
output id string = swa.id
