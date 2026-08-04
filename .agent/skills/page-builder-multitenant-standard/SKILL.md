---
description: Chuẩn mực phát triển Page Builder đa doanh nghiệp (Multi-tenant) - Thay thế Block cứng bằng Khối động (Dynamic Blocks).
---

# Chuẩn mực phát triển Page Builder Đa Doanh Nghiệp (Multi-tenant)

VTTech Core là một hệ thống Single App - Multi-tenant. Do đó, tất cả các cấu phần (Component) trong Page Builder **TUYỆT ĐỐI KHÔNG ĐƯỢC Hardcode** theo tên hoặc logic riêng rẽ của bất kỳ công ty nào.

Tài liệu này quy định chuẩn mực để thiết kế một Page Builder siêu tùy biến, tối ưu Bundle Size và có khả năng mở rộng không giới hạn mà không cần chạm vào Source Code.

## 1. Anti-Pattern (Tuyệt đối TRÁNH)
- **Tạo Block Hardcode Tên Công Ty:** Không bao giờ tạo các file như `TimonaHeroBlock.tsx`, `TimonaStats.tsx`, `RausachSidebar.tsx`.
- **Hardcode Data Cục Bộ:** Không gọi thẳng API cứng với tham số cố định của một nhãn hàng vào chung trong Component.
- **Hardcode CSS:** Không gán class cố định theo màu thương hiệu như `bg-[#00256e]` hay `text-[#a51c3d]`.

## 2. Gold Standard (Chuẩn Mực Thiết Kế)
Tất cả các Block trong hệ thống phải tuân theo triết lý **Universal Dynamic Block (Khối Cơ Sở Cực Kỳ Tùy Biến)**.

### A. Tùy chọn Data Source (Context-Aware)
Một khối chuẩn phải luôn hỗ trợ tham số `dataSource.type`, trong đó bao gồm tối thiểu 3 kiểu:
1. **`manual` (Thủ công cục bộ):** Cho phép người dùng trực tiếp sửa Data array/JSON trên ngay chính Page Builder Canvas thông qua nút Bút chì màu Cam ✏️.
2. **`database` (API - Kéo từ Entity):** Cho phép chọn truy vấn tự động (ví dụ: `GET_FEATURED_PRODUCTS` giới hạn `limit=10`).
3. **`global_settings` (Kéo từ Cấu hình chung Website):** *(MỚI)* Block có thể liên kết trực tiếp với biến `Global Setting` có trong CSDL (Ví dụ Key: `homepage.slides`).

#### Triển khai code Mẫu (Best Practice):
```tsx
  // Xác định nguồn dữ liệu ngay từ đầu
  const dataSource = content.dataSource || { type: "manual" };

  // Liên kết Global Settings (Ví dụ)
  const { value: globalData } = useWebsiteSetting(dataSource.settingKey);

  let finalDisplayData = [];
  if (dataSource.type === "global_settings" && globalData) {
    finalDisplayData = globalData;
  } else if (dataSource.type === "database" && apiData) {
    finalDisplayData = transformApiData(apiData);
  } else {
    finalDisplayData = content.localSlides || [];
  }
```

### B. Liên Kết Sự Kiện Page Builder Hiện Đại (Event-Driven)
* Áp dụng thanh công cụ chuẩn hóa toàn cục bên tay trái (`SortableBlockWrapper`).
* Mọi Block có Data **PHẢI LISTENER event `edit-block-content`** trên `<window>` để kích hoạt Dialog sửa chuyên biệt.

```tsx
  useEffect(() => {
    const handleEditEvent = (e: CustomEvent) => {
      if (e.detail?.blockId === block.id) {
        if (dataSource.type === "manual") {
            // Mở Slide Editor cục bộ
        } else {
            toast({ title: "Thông báo", description: "Vui lòng vào Cài đặt chung để cập nhật nguồn dữ liệu này." });
            setShowSettings(true); // Mở Settings Layout
        }
      }
    };
    window.addEventListener("edit-block-content", handleEditEvent as EventListener);
    return () => window.removeEventListener("edit-block-content", handleEditEvent as EventListener);
  }, [block.id, dataSource]);
```

### C. Theming (Sắc thái thiết kế Đa Doanh Nghiệp)
Sử dụng CSS Variables Context từ Backend:
```tsx
// SAI: Hardcode màu
<div className="bg-[#cc0000] text-white">

// ĐÚNG: Sử dụng Tokens hoặc CSS Variable được Inject từ ThemeProvider
<div className="bg-primary text-primary-foreground font-heading">
```

## 3. Quy trình Triển khai Block Mới
Khi nhận được yêu cầu "Làm khối Banner cho trang Timona", quy trình TỐI ƯU là:
1. Khảo sát xem khối này có chia sẻ chung layout/cấu trúc với bất kỳ khối gốc (Core Block) nào không? (Ảnh có text chạy chữ ở dưới -> Rất giống CarouselBlock).
2. Xây dựng bổ sung Props/Options vào khối Core đó (Ví dụ: Thêm option `overlayText` và `mobileImage` vào CarouselBlock).
3. Đóng gói nó cho toàn hệ thống dùng chung qua việc đổi Data Source sang `global_settings` với key là `homepage.timona_slides`.
4. Render bằng Component `CarouselBlock` thông dụng có gắn sẵn Context.
