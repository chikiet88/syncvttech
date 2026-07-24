# Tổng hợp dữ liệu "IT Chưa Fix"

> **Nguồn**: [Google Sheets - Chỉnh sửa/Xóa Bill](https://docs.google.com/spreadsheets/d/14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw/edit?gid=1547219026#gid=1547219026)
> **Ngày trích xuất**: 26/06/2026
> **Tổng số trường hợp**: 12

---

## Tổng quan theo Chi nhánh

| Chi nhánh | Số lượng |
|---|---|
| CN GÒ VẤP | 3 |
| TÂN PHÚ | 3 |
| TIMONA CMT8 | 2 |
| CN THÙ ĐỨC | 2 |
| TAZA QUẬN 10 | 1 |
| BÌNH TÂN | 1 |
| **Tổng** | **12** |

---

## Chi tiết từng trường hợp

---

### #1 — TAZA QUẬN 10 (Dòng 13)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 22/10/2025 |
| **Khách hàng** | NGỌC QUỲNH — 0907072789 |
| **Trường hợp** | Chỉnh bill hoàn tiền |
| **Nội dung cần IT chỉnh** | Chỉnh bill HTVPC2510.00003: số tiền 7.000.000 → 6.900.000, chi nhánh "Văn phòng" → "Taza skin Q10" |
| **XN CSKH** | ✅ XÁC NHẬN |
| **XN Kế toán** | ✅ XÁC NHẬN ngày 22/10 hoàn tiền 6.900.000 |
| **XN Sale Admin** | Xác nhận lên sai tk + số tiền hoàn |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `HTVPC2510.00003` — 22/10/2025, Tiền Mặt, -7.000.000, Văn Phòng
2. TẠO TT hoàn tiền tương tự — 22/10/2025, Tiền Mặt, -7.000.000, Taza Skin Clinic Quận 10 cho DV `SP20250813.321211` Liệu trình viêm nang lông cơ bản - 21.000.000

---

### #2 — TIMONA CMT8 (Dòng 87)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 06/06/2026 |
| **Khách hàng** | NGUYỄN NGỌC PHƯƠNG — 0901416027 |
| **Trường hợp** | Chiết khấu khi thanh toán hết công nợ |
| **Nội dung cần IT chỉnh** | Chỉnh BILL `PTSTT820260606.53` và DV `SP20260605.378557` để không bị lệch công nợ |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận Đ/CH DSO khóa học |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. CHỈNH D/SO KHÓA HỌC: `SP20260605.378557` Khoá Da Chuyên Nghiệp — 18.500.000 → **17.390.000**

---

### #3 — TIMONA CMT8 (Dòng 88)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 12/06/2026 |
| **Khách hàng** | HÀ THỊ NGỌC BÍCH — 0789246668 |
| **Trường hợp** | Chiết khấu khi thanh toán hết công nợ (4 khóa học) |
| **Nội dung cần IT chỉnh** | Chỉnh BILL `PTSTT820260612.112` và 4 DV để không bị lệch công nợ |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận Đ/CH DSO khóa học |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. CHỈNH D/SO: `SP20260606.378647` Khoá Da Chuyên Nghiệp — 18.360.000 → **17.452.000**
2. CHỈNH D/SO: `SP20260606.378648` Khoá học phòng chống lây nhiễm — 3.300.000 → **3.140.000**
3. CHỈNH D/SO: `SP20260606.378649` Khoá Gội Đầu Dưỡng Sinh Nâng Cao — 5.400.000 → **5.135.000**
4. CHỈNH D/SO: `SP20260606.378650` Xoa Bóp - Bấm Huyệt Chứng Chỉ Sơ Cấp — 16.200.000 → **15.395.000**

---

### #4 — CN GÒ VẤP (Dòng 85)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 30/05/2026 |
| **Khách hàng** | NGUYỄN QUỐC TRUNG — 0384594170 |
| **Chức năng** | TIMONA |
| **Trường hợp** | Khách chuyển từ combo xuống khóa đơn |
| **Nội dung cần IT chỉnh** | Chỉnh `SP20260417.369618` COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU 75.000.000 → KHOÁ CHĂM SÓC VÀ ĐIỀU TRỊ DA CHUYÊN SÂU 32.500.000 |
| **XN CSKH** | ✅ XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận chỉnh DS KHÓA HỌC |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. CHỈNH GIÁ KHÓA HỌC: `SP20260417.369618` COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU — 75.000.000 → **DA CHUYÊN SÂU 32.500.000**

---

### #5 — CN GÒ VẤP (Dòng 86)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 30/05/2026 |
| **Khách hàng** | TRỊNH MỸ TIÊN — 0383513098 |
| **Chức năng** | TIMONA |
| **Trường hợp** | Chiết khấu giảm 10% khi thanh toán |
| **Nội dung cần IT chỉnh** | Chỉnh `SP20260317.364328` Khoá Da Chuyên Nghiệp — 14.100.000 → 12.825.000 để không bị lệch công nợ |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận chỉnh DS khóa học |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. CHỈNH DS: `SP20260317.364328` Khoá Da Chuyên Nghiệp — 14.100.000 → **12.825.000**

---

### #6 — CN GÒ VẤP (Dòng 87)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 13/06/2026 |
| **Khách hàng** | LÊ THỤC OANH — 0393239368 |
| **Chức năng** | TIMONA |
| **Trường hợp** | Mạng lỗi → thu 2 lần bill 1.500.000 |
| **Nội dung cần IT chỉnh** | Chỉnh `SP20260613.380065` KHOÁ CHĂM SÓC VÀ ĐIỀU TRỊ DA NÂNG CAO — 11.016.000 thu 1.500.000, còn nợ 9.516.000. BILL `PTSTGV20260613.19` |
| **XN CSKH** | ✅ XÁC NHẬN |
| **XN Kế toán** | ✅ XÁC NHẬN ngày 13/6 CK ACB Timona 1.500.000 |
| **XN Sale Admin** | Xác nhận lên 2 lần TT bị dư |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSTGV20260613.20` — 13/06/2026, Chuyển Khoản - ACB Timona, 1.500.000, Timona Gò Vấp

---

### #7 — BÌNH TÂN (Dòng 16)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 23/10/2025 |
| **Khách hàng** | Nguyễn Nguyên Bình — 0931412499 |
| **Chức năng** | TIMONA |
| **Trường hợp** | Xuất nhầm tài khoản (Buiding Cmt8 + thu tiền Taza Q10) |
| **Nội dung cần IT chỉnh** | Chỉnh về tài khoản Timona Bình Tân cho đúng chi nhánh |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận CN lên sai tk |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSC_T20251023.242` — 23/10/2025, CK Cọc Online, 400.000, Taza Skin Clinic Quận 10
2. XÓA DV: `SP20251023.337216` Kim lăn tay ZGTS
3. TẠO DV MỚI: Kim lăn tay ZGTS — 400.000, TÀI KHOẢN TMN BT
4. TẠO TT MỚI: 23/10/2025, CK Cọc Online, 400.000, Timona Bình Tân cho DV mục 3

---

### #8 — CN THÙ ĐỨC (Dòng 40)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 29/10/2025 |
| **Khách hàng** | NGUYỄN QUỐC VINH — 0942229098 |
| **Chức năng** | TIMONA |
| **Trường hợp** | CN xuất nhầm tài khoản (Taza → Timona Thủ Đức) |
| **Nội dung cần IT chỉnh** | Chuyển `PTSPVD20251028.121` + `SP20251028.338174` từ Taza Skin Clinic Thủ Đức → Timona Thủ Đức |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận CN lên sai tk |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSPVD20251028.121` — 28/10/2025, CK Cọc Online, 245.000, Taza Skin Clinic Thủ Đức
2. XÓA DV: `SP20251028.338174` Mặt nạ thạch phục hồi, căng bóng D.701 H.Derma Melting Mask
3. TẠO DV MỚI: Mặt nạ thạch phục hồi, căng bóng D.701 H.Derma Melting Mask — 245.000, TÀI KHOẢN TMN TĐ
4. TẠO TT MỚI: 28/10/2025, CK Cọc Online, 245.000, Timona Thủ Đức cho DV mục 3

---

### #9 — CN THÙ ĐỨC (Dòng 47)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 01/02/2026 |
| **Khách hàng** | TRẦN NGỌC TRÚC ANH — 0933252292 |
| **Trường hợp** | Xuất nhầm số tiền (699.000 thay vì 690.000) |
| **Nội dung cần IT chỉnh** | Chỉnh `PTSPVD20260201.2` thanh toán 690.000 cho `SP20260201.358609` Triệt lông nách DIODE LASER - 10 buổi |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ✅ XÁC NHẬN ngày 1/2 có nhận CK 690.000 |
| **XN Sale Admin** | Xác nhận THU 690K |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSPVD20260201.2` — 01/02/2026, CK ACB, 699.000, Taza Skin Clinic Thủ Đức
2. TẠO TT MỚI: 01/02/2026, CK ACB, **690.000**, Taza Skin Clinic Thủ Đức cho MÃ `SP20260201.358609`

---

### #10 — TÂN PHÚ (Dòng 34)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 02/02/2024 |
| **Chức năng** | TAZA SKIN |
| **Trường hợp** | Xóa phiếu chi |
| **Nội dung cần IT chỉnh** | Xóa phiếu chi ngày 01/02/2024 `PC2402.00082` |
| **XN Kế toán** | ✅ XÁC NHẬN xóa phiếu chi PC2402.00082, 01/02/2024, 5.000.000 |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA PHIẾU CHI: `PC2402.00082` — 01/02/2024, 5.000.000

---

### #11 — TÂN PHÚ (Dòng 261)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 06/05/2026 |
| **Khách hàng** | Huỳnh Thị Hoà — 0365759603 |
| **Trường hợp** | Lên nhầm tài khoản (Taza TP → Timona TP) |
| **Nội dung cần IT chỉnh** | Chỉnh bill `PTSTPTZ20260506.11` chuyển thu từ tk Taza → Timona |
| **XN CSKH** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Kế toán** | ⬜ KHÔNG CẦN XÁC NHẬN |
| **XN Sale Admin** | Xác nhận CN lên sai tk |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSTPTZ20260506.11` — 06/05/2026, Tiền Mặt, 500.000, Taza Skin Clinic Tân Phú
2. TẠO TT MỚI: 06/05/2026, Tiền Mặt, 500.000, Timona Tân Phú cho `SP20260503.372696`

---

### #12 — TÂN PHÚ (Dòng 262)

| Thông tin | Nội dung |
|---|---|
| **Ngày gửi** | 22/05/2026 |
| **Khách hàng** | TRẦN MỸ HẰNG — 0945276301 |
| **Trường hợp** | Xuất nhầm thanh toán 2 lần |
| **Nội dung cần IT chỉnh** | Xoá bill thanh toán `PTSTPTZ20260522.60` (DV `SP20260522.375814` Triệt Bikini Full 2 năm - 1.200.000) để không bị lệch dòng tiền |
| **XN CSKH** | ✅ XÁC NHẬN |
| **XN Kế toán** | ✅ XÁC NHẬN ngày 22/5 CK ACB Taza 100.000 |
| **XN Sale Admin** | Xác nhận THU 100K |
| **Sếp Duyên** | ✅ DUYỆT SỬA |

**Hướng dẫn xử lý:**
1. XÓA TT: `PTSTPTZ20260522.59` — 22/05/2026, CK ACB Taza, 100.000, Taza Skin Clinic Tân Phú

---

## Phân loại theo Loại lỗi

| Loại lỗi | Số lượng | Trường hợp |
|---|---|---|
| Chỉnh giá/doanh số khóa học (chiết khấu) | 4 | #2, #3, #4, #5 |
| Xuất nhầm tài khoản (chuyển tk) | 3 | #7, #8, #11 |
| Xóa thanh toán trùng/dư | 2 | #6, #12 |
| Chỉnh bill hoàn tiền | 1 | #1 |
| Chỉnh số tiền thanh toán sai | 1 | #9 |
| Xóa phiếu chi | 1 | #10 |

---

## Bảng tóm tắt nhanh

| # | Chi nhánh | Ngày | Khách hàng | Mã Bill/DV chính | Loại lỗi | Số tiền liên quan |
|---|---|---|---|---|---|---|
| 1 | TAZA Q10 | 22/10/2025 | NGỌC QUỲNH | HTVPC2510.00003 | Chỉnh bill hoàn tiền | 7.000.000 → 6.900.000 |
| 2 | TIMONA CMT8 | 06/06/2026 | NGUYỄN NGỌC PHƯƠNG | SP20260605.378557 | Chỉnh giá khóa | 18.500.000 → 17.390.000 |
| 3 | TIMONA CMT8 | 12/06/2026 | HÀ THỊ NGỌC BÍCH | SP20260606.378647~650 | Chỉnh giá 4 khóa | Nhiều mã |
| 4 | CN GÒ VẤP | 30/05/2026 | NGUYỄN QUỐC TRUNG | SP20260417.369618 | Chỉnh giá khóa | 75.000.000 → 32.500.000 |
| 5 | CN GÒ VẤP | 30/05/2026 | TRỊNH MỸ TIÊN | SP20260317.364328 | Chỉnh giá khóa | 14.100.000 → 12.825.000 |
| 6 | CN GÒ VẤP | 13/06/2026 | LÊ THỤC OANH | PTSTGV20260613.20 | Xóa TT trùng | 1.500.000 |
| 7 | BÌNH TÂN | 23/10/2025 | Nguyễn Nguyên Bình | PTSC_T20251023.242 | Sai tài khoản | 400.000 |
| 8 | CN THÙ ĐỨC | 29/10/2025 | NGUYỄN QUỐC VINH | PTSPVD20251028.121 | Sai tài khoản | 245.000 |
| 9 | CN THÙ ĐỨC | 01/02/2026 | TRẦN NGỌC TRÚC ANH | PTSPVD20260201.2 | Sai số tiền | 699.000 → 690.000 |
| 10 | TÂN PHÚ | 02/02/2024 | — | PC2402.00082 | Xóa phiếu chi | 5.000.000 |
| 11 | TÂN PHÚ | 06/05/2026 | Huỳnh Thị Hoà | PTSTPTZ20260506.11 | Sai tài khoản | 500.000 |
| 12 | TÂN PHÚ | 22/05/2026 | TRẦN MỸ HẰNG | PTSTPTZ20260522.59 | Xóa TT trùng | 100.000 |
