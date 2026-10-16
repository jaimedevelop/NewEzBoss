const assert = require('node:assert/strict');
const test = require('node:test');
const path = require('node:path');
const { build } = require('esbuild');

async function setup(row) {
  const result = await build({
    entryPoints: [path.resolve(__dirname, '../src/services/clients/clients.queries.ts')],
    bundle: true, write: false, platform: 'node', format: 'cjs',
    plugins: [{ name: 'api', setup(builder) {
      builder.onResolve({ filter: /^\.\/clientsApi$/ }, () => ({ path: 'api', namespace: 'mock' }));
      builder.onLoad({ filter: /.*/, namespace: 'mock' }, () => ({ contents: `
        export class ApiError extends Error {}
        export async function clientsApiRequest(path) {
          if (path.startsWith('/clients/list')) return { clients: [row], hasMore: false };
          if (path === '/clients') return { A: [row] };
          return row;
        }
      ` }));
    } }],
  });
  const mod = { exports: {} };
  new Function('row', 'module', 'exports', result.outputFiles[0].text)(row, mod, mod.exports);
  return mod.exports;
}

test('company contacts survive detail, list, search and grouped loading', async () => {
  const fields = { billTo: 'company', contactName: 'Maria', contactNote: 'Main note', companyPhone: '2125550000', invoiceEmail: 'ap@abc.com',
    additionalContacts: [{ name: 'Joe', phone: '2125551234', email: 'joe@abc.com', note: 'Site contact' }] };
  const service = await setup({ id: 12, name: 'ABC', userId: 7, ...fields });
  const clients = [(await service.getClient('12')).data, (await service.getClients('7')).data.clients[0],
    (await service.searchClients('7', 'ABC')).data[0], (await service.getClientsGroupedByLetter('7')).data.A[0]];
  for (const client of clients) {
    assert.equal(client.id, '12');
    for (const [key, value] of Object.entries(fields)) assert.deepEqual(client[key], value);
  }
});

test('legacy clients default to person billing and an empty contact list', async () => {
  const service = await setup({ id: 12, name: 'Jane', userId: 7 });
  const { data } = await service.getClient('12');
  assert.equal(data.billTo, 'person');
  assert.deepEqual(data.additionalContacts, []);
});
