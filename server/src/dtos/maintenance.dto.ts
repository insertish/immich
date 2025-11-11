import { MaintenanceOperation } from 'src/enum';
import { ValidateString } from 'src/validation';

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
  error?: string;

  exitingMaintenanceMode?: boolean;
}
