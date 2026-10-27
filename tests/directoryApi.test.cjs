const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');

async function loadApi(mock) {
  const { outputFiles } = await build({
    entryPoints: ['src/services/directory/index.ts'], bundle: true, write: false, platform: 'node', format: 'cjs',
    define: { 'import.meta.env.VITE_API_URL': '"https://api.test/"' },
    plugins: [{name:'session',setup(b) {
      b.onResolve({filter:/apiAuth$|companySession$/},a=>({path:a.path,namespace:'mock'}));
      b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path.endsWith('apiAuth') ?
        `export const getApiAccessToken=()=>mock.token();` : `export const companyCacheScope=()=>mock.scope;`}));
    }}],
  });
  const module = { exports: {} };
  new Function('module', 'exports', 'mock', 'fetch', outputFiles[0].text)(module, module.exports, mock, mock.fetch);
  return module.exports;
}

test('directory writes cannot cross companies while token refresh is pending', async () => {
  let release;
  let calls = 0;
  const mock = { scope: 'a:1', token: () => new Promise(resolve => { release = resolve; }), fetch: async () => {calls++;} };
  const api = await loadApi(mock);
  const pending = api.saveDirectoryProfile({ displayName:'Company A' });
  mock.scope = 'b:2';
  release('token');
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(calls, 0);
});

test('directory adapter encodes queries, honors aborts, and reports API failures', async () => {
  const requests=[];
  const mock={scope:'a:1',token:async()=>'token',fetch:async(url,options)=>{requests.push({url,options});return {ok:true,status:200,json:async()=>({companies:[],total:0,page:1,pageSize:12})};}};
  const api=await loadApi(mock);
  await api.searchDirectoryCompanies({q:'A & B',industry:'construction',page:1,pageSize:12});
  const url=new URL(requests[0].url);
  assert.equal(url.pathname,'/directory/companies');
  assert.equal(url.searchParams.get('q'),'A & B');
  assert.equal(requests[0].options.headers.Authorization,'Bearer token');
  const controller=new AbortController();controller.abort();
  await assert.rejects(api.getDirectoryProfile(controller.signal),{name:'AbortError'});
  assert.equal(requests.length,1);
  mock.fetch=async()=>({ok:false,status:403,json:async()=>({error:'Owner required'})});
  const denied=await loadApi(mock);
  await assert.rejects(denied.getDirectoryProfile(),error=>error.status===403 && error.message==='Owner required');
});
