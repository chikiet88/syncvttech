# 🔍 CUSTOMER DETAIL ENDPOINTS - DEEP ANALYSIS

**Ngày scan**: 2025-12-25 01:07:31
**User**: ittest123
**Base URL**: https://tmtaza.vttechsolution.com

## 📊 TỔNG KẾT
| Metric | Value |
|--------|-------|
| Tổng handlers tested | 46 |
| ✅ Có dữ liệu | 3 |
| ⚠️ Empty (cần CustomerID) | 3 |
| ❌ HTML Redirect | 40 |

## ✅ HANDLERS CÓ DỮ LIỆU
| Handler | Mô tả | Data Type | Count | Preview |
|---------|-------|-----------|-------|---------|
| LoadIni | Khởi tạo - Employee full, Tele | DICT | 2 | ['EmpFull', 'Tele'] |
| LoadPaymentInfo | Thông tin thanh toán | LIST | 1 | {'PRICE_DISCOUNTED': 0.0, 'PAID': 0.0, 'PRICE_TREA |
| LoadStatusExtra | Trạng thái mở rộng | DICT | 2 | ['Table', 'Table1'] |

## ⚠️ HANDLERS CẦN CUSTOMERID
| Handler | Mô tả | Response |
|---------|-------|----------|
| Loadata | Dữ liệu khách hàng (cần CustomerID) | `0` |
| LoadCustCare | Chăm sóc khách hàng | `[]` |
| LoadCustomerScheduleNext | Lịch hẹn tiếp theo | `[]` |

## 📝 HƯỚNG DẪN SỬ DỤNG

### 1. API Request Format

```python
# Form-encoded data (NOT JSON!)
import requests

session = requests.Session()
session.headers['Authorization'] = f'Bearer {token}'
session.headers['X-Requested-With'] = 'XMLHttpRequest'

# Lấy XSRF token từ page
resp = session.get(f'{BASE_URL}/Customer/ListCustomer/')
xsrf = extract_xsrf(resp.text)

# Call handler
resp = session.post(
    f'{BASE_URL}/Customer/MainCustomer/?handler=LoadIni',
    data={'__RequestVerificationToken': xsrf}
)
```

### 2. Với CustomerID

```python
# CustomerID là encrypted string từ URL
customer_id = '+v8JSzPlpGkU%2FyH0kvLvOg%3D%3D'

resp = session.post(
    f'{BASE_URL}/Customer/MainCustomer/?handler=Loadata&CustomerID={customer_id}',
    data={'__RequestVerificationToken': xsrf}
)
```

### 3. Decompress Response

```python
import base64
import zlib

def decompress(data):
    data = data.strip('"')
    decoded = base64.b64decode(data)
    decompressed = zlib.decompress(decoded, -zlib.MAX_WBITS)
    return json.loads(decompressed.decode('utf-8'))
```


## 🗂️ MAPPING UI TABS → HANDLERS

| UI Tab | Vietnamese | Handler | Status |
|--------|------------|---------|--------|
| **Info** | Thông Tin | `Loadata`, `LoadInfo` | ⚠️ Cần CustomerID |
| **History** | Tiền Sử | `LoadHistory`, `LoadMedicalHistory` | ⚠️ Cần CustomerID |
| **Consultation** | Tư vấn | `LoadCustCare`, `LoadConsultation` | ⚠️ Cần CustomerID |
| **Diagnosis** | Chẩn Đoán | `LoadDiagnosis` | ❌ HTML |
| **Services** | Dịch Vụ | `LoadService`, `LoadDichVu` | ⚠️ Cần CustomerID |
| **Treatment** | Điều trị | `LoadTreatment`, `LoadProcedure` | ❌ HTML |
| **Payment** | Thanh Toán | `LoadPaymentInfo` | ✅ Có dữ liệu |
| **Images** | Hình Ảnh | `LoadImage`, `LoadImages` | ❌ HTML |
| **Installment** | Trả Góp | `LoadInstallment`, `LoadDebt` | ⚠️ Cần CustomerID |
| **History** | Lịch Sử | `LoadTransactionHistory` | ⚠️ Cần CustomerID |
| **Appointments** | Lịch Hẹn | `LoadCustomerScheduleNext` | ⚠️ Cần CustomerID |
| **Complaint** | Complaint | `LoadComplaint` | ❌ HTML |
| **Prepaid** | Thẻ trả trước | `LoadPrepaidCard`, `LoadCard` | ⚠️ Cần CustomerID |
| **Prescription** | Đơn thuốc | `LoadPrescription`, `LoadDonThuoc` | ⚠️ Cần CustomerID |


## ⚠️ GHI CHÚ VỀ QUYỀN

User `ittest123` (ID: 324) có các giới hạn:

1. **KHÔNG CÓ QUYỀN** xem danh sách khách hàng (`LoadData` returns 0)
2. **CẦN CustomerID** để xem chi tiết khách hàng
3. CustomerID được **ENCRYPT** trong URL (Base64 encoded encrypted string)
4. Có thể xem **Master Data** (branches, employees, services)
5. **CÓ QUYỀN** xem `LoadIni` (Employee full, Tele list)
6. **CÓ QUYỀN** xem `LoadPaymentInfo`, `LoadStatusExtra`

### Để truy cập đầy đủ Customer Detail cần:
- Quyền xem khách hàng cụ thể
- CustomerID từ hệ thống (encrypted)
- Hoặc nâng cấp quyền user
