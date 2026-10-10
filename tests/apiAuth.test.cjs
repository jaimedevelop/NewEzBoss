const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { build } = require('esbuild');

test('service token failures notify recovery, preserve errors, and unsubscribe', async () => {
  const { outputFiles } = await build({
    entryPoints: ['src/services/apiAuth.ts'], bundle: true, write: false,
    format: 'iife', globalName: 'apiAuth',
    define: { 'import.meta.env': JSON.stringify({ VITE_AUTH0_DOMAIN:'auth.test', VITE_AUTH0_CLIENT_ID:'test', VITE_AUTH0_AUDIENCE:'api.test' }) },
    plugins: [{ name:'sdk', setup(b) {
      b.onResolve({filter:/^@auth0\/auth0-spa-js$/}, () => ({path:'sdk',namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'}, () => ({contents:`export class Auth0Client { async getTokenSilently() { if (globalThis.failure) throw globalThis.failure; return globalThis.token; } }`}));
    }}],
  });
  const context = vm.createContext({window:{location:{origin:'http://localhost:5173'}}});
  vm.runInContext(outputFiles[0].text, context);
  const { getApiAccessToken, getAuth0Client, onApiTokenError } = context.apiAuth;
  assert.equal(getAuth0Client(), getAuth0Client());
  const errors = [];
  const unsubscribe = onApiTokenError(error => errors.push(error));
  context.token = 'access-token';
  assert.equal(await getApiAccessToken(), 'access-token');
  assert.equal(errors.length, 0);
  context.failure = Object.assign(new Error('Refresh token expired'), {error:'invalid_grant'});
  await assert.rejects(getApiAccessToken(), error => error === context.failure);
  assert.equal(errors[0], context.failure);
  context.failure = null;
  context.token = undefined;
  await assert.rejects(getApiAccessToken(), error => error.error === 'login_required');
  assert.equal(errors[1].error, 'login_required');
  unsubscribe();
  await assert.rejects(getApiAccessToken());
  assert.equal(errors.length, 2);
  // An old in-flight request must not report a failure to a new account.
  let rejectOld;
  getAuth0Client().getTokenSilently = () => new Promise((_, reject) => { rejectOld = reject; });
  const stopOld = onApiTokenError(error => errors.push(error));
  const pending = getApiAccessToken();
  stopOld();
  const newErrors = [];
  const stopNew = onApiTokenError(error => newErrors.push(error));
  rejectOld(Object.assign(new Error('Old account expired'), {error:'invalid_grant'}));
  await assert.rejects(pending);
  assert.equal(errors.length, 2);
  assert.equal(newErrors.length, 0);
  stopNew();
});
