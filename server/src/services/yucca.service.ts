import { Injectable, OnModuleInit, Optional } from '@nestjs/common';
import { EventsGateway, ModuleConfigRepository } from 'orchestration-api/dist';
import { SystemConfig } from 'src/config';
import { StorageCore } from 'src/cores/storage.core';
import { OnEvent } from 'src/decorators';
import { ImmichWorker, StorageFolder } from 'src/enum';
import { ArgOf } from 'src/repositories/event.repository';
import { LibraryRepository } from 'src/repositories/library.repository';
import { getExternalDomain } from 'src/utils/misc';
import { AuthService } from './auth.service';

@Injectable()
export class YuccaService implements OnModuleInit {
  constructor(
    private readonly libraryRepository: LibraryRepository,
    private readonly authService: AuthService,
    @Optional() private readonly moduleConfig: ModuleConfigRepository,
    @Optional() private readonly eventsGateway: EventsGateway,
  ) {}

  onModuleInit() {
    if (this.eventsGateway) {
      this.eventsGateway.setAuthFn(async (client) =>
        this.authService.authenticate({
          headers: client.request.headers,
          queryParams: {},
          metadata: { adminRoute: true, sharedLinkRoute: false, uri: '/api/yucca/socket.io' },
        }),
      );
    }
  }

  private async updateSystemConfig({ server }: SystemConfig) {
    this.moduleConfig.update({
      externalBaseUrl: getExternalDomain(server),
    });
  }

  private async updateLibraryConfig() {
    this.moduleConfig.update({
      immichIntegration: {
        dataPath: StorageCore.getMediaLocation(),
        dataFolders: Object.values(StorageFolder),
        libraries: (await this.libraryRepository.getAll())
          .filter((r) => !r.deletedAt)
          .map(({ id, name, importPaths, exclusionPatterns }) => ({ id, name, importPaths, exclusionPatterns })),
      },
    });
  }

  @OnEvent({ name: 'ConfigInit', workers: [ImmichWorker.Api] })
  async onConfigInit({ newConfig }: ArgOf<'ConfigInit'>) {
    void this.updateSystemConfig(newConfig);
    void this.updateLibraryConfig();
  }

  @OnEvent({ name: 'ConfigUpdate', workers: [ImmichWorker.Api], server: true })
  onConfigUpdate({ newConfig }: ArgOf<'ConfigUpdate'>) {
    void this.updateSystemConfig(newConfig);
  }

  @OnEvent({ name: 'LibraryCreate', workers: [ImmichWorker.Api], server: true })
  onLibraryCreate() {
    void this.updateLibraryConfig();
  }

  @OnEvent({ name: 'LibraryUpdate', workers: [ImmichWorker.Api], server: true })
  onLibraryUpdate() {
    void this.updateLibraryConfig();
  }

  @OnEvent({ name: 'LibraryDelete', workers: [ImmichWorker.Api], server: true })
  onLibraryDelete() {
    void this.updateLibraryConfig();
  }
}
