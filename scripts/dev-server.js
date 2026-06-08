require('../src/config/env');
const { spawn } = require('child_process');

console.log('Modo desarrollo: el servidor se reinicia solo al guardar cambios en src/');

const child = spawn(process.execPath, ['--watch', 'src/server.js'], {
  stdio: 'inherit',
  env: process.env,
  cwd: require('path').join(__dirname, '..'),
});

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
