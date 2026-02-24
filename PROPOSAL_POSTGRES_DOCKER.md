# Đề xuất: Hệ thống Đồng bộ VTTech lên Docker PostgreSQL
**Ngày đề xuất:** 24/02/2026
**Trạng thái:** Chờ duyệt (Chưa triển khai code)

## 1. Mục tiêu (Objectives)
Chuyển đổi/Thiết lập hệ thống lưu trữ dữ liệu đồng bộ từ máy chủ từ xa/SQLite sang **PostgreSQL chạy trên Docker** ngay tại máy này. Việc này nhằm:
- **Tăng hiệu suất**: Giảm độ trễ mạng so với việc kết nối DB từ xa.
- **Khả năng tích hợp**: Tạo ra một "Data Hub" tập trung để các ứng dụng khác (BI, Mobile App, Website chăm sóc khách hàng) có thể truy vấn dữ liệu tham chiếu một cách nhanh chóng.
- **Cô lập môi trường**: Dễ dàng quản lý, backup và scale bằng Docker.

---

## 2. Kiến trúc Đề xuất (Proposed Architecture)

### 2.1. Thành phần Infrastructure
- **Container 1 (PostgreSQL 16)**: Lưu trữ dữ liệu chính.
- **Container 2 (PgAdmin 4)**: Giao diện quản lý Database trực quan (Tùy chọn).
- **Network**: Private Docker Bridge để các ứng dụng trên cùng máy liên lạc nội bộ.

### 2.2. Luồng Dữ liệu (Data Flow)
1. **NestJS Sync Engine**: Tiếp tục cào dữ liệu từ VTTech API.
2. **Prisma ORM**: Đóng vai trò là cầu nối để ghi dữ liệu vào PostgreSQL Docker thay vì SQLite hoặc Remote DB hiện tại.
3. **Consumer Apps**: Các ứng dụng khác trong hệ sinh thái sẽ kết nối trực tiếp vào Docker Postgres (qua mạng nội bộ hoặc port expose) để lấy dữ liệu tham chiếu.

---

## 3. Cấu trúc lưu trữ dữ liệu (Database Schema)

Dữ liệu sẽ được tổ chức thành các schemas/bảng tối ưu cho truy vấn:
- **Master Data Schema**: Danh mục chi nhánh, dịch vụ, nhân viên (Dùng làm danh mục tham chiếu cho tất cả App).
- **Core CRM Schema**: Hồ sơ khách hàng, chi tiết tài chính, công nợ (Sử dụng cho các App chăm sóc khách hàng).
- **Interaction Schema**: Lịch sử cuộc gọi PBX, lịch sử điều trị, lượt hẹn (Sử dụng cho App báo cáo/BI).

---

## 4. Kế hoạch Triển khai (Implementation Plan)

### Bước 1: Khởi tạo Hạ tầng Docker
- Tạo file `docker-compose.yml` cấu hình Postgres và Volume mapping để đảm bảo dữ liệu không bị mất khi restart container.
- Thiết lập biến môi trường `DATABASE_URL` mới trỏ về `localhost` (hoặc tên service docker).

### Bước 2: Chuyển đổi Prisma (Migration)
- Chuyển provider trong `schema.prisma` sang `postgresql`.
- Thực hiện `prisma db push` để khởi tạo cấu trúc bảng trên Postgres Docker.

### Bước 3: Di chuyển Dữ liệu (Initial Sync/Data Migration)
- Chạy lại Full Sync từ VTTech để đổ dữ liệu vào DB mới.
- Hoặc sử dụng công cụ `pg_dump/pg_restore` nếu muốn chuyển từ DB từ xa hiện tại về local.

### Bước 4: Tối ưu cho ứng dụng khác (Inter-app Integration)
- Thiết lập **Read-only Users** cho các ứng dụng bên thứ 3 để đảm bảo an toàn dữ liệu.
- Tạo các **Database Views** (nếu cần) để đơn giản hóa các câu truy vấn phức tạp cho các App phía trước.

---

## 5. Lợi ích sau khi triển khai
1. **Hoàn toàn làm chủ dữ liệu**: Không phụ thuộc vào tốc độ mạng của DB từ xa.
2. **Hệ sinh thái kết nối**: Một nguồn sự thật (Single Source of Truth) duy nhất cho toàn bộ các phần mềm trong công ty.
3. **Dễ dàng sao lưu**: Chỉ cần backup Folder volume của Docker là có toàn bộ dữ liệu.

---
**Ghi chú:** Đây là bản thảo khảo sát. Nếu được đồng ý, bước tiếp theo sẽ là tạo các file cấu hình Docker và cập nhật mã nguồn Backend để tương thích hoàn toàn.
