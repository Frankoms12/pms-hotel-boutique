import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Separate local command. npm run dev/build/start retain their real Auth path.
const child = spawn(process.execPath, [fileURLToPath(new URL('../node_modules/next/dist/bin/next', import.meta.url)),
  'dev', '-p', '3001', '-H', '127.0.0.1'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)), stdio: 'inherit', windowsHide: true,
  env: { ...process.env, NODE_ENV: 'development', NEXT_PUBLIC_USE_MOCK_API: 'true', NEXT_PUBLIC_STAFF_PREVIEW: 'true' },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
