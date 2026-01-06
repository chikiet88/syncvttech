
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
import { SyncService } from './sync.service';
import { PbxApiService } from './pbx-api.service';
import { PbxSyncService } from './pbx-sync.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env', // Point to the root .env
    }),
    ScheduleModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    PrismaService,
    VttechApiService,
    SyncService,
    PbxApiService,
    PbxSyncService,
  ],
})
export class AppModule {}
