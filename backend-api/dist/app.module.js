"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const app_controller_1 = require("./app.controller");
const report_controller_1 = require("./report.controller");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./prisma.service");
const vttech_api_service_1 = require("./vttech-api.service");
const sync_service_1 = require("./sync.service");
const sync_processor_1 = require("./sync.processor");
const pbx_api_service_1 = require("./pbx-api.service");
const pbx_sync_service_1 = require("./pbx-sync.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    let host = configService.get('REDIS_HOST') || 'localhost';
                    let port = configService.get('REDIS_PORT') || 6379;
                    if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
                        host = 'localhost';
                        port = 18104;
                    }
                    return {
                        connection: {
                            host,
                            port,
                            password: configService.get('REDIS_PASSWORD'),
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'sync-queue',
            }),
        ],
        controllers: [app_controller_1.AppController, report_controller_1.ReportController],
        providers: [
            app_service_1.AppService,
            prisma_service_1.PrismaService,
            vttech_api_service_1.VttechApiService,
            sync_service_1.SyncService,
            sync_processor_1.SyncProcessor,
            pbx_api_service_1.PbxApiService,
            pbx_sync_service_1.PbxSyncService,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map