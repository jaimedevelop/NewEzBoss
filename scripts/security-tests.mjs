import { spawnSync } from 'node:child_process';
const suites = [
  ['scripts/test-typescript.mjs'],
  ['--test', 'tests/adminStepUp.test.cjs', 'tests/apiAuth.test.cjs', 'tests/authRedirect.test.cjs', 'tests/importerPopupSecurity.test.cjs', 'tests/financeSession.test.cjs'],
];
let failed = false;
for (const args of suites) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', timeout: 120000 });
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
