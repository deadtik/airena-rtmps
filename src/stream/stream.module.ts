import { Module } from '@nestjs/common';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stream } from './stream.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Stream])],
  controllers: [StreamController],
  providers: [StreamService],
})
export class StreamModule {}
