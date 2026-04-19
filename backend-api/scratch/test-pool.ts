import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(VttechApiService);

  console.log('--- TESTING MULTI-ACCOUNT LOGIN ---');
  const status = await service.checkLoginStatus();
  console.log('Result:', JSON.stringify(status, null, 2));

  await app.close();
}

bootstrap().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
