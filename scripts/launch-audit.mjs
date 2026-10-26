import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'docs/launch/matrix.json'), 'utf8'));
const clients = ['desktop', 'mobile-web', 'android', 'ios'];
const errors = [];
const ids = new Set();
for (const row of matrix.workflows) {
  if (ids.has(row.id)) errors.push(`Duplicate workflow ${row.id}`);
  ids.add(row.id);
  for (const client of clients) if (!['web','native','handoff','app-handoff','not-applicable'].includes(row.assignment[client])) errors.push(`${row.id}: missing assignment ${client}`);
  for (const kind of ['success','recovery','authorization']) if (!row.cases.some(c => c.kind === kind && c.expect)) errors.push(`${row.id}: missing ${kind}`);
}
const sources = ['src/App.tsx','src/pages/estimates/Estimates.tsx','src/pages/projects/Projects.tsx','src/pages/workOrders/WorkOrders.tsx'];
const routes = sources.flatMap(source => [...fs.readFileSync(path.join(root,source),'utf8').matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/gs)].map(m => ({source,route:m[1]})));
const covered = new Set(matrix.workflows.flatMap(w => w.webRoutes));
const shell = new Set(['/', '/*', '*', '/no-access', '/my-profile', '/landing/login', '/landing/signup', '/landing/onboarding']);
for (const {source,route} of routes) if (source === 'src/App.tsx' && !shell.has(route) && !covered.has(route)) errors.push(`Unassigned web route ${route}`);
const apiFile = path.join(root,'../ezboss-api/src/index.ts');
const mounts = [...fs.readFileSync(apiFile,'utf8').matchAll(/app\.use\("([^"]+)",\s*(\w+Router)\)/g)].map(m => ({path:m[1],router:m[2]}));
const pending = matrix.workflows.filter(w => w.decision === 'pending').map(w => w.id);
const caseCount = matrix.workflows.flatMap(w => w.cases).length;
const platformCases = matrix.workflows.reduce((n,w) => n + clients.filter(c => w.assignment[c] !== 'not-applicable').length * w.cases.length,0);
const report = {...matrix, inventory:{routes,apiMounts:mounts}, counts:{workflows:ids.size,cases:caseCount,platformCases,accepted:0},pendingDecisions:pending,errors};
if (process.argv.includes('--json')) console.log(JSON.stringify(report,null,2));
else {
  console.log(`Launch matrix v${matrix.version}: ${ids.size} workflows, ${caseCount} case definitions, ${platformCases} assigned client cases; 0 behavior cases accepted.`);
  console.log(`Inventory: ${routes.length} route declarations, ${mounts.length} API router mounts.`);
  console.log(`Pending Joaquin decisions: ${pending.join(', ')}.`);
  console.log(errors.length ? errors.join('\n') : 'PASS: every top-level feature route is assigned; assignments and case categories complete.');
  console.log('Source coverage does not establish working behavior, native handoffs, API acceptance or device acceptance.');
}
if (errors.length) process.exitCode = 1;
