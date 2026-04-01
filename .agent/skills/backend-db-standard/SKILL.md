---
name: backend-db-standard
description: Chuẩn mực phát triển Backend và Database cho KataCore - Multi-tenant, Prisma Optimization, GraphQL Best Practices & Security.
---

# 🚀 Backend & Database Standard for KataCore (High-Scale Ready)

Tài liệu này định nghĩa các tiêu chuẩn kỹ thuật bắt buộc để hệ thống đạt quy mô **1 triệu CCU** dựa trên kiến trúc **Cell-based**.

## 0. 🌍 Global Development Standard (Language)

- **Code & Database**: 100% Tiếng Anh (English).
  - Tên bảng, cột (Database Schema), biến (Variables), hàm (Functions), Class và Folder structure bắt buộc phải đặt tên bằng tiếng Anh chuẩn.
  - Mục tiêu: Dễ dàng mở rộng cho đội ngũ quốc tế và chuẩn hóa theo các thư viện toàn cầu.
- **Data & Logs**: Dữ liệu nghiệp vụ (Data content) có thể lưu chữ đa ngôn ngữ, nhưng cấu trúc metadata và system logs nên ưu tiên tiếng Anh.

## 1. 🏗️ Backend Architecture (High-Performance NestJS)

### 1.1. Module Blueprint & Cell Compatibility

- **Service**: Phải `extend BaseCompanyService`. Logic code phải đảm bảo **Stateless** để có thể scale ngang (horizontal scaling) vô hạn.
- **Tenant Isolation**: Tuyệt đối không lưu trữ dữ liệu cross-tenant trong bộ nhớ cục bộ (Local Memory). Sử dụng Redis cho mọi dữ liệu chia sẻ giữa các instance.

### 1.2. Asynchronous Task Standard (BullMQ/Kafka)

Để duy trì 1 triệu CCU, API phải phản hồi cực nhanh:

- **Rule**: Mọi tác vụ tốn > 100ms (Gửi mail, tạo PDF, đồng bộ dữ liệu bên thứ 3) **PHẢI** được đẩy vào hàng đợi (`QueueModule`).
- **Standard**: Sử dụng `JobId` theo định dạng `tenant_type_id` để tránh xử lý trùng lặp và dễ dàng trace lỗi theo từng Cell.

### 1.3. GraphQL Optimization

- **DataLoader**: Bắt buộc 100% cho các quan hệ.
- **Query Complexity**: Nghiêm cấm các bộ lọc lồng nhau sâu (deep nested filtering) trên các bảng lớn mà không có index phù hợp.

---

## 2. 🗄️ Database & Scaling (Cell-based Prisma)

### 2.1. Connection Pooling Optimization

- **Prisma Client**: Cấu hình `connection_limit` dựa trên tài nguyên của từng Cell.
- **Rule**: Tổng số connection từ tất cả app instance không được vượt quá 80% giới hạn của PostgreSQL Cluster.

### 2.2. Read/Write Splitting (Read Replicas)

- Đối với các module có lượng truy cập xem (Read) cực lớn (như LMS, News):
  - Sử dụng Prisma Middleware hoặc Client extension để điều tuyến `findMany`, `findUnique` sang **Read Replica nodes**.
  - Các lệnh `create`, `update`, `delete` luôn thực thi trên **Writer node**.

### 2.3. Indexing for High-Scale

- **Compulsory Index**: `tenantId` + `id`, `tenantId` + `slug`, `tenantId` + `createdAt`.
- **Partial Index**: Sử dụng Partial Index cho các trường trạng thái (ví dụ: `status='PENDING'`) để tối ưu hóa worker queues.

---

## 3. ⚡ Caching Strategy (Distributed Cache)

- **Redis Cluster**: Sử dụng Redis Cluster làm lớp đệm dữ liệu (Caching layer).
- **TTL Policies**: Mọi dữ liệu cache phải có TTL (Time To Live). Nghiêm cấm cache vĩnh viễn dữ liệu động.
- **Cache Invalidation**: Sử dụng cơ chế Event-driven (Prisma Middleware/Extensions) để xóa cache ngay khi dữ liệu gốc thay đổi.

---

## 4. 🛡️ Security & Monitoring (SRE Focused)

1.  **Rate Limiting**: Áp dụng `ThrottlerModule` cho từng Tenant/IP để chống tấn công DDoS cấp độ ứng dụng.
2.  **Telemetry**: Mọi logic nghiệp vụ quan trọng phải có `AuditLog` và log hiệu năng (DB Query Time, Response Time).
3.  **Circuit Breaker**: Sử dụng cho các service gọi API bên thứ 3 để tránh hiệu ứng Domino khi một cell bị chậm.

---

_Lưu ý: Tuân thủ Skill này là điều kiện tiên quyết để hệ thống vận hành ổn định trong mô hình Cell-based 5 công ty._
