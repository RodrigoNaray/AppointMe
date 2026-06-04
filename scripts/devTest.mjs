#!/usr/bin/env node
/**
 * devTest.mjs — End-to-end test orchestrator
 *
 * One command that:
 *   1. Pushes the Prisma schema into the test database (appointme_test).
 *   2. Seeds the test database (clients with emailVerified: true, services, schedule).
 *   3. Starts the backend on :5000 with TEST_DATABASE_URL exported.
 *   4. Starts the frontend on :5173 with VITE_API_BASE_URL pointing at the backend.
 *   5. Waits for both servers to be ready.
 *   6. Runs `playwright test`.
 *   7. Leaves both servers running (so the dev can inspect the test data).
 *
 * Servers are spawned detached; they survive after this script exits.
 * Use the printed PIDs to kill them.
 *
 * Usage:
 *   pnpm devTest           # from repo root
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TEST_DB_NAME = 'appointme_test';
const TEST_DB_URL = process.env.TEST_DATABASE_URL
  ?? `postgresql://postgres:postgres@localhost:5432/${TEST_DB_NAME}?schema=public`;

const BE_PORT = 5000;
const FE_PORT = 5173;
const API_URL = `http://localhost:${BE_PORT}/api`;

const isWindows = process.platform === 'win32';
const npx = isWindows ? 'npx.cmd' : 'npx';

const log = (msg) => console.log(`\x1b[36m[devTest]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m[devTest]\x1b[0m ${msg}`);
const err = (msg) => console.error(`\x1b[31m[devTest]\x1b[0m ${msg}`);

const run = (cmd, args, opts = {}) => new Promise((resolveFn, rejectFn) => {
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts });
  child.on('exit', (code) => (code === 0 ? resolveFn(code) : rejectFn(new Error(`${cmd} exited ${code}`))));
});

const spawnDetached = (cmd, args, env) => {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    windowsHide: true,
  });
  child.unref();
  return child;
};

const waitFor = async (url, label, timeoutMs = 30_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) {
        ok(`${label} is ready (${url})`);
        return;
      }
    } catch {
      // not ready yet
    }
    await sleep(500);
  }
  throw new Error(`${label} did not become ready at ${url} within ${timeoutMs}ms`);
};

const checkPrismaInstalled = () => {
  const prismaCli = resolve(ROOT, 'backend/node_modules/.bin/prisma');
  if (!existsSync(prismaCli)) {
    throw new Error('Prisma CLI not found in backend/node_modules. Run `pnpm install` first.');
  }
};

const main = async () => {
  log('Checking prerequisites...');
  checkPrismaInstalled();

  log(`Syncing schema into ${TEST_DB_NAME}...`);
  await run(npx, [
    '--prefix', 'backend',
    'prisma', 'db', 'push',
    '--schema', './src/prisma/schema.prisma',
    '--accept-data-loss',
  ], { env: { ...process.env, DATABASE_URL: TEST_DB_URL, TEST_DATABASE_URL: TEST_DB_URL } });

  log('Seeding test database...');
  await run(npx, [
    '--prefix', 'backend',
    'prisma', 'db', 'seed',
  ], { env: { ...process.env, DATABASE_URL: TEST_DB_URL, TEST_DATABASE_URL: TEST_DB_URL } });

  log(`Starting backend on :${BE_PORT} with TEST_DATABASE_URL...`);
  const be = spawnDetached(npx, ['--prefix', 'backend', 'run', 'dev'], {
    TEST_DATABASE_URL: TEST_DB_URL,
    PORT: String(BE_PORT),
  });
  be.stdout.on('data', (d) => process.stdout.write(`\x1b[33m[be]\x1b[0m ${d}`));
  be.stderr.on('data', (d) => process.stderr.write(`\x1b[33m[be]\x1b[0m ${d}`));

  await waitFor(`${API_URL}/health`, 'Backend');

  log(`Starting frontend on :${FE_PORT}...`);
  const fe = spawnDetached(npx, ['--prefix', 'frontend', 'run', 'dev'], {
    VITE_API_BASE_URL: API_URL,
  });
  fe.stdout.on('data', (d) => process.stdout.write(`\x1b[35m[fe]\x1b[0m ${d}`));
  fe.stderr.on('data', (d) => process.stderr.write(`\x1b[35m[fe]\x1b[0m ${d}`));

  await waitFor(`http://localhost:${FE_PORT}`, 'Frontend');

  log('Running Playwright tests...');
  let exitCode = 0;
  try {
    await run(npx, ['--prefix', 'frontend', 'exec', 'playwright', 'test']);
    ok('Playwright tests passed.');
  } catch (e) {
    exitCode = 1;
    err(`Playwright tests failed: ${e.message}`);
  }

  console.log('');
  console.log('────────────────────────────────────────────');
  console.log(`Backend PID:  ${be.pid}  (kill -9 ${be.pid} to stop)`);
  console.log(`Frontend PID: ${fe.pid}  (kill -9 ${fe.pid} to stop)`);
  console.log(`Test DB:      ${TEST_DB_URL}`);
  console.log(`App:          http://localhost:${FE_PORT}`);
  console.log('Servers left running for inspection.');
  console.log('────────────────────────────────────────────');

  process.exit(exitCode);
};

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
