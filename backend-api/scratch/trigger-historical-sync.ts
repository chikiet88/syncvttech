import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SyncService } from '../src/sync.service';

async function main() {
  console.log('🔄 Đang khởi tạo ứng dụng NestJS...');
  const app = await NestFactory.createApplicationContext(AppModule);
  const syncService = app.get(SyncService);

  console.log('🚀 Đang kích hoạt tiến trình đồng bộ lịch sử (Historical Sync) thủ công...');
  await syncService.handleHistoricalSyncCron();

  console.log('✅ Đã xếp hàng các task thành công!');
  
  // Đợi 2 giây để các cập nhật DB & Redis ghi nhận xong
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await app.close();
}

main().catch(console.error);
