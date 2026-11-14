const { spawn } = require('node:child_process');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

if (process.argv.includes('--dev')) {
  env.VITE_DEV_SERVER_URL = 'http://localhost:5173';
}

const child = spawn(electronPath, ['.'], {
  env,
  stdio: 'inherit',
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
