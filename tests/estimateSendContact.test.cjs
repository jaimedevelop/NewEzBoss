const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const path = require('node:path');

test('email composer mounts only when opened and receives the latest contact selection', async () => {
  const result = await build({
    entryPoints: [path.resolve('src/pages/estimates/components/estimateDashboard/EstimateShareChooser.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    plugins: [{ name:'mocks', setup(b) {
      b.onResolve({ filter:/^react$|^react\/jsx-runtime$|^lucide-react$|AuthContext$|services\/estimates$|SendEstimateModal$/ }, a => ({path:a.path, namespace:'mock'}));
      b.onLoad({filter:/.*/, namespace:'mock'}, a => ({contents:
        a.path === 'react' ? 'export const useState = v => [v === "closed" ? globalThis.__sendMode : v, () => {}]; export const useRef = () => ({current:null}); export const useEffect = () => {}; export default {};' :
        a.path === 'react/jsx-runtime' ? 'export const jsx = (type, props) => ({type, props}); export const jsxs = jsx; export const Fragment = Symbol();' :
        a.path === 'lucide-react' ? 'export const ArrowLeft=()=>{}, Copy=ArrowLeft, Mail=ArrowLeft, MessageSquareText=ArrowLeft, X=ArrowLeft;' :
        a.path.endsWith('AuthContext') ? 'export const useAuthContext = () => ({canPerform:()=>true});' :
        a.path.endsWith('SendEstimateModal') ? 'export default function SendEstimateModal() {}' :
        'export const issueEstimateShareLink = () => {}; export const updateEstimate = () => {};'
      }));
    }}],
  });
  const mod = {exports:{}};
  new Function('module', 'exports', result.outputFiles[0].text)(mod, mod.exports);
  function nodes(tree) {
    if (!tree || typeof tree !== 'object') return [];
    return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
  }
  let estimate = {id:'same-estimate', customerEmail:'one@example.com', clientSnapshot:{contactName:'Contact 1'}};
  const modal = () => nodes(mod.exports.default({estimate, onSend:async()=>{}})).find(n => n.type?.name === 'SendEstimateModal');
  try {
    globalThis.__sendMode = 'closed';
    assert.equal(modal(), undefined);
    estimate = {...estimate, customerEmail:'two@example.com', clientSnapshot:{contactName:'Contact 2'}};
    globalThis.__sendMode = 'choose';
    assert.equal(modal(), undefined);
    globalThis.__sendMode = 'email';
    assert.equal(modal().props.isOpen, true);
    assert.equal(modal().props.estimate.customerEmail, 'two@example.com');
    assert.equal(modal().props.estimate.clientSnapshot.contactName, 'Contact 2');
    globalThis.__sendMode = 'closed';
    assert.equal(modal(), undefined, 'closing must discard the old draft before the next opening');
  } finally { delete globalThis.__sendMode; }
});
