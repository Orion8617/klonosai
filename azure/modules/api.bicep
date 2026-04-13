// Container Apps — KlonOS API Server (scales to 0 when idle = gratis)
param location string
param logWorkspaceId string
param logWorkspaceKey string

@secure()
param sessionSecret string = newGuid()

@secure()
param dbConnectionString string = ''

// Container Apps Environment
resource env 'Microsoft.App/managedEnvironments@2023-11-02-preview' = {
  name: 'klonosai-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logWorkspaceId
        sharedKey:  logWorkspaceKey
      }
    }
  }
}

// API Container App
resource apiApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: 'klonosai-api'
  location: location
  properties: {
    managedEnvironmentId: env.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        allowInsecure: false
        corsPolicy: {
          allowedOrigins: ['https://klonosai.io', 'https://www.klonosai.io']
          allowedMethods: ['GET','POST','PUT','DELETE','OPTIONS']
          allowedHeaders: ['*']
          allowCredentials: true
        }
      }
      secrets: [
        { name: 'session-secret',     value: sessionSecret }
        { name: 'db-connection',      value: dbConnectionString }
      ]
    }
    template: {
      containers: [{
        name: 'api'
        image: 'klonosai.azurecr.io/api-server:latest'
        resources: { cpu: json('0.5'), memory: '1Gi' }
        env: [
          { name: 'NODE_ENV',       value: 'production' }
          { name: 'PORT',           value: '8080' }
          { name: 'SESSION_SECRET', secretRef: 'session-secret' }
          { name: 'DATABASE_URL',   secretRef: 'db-connection' }
          { name: 'BETTER_AUTH_URL', value: 'https://api.klonosai.io' }
        ]
      }]
      scale: { minReplicas: 0, maxReplicas: 3 }
    }
  }
}

output url string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
