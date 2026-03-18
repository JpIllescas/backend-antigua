import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Device } from '../../entities/device.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class DevicesService {
    constructor(
        @InjectRepository(Device)
        private readonly deviceRepo: Repository<Device>,
    ) {}

    async create(dto: CreateDeviceDto): Promise<Device> {
        const exists = await this.deviceRepo.findOne({ where: { id: dto.id } });
        if (exists) {
            throw new ConflictException(`El dispositivo con el id ${dto.id} ya esta registrado`);
        }

        const device = this.deviceRepo.create(dto);
        return this.deviceRepo.save(device);
    }
    async findAll(): Promise<Device[]> {
        return this.deviceRepo.find({ order: { create_at: 'DESC' } });
    }

    async findOne(id: string): Promise<Device> {
        const device = await this.deviceRepo.findOne({ where: { id } });
        if (!device) throw new NotFoundException(`El dispositivo con el id ${id} no existe`);
        return device;
    }
    
    async update(id: string, dto: UpdateDeviceDto): Promise<Device> {
        const device = await this.findOne(id);
        Object.assign(device, dto);
        return this.deviceRepo.save(device);
    }

    async remove(id: string): Promise<void> {
        const device = await this.findOne(id);
        await this.deviceRepo.remove(device);
    }

    async updateLastOnline(id: string): Promise<void> {
        await this.deviceRepo.update(id, { last_online: new Date() });
    } 
}
