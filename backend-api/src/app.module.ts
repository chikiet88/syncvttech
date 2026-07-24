
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { ReportController } from './report.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';
import { VttechApiService } from './vttech-api.service';
import { SyncService } from './sync.service';
import { SyncProcessor } from './sync.processor';
import { PbxApiService } from './pbx-api.service';
import { PbxSyncService } from './pbx-sync.service';
import { McpController } from './mcp/mcp.controller';
import { McpService } from './mcp/mcp.service';
import { ExcelExportService } from './excel-export.service';
import { GsheetReportService } from './gsheet-report.service';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Smart fallback for Redis Host
        let host = configService.get<string>('REDIS_HOST') || 'localhost';
        let port = configService.get<number>('REDIS_PORT') || 6379;
        
        // If not in docker environment, use host port 18104
        if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
           host = 'localhost';
           port = 12004;
        }

        return {
          connection: {
            host,
            port,
            password: configService.get<string>('REDIS_PASSWORD'),
          },
        };
      },
      inject: [ConfigService],
    }),
    // Register the sync queue
    BullModule.registerQueue({
      name: 'sync-queue',
    }),
  ],
  controllers: [AppController, ReportController, McpController],
  providers: [
    AppService,
    PrismaService,
    VttechApiService,
    SyncService,
    SyncProcessor,
    PbxApiService,
    PbxSyncService,
    McpService,
    ExcelExportService,
    GsheetReportService,
  ],
})
export class AppModule {}
