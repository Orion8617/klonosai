// Azure Database for PostgreSQL Flexible Server
// Free tier: 1 vCore Burstable + 32 GB — gratis 12 meses
param location string

@secure()
param adminPassword string = newGuid()

resource pgServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: 'klonosai-pg'
  location: location
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    administratorLogin: 'klonosadmin'
    administratorLoginPassword: adminPassword
    version: '16'
    storage: { storageSizeGB: 32 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    highAvailability: { mode: 'Disabled' }
  }
  tags: { project: 'klonosai' }
}

resource pgDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: pgServer
  name: 'klonosai'
  properties: { charset: 'utf8', collation: 'en_US.utf8' }
}

// Firewall — allow Azure services
resource fwRule 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2023-12-01-preview' = {
  parent: pgServer
  name: 'AllowAzureServices'
  properties: { startIpAddress: '0.0.0.0', endIpAddress: '0.0.0.0' }
}

output host string = pgServer.properties.fullyQualifiedDomainName
