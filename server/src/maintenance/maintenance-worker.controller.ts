import { Body, Controller, Delete, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import {
  MaintenanceAuthDto,
  MaintenanceListBackupsResponseDto,
  MaintenanceLoginDto,
  MaintenanceRestoreBackupDto,
  MaintenanceStatusResponseDto,
  SetMaintenanceModeDto,
} from 'src/dtos/maintenance.dto';
import { ServerConfigDto } from 'src/dtos/server.dto';
import { ImmichCookie, MaintenanceAction, MaintenanceOperation } from 'src/enum';
import { MaintenanceRoute } from 'src/maintenance/maintenance-auth.guard';
import { MaintenanceWorkerService } from 'src/maintenance/maintenance-worker.service';
import { respondWithCookie } from 'src/utils/response';
import { FilenameParamDto } from 'src/validation';

@Controller()
export class MaintenanceWorkerController {
  constructor(private service: MaintenanceWorkerService) {}

  @Get('server/config')
  getServerConfig(): ServerConfigDto {
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
    @Res({ passthrough: true }) res: Response,
  ): Promise<MaintenanceAuthDto> {
    const token = dto.token ?? request.cookies[ImmichCookie.MaintenanceToken];
    const auth = await this.service.login(token);
    return respondWithCookie(res, auth, {
      isSecure: false,
      values: [{ key: ImmichCookie.MaintenanceToken, value: token }],
    });
  }

  @Post('admin/maintenance')
  @MaintenanceRoute()
  async setMaintenanceMode(@Body() dto: SetMaintenanceModeDto): Promise<void> {
    if (dto.action === MaintenanceAction.End) {
      await this.service.endMaintenance();
    }
  }

  @Get('admin/maintenance/backups/list')
  @MaintenanceRoute()
  listBackups(): Promise<MaintenanceListBackupsResponseDto> {
    return this.service.listBackups();
  }

  @Post('admin/maintenance/backups/restore')
  @MaintenanceRoute()
  restoreBackup(@Body() dto: MaintenanceRestoreBackupDto): void {
    void this.service.tryStartOperation({
      operation: MaintenanceOperation.RestoreDatabase,
      filename: dto.backup,
    });
  }

  @Delete('admin/maintenance/backups/:filename')
  @MaintenanceRoute()
  async deleteBackup(@Param() { filename }: FilenameParamDto): Promise<void> {
    return this.service.deleteBackup(filename);
  }
}
