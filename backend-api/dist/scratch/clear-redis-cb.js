"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = require("ioredis");
let TempModule = class TempModule {
};
TempModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
        ],
    })
], TempModule);
async function main() {
    const app = await core_1.NestFactory.createApplicationContext(TempModule);
    const config = app.get(config_1.ConfigService);
    let host = config.get('REDIS_HOST') || 'localhost';
    let port = config.get('REDIS_PORT') || 6379;
    if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
        host = 'localhost';
        port = 12004;
    }
    console.log(`Connecting to Redis at ${host}:${port}...`);
    const redis = new ioredis_1.Redis({
        host,
        port,
        password: config.get('REDIS_PASSWORD'),
    });
    const keys = await redis.keys('vttech:circuit_breaker:*');
    console.log(`Found ${keys.length} circuit breaker keys:`, keys);
    if (keys.length > 0) {
        await redis.del(...keys);
        console.log('Successfully cleared all circuit breaker keys!');
    }
    await redis.quit();
    await app.close();
}
main().catch(console.error);
//# sourceMappingURL=clear-redis-cb.js.map