import { DataSource } from 'typeorm';
import { Stream } from './stream/stream.entity';  // Import your Stream entity
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';

TypeOrmModule.forRoot({
  type: 'sqlite',
  database: join(__dirname, 'src/data/streaming.db'), // Absolute path
  entities: [Stream],
  synchronize: true,
})

