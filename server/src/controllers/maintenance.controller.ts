import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MaintenanceRestoreBackupDto, MaintenanceRestoreBackupResponseDto } from 'src/dtos/maintenance.dto';
import { Permission } from 'src/enum';
import { Authenticated } from 'src/middleware/auth.guard';
import { BackupService } from 'src/services/backup.service';
import { MaintenanceService } from 'src/services/maintenance.service';

@ApiTags('Maintenance (admin)')
@Controller('admin/maintenance')
export class MaintenanceController {
  constructor(
    private service: MaintenanceService,
    private backupService: BackupService,
  ) {}

  @Get()
  getMaintenanceMode() {
    return this.service.getMaintenanceMode();
  }

  @Post('start')
  @Authenticated({ permission: Permission.SystemMetadataUpdate, admin: true })
  startMaintenance() {
    return this.service.startMaintenance();
  }

  @Post('end')
  @Authenticated({ permission: Permission.SystemMetadataUpdate, admin: true })
  endMaintenance() {
    return this.service.endMaintenance();
  }

  @Get('backups/list')
  // todo: auth
  listBackups() {
    return this.backupService.listBackups();
  }

  @Post('backups/restore')
  // todo: auth
  async restoreBackup(@Body() dto: MaintenanceRestoreBackupDto): Promise<MaintenanceRestoreBackupResponseDto> {
    try {
      await this.backupService.restoreBackup(dto.backup);

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: (error as { message?: string }).message ?? 'Unknown error occurred, check logs!',
      };
    }
  }
}
