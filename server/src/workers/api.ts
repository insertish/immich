import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { configureExpress, configureTelemetry } from 'src/app.common';
import { ApiModule } from 'src/app.module';
import { AppRepository } from 'src/repositories/app.repository';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository';
import { ApiService } from 'src/services/api.service';
import { getConfig } from 'src/utils/config';
import { getExternalDomain, isStartUpError } from 'src/utils/misc';

import { ValidationPipe } from '@nestjs/common';
import { OrchestrationApiModule } from 'orchestration-api/dist';

async function bootstrapOrchestrationApi(externalBaseUrl?: string) {
    const app = await NestFactory.create(
      OrchestrationApiModule.forRoot({
        yuccaProductionApi: 'http://100.64.0.6:5173',
        externalBaseUrl
      }),
    );

    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.setGlobalPrefix('/api/yucca');
    await app.listen(22676, '127.0.0.1');
}

async function bootstrap() {
  process.title = 'immich-api';

  configureTelemetry();

  const app = await NestFactory.create<NestExpressApplication>(ApiModule, { bufferLogs: true });
  app.get(AppRepository).setCloseFn(() => app.close());

  void configureExpress(app, {
    ssr: ApiService,
  });

  const config = await getConfig(
    {
      configRepo: app.get(ConfigRepository),
      metadataRepo: app.get(SystemMetadataRepository),
      logger: await app.resolve(LoggingRepository),
    },
    { withCache: true },
  );

  const externalDomain = getExternalDomain(config.server);
  void bootstrapOrchestrationApi(externalDomain);
}

bootstrap().catch((error) => {
  if (!isStartUpError(error)) {
    console.error(error);
  }
  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(1);
});
