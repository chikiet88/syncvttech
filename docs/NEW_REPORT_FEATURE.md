# HƯỚNG DẪN TÍNH NĂNG BÁO CÁO TỔNG HỢP CHI NHÁNH (REPORTS)

**Cập nhật lúc:** 01/04/2026
**Trạng thái:** Triển khai (Deployed)
**Phiên bản:** v1.0

---

## 1. Tổng quan (Overview)
Tính năng này cung cấp cái nhìn tổng thể về hiệu suất hoạt động của tất cả các chi nhánh trong một khoảng thời gian nhất định dựa trên dữ liệu đã được đồng bộ từ hệ thống VTTech CRM.

*   **Route Frontend:** `/reports`
*   **Endpoint Backend:** `GET http://localhost:3001/reports/branches`

---

## 2. Các chỉ số báo cáo (Key Metrics)

Báo cáo hiển thị 7 chỉ số quan trọng cho mỗi chi nhánh:

| Chỉ số | Mô tả | Nguồn dữ liệu (Table) |
| :--- | :--- | :--- |
| **Tên Chi Nhánh** | Tên đầy đủ của chi nhánh. | `branches.name` |
| **Số Lượng Khách Hàng** | Tổng số khách hàng duy nhất có hoạt động trong khoảng ngày đã chọn. | `daily_customers` |
| **Số Lượng Dịch Vụ** | Tổng số dịch vụ (Service) đã giao dịch trong khoảng ngày. | `revenue_transactions` (service_id != null) |
| **Số Lượng Điều Trị** | Số lượt thực hiện dịch vụ thực tế của khách hàng. | `treatments` |
| **Số Lượng Lịch Hẹn** | Tổng số lịch hẹn được tạo/ghi nhận trong hệ thống. | `appointments` |
| **Tổng Doanh Số** | Tổng giá trị đơn hàng được tạo (Order Amount). | `revenue_transactions.amount` |
| **Tổng Doanh Thu** | Tổng số tiền thực tế khách hàng đã thanh toán (Paid Amount). | `revenue_transactions.paid` |

---

## 3. Giao diện người dùng (UI Components)

Giao diện được thiết kế theo phong cách **Premium/Modern UI** với các thành phần chính:

1.  **Bộ lọc ngày (Date Picker):** Cho phép người dùng chọn khoảng ngày (Từ ngày - Đến ngày) để phân tích.
2.  **Lưới thẻ chi nhánh (Branch Cards Grid):** 
    *   Hiển thị thông tin dưới dạng Grid (lưới) tự động thích ứng với nhiều kích cỡ màn hình.
    *   Sử dụng màu sắc trực quan: 
        *   **Emerald:** Khách hàng.
        *   **Blue:** Dịch vụ.
        *   **Amber:** Điều trị.
        *   **Purple:** Lịch hẹn.
        *   **Dark Grey:** Doanh số.
        *   **Indigo:** Doanh thu.
3.  **Hiệu ứng (Effects):** 
    *   Glassmorphism (Nền mờ).
    *   Animations khi load dữ liệu và hiển thị card.
    *   Hover hiệu ứng đổ bóng và đổi màu Icon.

---

## 4. Kỹ thuật triển khai (Implementation Details)

### Backend (NestJS + Prisma)
Endpoint `/reports/branches` sử dụng `Promise.all` để truy vấn song song các chỉ số từ nhiều bảng khác nhau nhằm tối ưu hiệu năng.

```typescript
// Query example
const [customerCount, serviceCount, ...] = await Promise.all([
    prisma.dailyCustomer.count({ where: { branch_id, date: range } }),
    prisma.revenueTransaction.count({ where: { branch_id, date: range, service_id: not: null } }),
    ...
]);
```

### Frontend (Next.js + Tailwind CSS)
Sử dụng `Intl.NumberFormat` để định dạng tiền tệ VND (`1.000.000 ₫`).
Tích hợp vào Sidebar trong nhóm menu "Báo cáo" để người dùng dễ dàng truy cập.

---

## 5. Hướng dẫn sử dụng
1. Mở thanh Sidebar (Menu bên trái).
2. Tìm đến mục **Báo cáo**.
3. Chọn **Tổng hợp Chi nhánh**.
4. Chọn khoảng ngày cần xem và nhấn nút **Phân tích dữ liệu**.

---

## 6. Hỗ trợ Xem chi tiết (Drill-down Navigation)

Khi người dùng nhấn vào các icon hoặc con số chỉ số trên mỗi chi nhánh, hệ thống sẽ điều hướng đến trang chi tiết để tra cứu dữ liệu cụ thể.

| Chỉ số | Icon (Lucide) | Target Frontend Route | Backend Endpoint |
| :--- | :--- | :--- | :--- |
| **Khách hàng** | `Users` (Emerald) | `/reports/customers` | `GET /reports/customers/details` |
| **Dịch vụ** | `Scissors` (Blue) | `/reports/services` | `GET /reports/revenue?service_only=true` |
| **Điều trị** | `Activity` (Amber) | `/reports/treatments` | `GET /reports/treatments/details` |
| **Lịch hẹn** | `CalendarCheck` (Purple) | `/reports/appointments` | `GET /reports/appointments/details` |
| **Doanh số** | `DollarSign` (Grey) | `/reports/sales` | `GET /reports/revenue` (Focus: Amount) |
| **Doanh thu** | `Wallet` (Indigo) | `/reports/revenue` | `GET /reports/revenue` (Focus: Paid) |

**Tham số truyền vào (Query Params):**
- `branchId`: ID của chi nhánh được chọn.
- `from`: Ngày bắt đầu (định dạng DD-MM-YYYY).
- `to`: Ngày kết thúc (định dạng DD-MM-YYYY).

**Lưu ý:** Đối với **Doanh số** và **Doanh thu**, cả hai đều truy vấn chung bảng `revenue_transactions` nhưng hiển thị các cột giá trị khác nhau tùy theo ngữ cảnh.

---

## 7. Báo cáo Tình trạng Triển khai (% Tiến độ)

**Tính năng Xem chi tiết (Drill-down Navigation)** đã được phát triển và đưa vào luồng chính thức thức.

| Hạng mục Triển khai | Trạng thái | Nền tảng | % Hoàn thành |
| :--- | :--- | :--- | :--- |
| **Gắn Link Điều hướng (Router)** | ✅ Hoàn tất | Frontend (Báo cáo Tổng) | 100% |
| **Logic Truyền tham số (Branch, Date)**| ✅ Hoàn tất | Frontend (Hook/Params) | 100% |
| **Layout & Data Table Khách hàng** | ✅ Hoàn tất | Frontend (Customers) | 100% |
| **Layout & Data Table Điều trị** | ✅ Hoàn tất | Frontend (Treatments) | 100% |
| **Layout & Data Table Lịch hẹn** | ✅ Hoàn tất | Frontend (Appointments) | 100% |
| **Layout & Data Table Dịch vụ** | ✅ Hoàn tất | Frontend (Services) | 100% |
| **API Endpoint: `/customers/details`** | ✅ Hoàn tất | Backend (NestJS/Prisma) | 100% |
| **API Endpoint: `/treatments/details`**| ✅ Hoàn tất | Backend (NestJS/Prisma) | 100% |
| **API Endpoint: `/appointments/details`**| ✅ Hoàn tất | Backend (NestJS/Prisma) | 100% |
| **Update Endpoint: Phân loại Dịch vụ** | ✅ Hoàn tất | Backend (Revenue Filter) | 100% |

**Tổng tiến độ Epic Drill-down:** **100%** (Toàn bộ các luồng đã sẵn sàng chạy thực tế với DB VTTech).
