@description('Azure region for all resources.')
param location string

@description('Tags applied to every resource.')
param tags object

@description('Static Web App name.')
param swaName string

@description('Cosmos DB account name.')
param cosmosName string

// -------------------------
// Static Web App
// -------------------------
resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: swaName
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    // Repository is bound out-of-band via GitHub Actions using the deployment API token.
    provider: 'Custom'
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
  }
}

// App settings for the SWA-linked API; picked up by Functions at runtime.
resource swaAppSettings 'Microsoft.Web/staticSites/config@2023-01-01' = {
  parent: swa
  name: 'appsettings'
  properties: {
    COSMOS_ENDPOINT: cosmos.properties.documentEndpoint
    COSMOS_DATABASE: 'expense-tracker'
    COSMOS_CONTAINER: 'userData'
  }
}

// -------------------------
// Cosmos DB (NoSQL / SQL API) — Serverless
// Works in every subscription type (including Microsoft internal subs where the Free tier is blocked).
// -------------------------
resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: cosmosName
  location: location
  tags: tags
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    capabilities: [
      { name: 'EnableServerless' }
    ]
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
        isZoneRedundant: false
      }
    ]
    disableKeyBasedMetadataWriteAccess: true
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
    minimalTlsVersion: 'Tls12'
    backupPolicy: {
      type: 'Continuous'
      continuousModeProperties: { tier: 'Continuous7Days' }
    }
  }
}

resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'expense-tracker'
  properties: {
    resource: { id: 'expense-tracker' }
  }
}

resource userDataContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'userData'
  properties: {
    resource: {
      id: 'userData'
      partitionKey: {
        paths: [ '/userId' ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        automatic: true
      }
      defaultTtl: -1
    }
  }
}

// -------------------------
// Cosmos DB data-plane RBAC — grant SWA managed identity contributor access.
// -------------------------
resource cosmosDataContributor 'Microsoft.DocumentDB/databaseAccounts/sqlRoleDefinitions@2024-05-15' existing = {
  parent: cosmos
  name: '00000000-0000-0000-0000-000000000002' // Built-in "Cosmos DB Built-in Data Contributor"
}

resource swaCosmosRoleAssignment 'Microsoft.DocumentDB/databaseAccounts/sqlRoleAssignments@2024-05-15' = {
  parent: cosmos
  name: guid(cosmos.id, swa.id, 'DataContributor')
  properties: {
    roleDefinitionId: cosmosDataContributor.id
    principalId: swa.identity.principalId
    scope: cosmos.id
  }
}

output staticWebAppName string = swa.name
output staticWebAppHostname string = swa.properties.defaultHostname
output cosmosEndpoint string = cosmos.properties.documentEndpoint
