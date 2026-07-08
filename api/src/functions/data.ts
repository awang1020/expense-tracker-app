import type { HttpRequest, HttpResponseInit } from '@azure/functions';
import { app } from '@azure/functions';
import { getPrincipal, isAuthenticated } from '../shared/auth';
import { getContainer } from '../shared/cosmos';

const EMPTY_DATA = {
  expenses: [],
  categories: [],
  recurring: [],
  budgets: {},
};

app.http('getData', {
  route: 'data',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const principal = getPrincipal(req);
    if (!isAuthenticated(principal)) {
      return { status: 401, jsonBody: { error: 'unauthorized' } };
    }
    const userId = principal.userId;
    const container = getContainer();
    try {
      const { resource } = await container.item(userId, userId).read();
      if (resource) {
        return { jsonBody: resource };
      }
    } catch (err) {
      const code = (err as { code?: number }).code;
      if (code !== 404) throw err;
    }
    return {
      jsonBody: { id: userId, userId, data: EMPTY_DATA, updatedAt: null },
    };
  },
});

app.http('putData', {
  route: 'data',
  methods: ['PUT'],
  authLevel: 'anonymous',
  handler: async (req: HttpRequest): Promise<HttpResponseInit> => {
    const principal = getPrincipal(req);
    if (!isAuthenticated(principal)) {
      return { status: 401, jsonBody: { error: 'unauthorized' } };
    }
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return { status: 400, jsonBody: { error: 'invalid_json' } };
    }
    const data = (body as { data?: unknown } | null)?.data;
    if (!data || typeof data !== 'object') {
      return { status: 400, jsonBody: { error: 'missing_data' } };
    }
    const userId = principal.userId;
    const doc = {
      id: userId,
      userId,
      data,
      updatedAt: new Date().toISOString(),
    };
    const container = getContainer();
    await container.items.upsert(doc);
    return { jsonBody: { updatedAt: doc.updatedAt } };
  },
});
