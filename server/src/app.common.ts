import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { createProxyMiddleware } from 'http-proxy-middleware';
import sirv from 'sirv';
import { excludePaths, serverVersion } from 'src/constants';
import { MaintenanceWorkerService } from 'src/maintenance/maintenance-worker.service';
import { WebSocketAdapter } from 'src/middleware/websocket.adapter';
import { ConfigRepository } from 'src/repositories/config.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { bootstrapTelemetry } from 'src/repositories/telemetry.repository';
import { ApiService } from 'src/services/api.service';
import { useSwagger } from 'src/utils/misc';
import { AuthService } from './services/auth.service';

export function configureTelemetry() {
  const { telemetry } = new ConfigRepository().getEnv();
  if (telemetry.metrics.size > 0) {
    bootstrapTelemetry(telemetry.apiPort);
  }
}

export async function configureExpress(
  app: NestExpressApplication,
  {
    permitSwaggerWrite = true,
    ssr,
  }: {
    /**
     * Whether to allow swagger module to write to the specs.json
     * This is not desirable when the API is not available
     * @default true
     */
    permitSwaggerWrite?: boolean;
    /**
     * Service to use for server-side rendering
     */
    ssr: typeof ApiService | typeof MaintenanceWorkerService;
  },
) {
  const configRepository = app.get(ConfigRepository);
  const { environment, host, port, resourcePaths, network } = configRepository.getEnv();

  const logger = await app.resolve(LoggingRepository);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  app.set('trust proxy', ['loopback', ...network.trustedProxies]);
  app.set('etag', 'strong');

  const auth = app.get(AuthService);

  app.use(
    '/api/yucca',
    async (req: Request, res: Response, next: () => void) => {
      try {
        await auth.authenticate({
          headers: req.headers,
          queryParams: {},
          metadata: { adminRoute: true, sharedLinkRoute: false, uri: req.url },
        });
        next();
      } catch {
        res.status(401).json({ message: 'Unauthorized' });
      }
    },
  );
  app.use(
    createProxyMiddleware({
      target: 'http://127.0.0.1:22676',
      pathFilter: '/api/yucca/**',
      ws: true,
      on: {
        proxyReqWs: async (_proxyReq, req, socket) => {
          try {
            await auth.authenticate({
              headers: req.headers,
              queryParams: {},
              metadata: { adminRoute: true, sharedLinkRoute: false, uri: req.url ?? '' },
            });
          } catch {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
          }
        },
      },
    }),
  );

  app.use(cookieParser());
  app.use(json({ limit: '10mb' }));

  if (configRepository.isDev()) {
    app.enableCors();
  }

  app.setGlobalPrefix('api', { exclude: excludePaths });
  app.useWebSocketAdapter(new WebSocketAdapter(app));

  useSwagger(app, { write: configRepository.isDev() && permitSwaggerWrite });

  if (existsSync(resourcePaths.web.root)) {
    // copied from https://github.com/sveltejs/kit/blob/679b5989fe62e3964b9a73b712d7b41831aa1f07/packages/adapter-node/src/handler.js#L46
    // provides serving of precompressed assets and caching of immutable assets
    app.use(
      sirv(resourcePaths.web.root, {
        etag: true,
        gzip: true,
        brotli: true,
        extensions: [],
        setHeaders: (res, pathname) => {
          if (pathname.startsWith(`/_app/immutable`) && res.statusCode === 200) {
            res.setHeader('cache-control', 'public,max-age=31536000,immutable');
          }
        },
      }),
    );
  }

  app.use(app.get(ssr).ssr(excludePaths));
  app.use(compression());

  const server = await (host ? app.listen(port, host) : app.listen(port));
  server.requestTimeout = 24 * 60 * 60 * 1000;

  logger.log(`Immich Server is listening on ${await app.getUrl()} [v${serverVersion}] [${environment}] `);
}
