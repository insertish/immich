import { ChildProcessWithoutNullStreams } from 'node:child_process';

export function promiseChildProcess(process: ChildProcessWithoutNullStreams) {
  let stderr = '';
  process.stderr.on('data', (chunk) => (stderr += chunk));

  return new Promise((resolve, reject) => {
    process.on('exit', (code) => {
      if (code !== 0) {
        reject(`non-zero exit code (${code})\n${stderr}`);
      }
    });
  });
}
