// Static Web App — ClonEngine ZeroLag landing (FREE tier)
param location string

// SWA only supports: westus2, centralus, eastus2, westeurope, eastasia
var swaLocation = 'eastus2'

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: 'klonosai-web'
  location: swaLocation
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
