# TỔNG HỢP DỮ LIỆU DỰ ÁN API VTTECH
**Cập nhật lúc:** 30/03/2026
**Trạng thái:** Operational (Đang hoạt động)

---

## 1. Database (Cơ sở dữ liệu) đang sử dụng

Hệ thống hiện đang chuyển sang sử dụng **PostgreSQL** để đảm bảo khả năng mở rộng và hiệu năng cao cho dữ liệu lớn.

*   **Hệ quản trị CSDL:** PostgreSQL (v15+)
*   **Database Name:** `db_tazagroup_vttech_sync`
*   **Host:** `shared-db` (Containerized) hoặc `tazagroupnet-db` (Local/Link)
*   **ORM:** Prisma (v6.1+)
*   **Cấu trúc bảng:** Hơn 45 bảng dữ liệu quan hệ (Relational Tables).

---

## 2. Danh sách dữ liệu đang đồng bộ (Synchronization Details)

Dưới đây là bảng tổng hợp các tính năng và dữ liệu đang được đồng bộ từ VTTech CRM về hệ thống cục bộ:

| STT | Tên Tính Năng | Tên Bảng Dữ Liệu | Endpoint (VTTech) | Mô Tả |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Danh mục Chi nhánh** | `branches` | `/api/Home/SessionData` | Đồng bộ 17 chi nhánh, địa chỉ, số điện thoại liên hệ. |
| 2 | **Danh mục Dịch vụ** | `services` | `/api/Home/SessionData` | Toàn bộ ~1,700 dịch vụ, giá niêm yết, mã DV. |
| 3 | **Nhóm dịch vụ** | `service_groups` | `/api/Home/SessionData` | Phân loại các cụm dịch vụ (Nha khoa, Phẫu thuật...). |
| 4 | **Danh sách Nhân viên** | `employees`, `users` | `/api/Home/SessionData` | Tài khoản CRM và thông tin nhân sự tại các chi nhánh. |
| 5 | **Địa giới hành chính** | `cities`, `districts`, `wards` | `/api/Home/SessionData` | Dữ liệu Tỉnh/Thành, Quận/Huyện, Phường/Xã chuẩn hóa. |
| 6 | **Nguồn Khách hàng** | `customer_sources` | `/api/Home/SessionData` | Facebook, Website, Zalo, Khách giới thiệu... |
| 7 | **Doanh thu Chi tiết** | `revenue_transactions`| `/Report/Revenue/Branch/AllBranchGrid?handler=LoadataDetailByBranch` | Từng giao dịch phát sinh (Số tiền, phương thức trả...). |
| 8 | **Doanh thu Tổng hợp** | `daily_revenue` | (Aggregated from Sync) | Tổng hợp doanh thu, lượt khách, lịch hẹn theo ngày. |
| 9 | **Hồ sơ Khách hàng** | `customers` | `/Customer/GeneralInfo/LoadData` | Thông tin cá nhân: Họ tên, SĐT, Email, Birthday, Phái. |
| 10 | **Tài chính Khách hàng** | `customer_payments` | `/Customer/MainCustomer/LoadPaymentInfo` | Tổng chi tiêu tích lũy và số dư công nợ hiện tại. |
| 11 | **Thanh toán & Hóa đơn** | `customer_payments` | `/Customer/PaymentList/LoadataPayment` | Nhật ký các lần xuất hóa đơn và thu tiền khách hàng. |
| 12 | **Gói Dịch vụ Đã Mua** | `customer_service_tabs`| `/Customer/TabList_Service/LoadataTab` | Thẻ liệu trình, các gói dịch vụ khách hàng đang sở hữu. |
| 13 | **Thẻ Tiền Mặt & Log** | `customer_cards` | `/Customer/TabList_Card/LoadataCard` | Số dư thẻ tiền mặt, log trừ tiền mỗi lần sử dụng. |
| 14 | **Nhật ký Điều trị** | `treatments` | `/Customer/TreatmentList/LoadataTreatment` | Chi tiết các lần khách qua thực hiện dịch vụ thực tế. |
| 15 | **Nhật ký CSKH** | `customer_care_history`| `/Customer/HistoryList_Care/LoadataHistory` | Ghi chú các cuộc gọi, tin nhắn, tư vấn chăm sóc khách. |
| 16 | **Ảnh Khách hàng** | `customer_images` | `/Customer/CustomerImage/LoadImageByFolder`| Trước/Sau khi làm dịch vụ (Backblaze/S3 integration). |
| 17 | **Đơn thuốc & Mỹ phẩm** | `customer_prescriptions`| `/Customer/TabList_Medicine/LoadataPrescription`| Các loại thuốc hoặc mỹ phẩm đã kê cho khách. |
| 18 | **Khiếu nại/Phản hồi** | `customer_complaints` | `/Customer/Complaint/LoadData` | Nhật ký xử lý các vấn đề phát sinh từ khách hàng. |
| 19 | **Phác đồ Điều trị** | `customer_treatment_plans`| `/Customer/Plan/LoadData` | Các phác đồ/liệu trình dự kiến bác sĩ tư vấn. |
| 20 | **Lịch hẹn (Schedules)** | `appointments` | `/Customer/TabList_Schedule/LoadataSchedule` | Lịch hẹn tương lai và trạng thái khách đến (Check-in). |
| 21 | **Lịch sử Thay đổi** | `customer_change_history`| `/Customer/TabList_History/LoadataHistory`| Theo dõi vết thay đổi dữ liệu hồ sơ (Auditing). |
| 22 | **Lịch sử Cuộc gọi** | `pbx_call_records` | API PBX (Taza Group) | Log cuộc gọi từ tổng đài gắn với hồ sơ CRM. |
| 23 | **Báo cáo Chi nhánh** | `summaries` | `/reports/branches` | Tổng hợp nhanh các chỉ số (Khách, DV, Lịch, DT) của Chi nhánh. |

---

## 3. Cơ chế đồng bộ (Sync Mechanism)

1.  **Đồng bộ Master Data:** Tự động chạy hàng ngày (`00:00`) để cập nhật Danh mục.
2.  **Đồng bộ Theo ngày (Daily Sync):** Chạy theo "Chunking" để lấy toàn bộ dữ liệu phát sinh trong ngày của tất cả chi nhánh.
3.  **Hỗ trợ Back-sync:** Khả năng đồng bộ lại dữ liệu trong quá khứ theo khoảng ngày (Manual Range Sync).
4.  **Xử lý dữ liệu:** Giải nén `GZip/Base64` tự động và thực hiện `Upsert` để đảm bảo không trùng lặp và dữ liệu luôn mới nhất.
