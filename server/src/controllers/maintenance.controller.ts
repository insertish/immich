import { Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  MaintenanceAuthDto,
  MaintenanceListBackupsResponseDto,
  MaintenanceLoginDto,
  MaintenanceRestoreBackupDto,
  MaintenanceStatusResponseDto,
} from 'src/dtos/maintenance.dto';
import { ImmichCookie, Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { MaintenanceService } from 'src/services/maintenance.service';
import { FilenameParamDto } from 'src/validation';

@ApiTags('Maintenance (admin)')
@Controller('admin/maintenance')
export class MaintenanceController {
  constructor(private service: MaintenanceService) {}

  @Get('status')
  maintenanceStatus(): MaintenanceStatusResponseDto {
    return {
      exitingMaintenanceMode: true,
    };
  }

  @Post('login')
  maintenanceLogin(@Body() _dto: MaintenanceLoginDto): MaintenanceAuthDto {
    return this.service.login();
  }

  @Post('start')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  async startMaintenance(@Auth() auth: AuthDto, @Res({ passthrough: true }) response: Response): Promise<void> {
    const { jwt } = await this.service.startMaintenance(auth.user.name);
    response.cookie(ImmichCookie.MaintenanceToken, jwt);
  }

  @Post('start/restore')
  async startRestoreFlow(@Res({ passthrough: true }) response: Response): Promise<void> {
    const { jwt } = await this.service.startRestoreFlow();
    response.cookie(ImmichCookie.MaintenanceToken, jwt);
  }

  @Post('end')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  endMaintenance(): void {
    this.service.endMaintenance();
  }

  @Get('backups/list')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  listBackups(): Promise<MaintenanceListBackupsResponseDto> {
    return this.service.listBackups();
  }

  @Post('backups/restore')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  async restoreBackup(
    @Auth() auth: AuthDto,
    @Body() dto: MaintenanceRestoreBackupDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const { jwt } = await this.service.restoreBackup(auth.user.name, dto.backup);
    response.cookie(ImmichCookie.MaintenanceToken, jwt);
  }

  @Delete('backups/:filename')
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  async deleteBackup(@Param() { filename }: FilenameParamDto): Promise<void> {
    return this.service.deleteBackup(filename);
  }
}
