import { UnauthorizedException } from '@nestjs/common';
import { SignJWT } from 'jose';
import { DateTime } from 'luxon';
import { StorageCore } from 'src/cores/storage.core';
import { MaintenanceOperation, StorageFolder, SystemMetadataKey } from 'src/enum';
import { MaintenanceWebsocketRepository } from 'src/maintenance/maintenance-websocket.repository';
import { MaintenanceWorkerService } from 'src/maintenance/maintenance-worker.service';
import { PassThrough, Readable } from 'stream';
import { automock, AutoMocked, getMocks, mockDuplex, mockSpawn, ServiceMocks } from 'test/utils';

describe(MaintenanceWorkerService.name, () => {
  let sut: MaintenanceWorkerService;
  let mocks: ServiceMocks;
  let maintenanceWebsocketRepositoryMock: AutoMocked<MaintenanceWebsocketRepository>;

  beforeEach(() => {
    mocks = getMocks();
    maintenanceWebsocketRepositoryMock = automock(MaintenanceWebsocketRepository, {
      args: [mocks.logger],
      strict: false,
    });
    sut = new MaintenanceWorkerService(
      mocks.logger as never,
      mocks.app,
      mocks.config,
      mocks.storage as never,
      mocks.process,
      mocks.database as never,
      mocks.systemMetadata as never,
      maintenanceWebsocketRepositoryMock,
    );
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('getSystemConfig', () => {
    it('should respond the server is in maintenance mode', () => {
      expect(sut.getSystemConfig()).toMatchObject(
        expect.objectContaining({
          maintenanceMode: true,
        }),
      );

      expect(mocks.systemMetadata.get).toHaveBeenCalledTimes(0);
    });
  });

  describe('logSecret', () => {
    const RE_LOGIN_URL = /https:\/\/my.immich.app\/maintenance\?token=([A-Za-z0-9-_]*\.[A-Za-z0-9-_]*\.[A-Za-z0-9-_]*)/;

    it('should log a valid login URL', async () => {
      mocks.systemMetadata.get.mockResolvedValue({ isMaintenanceMode: true, secret: 'secret' });
      await expect(sut.logSecret()).resolves.toBeUndefined();
      expect(mocks.logger.log).toHaveBeenCalledWith(expect.stringMatching(RE_LOGIN_URL));

      const [url] = mocks.logger.log.mock.lastCall!;
      const token = RE_LOGIN_URL.exec(url)![1];

      await expect(sut.login(token)).resolves.toEqual(
        expect.objectContaining({
          username: 'immich-admin',
        }),
      );
    });
  });

  describe('authenticate', () => {
    it('should fail without a cookie', async () => {
      await expect(sut.authenticate({})).rejects.toThrowError(new UnauthorizedException('Missing JWT Token'));
    });

    it('should parse cookie properly', async () => {
      mocks.systemMetadata.get.mockResolvedValue({ isMaintenanceMode: true, secret: 'secret' });

      await expect(
        sut.authenticate({
          cookie: 'immich_maintenance_token=invalid-jwt',
        }),
      ).rejects.toThrowError(new UnauthorizedException('Invalid JWT Token'));
    });
  });

  describe('login', () => {
    it('should fail without token', async () => {
      await expect(sut.login()).rejects.toThrowError(new UnauthorizedException('Missing JWT Token'));
    });

    it('should fail with expired JWT', async () => {
      mocks.systemMetadata.get.mockResolvedValue({ isMaintenanceMode: true, secret: 'secret' });

      const jwt = await new SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('0s')
        .sign(new TextEncoder().encode('secret'));

      await expect(sut.login(jwt)).rejects.toThrowError(new UnauthorizedException('Invalid JWT Token'));
    });

    it('should succeed with valid JWT', async () => {
      mocks.systemMetadata.get.mockResolvedValue({ isMaintenanceMode: true, secret: 'secret' });
      maintenanceWebsocketRepositoryMock.getSecret.mockReturnValue('secret');

      const jwt = await new SignJWT({ _mockValue: true })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('4h')
        .sign(new TextEncoder().encode('secret'));

      await expect(sut.login(jwt)).resolves.toEqual(
        expect.objectContaining({
          _mockValue: true,
        }),
      );
    });
  });

  describe('endMaintenance', () => {
    it('should set maintenance mode', async () => {
      mocks.systemMetadata.get.mockResolvedValue({ isMaintenanceMode: false });
      await expect(sut.endMaintenance()).resolves.toBeUndefined();

      expect(mocks.systemMetadata.set).toHaveBeenCalledWith(SystemMetadataKey.MaintenanceMode, {
        isMaintenanceMode: false,
      });

      expect(maintenanceWebsocketRepositoryMock.clientBroadcast).toHaveBeenCalledWith('AppRestartV1', {
        isMaintenanceMode: false,
      });

      expect(maintenanceWebsocketRepositoryMock.serverSend).toHaveBeenCalledWith('AppRestart', {
        isMaintenanceMode: false,
      });
    });
  });

  /**
   * Operations
   */

  describe('operation: restore database flow', () => {
    it('should not do anything without an operation set', async () => {
      await sut.tryStartOperation();
      expect(mocks.database.tryLock).toHaveBeenCalledTimes(0);
    });

    it("should not do anything if it can't acquire a database lock", async () => {
      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabaseFlow,
      });

      expect(mocks.database.tryLock).toHaveBeenCalled();
      expect(mocks.logger.log).toHaveBeenCalledTimes(0);
    });

    it('should succeed in acquiring lock and do nothing else', async () => {
      mocks.database.tryLock.mockResolvedValueOnce(true);

      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabaseFlow,
      });

      expect(mocks.logger.log).toHaveBeenCalled();
    });
  });

  describe('operation: restore database', () => {
    beforeEach(() => {
      function* mockData() {
        yield '';
      }

      mocks.database.tryLock.mockResolvedValueOnce(true);

      mocks.storage.readdir.mockResolvedValue([]);
      mocks.process.spawn.mockReturnValue(mockSpawn(0, 'data', ''));
      mocks.process.createSpawnDuplexStream.mockImplementation(() => mockDuplex('command', 0, 'data', ''));
      mocks.storage.rename.mockResolvedValue();
      mocks.storage.unlink.mockResolvedValue();
      mocks.storage.createPlainReadStream.mockReturnValue(Readable.from(mockData()));
      mocks.storage.createWriteStream.mockReturnValue(new PassThrough());
      mocks.storage.createGzip.mockReturnValue(new PassThrough());
      mocks.storage.createGunzip.mockReturnValue(new PassThrough());
    });

    it('should update maintenance mode state', async () => {
      maintenanceWebsocketRepositoryMock.getSecret.mockReturnValue('secret');

      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabase,
        filename: 'filename',
      });

      expect(mocks.systemMetadata.set).toHaveBeenCalledWith(SystemMetadataKey.MaintenanceMode, {
        isMaintenanceMode: true,
        secret: 'secret',
      });
    });

    it('should fail to restore invalid backup', async () => {
      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabase,
        filename: 'filename',
      });

      expect(maintenanceWebsocketRepositoryMock.emitStatus).toHaveBeenCalledWith({
        operation: MaintenanceOperation.RestoreDatabase,
        error: 'Error: Invalid backup file format!',
      });
    });

    it('should successfully run a backup', async () => {
      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabase,
        filename: 'development-filename',
      });

      expect(maintenanceWebsocketRepositoryMock.emitStatus).toHaveBeenCalledWith({
        operation: MaintenanceOperation.RestoreDatabase,
        progress: expect.any(Number),
      });

      expect(maintenanceWebsocketRepositoryMock.emitStatus).toHaveBeenLastCalledWith({
        exitingMaintenanceMode: true,
      });
    });

    it('should fail if backup creation fails', async () => {
      mocks.process.createSpawnDuplexStream.mockReturnValueOnce(mockDuplex('pg_dump', 1, '', 'error'));

      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabase,
        filename: 'development-filename',
      });

      expect(maintenanceWebsocketRepositoryMock.emitStatus).toHaveBeenLastCalledWith({
        operation: MaintenanceOperation.RestoreDatabase,
        error: 'Error: pg_dump non-zero exit code (1)\nerror',
      });
    });

    it('should fail if restore itself fails', async () => {
      mocks.process.createSpawnDuplexStream
        .mockReturnValueOnce(mockDuplex('pg_dump', 0, 'data', ''))
        .mockReturnValueOnce(mockDuplex('gzip', 0, 'data', ''))
        .mockReturnValueOnce(mockDuplex('psql', 1, '', 'error'));

      await sut.tryStartOperation({
        operation: MaintenanceOperation.RestoreDatabase,
        filename: 'development-filename',
      });

      expect(maintenanceWebsocketRepositoryMock.emitStatus).toHaveBeenLastCalledWith({
        operation: MaintenanceOperation.RestoreDatabase,
        error: 'Error: psql non-zero exit code (1)\nerror',
      });
    });
  });

  /**
   * Backups
   */

  describe('listBackups', () => {
    it('should give us all valid and failed backups', async () => {
      mocks.storage.readdir.mockResolvedValue([
        `immich-db-backup-${DateTime.fromISO('2025-07-25T11:02:16Z').toFormat("yyyyLLdd'T'HHmmss")}-v1.234.5-pg14.5.sql.gz.tmp`,
        `immich-db-backup-${DateTime.fromISO('2025-07-27T11:01:16Z').toFormat("yyyyLLdd'T'HHmmss")}-v1.234.5-pg14.5.sql.gz`,
        'immich-db-backup-1753789649000.sql.gz',
        `immich-db-backup-${DateTime.fromISO('2025-07-29T11:01:16Z').toFormat("yyyyLLdd'T'HHmmss")}-v1.234.5-pg14.5.sql.gz`,
      ]);

      await expect(sut.listBackups()).resolves.toMatchObject({
        backups: [
          'immich-db-backup-20250729T110116-v1.234.5-pg14.5.sql.gz',
          'immich-db-backup-20250727T110116-v1.234.5-pg14.5.sql.gz',
          'immich-db-backup-1753789649000.sql.gz',
        ],
        failedBackups: ['immich-db-backup-20250725T110216-v1.234.5-pg14.5.sql.gz.tmp'],
      });
    });
  });

  describe('deleteBackup', () => {
    it('should unlink the target file', async () => {
      await sut.deleteBackup('filename');
      expect(mocks.storage.unlink).toHaveBeenCalledTimes(1);
      expect(mocks.storage.unlink).toHaveBeenCalledWith(`${StorageCore.getBaseFolder(StorageFolder.Backups)}/filename`);
    });
  });
});
