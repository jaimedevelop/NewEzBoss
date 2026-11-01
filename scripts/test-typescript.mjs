import { build } from 'esbuild';
import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
// Match Vite's compile-time environment without contacting a real API/Auth0 tenant.
const temp = await mkdtemp(path.join(tmpdir(),'ezboss-web-ts-tests-'));
let failed = false;
try {
  for (const file of (await readdir('tests')).filter(name=>name.endsWith('.test.ts')).sort()) {
    const output = path.join(temp,file.replace(/\.ts$/,'.cjs'));
    await build({entryPoints:[path.resolve('tests',file)],outfile:output,bundle:true,platform:'node',format:'cjs',define:{'import.meta.env':JSON.stringify({VITE_API_URL:'https://api.example.invalid',VITE_AUTH0_DOMAIN:'example.invalid',VITE_AUTH0_CLIENT_ID:'test',VITE_AUTH0_AUDIENCE:'test'})}});
    const result = spawnSync(process.execPath,['--test',output],{stdio:'inherit'});
    if(result.status !== 0)failed = true;
  }
} finally { await rm(temp,{recursive:true,force:true}); }
process.exitCode = failed ? 1 : 0;
