import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { VttechApiService } from '../src/vttech-api.service';

async function check() {
  console.log('🔄 Đang khởi tạo ứng dụng NestJS để kiểm tra tài khoản...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const vttechApi = app.get(VttechApiService);

  console.log('📡 Đang kiểm tra trạng thái đăng nhập của tất cả các tài khoản...');
  const status = await vttechApi.checkLoginStatus();
  
  console.log('\n=== KẾT QUẢ ĐĂNG NHẬP ===');
  console.log(`- Trạng thái tổng: ${status.success ? '✅ THÀNH CÔNG' : '❌ THẤT BẠI'}`);
  console.log(`- Thông điệp: ${status.message}`);
  console.log(`- Tổng số tài khoản: ${status.accounts}`);
  console.log('\nChi tiết từng tài khoản:');
  status.details.forEach(d => {
    console.log(`  * ${d.username}: ${d.success ? '✅ OK' : '❌ FAILED'}`);
  });

  await app.close();
}

check().catch(console.error);
