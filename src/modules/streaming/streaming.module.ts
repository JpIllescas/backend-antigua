import { Module } from '@nestjs/common';
import { StreamingGateway } from './streaming.gateway';

@Module({
    providers: [StreamingGateway],
    exports: [StreamingGateway],
})
export class StreamingModule {}