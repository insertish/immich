import { ValidateBoolean, ValidateString } from 'src/validation';

export class MaintenanceModeResponseDto {
  @ValidateBoolean()
  isMaintenanceMode!: boolean;
}

export class MaintenanceRestoreBackupDto {
  @ValidateString()
  backup!: string;
}

export class MaintenanceRestoreBackupResponseDto {
  success!: boolean;
  error?: string;
}

export class MaintenanceListBackupsResponseDto {
  backups!: string[];
  failedBackups!: string[];
}
