import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { GpsLog } from '../../entities/gps-log.entity';
import { DevicesService } from '../devices/devices.service';
import { StreamingGateway } from '../streaming/streaming.gateway';

// Payload que envía la ESP32
// Campos principales: id, lat, lon, vel, buf
// Campos opcionales nuevos: sig (señal RSSI), op (operador)
interface GpsPayload {
  id: string;
  lat: number;
  lon: number;
  vel: number;
  buf: boolean;
  sig?: number;   // Signal strength RSSI (0-31)
  op?: string;    // Operador (Claro, Tigo, etc.)
}

@Injectable()
export class GpsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GpsService.name);
  private client: mqtt.MqttClient;

  constructor(
    @InjectRepository(GpsLog)
    private readonly gpsLogRepo: Repository<GpsLog>,
    private readonly devicesService: DevicesService,
    private readonly configService: ConfigService,
    private readonly streamingGateway: StreamingGateway,
  ) {}

  onModuleInit() {
    this.connectMqtt();
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end();
      this.logger.log('Conexión MQTT cerrada');
    }
  }

  private connectMqtt() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL') || '';
    const topic = this.configService.get<string>('MQTT_TOPIC') || 'muniantigua/gps';

    if (!brokerUrl) {
      this.logger.warn('MQTT_BROKER_URL no configurado, saltando conexión MQTT');
      return;
    }

    this.logger.log(`Conectando a MQTT: ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: `gps-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      keepalive: 120,
      connectTimeout: 30000,
    });

    this.client.on('connect', () => {
      this.logger.log('MQTT conectado');
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Error al suscribirse: ${err.message}`);
        } else {
          this.logger.log(`Suscrito a: ${topic}`);
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      await this.handleMessage(topic, message.toString());
    });

    this.client.on('error', (err) => {
      this.logger.error(`Error MQTT: ${err.message}`);
    });

    this.client.on('reconnect', () => {
      this.logger.warn('Reconectando a MQTT...');
    });
  }

  private async handleMessage(topic: string, raw: string): Promise<void> {
    let payload: GpsPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn(`Mensaje inválido en ${topic}: ${raw}`);
      return;
    }

    // Validar campos obligatorios — usa "id", "lat", "lon", "vel", "buf"
    if (!payload.id || payload.lat === undefined || payload.lon === undefined) {
      this.logger.warn(`Payload incompleto: ${raw}`);
      return;
    }

    if (payload.lat === 0 || payload.lon === 0) {
      this.logger.warn(`Coordenadas nulas de ${payload.id}, descartando`);
      return;
    }

    try {
      await this.devicesService.findOne(payload.id);
    } catch {
      this.logger.warn(`Dispositivo desconocido: ${payload.id}, descartando`);
      return;
    }

    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Guatemala' })
    );

    const log = this.gpsLogRepo.create({
      deviceId: payload.id,
      latitude: payload.lat,
      longitude: payload.lon,
      speed: payload.vel ?? 0,
      is_buffered: payload.buf ?? false,
      timestamp: now,
      signal_strength: payload.sig ?? null,
      operator: payload.op ?? null,
    });

    await this.gpsLogRepo.save(log);
    await this.devicesService.updateLastOnline(payload.id);

    const source = payload.buf ? '[buffer]' : '[realtime]';
    const netInfo = payload.op ? ` | ${payload.op} ${payload.sig}/31` : '';
    this.logger.log(`${source} ${payload.id}: ${payload.lat}, ${payload.lon}${netInfo}`);

    this.streamingGateway.broadcastLocation({
      deviceId: payload.id,
      lat: payload.lat,
      lon: payload.lon,
      speed: payload.vel ?? 0,
      is_buffered: payload.buf ?? false,
      timestamp: now.toISOString(),
      sig: payload.sig,
      op: payload.op,
    });
  }

  async getHistory(deviceId: string, limit: number): Promise<GpsLog[]> {
    return this.gpsLogRepo.find({
      where: { deviceId },
      order: { timestamp: 'ASC' },   // ASC para que el frontend ya reciba la ruta ordenada
      take: limit,
    });
  }

  async getLastPosition(deviceId: string): Promise<GpsLog | null> {
    return this.gpsLogRepo.findOne({
      where: { deviceId },
      order: { timestamp: 'DESC' },
    });
  }
}