---
description: Quy trình sử dụng Stitch MCP để sinh giao diện cho Ads Admin Dashboard
---

# 🎨 Stitch UI Generation Workflow

Sử dụng quy trình này để tạo hoặc cập nhật giao diện người dùng bằng AI, đảm bảo tuân thủ Design System **"The Precision Architect"**.

## 1. Kết Nối Dự Án
Dự án hiện tại đã được cấu hình với:
- **Project ID:** `4148787118635292725`
- **Design Tokens:** Đã định nghĩa trong [DESIGN.md](file:///chikiet/singleapp/DESIGN.md)

## 2. Các Bước Thực Hiện

### Bước 1: Chuẩn Bị Prompt
Sử dụng các prompt đã được phân tích sẵn trong tài liệu [AI-First Review](file:///chikiet/singleapp/docs/yeucau/01-Analytics-Phan-Mem-Quan-Ly-Ads-AI-First-Review.md#7-phan-tich--de-xuat-layout-uiux-danh-cho-ai-ui-generation---stitch-mcp).

### Bước 2: Gọi Tool Stitch MCP
Sử dụng tool `mcp_StitchMCP_generate_screen_from_text` với các tham số:
- `projectId`: `4148787118635292725`
- `prompt`: Nội dung prompt đã chuẩn bị.

### Bước 3: Kiểm Tra & Tinh Chỉnh
- Sau khi sinh màn hình, sử dụng `get_screen` để xem chi tiết.
- Nếu cần điều chỉnh, sử dụng `edit_screens` với ID của màn hình vừa tạo.

## 3. Lưu Ý Quan Trọng
- **Multi-tenant Aware:** Luôn nhắc AI rằng giao diện phải hỗ trợ đa doanh nghiệp (Multi-tenant).
- **Compact Design:** Ưu tiên thiết kế gọn gàng, mật độ thông tin cao.
- **Precision:** Sử dụng font `Inter` và roundness `4px` (như trong DESIGN.md).

---
// turbo-all
