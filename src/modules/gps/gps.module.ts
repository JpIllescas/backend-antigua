import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm';
import { GpsLog } from '../../entities/gps-log.entity';
import { GpsService } from './gps.service';
import { GpsController } from './gps.controller';
import { DevicesModule } from '../devices/devices.module';
import { StreamingModule } from '../streaming/streaming.module'

@Module({
    imports: [
        TypeOrmModule.forFeature([GpsLog]),
        DevicesModule,
        StreamingModule,
    ],
    controllers: [GpsController],
    providers: [GpsService],
    exports: [GpsService],
})
export class GpsModule {}
