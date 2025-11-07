import { Body, Controller, Get, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  MaintenanceAuthDto,
  MaintenanceLoginDto,
  MaintenanceRestoreBackupDto,
  MaintenanceRestoreBackupResponseDto,
} from 'src/dtos/maintenance.dto';
import { ImmichCookie, Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { BackupService } from 'src/services/backup.service';
import { MaintenanceService } from 'src/services/maintenance.service';

@ApiTags('Maintenance (admin)')
@Controller('admin/maintenance')
export class MaintenanceController {
  constructor(
    private service: MaintenanceService,
    private backupService: BackupService,
  ) {}

  @Post('login')
  maintenanceLogin(@Body() _dto: MaintenanceLoginDto): MaintenanceAuthDto {
    return this.service.login();
  }

  @Post('start')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  async startMaintenance(@Auth() auth: AuthDto, @Res({ passthrough: true }) response: Response): Promise<void> {
    const { secret } = await this.service.startMaintenance();
    const jwt = await this.service.createJwt(secret, {
      username: auth.user.name,
    });

    response.cookie(ImmichCookie.MaintenanceToken, jwt);
  }

  @Post('end')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  endMaintenance(): void {
    this.service.endMaintenance();
  }

  @Get('backups/list')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  listBackups() {
    return this.backupService.listBackups();
  }

  @Post('backups/restore')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
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
