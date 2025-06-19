import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VodModule } from './vod/vod.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vod } from './vod/vod.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [Vod],
      synchronize: true, // Auto-create database schema (dev only)
    }),
    VodModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
