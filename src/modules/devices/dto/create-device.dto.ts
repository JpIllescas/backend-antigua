import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateDeviceDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    id: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    api_key: string;
}