import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';

async function main() {
  console.log('🔄 Đang khởi tạo ứng dụng NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  console.log('🕵️ Đang kích hoạt tiến trình tự sửa lỗi và reset các task bị kẹt (Self-healing)...');
  await syncService.handleStaleTasksCron();

  console.log('✅ Đã chạy xong tự sửa lỗi!');
  
  // Đợi 2 giây để chắc chắn các cập nhật DB đã ghi nhận xong
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await app.close();
}

main().catch(console.error);
