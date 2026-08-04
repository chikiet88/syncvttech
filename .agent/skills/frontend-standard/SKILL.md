---
name: frontend-standard
description: Chuẩn mực phát triển Frontend cho VTTech Core - Mobile First, New York Style (Shadcn UI), Advanced Table Optimization & Compact Design.
---

# Frontend Development Standard (VTTech Core Expert)

Đây là chuẩn mực phát triển giao diện cho VTTech Core, tập trung vào trải nghiệm người dùng (UX) hiện đại, tinh tế và tối ưu cho thiết bị di động.

## 0. 🌍 Global Code & Local UI Standard

- **Internal Codebase**: 100% Tiếng Anh (English).
  - Component names, props, variable names, functions, hooks và folder structure phải dùng tiếng Anh.
  - Tuyệt đối không đặt tên biến bằng tiếng Việt (ví dụ: `danhSachUser` -> `userList`).
- **User Interface (UI)**: Mặc định 100% Tiếng Việt (Vietnamese).
  - Mọi Label, Placeholder, Tooltip, Toast Message hiển thị cho người dùng cuối phải là tiếng Việt chuẩn, tinh tế.
  - Mục tiêu: Codebase mang tầm quốc tế nhưng trải nghiệm sản phẩm tối ưu cho người dùng Việt Nam.

## 1. Tối ưu hóa Mobile-First (Bắt buộc)

Hệ thống được thiết kế để hoạt động hoàn hảo trên điện thoại trước khi mở rộng ra máy tính.

- **Responsive Layout**: Luôn sử dụng Tailwind CSS với tư duy Mobile-First. CSS mặc định (không có tiền tố) là dành cho Mobile.
- **Touch-Friendly**: Các nút bấm (Button), mục menu phải có kích thước tối thiểu `44x44px` trên Mobile để dễ thao tác.
- **Card-based View for Mobile**: Trên màn hình nhỏ (`< sm`), nếu bảng quá phức tạp, ưu tiên hiển thị dạng Danh sách thẻ (Card List) thay vì Table cuộn ngang.
- **Bottom Navigation/Action**: Các hành động chính (Lưu, Xác nhận) trên Mobile nên đặt ở phía dưới (Sticky Bottom) để dễ với tới bằng ngón cái.

## 2. Tất cả Table sử dụng AdvancedTable

Tuyệt đối không sử dụng Table HTML thuần hoặc các bộ thư viện table đơn giản khác cho các tính năng nghiệp vụ.

- **Thành phần**: Sử dụng `@/components/ui/advanced-table/AdvancedTable`.
- **Toolbar**:
  - Mặc định **ẩn nút Lọc** (`hideFilterButton: true`), chỉ giữ lại thanh Tìm kiếm.
  - Tìm kiếm hỗ trợ Fuzzy Search tiếng Việt và Highlight kết quả.
- **Tính năng**:
  - **Mặc định có Sort**: Luôn bật tính năng sắp xếp trên các cột dữ liệu.
  - Multi-select cho hành động khối.
  - Pagination tích hợp mượt màng.
  - Nhấn vào mã hoặc tên để Edit, nhấn icon Mắt để xem nhanh (Quick View).
- **Chiều cao & Cuộn**:
  - Mặc định **chiều cao cố định** (`height: "calc(100vh - 280px)"`) để trang không bị cuộn quá dài.
  - Tắt tự động chiều cao (`autoHeight: false`) để kích hoạt thanh cuộn nội bộ của bảng.
  - Đảm bảo Header luôn ở trạng thái Sticky khi cuộn trong bảng.

## 3. Phong cách "New York" & Tối giản (Minimalist Design)

Áp dụng triết lý thiết kế của Shadcn UI phiên bản New York nhưng tối ưu hóa không gian (Dense/Compact) để tăng hiệu suất làm việc.

- **Typography**:
  - Sử dụng font chữ hiện đại (Inter, Outfit, hoặc Roboto).
  - Kích thước chữ chuẩn là `text-sm` (14px). Cho bảng dữ liệu và metadata dùng `text-xs` (12px).
  - Căn chỉnh `leading-tight` để tiết kiệm không gian theo chiều dọc.
- **Nhỏ gọn (Compact/Dense Design)**:
  - Giảm `padding` và `margin`. Sử dụng `p-2` hoặc `p-3` cho các Card/Container thay vì `p-6`.
  - Cấu trúc lưới (`grid`) hoặc `flex` với `gap-2` hoặc `gap-3` thay vì mặc định `gap-4`.
  - Khoảng cách giữa các hàng trong bảng (`Table Cell`) phải hẹp nhưng vẫn đảm bảo dễ đọc.
- **Aesthetics (Thẩm mỹ cao cấp)**:
  - **Borders**: Sử dụng border siêu mỏng (`border-slate-100/200` hoặc `border-border/40`).
  - **Shadows**: Shadow cực nhẹ (Soft UI), hầu như không nhận ra trừ khi focus.
  - **Palette**: Grayscale là chủ đạo (White/Slate/Zinc) với điểm nhấn Primary (Màu thương hiệu) đồng nhất.
  - **Bo góc**: `rounded-md` (6px) hoặc `rounded-lg` (8px). Tránh `rounded-full` trừ các icon tròn hoặc avatar.

## 4. Hiệu ứng & Tương tác (Micro-interactions)

- **Transitions**: Mọi trạng thái Hover/Active phải có `transition-all duration-200 ease-in-out`.
- **Hover States**:
  - Sử dụng `hover:bg-accent/50` hoặc `hover:bg-slate-50` cho các hàng trong danh sách.
  - Các Card/Item có thể thêm hiệu ứng `hover:-translate-y-0.5` cực nhẹ để tăng cảm giác phản hồi.
- **Glassmorphism**: Sử dụng `backdrop-blur` cho các Header hoặc Floating Action Button để tạo chiều sâu cao cấp.

## 5. Thành phần Combobox (Thay thế cho Select)

Tất cả các trường chọn dữ liệu phải sử dụng `Combobox` để hỗ trợ tìm kiếm nhanh, thay vì `Select` truyền thống.

- **Quy tắc**: Luôn có trạng thái "Không tìm thấy" và hỗ trợ tìm kiếm không dấu (vietnameseSearch).

## 6. Thông báo, Cảnh báo & Xác nhận (UX Unified)

- **Tuyệt đối không sử dụng native Alert/Confirm**: Không dùng `window.alert()` và `window.confirm()`. Các hàm này làm gián đoạn luồng trải nghiệm và không đồng bộ với thiết kế New York Style.
- **Thông báo (Toast)**: Sử dụng `sonner` để hiển thị thông báo trạng thái (`success`, `error`, `info`, `warning`).
- **Xác nhận (Confirmation Dialog)**: Sử dụng các Component `Dialog` hoặc `AlertDialog` từ Shadcn UI để yêu cầu xác nhận hành động (ví dụ: Xóa dữ liệu).
- **Trạng thái**: Luôn thông báo rõ ràng kết quả của mọi hành động lưu/xóa dữ liệu bằng tiếng Việt.
- **Loading State**: Hiển thị trạng thái chờ (Spinner/Skeleton) rõ ràng khi đang thực hiện các tác vụ Async.

## 7. Tìm kiếm mờ & Chuẩn hóa (Fuzzy Search & Normalization)

Yêu cầu bắt buộc hỗ trợ tìm kiếm tiếng Việt không dấu cho mọi thành phần lọc dữ liệu client-side.

- Sử dụng hàm `vietnameseSearch` từ `@/lib/vietnamese`.

## 8. Định dạng Số & Tiền tệ

- **Tiền tệ**: Luôn sử dụng định dạng `vi-VN`.
- **Phần thập phân**: Luôn hiển thị 2 chữ số thập phân (`.00`) cho các cột số lượng và tiền tệ để đảm bảo căn lề thẳng hàng.

## 9. Tiêu chuẩn Dialog & Side-sheet

Mọi Dialog nghiệp vụ phải tuân thủ:

- **Header**: Cố định (Sticky).
- **Content**: Có thể cuộn (`overflow-y-auto`) và giới hạn chiều cao (`max-h-[80vh]`).
- **Footer**: Cố định (Sticky) với các nút hành động chính.

## 10. Tối ưu hóa Tiếng Việt (Vietnamese UX)

- Tuyệt đối không để sót Text Tiếng Anh (Placeholder, Tooltip, Alert).
- Sử dụng `date-fns/locale/vi` cho mọi thành phần ngày tháng.
- Căn chỉnh `line-height` để các dấu tiếng Việt không bị chồng chênh hoặc bị cắt mất.
## 11. Chuẩn mực Trang Quản lý (Management Page Standard) - GOLD STANDARD: /admin/orders

Sử dụng trang `/admin/orders` làm chuẩn mực thiết kế và tính năng cho mọi trang quản lý danh sách (Sản phẩm, Khách hàng, Nhân viên, v.v.).

### A. Bố cục Header (Page Header)
- **Tiêu đề**: `text-lg font-bold tracking-tight mb-0`. Kích thước không quá lớn để tiết kiệm không gian.
- **Mô tả**: `text-xs text-muted-foreground`, tóm tắt nội dung trang bằng Tiếng Việt.
- **Statistics Card**: Hiển thị các chỉ số quan trọng ngay cạnh tiêu đề (Desktop) sử dụng `OrderStatsCards` làm mẫu:
  - Padding: `px-2 py-1`.
  - Border: `border-zinc-100`.
  - Hiệu ứng: `shadow-sm`, `bg-zinc-50/30`.
- **Primary Action (Nút chính)**: Đặt ở góc phải, sử dụng `size="sm"`, `h-8`, `bg-zinc-900 text-zinc-50`. Ví dụ: "+ Tạo mới".

### B. Thanh công cụ lọc (Filter Toolbar)
- **Đồng bộ Desktop & Mobile**: Cụm bộ lọc (Date Picker, Quick Status Filter, Search, Refresh) phải được thiết kế thành một Component độc lập (ví dụ: `OrderFiltersBar`) và đặt phía trên (bên ngoài) cấu trúc của Desktop Table (`AdvancedTable`) lẫn Mobile Cards. Điều này đảm bảo 100% người dùng trên Mobile và Desktop đều có cùng trải nghiệm bộ lọc.
- **Container**: `bg-zinc-50/50`, `backdrop-blur-md`, `border-zinc-100/80`, `p-1.5` đên `p-2`, `rounded-lg`, `mb-1.5` đên `mb-4`.
- **Tối ưu Mobile (Scroll & Shrink)**:
  - Khung chứa các `Badge` lọc trạng thái cần hỗ trợ cuộn ngang (horizontal scroll) sử dụng `overflow-x-auto` và bắt buộc ẩn thanh cuộn (sử dụng tailwind utilities như `[&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']`).
  - Container chứa Date Picker và Custom Search/Refresh trên Mobile cũng cần hỗ trợ chia tỷ lệ hợp lý (`flex-1`, `flex`, `gap-2`).
- **Date Picker**: Luôn hỗ trợ lọc theo ngày, kích thước `h-8`, `text-xs`.
- **Quick Status Filter**: Sử dụng `Badge` (h-7, text-[11px], font-medium, `whitespace-nowrap`) để lọc nhanh các trạng thái quan trọng. Khi được chọn (Active): `bg-zinc-900 text-zinc-50 shadow-sm`, khi không chọn: `bg-white text-zinc-600 border-zinc-100`.
- **Search Bar & Refresh**: `h-9` trên Mobile, có field Search (highlight, debounce, support tiếng Việt), input background là `bg-white`. Trên Desktop, có thể dùng chung với toolbar của `AdvancedTable`.

### C. Bảng dữ liệu (Advanced Table - Elite Choice)
- **Cấu trúc**: Phải có cột ID (nhấn để Edit), Cột tên chính (nhấn để xem Detail) và Cột Hành động (Quick View).
- **Row Height**: Phải là **48px** cho Desktop (Siêu gọn).
- **Header Height**: **36px** đến **40px**.
- **Cột ID**: Highlight bằng màu Primary hoặc Bold để dễ nhận diện.
- **Badge Trạng thái**: Luôn dùng Badge có màu sắc ý nghĩa (Xanh: Hoàn thành, Cam: Chờ xử lý, Đỏ: Huỷ...).
- **Fix Height & Scroll**: Phải dùng `autoHeight: false` và `height="calc(100vh - 280px)"` (hoặc tương đương) để bảng có thanh cuộn nội bộ, tránh làm vỡ layout trang quản trị.
- **Column Sizing**: Mặc định sử dụng chế độ **Tự động** (`columnSizingMode: "auto"`) để tối ưu không gian hiển thị dựa trên nội dung cột. Chỉ dùng `"fit"` khi bảng có ít cột và cần dàn đều 100% chiều ngang.

### D. Trình bày dữ liệu dạng Cây (Hierarchical/Tree Data) trong Advanced Table
Khi yêu cầu quản lý danh mục phân cấp (Parent-Child) kết hợp với Advanced Table:
- **Flatten Tree (Mảng phẳng)**: Không dùng thẻ lồng nhau HTML. Chuyển đổi dữ liệu cây thành mảng phẳng (Flatten array) kết hợp cấp độ `level`. Sử dụng `padding-left` (`ml-${level * 6}` hoặc thuộc tính style) cho cột Tên để tạo thụt lề phân cấp không gian.
- **Expand/Collapse**: Quản lý State `expandedKeys`. Tại `cellRenderer` của Cột Tên, dùng `ChevronRight` / `ChevronDown` có thể bấm để toggle mở rộng/thu gọn. Lọc logic (chỉ hiển thị những phần tử con khi cha của chúng nằm trong `expandedKeys`).
- **Icon (Biểu tượng)**: Ưu tiên dùng chuỗi ký tự Unicode (Emoji) lưu trong trường `icon` của CSDL để tối thiểu hóa file tĩnh. Render bằng thẻ màu nhạt làm nền. Cung cấp Emoji Picker nhẹ gọn khi thiết kế Dialog.

### Keywords: 
`Standard Management Page`, `Elite Admin UI`, `Compact Grid System`, `New York Dashboard`, `Gold Standard Orders`.
