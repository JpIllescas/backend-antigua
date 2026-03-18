import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface LocationPayload {
  deviceId: string;
  lat: number;
  lon: number;
  speed: number;
  is_buffered: boolean;
  timestamp: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tracking',
})
export class StreamingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server: Server;

  private readonly logger = new Logger(StreamingGateway.name);

  afterInit() {
    this.logger.log('🔌 WebSocket Gateway iniciado en /tracking');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  /**
   * El frontend puede suscribirse a un dispositivo específico.
   * Ejemplo desde Vue: socket.emit('join:device', 'ANDA_ANTIGUA_01')
   */
  @SubscribeMessage('join:device')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() deviceId: string,
  ) {
    client.join(`device:${deviceId}`);
    this.logger.log(`Cliente ${client.id} se unió a device:${deviceId}`);
    return { event: 'joined', deviceId };
  }

  @SubscribeMessage('leave:device')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() deviceId: string,
  ) {
    client.leave(`device:${deviceId}`);
    return { event: 'left', deviceId };
  }

  /**
   * Emite a TODOS los clientes conectados.
   * Lo llama GpsService cada vez que llega una coordenada.
   */
  broadcastLocation(payload: LocationPayload): void {
    this.server.emit('location:update', payload);
  }

  /**
   * Emite solo a los clientes suscritos a ese dispositivo.
   */
  broadcastToDevice(deviceId: string, payload: LocationPayload): void {
    this.server.to(`device:${deviceId}`).emit('location:update', payload);
  }
}