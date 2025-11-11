import { BadRequestException, Injectable } from '@nestjs/common';
import { OnEvent } from 'src/decorators';
import { MaintenanceAuthDto } from 'src/dtos/maintenance.dto';
import { SystemMetadataKey } from 'src/enum';
import { BaseService } from 'src/services/base.service';
import { MaintenanceModeOperation, MaintenanceModeState } from 'src/types';
import { listBackups } from 'src/utils/backups';
import { createMaintenanceLoginUrl, generateMaintenanceSecret, signMaintenanceJwt } from 'src/utils/maintenance';
import { getExternalDomain } from 'src/utils/misc';

/**
 * This service is available outside of maintenance mode to manage maintenance mode
 */
@Injectable()
export class MaintenanceService extends BaseService {
  getMaintenanceMode(): Promise<MaintenanceModeState> {
    return this.systemMetadataRepository
      .get(SystemMetadataKey.MaintenanceMode)
      .then((state) => state ?? { isMaintenanceMode: false });
  }

  login(): MaintenanceAuthDto {
    throw new BadRequestException('Not in maintenance mode');
  }

  async startMaintenance(username: string, operation?: MaintenanceModeOperation): Promise<{ jwt: string }> {
    const { isMaintenanceMode } = await this.getMaintenanceMode();
    if (isMaintenanceMode) {
      throw new BadRequestException('Already in maintenance mode');
    }

    const secret = generateMaintenanceSecret();
    await this.systemMetadataRepository.set(SystemMetadataKey.MaintenanceMode, {
      isMaintenanceMode: true,
      secret,
      operation,
    });
    await this.eventRepository.emit('AppRestart', { isMaintenanceMode: true });

    return {
      jwt: await signMaintenanceJwt(secret, {
        username,
      }),
    };
  }

  endMaintenance(): void {
    throw new BadRequestException('Not in maintenance mode');
  }

  @OnEvent({ name: 'AppRestart', server: true })
  onRestart(): void {
    this.maintenanceRepository.exitApp();
  }

  async createLoginUrl(auth: MaintenanceAuthDto, secret?: string): Promise<string> {
    const { server } = await this.getConfig({ withCache: true });
    const baseUrl = getExternalDomain(server);

    if (!secret) {
      const state = await this.getMaintenanceMode();
      if (!state.isMaintenanceMode) {
        throw new Error('Not in maintenance mode');
      }

      secret = state.secret;
    }

    return await createMaintenanceLoginUrl(baseUrl, auth, secret);
  }

  /**
   * Backups
   */

  async listBackups(): Promise<Record<'backups' | 'failedBackups', string[]>> {
    return listBackups(this.backupRepos);
  }

  async restoreBackup(username: string, filename: string): Promise<{ jwt: string }> {
    return this.startMaintenance(username, {
      operation: 'restore-backup',
      filename,
    });
  }

  private get backupRepos() {
    return {
      logger: this.logger,
      storage: this.storageRepository,
      config: this.configRepository,
      process: this.processRepository,
      database: this.databaseRepository,
    };
  }
}
