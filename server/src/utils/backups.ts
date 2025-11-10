import { DateTime } from 'luxon';
import path, { join } from 'node:path';
import semver from 'semver';
import { serverVersion } from 'src/constants';
import { StorageCore } from 'src/cores/storage.core';
import { JobStatus, StorageFolder } from 'src/enum';
import { ConfigRepository } from 'src/repositories/config.repository';
import { DatabaseRepository } from 'src/repositories/database.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { ProcessRepository } from 'src/repositories/process.repository';
import { StorageRepository } from 'src/repositories/storage.repository';

export function isValidBackupName(filename: string) {
  const oldBackupStyle = filename.match(/immich-db-backup-\d+\.sql\.gz$/);
  //immich-db-backup-20250729T114018-v1.136.0-pg14.17.sql.gz
  const newBackupStyle = filename.match(/immich-db-backup-\d{8}T\d{6}-v.*-pg.*\.sql\.gz$/);
  return oldBackupStyle || newBackupStyle;
}

export function isFailedBackupName(filename: string) {
  return filename.match(/immich-db-backup-.*\.sql\.gz\.tmp$/);
}

type BackupRepos = {
  logger: LoggingRepository;
  storage: StorageRepository;
  config: ConfigRepository;
  process: ProcessRepository;
  database: DatabaseRepository;
};

export async function buildPostgresLaunchArguments(
  { config, database }: Pick<BackupRepos, 'config' | 'database'>,
  bin: 'pg_dump' | 'pg_dumpall' | 'psql',
): Promise<{
  bin: string;
  args: (config?: {
    /**
     * @deprecated
     */
    database?: string;
    /**
     * @deprecated
     */
    user?: string;
  }) => string[];
  databasePassword: string;
  databaseIsSupported: boolean;
  databaseVersion: string;
  databaseMajorVersion?: number;
}> {
  const {
    database: { config: databaseConfig },
  } = config.getEnv();
  const isUrlConnection = databaseConfig.connectionType === 'url';

  const databaseVersion = await database.getPostgresVersion();
  const databaseSemver = semver.coerce(databaseVersion);
  const databaseMajorVersion = databaseSemver?.major;

  return {
    bin: `/usr/lib/postgresql/${databaseMajorVersion}/bin/${bin}`,
    args({ database, user } = {}) {
      const args: string[] = [];

      if (isUrlConnection) {
        if (bin !== 'pg_dump') {
          args.push('--dbname');
        }

        args.push(databaseConfig.url);
        // nb. doesn't replace database/user
      } else {
        args.push(
          '--username',
          user ?? databaseConfig.username,
          '--host',
          databaseConfig.host,
          '--port',
          databaseConfig.port.toString(),
        );

        switch (bin) {
          case 'pg_dumpall': {
            args.push('--database');
            break;
          }
          case 'psql': {
            args.push('--dbname');
            break;
          }
        }

        args.push(database ?? databaseConfig.database);
      }

      switch (bin) {
        case 'pg_dump':
        case 'pg_dumpall': {
          args.push('--clean', '--if-exists');
          break;
        }
      }

      return args;
    },
    databasePassword: isUrlConnection ? new URL(databaseConfig.url).password : databaseConfig.password,
    databaseIsSupported:
      (databaseMajorVersion && databaseSemver && semver.satisfies(databaseSemver, '>=14.0.0 <19.0.0')) === true,
    databaseVersion,
    databaseMajorVersion,
  };
}

export async function createBackup({
  logger,
  storage,
  process: processRepository,
  ...pgRepos
}: BackupRepos): Promise<JobStatus> {
  logger.debug(`Database Backup Started`);

  const { bin, args, databasePassword, databaseIsSupported, databaseVersion, databaseMajorVersion } =
    await buildPostgresLaunchArguments(pgRepos, 'pg_dump');

  if (!databaseIsSupported) {
    logger.error(`Database Backup Failure: Unsupported PostgreSQL version: ${databaseVersion}`);
    return JobStatus.Failed;
  }

  logger.log(`Database Backup Starting. Database Version: ${databaseMajorVersion}`);

  const backupFilePath = join(
    StorageCore.getBaseFolder(StorageFolder.Backups),
    `immich-db-backup-${DateTime.now().toFormat("yyyyLLdd'T'HHmmss")}-v${serverVersion.toString()}-pg${databaseVersion.split(' ')[0]}.sql.gz.tmp`,
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const pgdump = processRepository.spawn(bin, args(), {
        env: {
          PATH: process.env.PATH,
          PGPASSWORD: databasePassword,
        },
      });

      // NOTE: `--rsyncable` is only supported in GNU gzip
      const gzip = processRepository.spawn(`gzip`, ['--rsyncable']);
      pgdump.stdout.pipe(gzip.stdin);

      const fileStream = storage.createWriteStream(backupFilePath);

      gzip.stdout.pipe(fileStream);

      pgdump.on('error', (err) => {
        logger.error(`Backup failed with error: ${err}`);
        reject(err);
      });

      gzip.on('error', (err) => {
        logger.error(`Gzip failed with error: ${err}`);
        reject(err);
      });

      let pgdumpLogs = '';
      let gzipLogs = '';

      pgdump.stderr.on('data', (data) => (pgdumpLogs += data));
      gzip.stderr.on('data', (data) => (gzipLogs += data));

      pgdump.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`Backup failed with code ${code}`);
          reject(`Backup failed with code ${code}`);
          logger.error(pgdumpLogs);
          return;
        }
        if (pgdumpLogs) {
          logger.debug(`pgdump_all logs\n${pgdumpLogs}`);
        }
      });

      gzip.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`Gzip failed with code ${code}`);
          reject(`Gzip failed with code ${code}`);
          logger.error(gzipLogs);
          return;
        }
        if (pgdump.exitCode !== 0) {
          logger.error(`Gzip exited with code 0 but pgdump exited with ${pgdump.exitCode}`);
          return;
        }
        resolve();
      });
    });
    await storage.rename(backupFilePath, backupFilePath.replace('.tmp', ''));
  } catch (error) {
    logger.error(`Database Backup Failure: ${error}`);
    await storage
      .unlink(backupFilePath)
      .catch((error) => logger.error(`Failed to delete failed backup file: ${error}`));
    throw error;
  }

  logger.log(`Database Backup Success`);
  return JobStatus.Success;
}

export async function restoreBackup(
  { logger, storage, process: processRepository, ...pgRepos }: BackupRepos,
  filename: string,
): Promise<void> {
  logger.debug(`Database Restore Started`);

  try {
    if (!isValidBackupName(filename)) {
      // if we want to allow custom file names
      // replace this with a check that we aren't
      // traversing out of the backup directory
      throw new Error('Invalid backup file format!');
    }

    const { bin, args, databasePassword, databaseIsSupported, databaseVersion } = await buildPostgresLaunchArguments(
      pgRepos,
      'psql',
    );

    if (!databaseIsSupported) {
      logger.error(`Database Restore Failure: Unsupported PostgreSQL version: ${databaseVersion}`);
      throw new Error(`Unsupported PostgreSQL version:  ${databaseVersion}`);
    }

    const backupFilePath = path.join(StorageCore.getBaseFolder(StorageFolder.Backups), filename);
    await storage.stat(backupFilePath); // => check file exists

    logger.log(`Dropping all connections to database and preparing for backup.`);

    const PREPARE_SQL = `
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = current_database()
          AND pid <> pg_backend_pid();

        DROP SCHEMA public CASCADE;
        CREATE SCHEMA public;

        GRANT ALL ON SCHEMA public TO postgres;
        GRANT ALL ON SCHEMA public TO public;
      `;

    await new Promise<void>((resolve, reject) => {
      const psql = processRepository.spawn(bin, args(), {
        env: {
          PATH: process.env.PATH,
          PGPASSWORD: databasePassword,
        },
      });

      psql.stdin.write(PREPARE_SQL);
      psql.stdin.end();

      let psqlLogs = '';

      psql.stderr.on('data', (data) => (psqlLogs += data));

      // catch stdin error so we can read errors from psql
      psql.stdin.on('error', (error) => {
        if ((error as { code?: string })?.code !== 'EPIPE') {
          throw error;
        }
      });

      psql.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`Prepare failed with code ${code}`);
          reject(`Prepare failed with code ${code}`);
          logger.error(psqlLogs);
          return;
        }
        if (psqlLogs) {
          logger.debug(`psql logs\n${psqlLogs}`);
        }
        resolve();
      });
    });

    logger.log(`Database Restore Starting.`);

    const gzip = processRepository.spawn('gzip', ['-cd']);

    const psql = processRepository.spawn(bin, args(), {
      env: {
        PATH: process.env.PATH,
        PGPASSWORD: databasePassword,
      },
    });

    gzip.stdout.pipe(psql.stdin);

    const fileStream = await storage.createReadStream(backupFilePath);
    fileStream.stream.pipe(gzip.stdin);

    await new Promise<void>((resolve, reject) => {
      psql.on('error', (err) => {
        logger.error(`Restore failed with error: ${err}`);
        reject(err);
      });

      gzip.on('error', (err) => {
        logger.error(`Gzip failed with error: ${err}`);
        reject(err);
      });

      let psqlLogs = '';
      let gzipLogs = '';

      psql.stdout.on('data', (data) => console.info('' + data));
      psql.stderr.on('data', (data) => console.error('' + data));

      psql.stderr.on('data', (data) => (psqlLogs += data));
      gzip.stderr.on('data', (data) => (gzipLogs += data));

      // catch stdin error so we can read errors from psql
      psql.stdin.on('error', (error) => {
        if ((error as { code?: string })?.code !== 'EPIPE') {
          throw error;
        }
      });

      psql.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`Restore failed with code ${code}`);
          reject(`Restore failed with code ${code}`);
          logger.error(psqlLogs);
          return;
        }
        if (psqlLogs) {
          logger.debug(`psql logs\n${psqlLogs}`);
        }
        logger.debug('psql exited with', code);
        resolve();
      });

      gzip.on('exit', (code) => {
        if (code !== 0) {
          logger.error(`Gzip failed with code ${code}`);
          reject(`Gzip failed with code ${code}`);
          logger.error(gzipLogs);
          return;
        }
      });
    });
  } catch (error) {
    logger.error(`Database Restore Failure: ${error}`);
    throw error;
  }

  // todo: trigger restart

  logger.log(`Database Restore Success`);
}

export async function listBackups({
  storage,
}: Pick<BackupRepos, 'storage'>): Promise<Record<'backups' | 'failedBackups', string[]>> {
  const backupsFolder = StorageCore.getBaseFolder(StorageFolder.Backups);
  const files = await storage.readdir(backupsFolder);

  return {
    backups: files.filter(isValidBackupName).sort().toReversed(),
    failedBackups: files.filter(isFailedBackupName),
  };
}
