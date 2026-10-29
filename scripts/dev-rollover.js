#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readdir, readFile, readlink } from 'node:fs/promises';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const port = Number(args[0] ?? process.env.DEV_PORT ?? 8081);
const backendPort = 3000;
const backendUrl = `http://127.0.0.1:${backendPort}/api/health`;
let backend;
let vite;
let stopping = false;

async function readProcess(pid) {
  try {
    const [command, cwd, stat] = await Promise.all([
      readFile(`/proc/${pid}/cmdline`, 'utf8'),
      readlink(`/proc/${pid}/cwd`),
      readFile(`/proc/${pid}/stat`, 'utf8'),
    ]);
    const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    return { pid: Number(pid), parent: Number(fields[1]), state: fields[0], args: command.split('\0').filter(Boolean), cwd };
  } catch {
    return null;
  }
}

function signal(pid, name) {
  try {
    process.kill(pid, name);
  } catch (error) {
    if (error.code !== 'ESRCH') throw error;
  }
}

async function stopProcesses(pids) {
  for (const pid of pids) signal(pid, 'SIGTERM');
  if (process.platform !== 'win32') {
    for (const pid of pids) signal(pid, 'SIGCONT');
  }
  const deadline = Date.now() + 2_000;
  let pending = [...pids];
  while (pending.length && Date.now() < deadline) {
    await delay(50);
    const records = await Promise.all(pending.map(readProcess));
    pending = records.filter((record) => record && record.state !== 'Z').map((record) => record.pid);
  }
  for (const pid of pending) signal(pid, 'SIGKILL');
}

async function stopPreviousDevProcesses() {
  if (process.platform !== 'linux') return;
  const entries = await readdir('/proc');
  const records = (await Promise.all(entries.filter((entry) => /^\d+$/.test(entry)).map(readProcess))).filter(Boolean);
  const protectedPids = new Set([process.pid]);
  let ancestor = records.find((record) => record.pid === process.ppid);
  while (ancestor) {
    protectedPids.add(ancestor.pid);
    ancestor = records.find((record) => record.pid === ancestor.parent);
  }
  const entrypoints = new Set([
    join(root, 'scripts/dev-rollover.js'),
    join(root, 'server/index.js'),
    join(root, 'node_modules/vite/bin/vite.js'),
    join(root, 'node_modules/.bin/vite'),
  ]);
  const targets = new Set(records.filter((record) =>
    !protectedPids.has(record.pid) &&
    (record.cwd === root || record.cwd === join(root, 'server')) &&
    record.args.some((argument) => entrypoints.has(resolve(record.cwd, argument)))
  ).map((record) => record.pid));
  let changed = true;
  while (changed) {
    changed = false;
    for (const record of records) {
      if (protectedPids.has(record.pid) || targets.has(record.pid)) continue;
      const childOfTarget = targets.has(record.parent);
      const launcherParent = record.cwd === root &&
        (record.args.join(' ') === 'npm run dev' || record.args.join(' ').startsWith('sh -c node ./scripts/dev-rollover.js')) &&
        records.some((child) => child.parent === record.pid && targets.has(child.pid));
      if (childOfTarget || launcherParent) {
        targets.add(record.pid);
        changed = true;
      }
    }
  }
  if (targets.size) {
    console.log(`Stopping ${targets.size} previous project dev processes (including suspended ones)...`);
    await stopProcesses(targets);
  }
}

async function requireFreePort(value) {
  await new Promise((resolvePort, reject) => {
    const probe = net.createServer();
    probe.once('error', (error) => {
      reject(new Error(`Cannot use port ${value}: ${error.code}. Stop the service using it and retry. Unrelated services are not killed.`));
    });
    probe.listen(value, '0.0.0.0', () => probe.close(resolvePort));
  });
}

async function shutdown(code) {
  if (stopping) return;
  stopping = true;
  let exitCode = code;
  console.log('\nStopping development servers...');
  try {
    const stopBackend = backend?.exitCode === null && backend.signalCode === null
      ? stopProcesses([backend.pid])
      : Promise.resolve();
    const stopVite = vite?.exitCode === null && vite.signalCode === null
      ? stopProcesses([vite.pid])
      : Promise.resolve();
    await Promise.all([stopVite, stopBackend]);
  } catch (error) {
    console.error('Cleanup failed:', error.message);
    exitCode = 1;
  }
  process.exit(exitCode);
}

async function waitForBackend() {
  const deadline = Date.now() + 20_000;
  while (!stopping && Date.now() < deadline) {
    if (backend.exitCode !== null || backend.signalCode !== null) {
      throw new Error('The API exited before it became ready. Check the server error above.');
    }
    try {
      const response = await fetch(backendUrl, { signal: AbortSignal.timeout(1_000) });
      if (response.ok && (await response.json()).ok === true) return;
    } catch {
      if (stopping) return;
    }
    await delay(100);
  }
  if (!stopping) throw new Error('The API did not become ready within 20 seconds. Check the server output above.');
}

async function main() {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: npm run dev -- [port]');
    console.log('Restarts this project\'s dev servers on port 8081 (or DEV_PORT) and API port 3000.');
    return;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === backendPort) {
    throw new Error('Choose a frontend port between 1 and 65535, other than API port 3000.');
  }
  process.on('SIGINT', () => { void shutdown(0); });
  process.on('SIGTERM', () => { void shutdown(0); });
  if (process.platform !== 'win32') {
    process.on('SIGTSTP', () => { void shutdown(0); });
  }
  await stopPreviousDevProcesses();
  if (stopping) return;
  await Promise.all([requireFreePort(port), requireFreePort(backendPort)]);
  console.log(`Starting JSON API on port ${backendPort}...`);
  backend = spawn(process.execPath, [join(root, 'server/index.js')], {
    cwd: root,
    env: { ...process.env, PORT: String(backendPort) },
    stdio: 'inherit',
  });
  backend.on('error', (error) => {
    console.error('Failed to start API:', error.message);
    void shutdown(1);
  });
  backend.on('exit', (code, exitSignal) => {
    if (!stopping) {
      console.error(`API stopped unexpectedly (${exitSignal ?? code}).`);
      void shutdown(1);
    }
  });
  await waitForBackend();
  if (stopping) return;
  console.log(`Starting Vite on port ${port}...`);
  vite = spawn(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], {
    cwd: root,
    env: { ...process.env, DEV_PORT: String(port) },
    stdio: 'inherit',
  });
  vite.on('error', (error) => {
    console.error('Failed to start Vite:', error.message);
    void shutdown(1);
  });
  vite.on('exit', (code) => {
    if (!stopping) void shutdown(code ?? 1);
  });
}

try {
  await main();
} catch (error) {
  console.error(`Development startup failed: ${error.message}`);
  await shutdown(1);
}
