import { INestApplication, Injectable } from '@nestjs/common';
import { OnEvent } from 'src/decorators';
import { ImmichWorker } from 'src/enum';
import { BaseService } from 'src/services/base.service';

@Injectable()
export class MaintenanceService extends BaseService {
  application: INestApplication | undefined;

  setApp(application: INestApplication) {
    this.application = application;
  }

  @OnEvent({ name: 'AppRestart', workers: [ImmichWorker.Api] })
  async onMaintenanceModeApi() {
    await this.application?.close(); // gracefully shutdown
    process.exit(7); // trigger restart
  }

  @OnEvent({ name: 'AppRestart', workers: [ImmichWorker.Microservices] })
  async onMaintenanceModeMicroservices() {
    await this.application?.close(); // gracefully shutdown
  }

  async setMaintenanceMode(enabled: boolean) {
    await this.eventRepository.emit('AppRestart');
  }
}
