import { Controller, Get, Param, Query } from '@nestjs/common';
import { GpsService } from './gps.service';
import { GpsLog } from '../../entities/gps-log.entity'

@Controller('gps')
export class GpsController {
  constructor(private readonly gpsService: GpsService) {}

  @Get(':deviceId/history')
  getHistory(
    @Param('deviceId') deviceId: string,
    @Query('limit') limit?: number,
  ) {
    return this.gpsService.getHistory(deviceId, limit ? +limit : 100);
  }

  @Get(':deviceId/last')
  getLastPosition(@Param('deviceId') deviceId: string): Promise<GpsLog | null> {
    return this.gpsService.getLastPosition(deviceId);
  }
}   