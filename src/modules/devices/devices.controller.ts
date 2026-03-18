import {
    Controller, Get, Post, Put, Delete,
    Param, Body, HttpCode, HttpStatus, 
} from '@nestjs/common'
import { DevicesService } from './devices.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Controller('devices')
export class DevicesController {
    constructor(private readonly devicesService: DevicesService) {}

    @Post()
    create(@Body() dto: CreateDeviceDto) {
        return this.devicesService.create(dto);
    }

    @Get()
    findAll() {
        return this.devicesService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id:string) {
        return this.devicesService.findOne(id);
    }

    @Put(':id')
    update(@Param('id') id:string, @Body() dto: UpdateDeviceDto) {
        return this.devicesService.update(id, dto);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(@Param('id') id:string) {
        return this.devicesService.remove(id);
    }

}

