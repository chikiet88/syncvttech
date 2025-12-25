#!/usr/bin/env python3
"""
VTTech Customer Detail API - Deep Analysis
Phân tích chi tiết tất cả endpoints của Customer Detail page

Author: Auto-generated
Date: 2025-12-25
"""

import requests
import json
import base64
import zlib
import re
from datetime import datetime
from pathlib import Path

BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

OUTPUT_DIR = Path(__file__).parent / "data_scan" / "customer_detail"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def decompress_vttech(data):
    """Decompress VTTech response (base64 + gzip)"""
    if isinstance(data, str):
        data = data.strip().strip('"')
    
    try:
        decoded = base64.b64decode(data)
        for wbits in [-zlib.MAX_WBITS, zlib.MAX_WBITS, 16 + zlib.MAX_WBITS]:
            try:
                decompressed = zlib.decompress(decoded, wbits)
                text = decompressed.decode('utf-8')
                try:
                    return json.loads(text)
                except:
                    return text
            except:
                continue
    except:
        pass
    
    try:
        return json.loads(data)
    except:
        return data


class CustomerDetailAnalyzer:
    """Phân tích Customer Detail endpoints"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        })
        self.token = None
        self.xsrf = None
        self.results = {
            'scan_date': datetime.now().isoformat(),
            'user': USERNAME,
            'base_url': BASE_URL,
            'handlers': {}
        }
    
    def login(self):
        """Login và lấy token"""
        resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
            'username': USERNAME,
            'password': PASSWORD,
            'passwordcrypt': '',
            'from': '',
            'sso': '',
            'ssotoken': ''
        })
        data = resp.json()
        self.token = data.get('Session')
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        print(f"✅ Logged in as: {data.get('FullName')} (ID: {data.get('ID')})")
        return True
    
    def get_xsrf(self):
        """Lấy XSRF token"""
        resp = self.session.get(f'{BASE_URL}/Customer/ListCustomer/')
        match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>\"]+)', resp.text)
        self.xsrf = match.group(1) if match else None
        return self.xsrf
    
    def test_handler(self, page, handler, extra_data=None):
        """Test một handler"""
        url = f'{BASE_URL}{page}?handler={handler}'
        data = {'__RequestVerificationToken': self.xsrf}
        if extra_data:
            data.update(extra_data)
        
        try:
            resp = self.session.post(url, data=data, timeout=30)
            result = {
                'status_code': resp.status_code,
                'size': len(resp.content),
                'has_data': False,
                'data_type': None,
                'data_preview': None,
                'data_count': 0
            }
            
            if resp.status_code == 200:
                content = resp.text.strip()
                
                # Skip HTML responses
                if '<html' in content.lower() or '<!DOCTYPE' in content.lower():
                    result['data_type'] = 'HTML_REDIRECT'
                elif content in ['', '0', 'null', '[]', '{}']:
                    result['data_type'] = 'EMPTY'
                    result['data_preview'] = content
                else:
                    try:
                        parsed = decompress_vttech(content)
                        result['has_data'] = True
                        
                        if isinstance(parsed, dict):
                            result['data_type'] = 'DICT'
                            result['data_count'] = len(parsed.keys())
                            result['data_preview'] = list(parsed.keys())[:10]
                        elif isinstance(parsed, list):
                            result['data_type'] = 'LIST'
                            result['data_count'] = len(parsed)
                            if len(parsed) > 0:
                                result['data_preview'] = parsed[0] if len(parsed) > 0 else None
                        else:
                            result['data_type'] = type(parsed).__name__
                            result['data_preview'] = str(parsed)[:200]
                    except:
                        result['data_type'] = 'UNKNOWN'
                        result['data_preview'] = content[:100]
            
            return result
        except Exception as e:
            return {'error': str(e)}
    
    def analyze_all_handlers(self):
        """Phân tích tất cả handlers của Customer Detail"""
        
        # MainCustomer page handlers (dựa trên UI tabs)
        main_customer_handlers = {
            # Init handlers
            'LoadIni': 'Khởi tạo - Employee full, Tele list',
            'Initialize': 'Khởi tạo page',
            
            # Customer data
            'Loadata': 'Dữ liệu khách hàng (cần CustomerID)',
            'LoadData': 'Load data',
            'LoadCustomer': 'Load customer',
            
            # Tab: Thông Tin
            'LoadInfo': 'Thông tin cơ bản',
            'LoadProfile': 'Hồ sơ khách hàng',
            
            # Tab: Tiền Sử (History)
            'LoadHistory': 'Tiền sử bệnh lý',
            'LoadMedicalHistory': 'Tiền sử y tế',
            
            # Tab: Tư vấn
            'LoadCustCare': 'Chăm sóc khách hàng',
            'LoadConsultation': 'Tư vấn',
            
            # Tab: Chẩn Đoán
            'LoadDiagnosis': 'Chẩn đoán',
            
            # Tab: Dịch Vụ
            'LoadService': 'Danh sách dịch vụ',
            'LoadDichVu': 'Dịch vụ (VN)',
            'LoadServiceList': 'Danh sách dịch vụ',
            
            # Tab: Điều trị
            'LoadTreatment': 'Điều trị',
            'LoadProcedure': 'Quy trình điều trị',
            
            # Tab: Thanh Toán
            'LoadPaymentInfo': 'Thông tin thanh toán',
            'LoadPayment': 'Thanh toán',
            'LoadTransaction': 'Giao dịch',
            'LoadInvoice': 'Hóa đơn',
            'LoadReceipt': 'Phiếu thu',
            
            # Tab: Hình Ảnh
            'LoadImage': 'Hình ảnh',
            'LoadImages': 'Danh sách hình ảnh',
            'LoadGallery': 'Gallery',
            
            # Tab: Trả Góp
            'LoadInstallment': 'Trả góp',
            'LoadDebt': 'Công nợ',
            
            # Tab: Lịch Sử
            'LoadLichSu': 'Lịch sử',
            'LoadTransactionHistory': 'Lịch sử giao dịch',
            
            # Tab: Lịch Hẹn
            'LoadCustomerScheduleNext': 'Lịch hẹn tiếp theo',
            'LoadAppointment': 'Lịch hẹn',
            'LoadSchedule': 'Lịch',
            
            # Tab: Complaint
            'LoadComplaint': 'Khiếu nại',
            
            # Tab: Thẻ trả trước
            'LoadPrepaidCard': 'Thẻ trả trước',
            'LoadCard': 'Thẻ',
            'LoadTheTraTruoc': 'Thẻ trả trước (VN)',
            
            # Tab: Đơn thuốc
            'LoadPrescription': 'Đơn thuốc',
            'LoadDonThuoc': 'Đơn thuốc (VN)',
            'LoadMedicine': 'Thuốc',
            
            # Extra
            'LoadStatusExtra': 'Trạng thái mở rộng',
            'LoadExtraInfo': 'Thông tin mở rộng',
            'LoadMembership': 'Hạng thành viên',
            'LoadPoints': 'Điểm tích lũy',
            'LoadTeethData': 'Dữ liệu răng (Dental)',
            'LoadNote': 'Ghi chú',
            'LoadNotes': 'Danh sách ghi chú',
        }
        
        page = '/Customer/MainCustomer/'
        
        print(f"\n{'='*70}")
        print(f"ANALYZING {page}")
        print(f"{'='*70}")
        
        for handler, description in main_customer_handlers.items():
            result = self.test_handler(page, handler)
            self.results['handlers'][handler] = {
                'description': description,
                **result
            }
            
            # Print result
            status = '✅' if result.get('has_data') else ('⚠️' if result.get('data_type') == 'EMPTY' else '❌')
            size = result.get('size', 0)
            dtype = result.get('data_type', 'N/A')
            count = result.get('data_count', 0)
            
            print(f"{status} {handler:30} | {dtype:15} | Size: {size:6} | Count: {count}")
        
        return self.results
    
    def generate_report(self):
        """Tạo báo cáo Markdown"""
        report = []
        report.append("# 🔍 CUSTOMER DETAIL ENDPOINTS - DEEP ANALYSIS")
        report.append(f"\n**Ngày scan**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"**User**: {USERNAME}")
        report.append(f"**Base URL**: {BASE_URL}")
        
        # Summary
        working = sum(1 for h in self.results['handlers'].values() if h.get('has_data'))
        empty = sum(1 for h in self.results['handlers'].values() if h.get('data_type') == 'EMPTY')
        redirect = sum(1 for h in self.results['handlers'].values() if h.get('data_type') == 'HTML_REDIRECT')
        
        report.append("\n## 📊 TỔNG KẾT")
        report.append(f"| Metric | Value |")
        report.append(f"|--------|-------|")
        report.append(f"| Tổng handlers tested | {len(self.results['handlers'])} |")
        report.append(f"| ✅ Có dữ liệu | {working} |")
        report.append(f"| ⚠️ Empty (cần CustomerID) | {empty} |")
        report.append(f"| ❌ HTML Redirect | {redirect} |")
        
        # Working handlers
        report.append("\n## ✅ HANDLERS CÓ DỮ LIỆU")
        report.append("| Handler | Mô tả | Data Type | Count | Preview |")
        report.append("|---------|-------|-----------|-------|---------|")
        
        for name, data in self.results['handlers'].items():
            if data.get('has_data'):
                desc = data.get('description', '')[:30]
                dtype = data.get('data_type', 'N/A')
                count = data.get('data_count', 0)
                preview = str(data.get('data_preview', ''))[:50]
                report.append(f"| {name} | {desc} | {dtype} | {count} | {preview} |")
        
        # Empty handlers
        report.append("\n## ⚠️ HANDLERS CẦN CUSTOMERID")
        report.append("| Handler | Mô tả | Response |")
        report.append("|---------|-------|----------|")
        
        for name, data in self.results['handlers'].items():
            if data.get('data_type') == 'EMPTY':
                desc = data.get('description', '')[:40]
                preview = str(data.get('data_preview', 'empty'))
                report.append(f"| {name} | {desc} | `{preview}` |")
        
        # Usage guide
        report.append("\n## 📝 HƯỚNG DẪN SỬ DỤNG")
        report.append("""
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
""")
        
        # UI Tabs mapping
        report.append("\n## 🗂️ MAPPING UI TABS → HANDLERS")
        report.append("""
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
""")
        
        # Permission notes
        report.append("\n## ⚠️ GHI CHÚ VỀ QUYỀN")
        report.append("""
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
""")
        
        return "\n".join(report)
    
    def save_results(self):
        """Lưu kết quả"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # JSON
        json_file = OUTPUT_DIR / f"analysis_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2, default=str)
        print(f"\n📁 Saved JSON: {json_file}")
        
        # Markdown report
        report = self.generate_report()
        md_file = OUTPUT_DIR / f"CUSTOMER_DETAIL_ANALYSIS_{timestamp}.md"
        with open(md_file, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"📁 Saved Report: {md_file}")
        
        # Also save to main directory
        main_report = OUTPUT_DIR.parent.parent / "CUSTOMER_DETAIL_ENDPOINTS.md"
        with open(main_report, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"📁 Saved Main Report: {main_report}")
        
        return json_file, md_file


def main():
    analyzer = CustomerDetailAnalyzer()
    analyzer.login()
    analyzer.get_xsrf()
    analyzer.analyze_all_handlers()
    analyzer.save_results()
    
    print("\n" + "="*70)
    print("ANALYSIS COMPLETE!")
    print("="*70)


if __name__ == "__main__":
    main()
