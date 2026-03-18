import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Device } from '../entities/device.entity';
import { GpsLog } from '../entities/gps-log.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  entities: [Device, GpsLog],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});