import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Device } from './entities/device.entity';
import { GpsLog } from './entities/gps-log.entity';
import { DevicesModule } from './modules/devices/devices.module';
import { GpsModule } from './modules/gps/gps.module';
import { StreamingModule } from './modules/streaming/streaming.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USER'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        ssl: { rejectUnauthorized: false },
        entities: [Device, GpsLog],
        synchronize: false,
      }),
    }),
    DevicesModule,
    GpsModule,
    StreamingModule,
  ],
})
export class AppModule {}