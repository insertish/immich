import { MaintenanceAction, MaintenanceOperation } from 'src/enum';
import { ValidateEnum, ValidateString } from 'src/validation';

export class SetMaintenanceModeDto {
  @ValidateEnum({ enum: MaintenanceAction, name: 'MaintenanceAction' })
  action!: MaintenanceAction;
}

export class MaintenanceLoginDto {
  @ValidateString({ optional: true })
  token?: string;
}

export class MaintenanceAuthDto {
  username!: string;
}

export class MaintenanceRestoreBackupDto {
  @ValidateString()
  backup!: string;
}

export class MaintenanceListBackupsResponseDto {
  backups!: string[];
  failedBackups!: string[];
}

export class MaintenanceStatusResponseDto {
  operation?: MaintenanceOperation;
  progress?: number;
  action?: string;
  error?: string;

  exitingMaintenanceMode?: boolean;
}
