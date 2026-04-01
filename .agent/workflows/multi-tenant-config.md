---
description: Kiến trúc và Logic đa doanh nghiệp (Multi-tenant) của dự án KataCore
---

# Multi-tenant Configuration & Logic Skill

Workflow này lưu trữ các quy tắc và kiến thức quan trọng về cách hệ thống KataCore quản lý đa doanh nghiệp (SaaS) trên môi trường phát triển (Local) và thực tế (Production).

## 1. Bản đồ Cổng (Port Mapping) - Development

Dự án được phân chia theo các cổng cụ thể để phục vụ việc phát triển đa doanh nghiệp trên localhost:

- **Cổng 18000 & 18001 (SaaS Unified Cluster):**
  - Dùng chung cho các công ty thuộc cụm: `TAZAGROUP`, `TIMONA`, `TAZASKIN`, `ELASOME`, `HDERMA`.
  - Các file cấu hình mẫu thường nhắm vào cụm này.
- **Cổng 19000 & 19001 (Dedicated Port):**
  - Dành riêng cho công ty: `RAUSACH` (Rau Sạch Trần Gia).
- **Lưu ý:** Các cổng cũ (12000, 13000, 15000...) đã được loại bỏ để tập trung vào kiến trúc này.

## 2. Logic Nhận diện Doanh nghiệp (Domain/Company Detection)

Logic nằm tại `frontend/src/lib/utils.ts` và `CompanyContext.tsx`.

### Quy trình nhận diện (Priority):

1. **Localhost Port:** Ưu tiên kiểm tra cổng truy cập (`window.location.port`). Điều này cực kỳ quan trọng vì `localhost` luôn ghi đè hostname.
2. **Environment Variable:** Kiểm tra `NEXT_PUBLIC_SITE_DOMAIN` (thường đặt trong `.env`).
3. **Hostname Production:** So khớp domain thực tế (ví dụ: `timona.edu.vn`).
4. **Keyword Check:** Tìm kiếm từ khóa (`timona`, `rausach`, `taza`) trong hostname để đoán định.

## 3. Cơ chế Hiển thị Giao diện (Specialized vs Dynamic Layout)

Tại trang chủ (`frontend/src/app/page.tsx`), hệ thống quyết định layout dựa trên 2 lớp kiểm tra:

- **Specialized Layout (Giao diện chuyên biệt):** Khi mã công ty là `TIMONA`, hệ thống sẽ sử dụng bộ component riêng biệt trong `features/timona`. Điều này áp dụng ngay trên cổng 18000 nếu công ty được chọn là Timona.
- **Dynamic Layout (Giao diện động):** Các công ty khác mặc định sử dụng `DynamicHomepageWrapper` - nơi render các khối (blocks) được cấu hình từ công cụ Page Builder trong Admin.

## 4. Cấu hình Website (Website Settings)

Hệ thống sử dụng cơ chế ghi đè (Overrides) và Fallback:

- **Bộ lọc Database:** Luôn tìm theo `(Company ID) + (Domain hiện tại || 'default')`.
- **Thứ tự Ưu tiên (Frontend):**
  1. Cài đặt có `domain` cụ thể (ví dụ: `domain = 'timona'`).
  2. Cài đặt có `domain = 'default'`.
- **Dữ liệu Toàn cục (Global):** Các bản ghi có `companyId = null` được coi là cài đặt mặc định hệ thống. Khi Reset Global, phải sử dụng các thông tin trung tính (Placeholders) để tránh hiển thị nhầm thông tin cá nhân hóa của một công ty cũ cho các công ty mới.

## 5. Quy trình Fix Duplication

Nếu một cài đặt hiển thị 2 lần trong Admin:

1. Kiểm tra trường `group` và `category` của bản ghi TOÀN CỤC so với bản ghi của CÔNG TY. Chúng phải khớp hệt nhau.
2. Đồng bộ Metadata từ bản ghi hệ thống sang bản ghi công ty thông qua script cleanup.
