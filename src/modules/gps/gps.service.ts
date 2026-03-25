import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as mqtt from 'mqtt';
import { GpsLog } from '../../entities/gps-log.entity';
import { DevicesService } from '../devices/devices.service';
import { StreamingGateway } from '../streaming/streaming.gateway';

// Interfaz actualizada para coincidir con el JSON corto de la ESP32
interface GpsPayload {
  id: string;
  k: string;    // api_key
  lat: number;
  lon: number;
  v: number;    // velocidad
  b: boolean;   // buffer
  s?: number;   // senal
  h?: string;   // hora (HHMMSS)
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
      this.logger.log('Conexion MQTT cerrada');
    }
  }

  private connectMqtt() {
    const brokerUrl = this.configService.get<string>('MQTT_BROKER_URL') || '';
    const topic = this.configService.get<string>('MQTT_TOPIC') || 'muniantigua/gps';

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
      this.logger.warn(`Mensaje invalido en ${topic}: ${raw}`);
      return;
    }

    if (!payload.id || payload.lat === undefined || payload.lon === undefined) {
      this.logger.warn(`Payload incompleto: ${raw}`);
      return;
    }

    if (payload.lat === 0 || payload.lon === 0) {
      this.logger.warn(`Coordenadas nulas de ${payload.id}, descartando`);
      return;
    }

    let device;
    try {
      device = await this.devicesService.findOne(payload.id);
    } catch {
      this.logger.warn(`Dispositivo desconocido: ${payload.id}, descartando`);
      return;
    }

    // Validacion de seguridad API KEY
    if (device.api_key !== payload.k) {
      this.logger.warn(`Intento de acceso denegado (API KEY incorrecta) para ${payload.id}`);
      return;
    }

    // Manejo exacto de la hora para evitar distorsion de la ruta
    let logTimestamp = new Date();
    
    if (payload.h && payload.h.length >= 6) {
      const hours = parseInt(payload.h.substring(0, 2), 10);
      const minutes = parseInt(payload.h.substring(2, 4), 10);
      const seconds = parseInt(payload.h.substring(4, 6), 10);

      // El satelite siempre envia la hora en formato UTC (GMT 0)
      const exactTime = new Date();
      exactTime.setUTCHours(hours, minutes, seconds, 0); // El satelite siempre envia la hora en formato UTC (GMT 0)
      exactTime.setHours(exactTime.getHours() - 6); // Ajustamos a GMT -6 (hora local de Guatemala)
      logTimestamp = exactTime;
    }

    const log = new GpsLog();
    log.deviceId = payload.id;
    log.latitude = payload.lat;
    log.longitude = payload.lon;
    log.speed = payload.v ?? 0;
    log.is_buffered = payload.b ?? false;
    log.timestamp = logTimestamp;
    log.signal_strength = payload.s ?? null;

    await this.gpsLogRepo.save(log);
    await this.devicesService.updateLastOnline(payload.id);

    const source = payload.b ? '[buffer]' : '[realtime]';
    const netInfo = payload.s ? ` | Claro ${payload.s}/31` : '';
    this.logger.log(`${source} ${payload.id}: ${payload.lat}, ${payload.lon}${netInfo}`);

    this.streamingGateway.broadcastLocation({
      deviceId: payload.id,
      lat: payload.lat,
      lon: payload.lon,
      speed: payload.v ?? 0,
      is_buffered: payload.b ?? false,
      timestamp: logTimestamp.toISOString(),
      sig: payload.s,
      op: 'Claro',
    });
  }

  async getHistory(deviceId: string, limit: number): Promise<GpsLog[]> {
    return this.gpsLogRepo.find({
      where: { deviceId },
      order: { timestamp: 'ASC' },
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