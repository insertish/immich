import { Injectable } from '@nestjs/common';
import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { Duplex } from 'node:stream';

@Injectable()
export class ProcessRepository {
  spawn(command: string, args: readonly string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    return spawn(command, args, options);
  }

  createSpawnDuplexStream(
    command: string,
    args: readonly string[],
    options?: SpawnOptionsWithoutStdio,
  ): Duplex & { process: ChildProcessWithoutNullStreams } {
    let ended = false;

    const process = this.spawn(command, args, options);
    const duplex = new Duplex({
      // duplex -> stdin
      write(chunk, encoding, callback) {
        // drain the input if process dies
        if (ended) {
          return callback();
        }

        // handle stream backpressure
        if (process.stdin.write(chunk, encoding)) {
          callback();
        } else {
          process.stdin.once('drain', callback);
        }
      },

      read() {
        // no-op
      },

      final(callback) {
        if (!ended) {
          process.stdin.end(callback);
        } else {
          callback();
        }
      },
    }) as Duplex & { process: ChildProcessWithoutNullStreams };

    // stdout -> duplex
    process.stdout.on('data', (chunk) => {
      if (ended) return;

      // handle stream backpressure
      if (!duplex.push(chunk)) {
        process.stdout.pause();
      }
    });

    duplex.on('resume', () => process.stdout.resume());

    // end handling
    let stdoutClosed = false;
    function close(error?: Error) {
      if (ended) {
        return;
      }

      if (error) {
        duplex.destroy(error);
      } else if (stdoutClosed && typeof process.exitCode === 'number') {
        duplex.push(null);
      }
    }

    process.stdout.on('close', () => {
      stdoutClosed = true;
      close();
    });

    // error handling
    process.on('error', close);
    process.stdin.on('error', close);
    process.stdout.on('error', close);

    let stderr = '';
    process.stderr.on('data', (chunk) => (stderr += chunk));

    process.on('exit', (code) => {
      console.info(`${command} exited (${code})`);

      if (code !== 0) {
        close(new Error(`${command} non-zero exit code (${code})\n${stderr}`));
      } else {
        close();
      }
    });

    duplex.process = process;
    return duplex;
  }
}
