# Snapshot thông tin các case trước khi xử lý

Báo cáo lưu trữ trạng thái của dữ liệu trước khi tiến hành xử lý điều chỉnh trên hệ thống VTTech.

---

## Case #1: Huỳnh Thị Hoà (0365759603)

### 1. Thông tin trên Google Sheet (Yêu cầu)
- **Chi nhánh**: TÂN PHÚ (Dòng 261)
- **Ngày gửi**: 06/05/2026
- **Khách hàng/Học viên**: Huỳnh Thị Hoà — 0365759603
- **Nội dung yêu cầu**: Thanh toán 500.000đ cho Timona Tân Phú nhưng chi nhánh lên nhầm bằng tài khoản Taza Tân Phú. Nhờ chỉnh lại bill `PTSTPTZ20260506.11` chuyển thu từ tài khoản Taza sang Timona.
- **Xác nhận Sale Admin**: 
  1. Xóa TT: `PTSTPTZ20260506.11` (06-05-2026, Tiền Mặt, 500,000đ, Taza Skin Clinic Tân Phú)
  2. Tạo TT mới: 06-05-2026, Tiền Mặt, 500,000đ, Timona Tân Phú cho dịch vụ `SP20260503.372696`.
- **Trạng thái**: IT CHƯA FIX

### 2. Trạng thái trong Database cục bộ (trước khi xử lý)
- **Customer ID**: `195975`
- **Customer Code**: `TPTA00195975`
- **Tên khách hàng**: HUỲNH THỊ HÒA
- **Số điện thoại**: `0365759603`
- **Chi nhánh ID**: `26` (Taza Tân Phú)
- **Tổng chi tiêu (total_spent)**: `5.400.000`
- **Tổng nợ (total_debt)**: `0`
- **Dịch vụ đã đăng ký (CustomerServiceTab)**:
  - ID `815663`: `SP20260503.372696` — KHÓA KỸ THUẬT VIÊN SPA (Đơn giá: 15.500.000đ, Số lượng: 1, Tổng thu: 0đ, Ngày tạo: 03/05/2026)
  - ID `815662`: `SP20260509.373642` — KHOÁ GỘI ĐẦU DƯỠNG SINH NÂNG CAO (Đơn giá: 10.000.000đ, Số lượng: 1, Tổng thu: 0đ, Ngày tạo: 09/05/2026)
- **Lịch sử thanh toán (CustomerPayment)**:
  - **Không tìm thấy thanh toán nào** (`Payments found: 0`). Thanh toán nhầm `PTSTPTZ20260506.11` hoặc bất kỳ payment nào chưa được đồng bộ về DB cục bộ do lỗi lệch doanh thu/chi nhánh chưa được duyệt xử lý.

---
