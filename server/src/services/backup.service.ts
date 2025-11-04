import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { randomBytes } from 'node:crypto';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import semver from 'semver';
import { serverVersion } from 'src/constants';
import { StorageCore } from 'src/cores/storage.core';
import { OnEvent, OnJob } from 'src/decorators';
import { DatabaseLock, ImmichWorker, JobName, JobStatus, QueueName, StorageFolder } from 'src/enum';
import { ArgOf } from 'src/repositories/event.repository';
import { BaseService } from 'src/services/base.service';
import { handlePromiseError } from 'src/utils/misc';

@Injectable()
export class BackupService extends BaseService {
  private backupLock = false;

  @OnEvent({ name: 'ConfigInit', workers: [ImmichWorker.Microservices] })
  async onConfigInit({
    newConfig: {
      backup: { database },
    },
  }: ArgOf<'ConfigInit'>) {
    this.backupLock = await this.databaseRepository.tryLock(DatabaseLock.BackupDatabase);

    if (this.backupLock) {
      this.cronRepository.create({
        name: 'backupDatabase',
        expression: database.cronExpression,
        onTick: () => handlePromiseError(this.jobRepository.queue({ name: JobName.DatabaseBackup }), this.logger),
        start: database.enabled,
      });
    }
  }

  @OnEvent({ name: 'ConfigUpdate', server: true })
  onConfigUpdate({ newConfig: { backup } }: ArgOf<'ConfigUpdate'>) {
    if (!this.backupLock) {
      return;
    }

    this.cronRepository.update({
      name: 'backupDatabase',
      expression: backup.database.cronExpression,
      start: backup.database.enabled,
    });
  }

  async cleanupDatabaseBackups() {
    this.logger.debug(`Database Backup Cleanup Started`);
    const {
      backup: { database: config },
    } = await this.getConfig({ withCache: false });

    const backupsFolder = StorageCore.getBaseFolder(StorageFolder.Backups);
    const { backups, failedBackups } = await this.listBackups();
    const toDelete = backups.slice(config.keepLastAmount);
    toDelete.push(...failedBackups);

    for (const file of toDelete) {
      await this.storageRepository.unlink(path.join(backupsFolder, file));
    }
    this.logger.debug(`Database Backup Cleanup Finished, deleted ${toDelete.length} backups`);
  }

  @OnJob({ name: JobName.DatabaseBackup, queue: QueueName.BackupDatabase })
  async handleBackupDatabase(): Promise<JobStatus> {
    const status = await this.createBackup();
    if (status !== JobStatus.Success) {
      return status;
    }

    this.logger.log(`Database Backup Success`);
    await this.cleanupDatabaseBackups();
    return JobStatus.Success;
  }

  private async buildDatabaseParams(cli: 'pg_dump' | 'pg_dumpall' | 'psql'): Promise<{
    databasePassword: string;
    databaseParams: (connectionDatabase?: string, connectionUser?: string) => string[];
    databaseVersion: string;
    databaseMajorVersion: number;
  }> {
    const { database } = this.configRepository.getEnv();
    const config = database.config;

    const isUrlConnection = config.connectionType === 'url';

    const databaseParams = (connectionDatabase?: string, connectionUser?: string) =>
      (isUrlConnection
        ? [cli === 'pg_dump' ? '' : '--dbname', config.url]
        : [
            '--username',
            connectionUser ?? config.username,
            '--host',
            config.host,
            '--port',
            `${config.port}`,
            cli === 'pg_dump' ? '' : cli === 'pg_dumpall' ? '--database' : '--dbname',
            connectionDatabase ?? config.database,
          ]
      ).filter((item) => item.length);

    const databaseName = isUrlConnection ? config.url.split('/')[3] : config.database;

    const databaseVersion = await this.databaseRepository.getPostgresVersion();
    const databaseSemver = semver.coerce(databaseVersion);
    const databaseMajorVersion = databaseSemver?.major;

    if (!databaseMajorVersion || !databaseSemver || !semver.satisfies(databaseSemver, '>=14.0.0 <19.0.0')) {
      throw new Error(`Database Backup Failure: Unsupported PostgreSQL version: ${databaseVersion}`);
    }

    const databasePassword = isUrlConnection ? new URL(config.url).password : config.password;

    return {
      databasePassword,
      databaseParams,
      databaseVersion,
      databaseMajorVersion,
    };
  }

  async createBackup(): Promise<JobStatus> {
    this.logger.debug(`Database Backup Started`);

    let params;
    try {
      params = await this.buildDatabaseParams('pg_dump');
    } catch (error) {
      this.logger.error((error as Error).message);
      return JobStatus.Failed;
    }

    const { databasePassword, databaseParams, databaseMajorVersion, databaseVersion } = params;

    const backupFilePath = path.join(
      StorageCore.getBaseFolder(StorageFolder.Backups),
      `immich-db-backup-${DateTime.now().toFormat("yyyyLLdd'T'HHmmss")}-v${serverVersion.toString()}-pg${databaseVersion.split(' ')[0]}.sql.gz.tmp`,
    );

    this.logger.log(`Database Backup Starting. Database Version: ${databaseMajorVersion}`);

    try {
      await new Promise<void>((resolve, reject) => {
        const pgdump = this.processRepository.spawn(
          `/usr/lib/postgresql/${databaseMajorVersion}/bin/pg_dump`,
          [...databaseParams(), '--clean', '--if-exists'],
          {
            env: {
              PATH: process.env.PATH,
              PGPASSWORD: databasePassword,
            },
          },
        );

        // NOTE: `--rsyncable` is only supported in GNU gzip
        const gzip = this.processRepository.spawn(`gzip`, ['--rsyncable']);
        pgdump.stdout.pipe(gzip.stdin);

        const fileStream = this.storageRepository.createWriteStream(backupFilePath);
        gzip.stdout.pipe(fileStream);

        pgdump.on('error', (err) => {
          this.logger.error(`Backup failed with error: ${err}`);
          reject(err);
        });

        gzip.on('error', (err) => {
          this.logger.error(`Gzip failed with error: ${err}`);
          reject(err);
        });

        let pgdumpLogs = '';
        let gzipLogs = '';

        pgdump.stderr.on('data', (data) => (pgdumpLogs += data));
        gzip.stderr.on('data', (data) => (gzipLogs += data));

        pgdump.on('exit', (code) => {
          if (code !== 0) {
            this.logger.error(`Backup failed with code ${code}`);
            reject(`Backup failed with code ${code}`);
            this.logger.error(pgdumpLogs);
            return;
          }
          if (pgdumpLogs) {
            this.logger.debug(`pgdump_all logs\n${pgdumpLogs}`);
          }
        });

        gzip.on('exit', (code) => {
          if (code !== 0) {
            this.logger.error(`Gzip failed with code ${code}`);
            reject(`Gzip failed with code ${code}`);
            this.logger.error(gzipLogs);
            return;
          }
          if (pgdump.exitCode !== 0) {
            this.logger.error(`Gzip exited with code 0 but pgdump exited with ${pgdump.exitCode}`);
            return;
          }
          resolve();
        });
      });
      await this.storageRepository.rename(backupFilePath, backupFilePath.replace('.tmp', ''));
    } catch (error) {
      this.logger.error(`Database Backup Failure: ${error}`);
      await this.storageRepository
        .unlink(backupFilePath)
        .catch((error) => this.logger.error(`Failed to delete failed backup file: ${error}`));
      throw error;
    }

    return JobStatus.Success;
  }

  async restoreBackup(filename: string): Promise<void> {
    this.logger.debug(`Database Restore Started`);

    try {
      if (!this.isValidBackupName(filename)) {
        // if we want to allow custom file names
        // replace this with a check that we aren't
        // traversing out of the backup directory
        throw new Error('Invalid backup file format!');
      }

      const { databasePassword, databaseParams, databaseMajorVersion } =
        await this.buildDatabaseParams('psql');

      this.logger.log(`Dropping all connections to database and preparing for backup.`);

      const superuserToken = Buffer.from(randomBytes(64)).toString('hex');

      // DO $$
      //         BEGIN
      //           IF EXISTS (
      //             SELECT FROM pg_catalog.pg_roles WHERE rolname = 'immich_backup_restore'
      //           ) THEN
      //             ALTER ROLE immich_backup_restore WITH PASSWORD '${superuserToken}';
      //           ELSE
      //             CREATE ROLE immich_backup_restore WITH LOGIN SUPERUSER PASSWORD '${superuserToken}';
      //           END IF;
      //         END
      //         $$;

      //         CREATE DATABASE immich_backup_restore;

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
        const psql = this.processRepository.spawn(
          `/usr/lib/postgresql/${databaseMajorVersion}/bin/psql`,
          databaseParams(),
          // [...databaseParams('postgres'), '-c', `DROP DATABASE IF EXISTS ${databaseName};`],
          {
            env: {
              PATH: process.env.PATH,
              PGPASSWORD: databasePassword,
            },
          },
        );

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
            this.logger.error(`Prepare failed with code ${code}`);
            reject(`Prepare failed with code ${code}`);
            this.logger.error(psqlLogs);
            return;
          }
          if (psqlLogs) {
            this.logger.debug(`psql logs\n${psqlLogs}`);
          }
          resolve();
        });
      });

      this.logger.log(`Database Restore Starting.`);

      const backupFilePath = path.join(StorageCore.getBaseFolder(StorageFolder.Backups), filename);
      await stat(backupFilePath); // => check file exists

      const gzip = this.processRepository.spawn('gzip', ['-cd']);

      const psql = this.processRepository.spawn(
        `/usr/lib/postgresql/${databaseMajorVersion}/bin/psql`,
        databaseParams(),
        {
          env: {
            PATH: process.env.PATH,
            PGPASSWORD: databasePassword,
          },
        },
      );

      gzip.stdout.pipe(psql.stdin);

      const fileStream = await this.storageRepository.createReadStream(backupFilePath);
      fileStream.stream.pipe(gzip.stdin);

      await new Promise<void>((resolve, reject) => {
        psql.on('error', (err) => {
          this.logger.error(`Restore failed with error: ${err}`);
          reject(err);
        });

        gzip.on('error', (err) => {
          this.logger.error(`Gzip failed with error: ${err}`);
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
            this.logger.error(`Restore failed with code ${code}`);
            reject(`Restore failed with code ${code}`);
            this.logger.error(psqlLogs);
            return;
          }
          if (psqlLogs) {
            this.logger.debug(`psql logs\n${psqlLogs}`);
          }
          this.logger.debug('psql exited with', code);
          resolve();
        });

        gzip.on('exit', (code) => {
          if (code !== 0) {
            this.logger.error(`Gzip failed with code ${code}`);
            reject(`Gzip failed with code ${code}`);
            this.logger.error(gzipLogs);
            return;
          }

          console.info('gzip is done!');
          // psql.stdin.write('\\q\n');
          // psql.stdin.end();
          psql.stdin.end();
        });
      });
    } catch (error) {
      this.logger.error(`Database Restore Failure: ${error}`);
      throw error;
    }

    this.eventRepository.emit('AppRestart');

    this.logger.debug('db restore fin.');
  }

  async listBackups(): Promise<Record<'backups' | 'failedBackups', string[]>> {
    const backupsFolder = StorageCore.getBaseFolder(StorageFolder.Backups);
    const files = await this.storageRepository.readdir(backupsFolder);

    return {
      backups: files
        .filter((name) => this.isValidBackupName(name))
        .sort()
        .toReversed(),
      failedBackups: files.filter((file) => file.match(/immich-db-backup-.*\.sql\.gz\.tmp$/)),
    };
  }

  private isValidBackupName(backup: string) {
    const oldBackupStyle = backup.match(/immich-db-backup-\d+\.sql\.gz$/);
    //immich-db-backup-20250729T114018-v1.136.0-pg14.17.sql.gz
    const newBackupStyle = backup.match(/immich-db-backup-\d{8}T\d{6}-v.*-pg.*\.sql\.gz$/);
    return oldBackupStyle || newBackupStyle;
  }
}
