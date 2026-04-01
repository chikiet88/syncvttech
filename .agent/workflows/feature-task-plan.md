---
description: Phân tích tính năng và sinh GitHub Tasks cho 3 vai trò (Designer, Dev, QC) - Quy trình tự động hóa lập kế hoạch triển khai
---

# Workflow: Feature Analysis & Task Planning

## Cách sử dụng

Gọi workflow này bằng cách nhắc:
- `/feature-task-plan` hoặc
- `Phân tích tính năng [Tên] và tạo task`

## Các bước thực hiện

### Bước 1: Xác định Tính năng cần phân tích
- Hỏi người dùng tên tính năng / module nếu chưa rõ
- Xác định các keyword để tìm kiếm trong codebase

### Bước 2: Đọc Skill chuẩn mực
// turbo
- Đọc file `.agent/skills/feature-task-generator/SKILL.md` để nắm chuẩn format

### Bước 3: Quét Mã nguồn (Codebase Scan)
- Tìm trong `backend/prisma/schema.prisma` các Model liên quan
- Tìm trong `backend/src/` các file resolver, service, module liên quan
- Tìm trong `frontend/src/app/` các page/route liên quan
- Tìm trong `frontend/src/components/` các component liên quan
- Tìm trong `docs/` các tài liệu hiện có

### Bước 4: Kiểm tra STT file mới nhất
// turbo
- Duyệt thư mục `docs/reviews/` để xác định số thứ tự tiếp theo
- Tuân thủ `documentation-standard`

### Bước 5: Tạo File Analytics Markdown
- Tạo file `docs/reviews/[STT]-Analytics-[Tên-Tính-Năng]-Task-Plan.md`
- Nội dung theo template trong skill `feature-task-generator`:
  1. Hiện trạng (Database, Backend, Frontend)
  2. Đánh giá tổng thể
  3. Danh sách Task cho 3 vai trò (Designer, Dev, QC)
  4. Thứ tự thực hiện (Sprint plan)
  5. Lệnh `gh issue create` sẵn sàng chạy

### Bước 6: Trình bày kết quả
- Hiển thị tóm tắt phân tích cho người dùng
- Liệt kê số lượng task theo vai trò
- Hỏi: **"Bạn muốn tôi tạo GitHub Issues luôn không?"**

### Bước 7 (Tùy chọn): Tạo GitHub Issues
- Nếu người dùng đồng ý → Chạy các lệnh `gh issue create`
- Nếu không → Kết thúc, file Markdown đã sẵn sàng để tham khảo

### Bước 8 (Tùy chọn): Tạo file Process tracking
- Tạo thêm `[STT]-Process-[Tên]-Progress.md` để theo dõi tiến độ
