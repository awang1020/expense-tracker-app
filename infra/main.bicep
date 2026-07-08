targetScope = 'subscription'

@minLength(1)
@maxLength(64)
@description('Name of the environment, injected by azd (or supplied manually).')
param environmentName string

@minLength(1)
@description('Primary location for all resources.')
param location string = 'eastus2'

@description('Set to false if this subscription already has a Cosmos DB free-tier account.')
param enableCosmosFreeTier bool = true

var tags = { 'azd-env-name': environmentName }
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: 'rg-${environmentName}'
  location: location
  tags: tags
}

module resources 'resources.bicep' = {
  name: 'resources'
  scope: rg
  params: {
    location: location
    tags: tags
    swaName: 'swa-${environmentName}-${resourceToken}'
    cosmosName: 'cos-${environmentName}-${resourceToken}'
    enableCosmosFreeTier: enableCosmosFreeTier
  }
}

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name
output STATIC_WEB_APP_NAME string = resources.outputs.staticWebAppName
output STATIC_WEB_APP_HOSTNAME string = resources.outputs.staticWebAppHostname
output COSMOS_ENDPOINT string = resources.outputs.cosmosEndpoint
