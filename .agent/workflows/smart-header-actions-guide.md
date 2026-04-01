---
description: Hướng dẫn cấu trúc, tích hợp và nâng cấp hệ thống SmartHeaderActions
---

# Hướng dẫn Hệ thống SmartHeaderActions

Hệ thống SmartHeaderActions là một giải pháp quản lý Icon và Menu trên Header dựa trên phân quyền (Role-based) và cấu hình động (Dynamic Config).

## 1. Kiến trúc 3 Lớp

Hệ thống được tổ chức theo 3 tầng sau:

- **Lớp Phân quyền (Hook):** `frontend/src/hooks/useIconPermissionsV3.ts`
  - Nhiệm vụ: Xác định Role, truy vấn cấu hình từ DB (`IconPermissionConfig`) và trả về bảng map Icon được phép hiển thị. Hỗ trợ Real-time update và Maintenance mode.
- **Lớp Bọc Thông minh (Smart Wrapper):** `frontend/src/components/layout/SmartHeaderActions.tsx`
  - Nhiệm vụ: Tự động kết nối với Hook phân quyền, xử lý logic `overridePermissions` và `loading state`.
- **Lớp Giao diện (UI):** `frontend/src/components/layout/HeaderActions.tsx` và `UserAccountAction.tsx`
  - Nhiệm vụ: Hiển thị các Icon (Bell, Cart, User...), xử lý Dropdown Menu nội dung động (User Dropdown, Guest Dropdown), Tooltip và định dạng giao diện (`light`/`dark`).
- **Lớp Dữ liệu (Constant/Seed):** `frontend/src/components/layout/header-actions/constants/user-menu.ts` và `backend/prisma/seeds/seed-user-dropdown-menus.ts`
  - Nhiệm vụ: Cung cấp dữ liệu mẫu và đồng bộ giữa Frontend/Backend cho các mục menu như "Trang cá nhân", "Khóa học của tôi".

## 2. Cách tích hợp vào Header mới

Để sử dụng hệ thống này trong một Header (ví dụ `HeaderNewCompany.tsx`), thực hiện theo các bước:

```tsx
import { SmartHeaderActions } from "../SmartHeaderActions";

// Trong Component:
<SmartHeaderActions
  variant="dark" // hoặc "light"
  className="gap-4"
  debug={false} // Bật true để xem log phân quyền trong console
/>;
```

## 3. Cách ép buộc (Override) Quyền hạn

Nếu một Header cụ thể cần hiển thị/ẩn Icon mà không dựa vào quy tắc chung trong Database, sử dụng prop `overridePermissions`:

```tsx
<SmartHeaderActions
  overridePermissions={{
    showNotifications: false, // Luôn ẩn thông báo
    showChat: true, // Luôn hiện chat
  }}
/>
```

## 4. Cấu hình Dữ liệu (Backend/DB)

Dữ liệu phân quyền được lưu trong bảng `IconPermissionConfig`. Các trường quan trọng:

- `roleKey`: Mã Role (ví dụ: `ADMIN`, `user`, `guest`).
- `[iconType]Enabled`: Boolean để bật/tắt Icon.
- `[iconType]Position`: Vị trí (`EXTERNAL`, `DROPDOWN`, `BOTH`, `NONE`).

### Cấu hình Menu Tài khoản (User Dropdown)
Sử dụng bảng `menus` với `type = 'USER_DROPDOWN'` hoặc `'GUEST_DROPDOWN'`. Các trường quan trọng:
- `slug`: Phân định duy nhất (ví dụ: `user-menu/profile`).
- `requiredFeature`: Chỉ hiện nếu Feature Flag tương ứng được bật (ví dụ: `enableLMS`).
- `requiredRoles`: Mảng các Role được phép xem mục này.
- `moduleKey`: Định danh Module (ADMIN, LMS, CRM...).

## 5. Lưu ý khi nâng cấp

1. **Thêm Icon mới:**
   - Cập nhật Type trong `frontend/src/types/icon-permission.ts`.
   - Cập nhật GraphQL Query trong `useIconPermissionsV2.ts`.
   - Cập nhật logic render trong `HeaderActions.tsx`.
2. **Thay đổi Style:**
   - Chỉnh sửa trực tiếp trong `HeaderActions.tsx` để áp dụng cho toàn hệ thống.
3. **Debug:**
   - Luôn sử dụng prop `debug={true}` trên `SmartHeaderActions` để kiểm tra tại sao một Icon không xuất hiện (do Role sai hay do Config trong DB chưa đúng).

---

_Ghi chú: Luôn ưu tiên dùng SmartHeaderActions trừ khi cần tùy chỉnh giao diện hoàn toàn khác biệt với chuẩn của hệ thống._
