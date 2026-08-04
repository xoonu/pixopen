import { spawn, type ChildProcess } from 'node:child_process';
import { platform } from 'node:os';

/** Prevents idle system sleep while a live frame is running (macOS). */
let caffeinate: ChildProcess | null = null;

export function startKeepAwake(): void {
  if (platform() !== 'darwin' || caffeinate) return;
  caffeinate = spawn('caffeinate', ['-i', '-w', String(process.pid)], {
    stdio: 'ignore',
    detached: false,
  });
  caffeinate.on('exit', () => {
    caffeinate = null;
  });
}

export function stopKeepAwake(): void {
  if (!caffeinate) return;
  caffeinate.kill();
  caffeinate = null;
}
