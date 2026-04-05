import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VttechApiService } from './vttech-api.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);
  
  vttechApi.setLogCallback(msg => console.log(msg));

  try {
    const customerId = 125349;
    console.log("Testing MainCustomer LoadPaymentInfo...");
    const payInfo = await vttechApi.callHandler('/Customer/MainCustomer/', 'LoadPaymentInfo', { CustomerID: customerId });
    console.log("PayInfo:", payInfo);
  } catch (e) {
    console.error("Error:", e);
  }
  
  await app.close();
}

bootstrap();
