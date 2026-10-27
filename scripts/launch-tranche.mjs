import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(fs.readFileSync(path.join(root, 'docs/launch/first-tranche.json')));
const matrix = JSON.parse(fs.readFileSync(path.join(root, 'docs/launch/matrix.json')));
const definitions = new Map(matrix.workflows.flatMap(w => w.cases.map(c => [c.id, w])));
const seen = new Set();
if (plan.definitions.length !== 18 || plan.clientCases.length !== 70) throw Error('Expected 18 definitions and 70 client cases');
for (const c of plan.clientCases) {
  const workflow = definitions.get(c.definition);
  if (!workflow || workflow.assignment[c.client] !== c.assignment || c.assignment === 'not-applicable') throw Error(`Invalid assignment: ${c.id}`);
  if (seen.has(c.id) || !c.steps || !c.platformSteps) throw Error(`Duplicate/incomplete case: ${c.id}`);
  seen.add(c.id);
}
const all = matrix.workflows.flatMap(w => w.cases.flatMap(c => Object.entries(w.assignment)
  .filter(([, a]) => a !== 'not-applicable').map(([client]) => `${c.id}:${client}`)));
for (const c of plan.remainingClientCases) {
  if (seen.has(c.id)) throw Error(`Selected/deferred overlap: ${c.id}`);
  seen.add(c.id);
}
if (seen.size !== all.length || all.some(id => !seen.has(id))) throw Error('Case inventory lost an assignment');
const output = path.resolve(process.env.LAUNCH_EVIDENCE_DIR || path.join(root, '../docs/launch/evidence/2026-10-26'));
fs.mkdirSync(output, { recursive: true });
const results = [];
for (const surface of ['api', 'web']) {
  const cwd = surface === 'api' ? path.join(root, '../ezboss-api') : root;
  const files = [...new Set(plan.definitions.flatMap(d => d.supportingSuites[surface]))];
  for (const file of files) if (!fs.existsSync(path.join(cwd, 'tests', file))) throw Error(`Missing supporting suite ${file}`);
  const args = surface === 'api' ? ['--import', 'tsx', '--test', ...files.map(f => `tests/${f}`)] : ['--test', ...files.map(f => `tests/${f}`)];
  const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 180000, maxBuffer: 16 * 1024 * 1024 });
  fs.writeFileSync(path.join(output, `tranche-${surface}.log`), `${result.stdout || ''}\n${result.stderr || ''}`);
  results.push({ surface, command: ['node', ...args], exitCode: result.status, error: result.error?.message, log: `tranche-${surface}.log` });
}
// Deliberately never promote a supporting-suite pass to client/API acceptance.
const report = { generatedAt: new Date().toISOString(), counts: plan.counts, supportingChecks: results,
  apiAccepted: 0, clientAccepted: 0, clientCases: plan.clientCases.map(c => ({ id: c.id, status: c.status, evidence: c.evidence })),
  note: '18 executable supporting-suite mappings; 70 client protocols prepared, runtime acceptance pending. Read full logs for skips and failures.' };
fs.writeFileSync(path.join(output, 'first-tranche-results.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ counts: report.counts, supportingChecks: results, apiAccepted: 0, clientAccepted: 0 }, null, 2));
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
