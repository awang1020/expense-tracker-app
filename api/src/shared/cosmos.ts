import type { Container } from '@azure/cosmos';
import { CosmosClient } from '@azure/cosmos';
import { DefaultAzureCredential } from '@azure/identity';

let cachedContainer: Container | null = null;

export function getContainer(): Container {
  if (cachedContainer) return cachedContainer;
  const endpoint = process.env.COSMOS_ENDPOINT;
  if (!endpoint) {
    throw new Error('COSMOS_ENDPOINT environment variable is not set.');
  }
  const databaseId = process.env.COSMOS_DATABASE ?? 'expense-tracker';
  const containerId = process.env.COSMOS_CONTAINER ?? 'userData';
  const credential = new DefaultAzureCredential();
  const client = new CosmosClient({ endpoint, aadCredentials: credential });
  cachedContainer = client.database(databaseId).container(containerId);
  return cachedContainer;
}
