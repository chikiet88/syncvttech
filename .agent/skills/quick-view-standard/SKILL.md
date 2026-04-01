# Quick View Dialog & Detail Standard (KataCore)

Tiêu chuẩn này quy định cách triển khai tính năng "Xem nhanh" (Quick View) cho các thực thể trong hệ thống KataCore (Đơn hàng, Khách hàng, Sản phẩm, v.v.) từ giao diện bảng (`AdvancedTable`).

## 1. Nguyên tắc Trải nghiệm (UX)
- **Truy cập nhanh**: Sử dụng icon `Eye` (luôn có `lucide-react`) đặt cạnh mã định danh hoặc ở cuối dòng.
- **Không ngắt quãng**: Hiển thị trong `Dialog` (Modal) thay vì chuyển trang.
- **Phân cấp thông tin**:
    - Header: Mã định danh + Trạng thái (Badge).
    - Body: 1 Grid thông số chính (Metadata) + 1 Danh sách chi tiết (Table if any).
    - Footer: Nút "Xem đầy đủ" (Chuyển trang) + Nút "Đóng".

## 2. Đặc điểm Visual (Aesthetics)
- **Header**: Sử dụng background tối (`bg-zinc-950` hoặc `bg-slate-900`) với text trắng để tạo cảm giác "Premium".
- **Góc bo**: Sử dụng `rounded-xl` hoặc `rounded-2xl` cho DialogContent.
- **Shadow**: Đổ bóng sâu `shadow-2xl`.
- **Badge**: Trạng thái luôn viết hoa, font font-black, size nhỏ ([10px]).

## 3. Cấu trúc Code Mẫu (React/TSX)

### State quản lý
```tsx
const [showViewDialog, setShowViewDialog] = useState(false);
const [viewItem, setViewItem] = useState<any>(null);

const handleOpenView = (item: any) => {
  setViewItem(item);
  setShowViewDialog(true);
};
```

### Renderer trong ColumnDef
```tsx
{
  field: "code",
  headerName: "Mã",
  cellRenderer: ({ data }) => (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="sm" onClick={() => handleOpenView(data)}>
        <Eye className="w-3.5 h-3.5 text-zinc-400" />
      </Button>
      <span className="font-bold">{data.code}</span>
    </div>
  )
}
```

### Dialog Wrapper Content
```tsx
<Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
  <DialogContent className="max-w-3xl p-0 overflow-hidden border-none shadow-2xl rounded-xl">
    <DialogHeader className="p-4 bg-zinc-950 text-white">
      <DialogTitle>Chi tiết [Thực thể]</DialogTitle>
      <DialogDescription>Mã: {viewItem?.code}</DialogDescription>
    </DialogHeader>
    <div className="p-6">
       {/* Metadata & Details table */}
    </div>
    <DialogFooter>
       <Button onClick={() => router.push(`/[route]/${viewItem?.id}`)}>Xem đầy đủ</Button>
       <Button variant="outline" onClick={() => setShowViewDialog(false)}>Đóng</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

## 4. Quy tắc vận hành (AI Protocol)
- Khi người dùng yêu cầu "Thêm xem nhanh/Quick View" cho bất kỳ bảng nào, AI phải tự động:
    1. Import các Dialog components từ `@/components/ui/dialog`.
    2. Tạo state `showViewDialog` và `viewItem`.
    3. Cập nhật `ColumnDef` tương ứng.
    4. Triển khai Modal theo style "Premium" ở cuối component.
    5. Đảm bảo ngôn ngữ là Tiếng Việt theo [vietnamese-ux-glossary-standard].
