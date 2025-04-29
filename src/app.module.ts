import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NmsService } from './nms/nms.service'; // Ensure the correct path
import { Stream } from './stream/stream.entity'; // Adjust based on your entity

@Module({
  imports: [
    // TypeORM configuration for SQLite
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data/streaming.db', // Path to your SQLite database
      entities: [Stream], // Include your entities here
      synchronize: true, // Set to false in production
    }),
    TypeOrmModule.forFeature([Stream]), // Register the Stream entity
  ],
  controllers: [],  // Add your controllers if needed
  providers: [NmsService],  // Register NmsService as a provider
})
export class AppModule {}
