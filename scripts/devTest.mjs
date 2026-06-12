#!/usr/bin/env node
/**
 * devTest.mjs — End-to-end test orchestrator
 *
 * One command that:
 *   1. Derives TEST_DATABASE_URL from DATABASE_URL (replaces DB name with "appointme_test").
 *   2. Verifies ports 5000 and 5173 are free.
 *   3. Pushes the Prisma schema into the test database.
 *   4. Seeds the test database (clients with emailVerified: true, services, schedule).
 *   5. Starts the backend on :5000 with MOCK_EMAILS=true and TEST_DATABASE_URL exported.
 *   6. Starts the frontend on :5173 with VITE_API_BASE_URL pointing at the backend.
 *   7. Waits for both servers to be ready.
 *   8. Runs `playwright test`.
 *   9. Leaves both servers running (so the dev can inspect the test data).
 *
 * Servers are spawned detached; they survive after this script exits.
 * Use the printed PIDs to kill them.
 *
 * Usage:
 *   pnpm devTest           # from repo root
 */

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync, readFileSync, renameSync } from 'node:fs';
import { createConnection } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const TEST_DB_NAME = 'appointme_test';
const BE_PORT = 5000;
const FE_PORT = 5173;
const API_URL = `http://localhost:${BE_PORT}/api`;

/**
 * Minimal .env parser. Lines are `KEY=VALUE`; inline comments (after ` #` or after
 * an unclosed quote that runs into `#`) are stripped; single/double quotes around
 * values are unquoted; blank lines and # comments skipped.
 * Values already set in process.env win (manual export beats file).
 */
const loadEnvFile = (path) => {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted = value.match(/^(['"])(.*?)\1/);
    if (quoted) {
      value = quoted[2];
    } else {
      const commentMatch = value.match(/\s+#/);
      if (commentMatch) value = value.slice(0, commentMatch.index).trim();
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
};

loadEnvFile(resolve(ROOT, 'backend/.env'));

const isWindows = process.platform === 'win32';
const pnpmBin = isWindows ? 'pnpm.cmd' : 'pnpm';
const spawnOpts = isWindows ? { shell: true } : {};
const killCmd = isWindows
  ? (pid) => `Stop-Process -Id ${pid} -Force`
  : (pid) => `kill -9 ${pid}`;

const log = (msg) => console.log(`\x1b[36m[devTest]\x1b[0m ${msg}`);
const ok = (msg) => console.log(`\x1b[32m[devTest]\x1b[0m ${msg}`);
const err = (msg) => console.error(`\x1b[31m[devTest]\x1b[0m ${msg}`);

const maskDbUrl = (url) => {
  if (!url) return url;
  return url.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
};

const deriveTestDbUrl = () => {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const base = process.env.DATABASE_URL;
  if (!base) {
    throw new Error('Neither TEST_DATABASE_URL nor DATABASE_URL is set. Add one to backend/.env.');
  }
  return base.replace(/\/([^/]+)(\?.*)?$/, (_, db, qs) => `/${TEST_DB_NAME}${qs ?? ''}`);
};

const checkPortFree = (port) => new Promise((resolveFn) => {
  const socket = createConnection({ port, host: 'localhost' });
  socket.once('connect', () => {
    socket.destroy();
    resolveFn(false);
  });
  socket.once('error', () => {
    socket.destroy();
    resolveFn(true);
  });
});

const checkPortsFree = async () => {
  const ports = [
    { port: BE_PORT, name: 'backend' },
    { port: FE_PORT, name: 'frontend' },
  ];
  for (const { port, name } of ports) {
    const free = await checkPortFree(port);
    if (!free) {
      throw new Error(
        `Port ${port} (${name}) is already in use. ` +
        (isWindows
          ? `Run: Get-Process -Id (Get-NetTCPConnection -LocalPort ${port}).OwningProcess | Stop-Process -Force`
          : `Run: lsof -ti:${port} | xargs kill -9`),
      );
    }
  }
  ok('Ports 5000 and 5173 are free.');
};

const run = (cmd, args, opts = {}) => new Promise((resolveFn, rejectFn) => {
  const child = spawn(cmd, args, { stdio: 'inherit', cwd: ROOT, ...spawnOpts, ...opts });
  child.on('exit', (code) => (code === 0 ? resolveFn(code) : rejectFn(new Error(`${cmd} exited ${code}`))));
});

const spawnDetached = (cmd, args, env) => {
  const child = spawn(cmd, args, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
    windowsHide: true,
    ...spawnOpts,
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
  const TEST_DB_URL = deriveTestDbUrl();
  log(`Test DB URL: ${maskDbUrl(TEST_DB_URL)}`);
  await checkPortsFree();

  const envPath = resolve(ROOT, 'backend/.env');
  const envBackup = resolve(ROOT, 'backend/.env.devTestBak');
  const hasEnvFile = existsSync(envPath);

  if (hasEnvFile) {
    renameSync(envPath, envBackup);
    log('Backed up backend/.env so Prisma CLI uses spawn env vars.');
  }

  let dbPushFailed = false;

  try {
    log(`Syncing schema into ${TEST_DB_NAME}...`);
    await run(pnpmBin, [
      '--filter', 'backend',
      'exec', 'prisma', 'db', 'push',
      '--schema', './src/prisma/schema.prisma',
      '--accept-data-loss',
    ], { env: { ...process.env, DATABASE_URL: TEST_DB_URL } });

    log('Seeding test database...');
    await run(pnpmBin, [
      '--filter', 'backend',
      'exec', 'prisma', 'db', 'seed',
    ], { env: { ...process.env, DATABASE_URL: TEST_DB_URL } });
  } catch (e) {
    dbPushFailed = true;
    err(`Database setup failed: ${e.message}`);
  } finally {
    if (hasEnvFile) {
      renameSync(envBackup, envPath);
      log('Restored backend/.env.');
    }
  }

  if (dbPushFailed) {
    process.exit(1);
  }

  log(`Starting backend on :${BE_PORT} (MOCK_EMAILS=true, RATE_LIMIT_DISABLED=true)...`);
  const be = spawnDetached(pnpmBin, ['--filter', 'backend', 'run', 'dev'], {
    DATABASE_URL: TEST_DB_URL,
    PORT: String(BE_PORT),
    MOCK_EMAILS: 'true',
    RATE_LIMIT_DISABLED: 'true',
  });
  be.stdout.on('data', (d) => process.stdout.write(`\x1b[33m[be]\x1b[0m ${d}`));
  be.stderr.on('data', (d) => process.stderr.write(`\x1b[33m[be]\x1b[0m ${d}`));

  await waitFor(`${API_URL}/health`, 'Backend');

  log(`Starting frontend on :${FE_PORT}...`);
  const fe = spawnDetached(pnpmBin, ['--filter', 'frontend', 'run', 'dev'], {
    VITE_API_BASE_URL: API_URL,
  });
  fe.stdout.on('data', (d) => process.stdout.write(`\x1b[35m[fe]\x1b[0m ${d}`));
  fe.stderr.on('data', (d) => process.stderr.write(`\x1b[35m[fe]\x1b[0m ${d}`));

  await waitFor(`http://localhost:${FE_PORT}`, 'Frontend');

  log('Running Playwright tests...');
  let exitCode = 0;
  try {
    await run(pnpmBin, ['--filter', 'frontend', 'exec', 'playwright', 'test']);
    ok('Playwright tests passed.');
  } catch (e) {
    exitCode = 1;
    err(`Playwright tests failed: ${e.message}`);
  }

  console.log('');
  console.log('────────────────────────────────────────────');
  console.log(`Backend PID:  ${be.pid}  → ${killCmd(be.pid)}`);
  console.log(`Frontend PID: ${fe.pid}  → ${killCmd(fe.pid)}`);
  console.log(`Test DB:      ${maskDbUrl(TEST_DB_URL)}`);
  console.log(`App:          http://localhost:${FE_PORT}`);
  console.log('Servers left running for inspection.');
  console.log('────────────────────────────────────────────');

  process.exit(exitCode);
};

main().catch((e) => {
  err(e.message);
  process.exit(1);
});
