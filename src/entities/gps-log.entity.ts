import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { Device } from './device.entity';

@Entity('gps_logs')
@Index(['deviceId', 'timestamp'])
@Index(['received_at'])
export class GpsLog {

  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @ManyToOne(() => Device, { onDelete: 'CASCADE', eager: false })
  @JoinColumn({ name: 'deviceId' })
  device: Device;

  @Column({ type: 'varchar', length: 50 })
  deviceId: string;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  latitude: number;

  @Column({ type: 'decimal', precision: 9, scale: 6 })
  longitude: number;

  @Column({ type: 'decimal', precision: 6, scale: 2, default: 0 })
  speed: number;

  @Column({ type: 'boolean', default: false })
  is_buffered: boolean;

  // Calidad de señal RSSI del módulo SIM (0-31)
  @Column({ type: 'int', nullable: true })
  signal_strength: number;

  // Operador de red detectado (Tigo, Claro, etc.)
  @Column({ type: 'varchar', length: 20, nullable: true })
  operator: string;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @CreateDateColumn({ type: 'timestamptz' })
  received_at: Date;
}