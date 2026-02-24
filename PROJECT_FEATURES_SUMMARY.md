# VTTech Studio - Project Features Summary
**Cập nhật cuối:** 24/02/2026
**Trạng thái:** Operational

Dự án này là một giải pháp toàn diện để đồng bộ, quản lý và phân tích dữ liệu từ hệ thống CRM VTTech và tổng đài PBX.

---

## 🏗️ 1. Kiến trúc Hệ thống (Architecture)

Hệ thống được xây dựng theo mô hình Monorepo/Microservices kết hợp:
1. **Backend API (NestJS)**: 
   - Đóng vai trò là "Sync Engine" chính.
   - Xử lý xác thực JWT & XSRF với VTTech.
   - Giải nén dữ liệu (GZip/Brotli/Base64).
   - Quản lý các tác vụ định kỳ (Cron Jobs).
2. **Dashboard Frontend (Next.js 16)**:
   - Giao diện quản trị hiện đại (ShadcnUI + TailwindCSS).
   - Hiển thị báo cáo doanh thu, danh sách khách hàng và nhật ký đồng bộ.
   - Cung cấp tính năng điều khiển đồng bộ thủ công.
3. **Database (Prisma + SQLite)**:
   - Lưu trữ tập trung dữ liệu đã đồng bộ từ nhiều nguồn.
   - Hỗ trợ quan hệ dữ liệu phức tạp (Khách hàng <-> Giao dịch <-> Cuộc gọi).

---

## 🚀 2. Các Tính năng Chính (Features)

### 📊 2.1. Quản lý Doanh thu (Revenue Management)
- **Đồng bộ đa tầng**: Lấy dữ liệu tổng hợp theo chi nhánh và dữ liệu chi tiết từng giao dịch (`revenueTransaction`).
- **Báo cáo chi tiết**: Xem lịch sử doanh thu theo khoảng ngày, lọc theo chi nhánh, tìm kiếm khách hàng/dịch vụ.
- **Biểu đồ xu hướng**: Dashboard hiển thị biểu đồ doanh thu 7 ngày gần nhất.
- **Dynamic Fetching**: Tự động lấy dữ liệu trực tiếp từ API VTTech nếu dữ liệu trong DB cục bộ chưa có (Fallback mechanism).

### 👥 2.2. Quản lý Khách hàng (CRM Management)
- **Hồ sơ 360 độ**: Đồng bộ đầy đủ thông tin khách hàng (ID, Họ tên, SĐT, Email, Nhóm, Chi nhánh).
- **Lịch sử Tài chính**: Theo dõi tổng chi tiêu (`total_spent`) và công nợ (`total_debt`) được cập nhật realtime khi đồng bộ.
- **Chi tiết dịch vụ**: Lưu trữ tất cả thẻ dịch vụ, lịch sử điều trị, đơn thuốc và nhật ký chăm sóc của từng khách hàng.
- **Lượt hẹn (Appointments)**: Theo dõi lịch hẹn trong ngày và trạng thái check-in.

### 📞 2.3. Tích hợp Tổng đài (PBX Call Center)
- **Đồng bộ CDR**: Tự động tải lịch sử cuộc gọi từ hệ thống PBX (tên miền tùy chỉnh).
- **Quản lý Extension**: Đồng bộ danh sách máy lẻ và mật khẩu từ VTTech.
- **Ánh xạ Nhân viên**: Kết nối nhân viên trên CRM với máy lẻ tổng đài để theo dõi hiệu suất nghe gọi.
- **Nghe lại ghi âm**: Hỗ trợ đường dẫn file ghi âm cuộc gọi trực tiếp trên bảng điều khiển.

### ⚙️ 2.4. Công cụ Đồng bộ (Sync Engine)
- **Cron Jobs**: 
  - `00:00`: Đồng bộ toàn bộ dữ liệu CRM ngày hôm trước.
  - `01:00`: Đồng bộ log cuộc gọi PBX.
- **Manual Sync Control**: Giao diện cho phép chạy đồng bộ thủ công theo khoảng ngày tùy chỉnh.
- **Chiến lược giảm tải**: Cơ chế "Daily Chunking" (xử lý cuốn chiếu theo ngày) và "Micro-delays" (nghỉ 100ms giữa các request) để tránh bị khóa IP.

---

## 🛠️ 3. Danh sách Endpoints quan trọng

### API VTTech (Crawl)
| Endpoint | Handler | Mô tả |
| :--- | :--- | :--- |
| `/api/Home/SessionData` | Master | Lấy toàn bộ danh mục (Branch, Service, Employee...) |
| `/Customer/ListCustomer/` | `LoadData` | Khám phá khách hàng có biến động theo ngày |
| `/Report/Revenue/Branch/...` | `LoadataDetailByBranch` | Lấy chi tiết dòng tiền/doanh thu |
| `/Customer/MainCustomer/` | `LoadPaymentInfo` | Lấy số dư và công nợ khách hàng |

### API Nội bộ (Backend)
| Path | Method | Mô tả |
| :--- | :--- | :--- |
| `/reports/revenue` | `GET` | Lấy báo cáo doanh thu đã sync (có pagination/filter) |
| `/monitoring/logs` | `GET` | Xem lịch sử các phiên đồng bộ |
| `/sync/range` | `POST` | Kích hoạt đồng bộ thủ công theo khoảng ngày |

---

## 🖥️ 4. Hướng dẫn Vận hành (Operations)

Dự án cung cấp script `manage.sh` là trung tâm điều khiển:
- **Option 1**: Mở Prisma Studio (Giao diện quản lý DB).
- **Option 2/3**: Backup/Restore dữ liệu ra định dạng JSON.
- **Option 5**: Cập nhật cấu trúc Database (`db push`).
- **Option 9**: Khởi động toàn bộ hệ thống (Full Stack).

---

## 📁 5. Cấu trúc Thư mục Nguồn

```text
/
├── backend-api/          # Source code NestJS (Sync Engine)
│   ├── src/sync.service.ts    # Logic đồng bộ chính (Crucial)
│   └── prisma/schema.prisma   # Định nghĩa cấu trúc Database
├── vttech-dashboard/     # Source code Next.js (Admin UI)
│   ├── src/app/reports/       # Module báo cáo
│   └── src/app/customers/     # Module quản lý khách hàng
├── manage.sh             # Script quản trị hệ thống
└── *.md                  # Tài liệu kỹ thuật & API Guide
```
