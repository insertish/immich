import { BadRequestException, Body, Controller, Delete, Get, Param, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Endpoint, HistoryBuilder } from 'src/decorators';
import { AuthDto } from 'src/dtos/auth.dto';
import {
  MaintenanceAuthDto,
  MaintenanceListBackupsResponseDto,
  MaintenanceLoginDto,
  MaintenanceRestoreBackupDto,
  MaintenanceStatusResponseDto,
  SetMaintenanceModeDto,
} from 'src/dtos/maintenance.dto';
import { ApiTag, ImmichCookie, MaintenanceAction, Permission } from 'src/enum';
import { Auth, Authenticated } from 'src/middleware/auth.guard';
import { MaintenanceService } from 'src/services/maintenance.service';
import { respondWithCookie } from 'src/utils/response';
import { FilenameParamDto } from 'src/validation';

@ApiTags(ApiTag.Maintenance)
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
  @Endpoint({
    summary: 'Log into maintenance mode',
    description: 'Login with maintenance token or cookie to receive current information and perform further actions.',
    history: new HistoryBuilder().added('v2.3.0').alpha('v2.3.0'),
  })
  maintenanceLogin(@Body() _dto: MaintenanceLoginDto): MaintenanceAuthDto {
    throw new BadRequestException('Not in maintenance mode');
  }

  @Post()
  @Endpoint({
    summary: 'Set maintenance mode',
    description: 'Put Immich into or take it out of maintenance mode',
    history: new HistoryBuilder().added('v2.3.0').alpha('v2.3.0'),
  })
  @Authenticated({ permission: Permission.Maintenance, admin: true })
  async setMaintenanceMode(
    @Auth() auth: AuthDto,
    @Body() dto: SetMaintenanceModeDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (dto.action === MaintenanceAction.Start) {
      const { jwt } = await this.service.startMaintenance(auth.user.name);
      return respondWithCookie(res, undefined, {
        isSecure: false,
        values: [{ key: ImmichCookie.MaintenanceToken, value: jwt }],
      });
    }
  }

  @Post('start/restore')
  async startRestoreFlow(@Res({ passthrough: true }) response: Response): Promise<void> {
    const { jwt } = await this.service.startRestoreFlow();
    response.cookie(ImmichCookie.MaintenanceToken, jwt);
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
