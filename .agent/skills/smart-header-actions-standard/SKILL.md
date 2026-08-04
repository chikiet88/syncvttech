---
name: smart-header-actions-standard
description: Hướng dẫn cấu trúc, tích hợp và nâng cấp hệ thống SmartHeaderActions (Header Icons & Menus).
---

# SmartHeaderActions Standard (VTTech Core)

Hệ thống quản lý Icon và Menu (Thông báo, Giỏ hàng, Tài khoản...) trên Header dựa trên phân quyền (Role-based) và cấu hình động (Dynamic Config).

## 1. Thành phần chính

- **Component**: `@/components/layout/header-actions/SmartHeaderActions`
- **Hook (Permissions)**: `useIconPermissionsV3`
- **Source Data**: Bảng `IconPermissionConfig` (DB) và `menus` (type: `USER_DROPDOWN`/`GUEST_DROPDOWN`).

## 2. Cách tích hợp chuẩn

Tích hợp vào bất kỳ Header nào:

```tsx
import { SmartHeaderActions } from "@/components/layout/header-actions/SmartHeaderActions";

export function CustomHeader() {
  return (
    <header className="flex items-center justify-between p-4">
      <Logo />
      <SmartHeaderActions 
        variant="light" // "light" | "dark"
        className="gap-4"
        debug={false} // Bật true để xem log permissions trong console
      />
    </header>
  );
}
```

## 3. Ghi đè cấu hình (Override)

Sử dụng prop `overridePermissions` để ép buộc hiển thị/ẩn icon bất kể cấu hình DB:

```tsx
<SmartHeaderActions
  overridePermissions={{
    showNotifications: false, // Luôn ẩn
    showChat: true,          // Luôn hiện
    showCart: true,
    showSearch: false,
    showApps: true
  }}
/>
```

## 4. Dữ liệu Menu thả xuống (Dropdown Menus)

- **User Menu**: Hiển thị khi đã login. Cấu hình tại `backend/prisma/seeds/seed-user-dropdown-menus.ts`.
- **Guest Menu**: Hiển thị khi chưa login.
- **Quy tắc**:
  - `slug`: duy nhất (vd: `profile`).
  - `label`: Tiếng Việt (Tiêu chuẩn UX).
  - `icon`: Tên Lucide icon.
  - `href`: Đường dẫn URL.

## 5. Quy trình thêm Icon mới

1. Định nghĩa Type mới tại `frontend/src/types/icon-permission.ts`.
2. Cập nhật GraphQL Query trong `useIconPermissionsV3.ts`.
3. Thêm logic render Icon trong `HeaderActions.tsx`.
4. Seed dữ liệu mặc định vào DB.

---
**Lưu ý**: Tuyệt đối không hard-code icon nếu icon đó liên quan đến quyền hạn người dùng. Hãy sử dụng hệ thống cấu hình để đảm bảo tính linh hoạt.
