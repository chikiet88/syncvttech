---
name: compact-ui-layout-standard
description: Chuẩn mực thiết kế giao diện tối ưu không gian (Compact/Dense Design) cho VTTech Core - Tối đa hóa thông tin hiển thị mà không gây rối mắt.
---

# Compact UI Layout Standard (VTTech Core)

Hướng dẫn tối ưu hóa diện tích hiển thị, giúp người dùng nắm bắt thông tin nhanh nhất mà không cần cuộn (scroll) nhiều.

## 1. Grid & Table Density (Quan trọng nhất)

- **Row Height**: Sử dụng `rowHeight: 48` cho Desktop (mặc định) và `rowHeight: 52` nếu có nhiều metadata.
- **Header Height**: `headerHeight: 40`.
- **Text Size**: 
  - Nội dung chính: `text-sm` (14px).
  - Metadata (Ngày tạo, Mã phụ, Email): `text-xs` (12px).
- **Line Height**: Luôn dùng `leading-tight` hoặc `leading-5`.

## 2. Card & Component Padding

- **Gaps**: Sử dụng `gap-2` hoặc `gap-3` thay vì mặc định `gap-4`.
- **Padding**: 
  - Card: `p-3` hoặc `p-4`.
  - Input/Select: `h-8` hoặc `h-9` (size="sm").
  - Table Cell: `px-3 py-2`.

## 3. Toolbar & Filter Layout

- **Hide Filter Button**: Ưu tiên ẩn nút Filter chính của AdvancedTable (`hideFilterButton: true`) để tiết kiệm layer.
- **Quick Filters Bar**: Đặt các filter chính (DateRange, Status badges) trực tiếp trên 1 dòng phía trên Table.
- **Status Badges**: Sử dụng `text-[10px]` hoặc `text-xs` với padding nhỏ `px-2 py-0.5`.

## 4. Layout "1-2 Rows Visible" Rule

Mục tiêu là hiển thị ít nhất 8-10 dòng dữ liệu trên màn hình Laptop 14 inch mà không cần cuộn trang (phần header và toolbar phải cực kỳ gọn).

- **Breadcrumbs & Page Header**: Tổng chiều cao không quá `h-16`.
- **Vertical Spacing**: Hạn chế `my-8` hoặc `mt-10`. Ưu tiên `space-y-4` hoặc `space-y-6`.

## 5. Visual Hierarchy

- Sử dụng border siêu mỏng `border-border/50` để phân tách vùng thay vì dùng khoảng trắng (white-space) lớn.
- **Primary Info**: In đậm (`font-semibold`), màu đen/zinc đậm.
- **Secondary Info**: Màu nhạt (`text-muted-foreground`), kích thước nhỏ hơn.

---
**Lưu ý**: Compact Design không có nghĩa là "chật chội". Phải đảm bảo Touch Target (`44px`) trên Mobile và tính dễ đọc trên Desktop.
