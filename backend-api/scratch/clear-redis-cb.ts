import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { Redis } from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
class TempModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(TempModule);
  const config = app.get(ConfigService);

  let host = config.get<string>('REDIS_HOST') || 'localhost';
  let port = config.get<number>('REDIS_PORT') || 6379;
  
  if (host === 'tazagroupnet-redis' && process.env.NODE_ENV !== 'production') {
     host = 'localhost';
     port = 12004;
  }

  console.log(`Connecting to Redis at ${host}:${port}...`);
  const redis = new Redis({
    host,
    port,
    password: config.get<string>('REDIS_PASSWORD'),
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
