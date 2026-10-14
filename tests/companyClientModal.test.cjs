const test = require('node:test');
const assert = require('node:assert/strict');
const { build } = require('esbuild');
const path = require('node:path');

async function setup(client) {
  const state = [], effects = []; let cursor = 0;
  const hooks = { useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial;
    return [state[i], value => { state[i] = typeof value === 'function' ? value(state[i]) : value; }]; },
    useRef(initial) { const i = cursor++; if (!(i in state)) state[i] = { current: initial }; return state[i]; },
    useEffect(fn) { effects.push(fn); } };
  const result = await build({ entryPoints: [path.resolve(__dirname, '../src/pages/people/clients/components/ClientsCreationModal.tsx')],
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic', plugins: [{ name: 'mocks', setup(b) {
      b.onResolve({ filter: /^react$|^react\/jsx-runtime$|lucide-react|AuthContext|services\/clients$|InputField$|Dropdown$|FormField$|ModalPortal$/ }, a => ({ path: a.path, namespace: 'mock' }));
      b.onLoad({ filter: /.*/, namespace: 'mock' }, a => ({ contents:
        a.path === 'react' ? 'export const useState = hooks.useState; export const useEffect = hooks.useEffect; export const useRef = hooks.useRef; export default {};' :
        a.path === 'react/jsx-runtime' ? 'export const jsx = (type, props) => ({ type, props }); export const jsxs = jsx;' :
        a.path.includes('AuthContext') ? 'export const useAuthContext = () => ({ currentUser: { uid: "owner" } });' :
        a.path.includes('services/clients') ? 'export const validateClientData = () => ({ isValid: true }); export const formatPhoneNumber = value => value; export const createClient = async () => ({ success: true, data: "12" }); export const updateClient = createClient;' :
        'export const ArrowLeft = "arrow"; export const X = "x"; export const Dropdown = "dropdown"; export const InputField = "input"; export const FormField = "field"; export default "portal";'
      }));
    } }] });
  const mod = { exports: {} }; new Function('hooks', 'module', 'exports', result.outputFiles[0].text)(hooks, mod, mod.exports);
  let saved;
  const props = { client, snapshotOnly: true, onClose() {}, onSave(value) { saved = value; } };
  function render() { cursor = 0; effects.length = 0; return mod.exports.default(props); }
  render(); effects.forEach(fn => fn());
  return { render, saved: () => saved, refresh(client) { props.client = client; render(); effects.forEach(fn => fn()); } };
}
function nodes(tree) { if (!tree || typeof tree !== 'object') return []; if (Array.isArray(tree)) return tree.flatMap(nodes);
  return [tree, ...nodes(tree.props?.children)]; }

test('company form can switch the main contact and save the estimate snapshot', async () => {
  const ctx = await setup({ billTo: 'company', name: 'ABC', companyName: 'ABC', contactName: 'Maria',
    phoneMobile: '2125557896', email: 'maria@abc.com', invoiceEmail: 'ap@abc.com',
    additionalContacts: [{ name: 'Joe', phone: '2125551234', email: 'joe@abc.com' }] });
  let tree = ctx.render();
  assert.equal(nodes(tree).find(n => n.type === 'dropdown').props.value, 'company');
  nodes(tree).find(n => n.props?.children === 'Use as Main Contact').props.onClick();
  tree = ctx.render();
  assert.equal(nodes(tree).find(n => n.props?.id === 'name').props.value, 'Joe');
  await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(ctx.saved().name, 'ABC');
  assert.equal(ctx.saved().contactName, 'Joe');
  assert.equal(ctx.saved().email, 'joe@abc.com');
  assert.equal(ctx.saved().additionalContacts[0].name, 'Maria');
  assert.equal(ctx.saved().invoiceEmail, 'ap@abc.com');
});

test('background client refresh preserves edited billing and service addresses for both bill-to modes', async () => {
  for (const billTo of ['person', 'company']) {
    const client = { id: '12', billTo, name: 'Jane', companyName: 'ABC', billingEqualToService: false,
      billingAddress: 'Old billing', serviceAddress: 'Old service' };
    const ctx = await setup(client);
    let tree = ctx.render();
    for (const [id, value] of [['billingAddress', 'New billing'], ['serviceAddress', 'New service']]) {
      nodes(tree).find(n => n.props?.id === id).props.onChange({ target: { value } });
    }
    ctx.refresh({ ...client });
    tree = ctx.render();
    assert.equal(nodes(tree).find(n => n.props?.id === 'billingAddress').props.value, 'New billing');
    assert.equal(nodes(tree).find(n => n.props?.id === 'serviceAddress').props.value, 'New service');
    await nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} });
    assert.equal(ctx.saved().billingAddress, 'New billing');
    assert.equal(ctx.saved().serviceAddress, 'New service');
    ctx.refresh({ ...client, id: '13', billingAddress: 'Another client' });
    assert.equal(nodes(ctx.render()).find(n => n.props?.id === 'billingAddress').props.value, 'Another client');
  }
});

test('person retains existing fields and company supports adding and removing contacts', async () => {
  const ctx = await setup(null); let tree = ctx.render();
  assert.equal(nodes(tree).find(n => n.type === 'dropdown').props.value, 'person');
  assert.ok(nodes(tree).some(n => n.props?.id === 'phoneOther'));
  nodes(tree).find(n => n.type === 'dropdown').props.onChange('company');
  tree = ctx.render();
  assert.ok(!nodes(tree).some(n => n.props?.id === 'phoneOther'));
  nodes(tree).find(n => n.props?.children === '+ Add Contact').props.onClick();
  tree = ctx.render(); assert.ok(nodes(tree).some(n => n.props?.id === 'contact-0-name'));
  nodes(tree).find(n => n.props?.children === 'Remove').props.onClick();
  assert.ok(!nodes(ctx.render()).some(n => n.props?.id === 'contact-0-name'));
});
