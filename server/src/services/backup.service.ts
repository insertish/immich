import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
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

    await this.cleanupDatabaseBackups();
    return JobStatus.Success;
  }

  /**
   * Build parameters for CLI use
   * @param bin the CLI being invoked
   * @throws if unsupported PostgreSQL version
   * @returns parameters for CLI
   */
  private async buildPgArguments(bin: 'pg_dump' | 'pg_dumpall' | 'psql'): Promise<{
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
    const { database } = this.configRepository.getEnv();
    const config = database.config;
    const isUrlConnection = config.connectionType === 'url';

    const databaseVersion = await this.databaseRepository.getPostgresVersion();
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

          args.push(config.url);
          // nb. doesn't replace database/user
        } else {
          args.push('--username', user ?? config.username);
          args.push('--host', config.host);
          args.push('--port', config.port.toString());

          switch (bin) {
            case 'pg_dumpall':
              args.push('--database');
              break;
            case 'psql':
              args.push('--dbname');
              break;
          }

          args.push(database ?? config.database);
        }

        switch (bin) {
          case 'pg_dump':
          case 'pg_dumpall':
            args.push('--clean', '--if-exists');
            break;
        }

        return args;
      },
      databasePassword: isUrlConnection ? new URL(config.url).password : config.password,
      databaseIsSupported:
        (databaseMajorVersion && databaseSemver && semver.satisfies(databaseSemver, '>=14.0.0 <19.0.0')) === true,
      databaseVersion,
      databaseMajorVersion,
    };
  }

  async createBackup(): Promise<JobStatus> {
    this.logger.debug(`Database Backup Started`);

    const { bin, args, databasePassword, databaseIsSupported, databaseVersion, databaseMajorVersion } =
      await this.buildPgArguments('pg_dump');

    if (!databaseIsSupported) {
      this.logger.error(`Database Backup Failure: Unsupported PostgreSQL version: ${databaseVersion}`);
      return JobStatus.Failed;
    }

    this.logger.log(`Database Backup Starting. Database Version: ${databaseMajorVersion}`);

    const backupFilePath = path.join(
      StorageCore.getBaseFolder(StorageFolder.Backups),
      `immich-db-backup-${DateTime.now().toFormat("yyyyLLdd'T'HHmmss")}-v${serverVersion.toString()}-pg${databaseVersion.split(' ')[0]}.sql.gz.tmp`,
    );

    try {
      await new Promise<void>((resolve, reject) => {
        const pgdump = this.processRepository.spawn(bin, args(), {
          env: {
            PATH: process.env.PATH,
            PGPASSWORD: databasePassword,
          },
        });

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

    this.logger.log(`Database Backup Success`);
    return JobStatus.Success;
  }

  /**
   * Get a list of all backups on disk
   * @returns Successful and failed backups
   */
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

  /**
   * Check whether the given file appears to be a valid backup we can restore from
   * @param backup Filename
   * @returns Whether it is valid
   */
  private isValidBackupName(backup: string) {
    const oldBackupStyle = backup.match(/immich-db-backup-\d+\.sql\.gz$/);
    //immich-db-backup-20250729T114018-v1.136.0-pg14.17.sql.gz
    const newBackupStyle = backup.match(/immich-db-backup-\d{8}T\d{6}-v.*-pg.*\.sql\.gz$/);
    return oldBackupStyle || newBackupStyle;
  }
}
