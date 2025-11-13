import { Injectable } from '@nestjs/common';
import { ChildProcessWithoutNullStreams, spawn, SpawnOptionsWithoutStdio } from 'node:child_process';
import { Duplex } from 'node:stream';

@Injectable()
export class ProcessRepository {
  spawn(command: string, args: readonly string[], options?: SpawnOptionsWithoutStdio): ChildProcessWithoutNullStreams {
    return spawn(command, args, options);
  }

  createSpawnDuplexStream(command: string, args: readonly string[], options?: SpawnOptionsWithoutStdio): Duplex {
    const process = this.spawn(command, args, options);

    const duplex = new Duplex({
      // duplex -> stdin
      write(chunk, encoding, callback) {
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
        process.stdin.end(callback);
      },
    });

    // stdout -> duplex
    process.stdout.on('data', (chunk) => {
      // handle stream backpressure
      if (!duplex.push(chunk)) {
        process.stdout.pause();
      }
    });

    duplex.on('resume', () => process.stdout.resume());
    process.stdout.on('close', () => duplex.push(null));

    // error handling
    function handleError(error: any) {
      duplex.destroy(error);
    }

    process.on('error', handleError);
    process.stdin.on('error', handleError);
    process.stdout.on('error', handleError);

    let stderr = '';
    process.stderr.on('data', (chunk) => (stderr += chunk));

    process.on('exit', (code) => {
      if (code !== 0) {
        handleError(`${command} non-zero exit code (${code})\n${stderr}`);
      }
    });

    return duplex;
  }
}
