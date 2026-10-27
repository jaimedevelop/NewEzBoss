import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function fixture(t, mutate) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ezboss-launch-audit-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const target = path.join(temp, 'web');
  for (const file of ['scripts/launch-audit.mjs', 'docs/launch/matrix.json', 'src/App.tsx',
    'src/pages/estimates/Estimates.tsx', 'src/pages/projects/Projects.tsx', 'src/pages/workOrders/WorkOrders.tsx']) {
    fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
    fs.copyFileSync(path.join(root, file), path.join(target, file));
  }
  fs.mkdirSync(path.join(temp, 'ezboss-api/src'), { recursive: true });
  fs.copyFileSync(path.join(root, '../ezboss-api/src/index.ts'), path.join(temp, 'ezboss-api/src/index.ts'));
  const file = path.join(target, 'docs/launch/matrix.json');
  const matrix = JSON.parse(fs.readFileSync(file));
  mutate(matrix, target);
  fs.writeFileSync(file, JSON.stringify(matrix));
  const result = spawnSync(process.execPath, [path.join(target, 'scripts/launch-audit.mjs'), '--json'], { encoding: 'utf8' });
  return { code: result.status, report: JSON.parse(result.stdout) };
}
test('frozen inventory retains 72 definitions and 279 assigned cases without claiming acceptance', t => {
  const { code, report } = fixture(t, () => {});
  assert.equal(code, 0);
  assert.deepEqual(report.counts, { workflows: 24, cases: 72, platformCases: 279, accepted: 0 });
});
test('audit rejects a missing native assignment', t => {
  const { code, report } = fixture(t, matrix => { delete matrix.workflows[0].assignment.ios; });
  assert.equal(code, 1);
  assert.ok(report.errors.some(e => e.includes('missing assignment ios')));
});
test('audit rejects a newly introduced unassigned feature route', t => {
  const { code, report } = fixture(t, (_, target) => { fs.appendFileSync(path.join(target, 'src/App.tsx'), '\n<Route path="/launch-unassigned-probe" />'); });
  assert.equal(code, 1);
  assert.ok(report.errors.includes('Unassigned web route /launch-unassigned-probe'));
});
test('duplicate case IDs cannot inflate coverage', t => {
  const { code, report } = fixture(t, matrix => { matrix.workflows[1].cases[0].id = matrix.workflows[0].cases[0].id; });
  assert.equal(code, 1);
  assert.ok(report.errors.some(e => e.includes('duplicate case ID')));
});
