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
  @Authenticated({ permission: Permission.SystemMetadataUpdate, admin: true })
  listBackups() {
    return this.backupService.listBackups();
  }

  @Post('backups/restore')
  @Authenticated({ permission: Permission.SystemMetadataUpdate, admin: true })
  async restoreBackup(@Body() dto: MaintenanceRestoreBackupDto): Promise<MaintenanceRestoreBackupResponseDto> {
    return {
      success: await this.backupService
        .restoreBackup(dto.backup)
        .then(() => true)
        .catch(() => false),
    };
  }
}
