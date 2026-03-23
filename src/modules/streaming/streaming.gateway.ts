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

// 1. ACTUALIZAMOS LA INTERFAZ
// Añadimos ts, sig y op como opcionales (?) para no romper 
// la compatibilidad con registros que no los tengan.
export interface LocationPayload {
  deviceId: string;
  lat: number;
  lon: number;
  speed: number;
  is_buffered: boolean;
  timestamp: string;
  ts?: string;    // Satellite Timestamp
  sig?: number;   // Signal Strength (RSSI)
  op?: string;    // Operator (Tigo/Claro)
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
   * Ahora incluirá los datos de red y tiempo satelital si están disponibles.
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