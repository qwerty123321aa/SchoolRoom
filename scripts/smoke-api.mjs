import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('..', import.meta.url));
const port = 4199;
const output = [];
const api = spawn(process.execPath, ['apps/api/dist/server.js'], {
  cwd: workspace,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    API_HOST: '127.0.0.1',
    API_PORT: String(port),
    DEV_AUTH_ENABLED: 'false',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

api.stdout.on('data', (chunk) => output.push(String(chunk)));
api.stderr.on('data', (chunk) => output.push(String(chunk)));

try {
  const deadline = Date.now() + 12_000;
  let ready = false;

  while (Date.now() < deadline) {
    if (api.exitCode !== null) {
      throw new Error(`API stopped before readiness (exit ${api.exitCode})`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'ready') {
          ready = true;
          break;
        }
      }
    } catch {
      // The listener may not be ready yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  if (!ready) throw new Error('API readiness check timed out');
  console.info('SchoolRoom API smoke check passed');
} catch (error) {
  const recentOutput = output.join('').slice(-2500);
  if (recentOutput) console.error(recentOutput);
  throw error;
} finally {
  if (api.exitCode === null) {
    api.kill('SIGTERM');
    let forceKillTimer;
    await Promise.race([
      once(api, 'exit'),
      new Promise((resolve) =>
        (forceKillTimer = setTimeout(() => {
          if (api.exitCode === null) api.kill('SIGKILL');
          resolve(undefined);
        }, 3000)),
      ),
    ]);
    clearTimeout(forceKillTimer);
  }
}
