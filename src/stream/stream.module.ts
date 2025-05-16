import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamService } from './stream.service';
import { StreamController } from './stream.controller';
import { MetricService } from '../metrics/metric.service';
import { MetricController } from '../metrics/metric.controller';
import { User } from './user.entity';
import { Stream } from './stream.entity'; // Import Stream entity
import { MetricsModule } from '../metrics/metric.module';  // Import MetricsModule

@Module({
  imports: [
    TypeOrmModule.forFeature([ Stream, User]),
    MetricsModule,  // Add MetricsModule to resolve MetricGateway dependency
  ],
  providers: [StreamService, MetricService],
  controllers: [StreamController, MetricController],
})
export class StreamModule {}
