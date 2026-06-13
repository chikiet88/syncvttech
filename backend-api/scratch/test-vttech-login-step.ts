import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function main() {
  console.log('Starting Nest context for testing login step...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  // Lấy ra session đầu tiên trong sessions
  const s = (vttechApi as any).sessions[0];
  console.log(`Testing login for session: ${s.username}`);

  // Test request trực tiếp bằng axiosInstance của vttechApi để xem có bị chặn/timeout không
  const axiosInstance = (vttechApi as any).axiosInstance;
  const baseUrl = (vttechApi as any).baseUrl;

  console.log('Sending direct GET request to /Login/Login...');
  const start = Date.now();
  try {
    const res = await axiosInstance.get('/Login/Login?ver=' + Date.now(), {
      session: s,
      timeout: 12000,
    });
    console.log(`Success GET /Login/Login in ${Date.now() - start}ms! Status: ${res.status}`);
  } catch (err: any) {
    console.error(`Failed GET /Login/Login in ${Date.now() - start}ms:`, err.message);
  }

  await app.close();
}

main().catch(console.error);
