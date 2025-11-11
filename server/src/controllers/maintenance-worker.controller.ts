import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import {
  MaintenanceAuthDto,
  MaintenanceListBackupsResponseDto,
  MaintenanceLoginDto,
  MaintenanceRestoreBackupDto,
  MaintenanceStatusResponseDto,
} from 'src/dtos/maintenance.dto';
import { ServerConfigDto } from 'src/dtos/server.dto';
import { ImmichCookie } from 'src/enum';
import { MaintenanceRoute } from 'src/middleware/maintenance-auth.guard';
import { MaintenanceWorkerService } from 'src/services/maintenance-worker.service';

@ApiTags('Maintenance (admin)')
@Controller()
export class MaintenanceWorkerController {
  constructor(private service: MaintenanceWorkerService) {}

  @Get('server/config')
  getServerConfig(): Promise<ServerConfigDto> {
    return this.service.getSystemConfig();
  }

  @Get('admin/maintenance/status')
  maintenanceStatus(@Req() request: Request): Promise<MaintenanceStatusResponseDto> {
    return this.service.getStatusWith(request.cookies[ImmichCookie.MaintenanceToken]);
  }

  @Post('admin/maintenance/login')
  async maintenanceLogin(
    @Req() request: Request,
    @Body() dto: MaintenanceLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MaintenanceAuthDto> {
    const token = dto.token ?? request.cookies[ImmichCookie.MaintenanceToken];
    const auth = await this.service.login(token);
    response.cookie(ImmichCookie.MaintenanceToken, token);
    return auth;
  }

  @Post('admin/maintenance/start')
  @MaintenanceRoute()
  startMaintenance(): void {
    this.service.startMaintenance();
  }

  @Post('admin/maintenance/end')
  @MaintenanceRoute()
  async endMaintenance(): Promise<void> {
    await this.service.endMaintenance();
  }

  @Get('backups/list')
  @MaintenanceRoute()
  listBackups(): Promise<MaintenanceListBackupsResponseDto> {
    return this.service.listBackups();
  }

  @Post('backups/restore')
  @MaintenanceRoute()
  restoreBackup(@Body() _dto: MaintenanceRestoreBackupDto): void {
    throw 'unimplemented';
  }
}
