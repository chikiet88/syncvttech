# Tổng hợp dữ liệu "IT Chưa Fix" (Từ 01/05/2026 đến nay)

> **Nguồn**: [Google Sheets - Chỉnh sửa/Xóa Bill](https://docs.google.com/spreadsheets/d/14Q4MXk5l1ZgDXemDPBe0PCDIOlLbBgKuY7Vi2kugvpw/edit?gid=1547219026#gid=1547219026)
> **Thời gian lọc**: Từ 01/05/2026 đến hiện tại (Ngày chạy báo cáo: 26/06/2026)
> **Tổng số trường hợp chưa xử lý**: 7

---

## 1. Thống kê theo Chi nhánh

| Chi nhánh | Số lượng |
|---|---|
| TÂN PHÚ | 2 |
| CN GÒ VẤP | 3 |
| TIMONA CMT8 | 2 |
| **Tổng cộng** | **7** |

---

## 2. Bảng phân tích các bước xử lý cho IT (IT Actions Map)

| # | Chi nhánh (Dòng) | Khách hàng/Học viên | Ngày gửi | Bước 1: XÓA / HỦY (Thanh toán, Dịch vụ cũ) | Bước 2: CHỈNH SỬA (Giá, Doanh số, Tên DV) | Bước 3: TẠO MỚI (Thanh toán, Dịch vụ mới) |
|---|---|---|---|---|---|---|
| 1 | **TÂN PHÚ**<br>(Dòng 261)<br>🟢 **Đã Fix** | Huỳnh Thị Hoà 0365759603 | 6/5/2026 | **XÓA Thanh toán:**<br>Mã TT: `PTSTPTZ20260506.11` (06-05-2026, Tiền Mặt, 500.000đ, Taza Skin Clinic Tân Phú) | - | **TẠO MỚI Thanh toán:**<br>Thu tiền 500.000đ, Tiền Mặt, Ngày 06-05-2026 vào tài khoản **Timona Tân Phú** (phân bổ cho DV `SP20260503.372696`) |
| 2 | **TÂN PHÚ**<br>(Dòng 262) | TRẦN MỸ HẰNG 0945276301 | 22/5/2026 | **XÓA Thanh toán:**<br>Mã TT: `PTSTPTZ20260522.59` (22-05-2026, Chuyển Khoản - ACB Taza, 100.000đ, Taza Skin Clinic Tân Phú)<br>*(Note: Theo yêu cầu CN, cần xóa bill thanh toán PTSTPTZ20260522.60 do trùng)* | - | - |
| 3 | **CN GÒ VẤP**<br>(Dòng 85) | NGUYỄN QUỐC TRUNG 0384594170 | 30/05/2026 | - | **CHỈNH GIÁ KHÓA HỌC:**<br>Mã DV: `SP20260417.369618` (Combo Da Chuyên Sâu + Phun Xăm Chuyên Sâu)<br>- Giá cũ: 75.000.000đ<br>- Giá mới: **32.500.000đ** (Đổi sang khóa Da Chuyên Sâu) | - |
| 4 | **CN GÒ VẤP**<br>(Dòng 86) | TRỊNH MỸ TIÊN 0383513098 | 30/05/2026 | - | **CHỈNH DOANH SỐ KHÓA HỌC:**<br>Mã DV: `SP20260317.364328` (Khoá Da Chuyên Nghiệp)<br>- Doanh số cũ: 14.100.000đ<br>- Doanh số mới: **12.825.000đ** (Giảm 10% chiết khấu) | - |
| 5 | **TIMONA CMT8**<br>(Dòng 87) | NGUYỄN NGỌC PHƯƠNG 0901416027 | 06/06/2026 | - | **CHỈNH DOANH SỐ KHÓA HỌC:**<br>Mã DV: `SP20260605.378557` (Khoá Da Chuyên Nghiệp)<br>- Doanh số cũ: 18.500.000đ<br>- Doanh số mới: **17.390.000đ** (Chiết khấu khi thanh toán hết nợ) | - |
| 6 | **TIMONA CMT8**<br>(Dòng 88) | HÀ THỊ NGỌC BÍCH 0789246668 | 12/06/2026 | - | **CHỈNH DOANH SỐ 4 KHÓA HỌC:**<br>1. `SP20260606.378647` (Khoá Da CN): 18.360.000đ → **17.452.000đ**<br>2. `SP20260606.378648` (Phòng chống lây nhiễm): 3.300.000đ → **3.140.000đ**<br>3. `SP20260606.378649` (Gội Đầu DS Nâng Cao): 5.400.000đ → **5.135.000đ**<br>4. `SP20260606.378650` (Xoa Bóp Bấm Huyệt): 16.200.000đ → **15.395.000đ** | - |
| 7 | **CN GÒ VẤP**<br>(Dòng 87) | LÊ THỤC OANH 0393239368 | 13/06/2026 | **XÓA Thanh toán trùng:**<br>Mã TT: `PTSTGV20260613.20` (13-06-2026, Chuyển Khoản - ACB Timona, 1.500.000đ, Timona Gò Vấp) | - | - |

---

## 3. Danh sách tóm tắt nhanh

| # | Ngày gửi | Chi nhánh | Dòng | Khách hàng/Học viên | Tóm tắt nội dung yêu cầu ban đầu |
|---|---|---|---|---|---|
| 1 | 6/5/2026 | TÂN PHÚ | 261 | Huỳnh Thị Hoà 0365759603 | Dạ Sếp @Mỹ Duyên duyệt giúp chi nhánh Tân Phú trường hợp sau ạ: Học viên: Huỳnh Thị Hoà 0365759603 Thanh toán 500.000 ch... |
| 2 | 22/5/2026 | TÂN PHÚ | 262 | TRẦN MỸ HẰNG 0945276301 | Dạ sếp @Mỹ Duyên  duyệt giúp CN TAZA Thủ Đức trường hợp sau ạ: Khách hàng TRẦN MỸ HẰNG	945276301. Ngày 22/5/2026 xuất... |
| 3 | 30/05/2026 | CN GÒ VẤP | 85 | NGUYỄN QUỐC TRUNG 0384594170 | Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ:  Học viên: NGUYỄN QUỐC TRUNG 0384594170 Khách không học... |
| 4 | 30/05/2026 | CN GÒ VẤP | 86 | TRỊNH MỸ TIÊN 0383513098 | Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ:  Học viên: TRỊNH MỸ TIÊN  0383513098 Khách được chiết k... |
| 5 | 06/06/2026 | TIMONA CMT8 | 87 | NGUYỄN NGỌC PHƯƠNG 0901416027 | dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA QUẬN 10  trường hợp sau ạ:  Học viên:  NGUYỄN NGỌC PHƯƠNG 0901416027 Khách được c... |
| 6 | 12/06/2026 | TIMONA CMT8 | 88 | HÀ THỊ NGỌC BÍCH 0789246668 | dạ Sếp @Mỹ Duyên duyệt giúp CN TIMONA QUẬN 10  trường hợp sau ạ:  Học viên:  HÀ THỊ NGỌC BÍCH 0789246668  Khách được chi... |
| 7 | 13/06/2026 | CN GÒ VẤP | 87 | LÊ THỤC OANH 0393239368 | Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ:  Học viên: LÊ THỤC OANH 0393239368 Do mạng chi nhánh ng... |

---

## 4. Chi tiết các trường hợp cần xử lý

### Case #1: TÂN PHÚ (Dòng 261)

* **Ngày gửi**: 6/5/2026
* **Khách hàng/Học viên**: Huỳnh Thị Hoà 0365759603
* **Nội dung yêu cầu**:
```text
Dạ Sếp @Mỹ Duyên duyệt giúp chi nhánh Tân Phú trường hợp sau ạ:
Học viên: Huỳnh Thị Hoà 0365759603
Thanh toán 500.000 cho Timona TP nhưng chi nhánh lên nhầm bằng tài khoản Taza TP
Nhờ a @Kata chỉnh giúp e bill: PTSTPTZ20260506.11 chuyển thu từ tk Taza sang Timona để khớp bill chi nhánh ạ.
Nhờ @Kitkat xác nhận giúp chi nhánh nha.
```

* **Xác nhận CSKH**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Kế toán**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Sale Admin**:
```text
xác nhận CN lên sai tk:

1. XÓA TT: PTSTPTZ20260506.11
06-05-2026
Tiền Mặt
500,000
Taza Skin Clinic Tân Phú

2. TẠO TT MỚI: 06-05-2026
Tiền Mặt
500,000
Timona Tân Phú cho  SP20260503.372696
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🟢 **IT ĐÃ FIX (Ngày 26/06/2026)**

---

### Case #2: TÂN PHÚ (Dòng 262)

* **Ngày gửi**: 22/5/2026
* **Khách hàng/Học viên**: TRẦN MỸ HẰNG 0945276301
* **Nội dung yêu cầu**:
```text
Dạ sếp @Mỹ Duyên  duyệt giúp CN TAZA Thủ Đức trường hợp sau ạ:
Khách hàng TRẦN MỸ HẰNG	945276301. Ngày 22/5/2026 xuất nhầm thanh toán 2 lần dịch vụ SP20260522.375814 Triệt Bikini Full - 2 năm - 1,200,000. Nhờ anh @Kata xoá bill thanh toán PTSTPTZ20260522.60 giúp chi nhánh để không bị lệch dòng tiền. 
Nhờ chị @Ngọc Huyền   @Phan Ngọc Đan Thanh  @Kitkat  xác nhận giúp chi nhánh. Chi nhánh xin cảm ơn ạ!
```

* **Xác nhận CSKH**: XÁC NHẬN
* **Xác nhận Kế toán**: XÁC NHẬN TRẦN MỸ HẰNG 0945276301 NGÀY 22/5 CHUYỂN KHOẢN ACB TAZA 100.000
* **Xác nhận Sale Admin**:
```text
nhờ KT xác nhận THU 100K 22-05-2026

XÓA TT: PTSTPTZ20260522.59
22-05-2026
Chuyển Khoản - ACB Taza
100,000
Taza Skin Clinic Tân Phú
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

### Case #3: CN GÒ VẤP (Dòng 85)

* **Ngày gửi**: 30/05/2026
* **Khách hàng/Học viên**: NGUYỄN QUỐC TRUNG 0384594170
* **Nội dung yêu cầu**:
```text
Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ: 
Học viên: NGUYỄN QUỐC TRUNG 0384594170
Khách không học SP20260417.369618COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU 75.000.000 nửa chuyển xuống học KHOÁ CHĂM SÓC VÀ ĐIỀU TRỊ DA CHUYÊN SÂU 32.500.000 và thanh toán đủ 
Nhờ anh @Kata  chỉnh lại giúp chi nhánh SP20260417.369618 COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU - 75,000,000 thành KHOÁ CHĂM SÓC VÀ ĐIỀU TRỊ DA CHUYÊN SÂU 32.500.000  đã thanh toán đủ.  
Nhờ Chị @Ngọc Huyền   @Kitkat    @Phan Ngọc Đan Thanh . Xác nhận giúp CN.  CN xin cảm ơn ạ!
```

* **Xác nhận CSKH**: XÁC NHẬN
* **Xác nhận Kế toán**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Sale Admin**:
```text
nhờ CSKH xác nhận KH chuyển từ combo XUỐNG DCS 32.500

 CHỈNH GIÁ KHÓA HỌC:  SP20260417.369618 COMBO DA CHUYÊN SÂU + PHUN XĂM CHUYÊN SÂU - 75,000,000 THÀNH DA CHUYÊN SÂU 32,500,000
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

### Case #4: CN GÒ VẤP (Dòng 86)

* **Ngày gửi**: 30/05/2026
* **Khách hàng/Học viên**: TRỊNH MỸ TIÊN 0383513098
* **Nội dung yêu cầu**:
```text
Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ: 
Học viên: TRỊNH MỸ TIÊN  0383513098
Khách được chiết khấu giảm 10% khi thanh toán khoá học SP20260317.364328 Khoá Da Chuyên Nghiệp - 14,100,000 
Nhờ anh @Kata  chỉnh lại giúp chi nhánh SP20260317.364328 Khoá Da Chuyên Nghiệp - 14,100,000 thành SP20260317.364328 Khoá Da Chuyên Nghiệp - 12,825,000  để không bị lệch công nợ. 
BILL: PTSTGV20260529.78 29-05-2026  THANH TOÁN ĐỦ. 
Nhờ Chị @Ngọc Huyền   @Kitkat   @Phan Ngọc Đan Thanh  . Xác nhận giúp CN.  CN xin cảm ơn ạ!
```

* **Xác nhận CSKH**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Kế toán**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Sale Admin**:
```text
xác nhận chỉnh DS KHÓA HỌC

CHỈNH DS:  SP20260317.364328 Khoá Da Chuyên Nghiệp - 14,100,000 THÀNH 12,825,000
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

### Case #5: TIMONA CMT8 (Dòng 87)

* **Ngày gửi**: 06/06/2026
* **Khách hàng/Học viên**: NGUYỄN NGỌC PHƯƠNG 0901416027
* **Nội dung yêu cầu**:
```text
dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA QUẬN 10  trường hợp sau ạ: 
Học viên:  NGUYỄN NGỌC PHƯƠNG 0901416027
Khách được chiếc khấu khi thanh toán hết công nợ của Khoá Da Chuyên Nghiệp : 18,500,000đ còn 17,390,000đ 
Nhờ anh @Kata  chỉnh giúp CN BILL : PTSTT820260606.53 và dịch vụ: SP20260605.378557 để không bị lệch công nợ ạ.  
Nhờ Chị  @Ngọc Huyền @Kitkat  @Phan Ngọc Đan Thanh Xác nhận giúp em. Em xin cảm ơn!
```

* **Xác nhận CSKH**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Kế toán**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Sale Admin**:
```text
xác nhận Đ/CH DSO KHÓA HỌC

CHỈNH D/SO KHÓA HỌC:  SP20260605.378557 Khoá Da Chuyên Nghiệp - 18,500,000 THÀNH 17,390,000
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

### Case #6: TIMONA CMT8 (Dòng 88)

* **Ngày gửi**: 12/06/2026
* **Khách hàng/Học viên**: HÀ THỊ NGỌC BÍCH 0789246668
* **Nội dung yêu cầu**:
```text
dạ Sếp @Mỹ Duyên duyệt giúp CN TIMONA QUẬN 10  trường hợp sau ạ: 
Học viên:  HÀ THỊ NGỌC BÍCH 0789246668

Khách được chiếc khấu khi thanh toán hết công nợ của Khoá Da Chuyên Nghiệp : 18,360,000 còn 17,452,000 
                                                                                     Khoá học phòng chống lây nhiễm: 3,300,000 CÒN 3,140,000 
                                                                     KHOÁ GỘI ĐẦU DƯỠNG SINH NÂNG CAO :  5,400,000 còn 5,135,000 
                                                                XOA BÓP - BẤM HUYỆT CHỨNG CHỈ SƠ CẤP:  16,200,000 còn 15,395,000

Nhờ anh @Kata   chỉnh giúp CN BILL : PTSTT820260612.112 và dịch vụ 1: SP20260606.378647 
                                                                                                            dịch vụ 2 : SP20260606.378648 
                                                                                                            dịch vụ 3: SP20260606.378649 
                                                                                                            dịch vụ 4: SP20260606.378650 để không bị lệch công nợ
Nhờ Chị  @Ngọc Huyền  @Kitkat  @Phan Ngọc Đan Thanh Xác nhận giúp em. Em xin cảm ơn!
```

* **Xác nhận CSKH**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Kế toán**: KHÔNG CẦN XÁC NHẬN
* **Xác nhận Sale Admin**:
```text
xác nhận Đ/CH DSO KHÓA HỌC

1.CHỈNH D/SO KHÓA HỌC:  SP20260606.378647 Khoá Da Chuyên Nghiệp - 18,360,000 THÀNH  17,452,000

2.CHỈNH D/SO KHÓA HỌC:  SP20260606.378648 Khoá học phòng chống lây nhiễm - 3,300,000 THÀNH 3,140,000

3.CHỈNH D/SO KHÓA HỌC:   SP20260606.378649 KHOÁ GỘI ĐẦU DƯỠNG SINH NÂNG CAO - 5,400,000   THÀNH  5,135,000

4.CHỈNH D/SO KHÓA HỌC:  SP20260606.378650 XOA BÓP - BẤM HUYỆT CHỨNG CHỈ SƠ CẤP - 16,200,000 THÀNH 15,395,000
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

### Case #7: CN GÒ VẤP (Dòng 87)

* **Ngày gửi**: 13/06/2026
* **Khách hàng/Học viên**: LÊ THỤC OANH 0393239368
* **Nội dung yêu cầu**:
```text
Dạ Sếp @Mỹ Duyên  duyệt giúp CN TIMONA GÒ VẤP  trường hợp sau ạ: 
Học viên: LÊ THỤC OANH 0393239368
Do mạng chi nhánh ngày 13/6 bị lỗi, KTCN thu 1 bill 1.500.000 bị lỗi thành 2  lần 1.500.000 
Nhờ anh @Kata  chỉnh lại giúp chi nhánh SP20260613.380065 KHOÁ CHĂM SÓC VÀ ĐIỀU TRỊ DA NÂNG CAO - 11,016,000 thu 1.500.000 và còn nợ 9.516.000
BILL: PTSTGV20260613.19 13-06-2026 thanh toán 1.500.000
Nhờ Chị @Ngọc @Ngọc Huyền   @Kitkat   @Phan Ngọc Đan Thanh   . Xác nhận giúp CN.  CN xin cảm ơn ạ!
```

* **Xác nhận CSKH**: XÁC NHẬN
* **Xác nhận Kế toán**: XÁC NHẬN LÊ THỤC OANH 0393239368 NGÀY 13/6 CK ACB TIMONA 1.500.000
* **Xác nhận Sale Admin**:
```text
xác nhận: LÊN 2 LẦN TT BỊ DƯ

XÓA TT: PTSTGV20260613.20
13-06-2026
Chuyển Khoản - ACB Timona
1,500,000
Timona Gò Vấp
```
* **Sếp Duyên duyệt**: DUYỆT SỬA
* **Trạng thái**: 🔴 **IT CHƯA FIX**

---

