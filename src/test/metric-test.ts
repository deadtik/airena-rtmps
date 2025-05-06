import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MetricService } from '../metrics/metric.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const metricService = app.get(MetricService);



  // Fetch recent metrics
  const metrics = await metricService.getLiveMetrics('test');
  console.log('Recent Metrics:');
  console.table(metrics);

  await app.close();
}
bootstrap();
