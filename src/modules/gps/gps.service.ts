import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { GpsLog } from '../../entities/gps-log.entity';
import { DevicesService } from '../devices/devices.service';
import { StreamingGateway } from '../streaming/streaming.gateway';

interface GpsPayload {
  id: string;
  lat: number;
  lon: number;
  vel: number;
  buf: boolean;
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
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL', '');
    const topic = this.configService.get<string>('MQTT_TOPIC', '');

    if (!brokerUrl) {
      this.logger.warn('MQTT_BROKER_URL no configurado, saltando conexion MQTT');
      return;
    }

    this.logger.log(`Conectando a MQTT: ${brokerUrl}`);

    this.client = mqtt.connect(brokerUrl, {
      clientId: `gps-backend-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      keepalive: 120,
      connectTimeout: 3000,
    });

    this.client.on('connect', () => {
      this.logger.log('MQTT conectado');
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          this.logger.error(`Error al suscribirse: ${err.message}`);
        } else {
          this.logger.log(`📡 Suscrito a: ${topic}`);
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
    // Parsear JSON
    let payload: GpsPayload;
    try {
      payload = JSON.parse(raw);
    } catch {
      this.logger.warn(`Mensaje inválido en ${topic}: ${raw}`);
      return;
    }

    // Validaciones básicas
    if (!payload.id || !payload.lat || !payload.lon) {
      this.logger.warn(`Payload incompleto: ${raw}`);
      return;
    }

    if (payload.lat === 0 || payload.lon === 0) {
      this.logger.warn(`Coordenadas nulas de ${payload.id}, descartando`);
      return;
    }

    // Verificar que el dispositivo existe en la BD
    try {
      await this.devicesService.findOne(payload.id);
    } catch {
      this.logger.warn(`Dispositivo desconocido: ${payload.id}, descartando`);
      return;
    }

    // Guardar en gps_logs
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Guatemala'})); 

    const log = this.gpsLogRepo.create({
      deviceId: payload.id,
      latitude: payload.lat,
      longitude: payload.lon,
      speed: payload.vel ?? 0,
      is_buffered: payload.buf ?? false,
      timestamp: now,
    });

    await this.gpsLogRepo.save(log);

    // Actualizar last_online del dispositivo
    await this.devicesService.updateLastOnline(payload.id);

    const source = payload.buf ? 'buffer' : 'realtime';
    this.logger.log(`[${source}] ${payload.id}: ${payload.lat}, ${payload.lon}`);

    this.streamingGateway.broadcastLocation({
      deviceId: payload.id,
      lat: payload.lat,
      lon: payload.lon,
      speed: payload.vel ?? 0,
      is_buffered: payload.buf ?? false,
      timestamp: now.toISOString(),
    });
  }

  async getHistory(deviceId: string, limit: number): Promise<GpsLog[]> {
    return this.gpsLogRepo.find({
      where: { deviceId },
      order: { timestamp: 'DESC' },
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
