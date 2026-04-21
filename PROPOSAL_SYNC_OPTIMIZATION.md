# ĐỀ XUẤT TỐI ƯU HÓA ĐỒNG BỘ DỮ LIỆU LỚN & GIÁM SÁT TỰ ĐỘNG

## 1. Vấn đề hiện tại
- **Dữ liệu lịch sử khổng lồ:** ~42,000 task từ năm 2019 đang ở trạng thái `PENDING`, chưa có cơ chế tự động xử lý.
- **Rủi ro quá tải:** Nếu đồng bộ ồ ạt sẽ bị VTTech chặn (Rate Limit) hoặc làm chậm hệ thống Dashboard.
- **Thiếu báo cáo định kỳ:** Người vận hành khó nắm bắt tổng lượng dữ liệu đã đồng bộ trong ngày nếu không vào database kiểm tra.

## 2. Giải pháp tối ưu hóa (Phân bổ tải)

### A. Cơ chế "Dòng chảy nhỏ" (Micro-batching) cho lịch sử
Thay vì chạy ồ ạt, hệ thống sẽ tự động "nhặt" một lượng nhỏ task cũ để xử lý xen kẽ:
- **Tần suất:** Mỗi 15 phút (trong các khung giờ thấp điểm) hoặc mỗi 30 phút (giờ cao điểm).
- **Số lượng:** 50 - 100 task/lần.
- **Ưu tiên (Priority):** 
    - Dữ liệu hôm nay: **Priority 1** (Cao nhất).
    - Dữ liệu lịch sử: **Priority 10** (Thấp nhất).
- **Cơ chế kiểm soát:** Chỉ kích hoạt Task cũ khi hàng đợi (Queue) của ngày hôm nay đã trống.

### B. Tự động hóa báo cáo (Reporting)
Tự động tổng hợp dữ liệu và gửi thông báo vào bảng giám sát (`/monitoring/sync`) tại 2 khung giờ cố định:
- **Khung giờ 1 (08:00 AM):** Báo cáo kết quả đồng bộ Master Data và dữ liệu tồn đọng từ đêm qua.
- **Khung giờ 2 (08:00 PM):** Báo cáo tổng kết hiệu suất đồng bộ trong ngày, doanh thu và lượng khách hàng mới.

## 3. Kế hoạch triển khai Code

### SyncService:
- Thêm `handleHistoricalSyncCron()`: Tự động quét `SyncTask` ở trạng thái `PENDING` và đẩy vào BullMQ với priority thấp.
- Thêm `generateDailyStatusReport()`: Tổng hợp số liệu từ `SyncTask` và `Customer` trong ngày, lưu vào `CrawlLog` với type `DAILY_REPORT`.

### BullMQ Configuration:
- Đảm bảo `sync-queue` xử lý theo thứ tự ưu tiên (Priority-based).

---
*Đề xuất bởi Antigravity AI - 20/04/2026*
