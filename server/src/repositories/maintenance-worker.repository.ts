import { Injectable } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { MaintenanceAuthDto, MaintenanceStatusResponseDto } from 'src/dtos/maintenance.dto';
import { AppRestartEvent } from 'src/repositories/event.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { MaintenanceRepository } from 'src/repositories/maintenance.repository';

export const serverEvents = ['AppRestart'] as const;
export type ServerEvents = (typeof serverEvents)[number];

type AuthFn = (client: Socket) => Promise<MaintenanceAuthDto>;

@WebSocketGateway({
  cors: true,
  path: '/api/socket.io',
  transports: ['websocket'],
})
@Injectable()
export class MaintenanceWorkerRepository implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  private authFn?: AuthFn;

  @WebSocketServer()
  private websocketServer?: Server;

  private cachedSecret: string = null!;
  private ephemeralStatus: MaintenanceStatusResponseDto = null!;

  constructor(
    private logger: LoggingRepository,
    private maintenanceRepository: MaintenanceRepository,
  ) {
    this.logger.setContext(MaintenanceWorkerRepository.name);
  }

  init(secret: string, initialStatus: MaintenanceStatusResponseDto) {
    this.cachedSecret = secret;
    this.ephemeralStatus = initialStatus;
  }

  getSecret() {
    return this.cachedSecret;
  }

  status(type: 'public' | 'private') {
    const status = structuredClone(this.ephemeralStatus);

    if (type === 'public' && status.error) {
      status.error = 'Something went wrong, see logs!';
    }

    return status;
  }

  afterInit(websocketServer: Server) {
    this.logger.log('Initialized websocket server');
    websocketServer.on('AppRestart', () => this.maintenanceRepository.exitApp());
    websocketServer.on('MaintenanceStatusV1', (status) => (this.ephemeralStatus = status));
  }

  restartApp(state: AppRestartEvent) {
    // => corresponds to notification.service.ts#onAppRestart
    this.websocketServer!.emit('AppRestartV1', state, () => {
      this.websocketServer!.serverSideEmit('AppRestart', state, () => {
        this.maintenanceRepository.exitApp();
      });
    });
  }

  emitStatus(status: MaintenanceStatusResponseDto) {
    this.ephemeralStatus = status;
    this.websocketServer!.to('public').emit('MaintenanceStatusV1', this.status('public'));
    this.websocketServer!.to('private').emit('MaintenanceStatusV1', status);
    this.websocketServer!.serverSideEmit('MaintenanceStatusV1', status);
  }

  async handleConnection(client: Socket) {
    try {
      await this.authFn!(client);
      await client.join('private');
      this.logger.log(`Websocket Connect:    ${client.id} (private)`);
    } catch {
      await client.join('public');
      this.logger.log(`Websocket Connect:    ${client.id} (public)`);
    }
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Websocket Disconnect: ${client.id}`);
    await Promise.allSettled([client.leave('private'), client.leave('public')]);
  }

  setAuthFn(fn: (client: Socket) => Promise<MaintenanceAuthDto>) {
    this.authFn = fn;
  }
}
