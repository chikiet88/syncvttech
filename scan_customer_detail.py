#!/usr/bin/env python3
"""
VTTech Customer Detail Endpoints Deep Scanner
Scan sâu tất cả endpoints của trang Customer Detail (MainCustomer)

Dựa trên UI tabs:
- Thông Tin (Info)
- Tiền Sử (History)
- Tư vấn (Consultation)
- Chẩn Đoán (Diagnosis) 
- Dịch Vụ (Services)
- Điều trị (Treatment)
- Thanh Toán (Payment)
- Hình Ảnh (Images)
- Trả Góp (Installment)
- Lịch Sử (Transaction History)
- Lịch Hẹn (Appointments)
- Complaint

Author: Auto-generated
Date: 2025-12-25
"""

import requests
import json
import base64
import zlib
import re
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, Dict, List, Any
import logging

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "data_scan" / "customer_detail"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ============== LOGGING ==============
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s'
)
logger = logging.getLogger(__name__)

# ============== HANDLERS CÓ THỂ CÓ CHO CUSTOMER DETAIL ==============

# Các handler dựa trên UI tabs và pattern thường gặp trong VTTech
CUSTOMER_DETAIL_HANDLERS = [
    # General/Initialize
    "LoadIni",
    "Initialize", 
    "Init",
    "LoadInit",
    "GetInit",
    
    # Customer Data
    "Loadata",
    "LoadData",
    "LoadCustomer",
    "LoadCustomerInfo",
    "LoadCustomerData",
    "GetCustomer",
    "GetCustomerDetail",
    "LoadDataCustomer",
    
    # Info Tab - Thông Tin
    "LoadInfo",
    "LoadCustomerProfile",
    "LoadProfile",
    "GetInfo",
    "GetProfile",
    "LoadBasicInfo",
    
    # History Tab - Tiền Sử
    "LoadHistory",
    "LoadMedicalHistory",
    "LoadHealthHistory",
    "LoadTienSu",
    "GetHistory",
    "LoadCustomerHistory",
    
    # Consultation Tab - Tư vấn
    "LoadConsultation",
    "LoadTuVan",
    "LoadAdvise",
    "LoadCustCare",
    "LoadCustomerCare",
    "GetConsultation",
    "LoadConsult",
    
    # Diagnosis Tab - Chẩn Đoán
    "LoadDiagnosis",
    "LoadChanDoan",
    "LoadDiag",
    "GetDiagnosis",
    "LoadMedicalDiagnosis",
    
    # Services Tab - Dịch Vụ
    "LoadService",
    "LoadServices",
    "LoadServiceList",
    "LoadDichVu",
    "GetServices",
    "LoadCustomerService",
    "LoadCustomerServices",
    "LoadServiceHistory",
    "LoadDataService",
    "LoadServiceData",
    
    # Treatment Tab - Điều trị
    "LoadTreatment",
    "LoadTreatments",
    "LoadTreatmentList",
    "LoadDieuTri",
    "GetTreatment",
    "LoadCustomerTreatment",
    "LoadTreatmentHistory",
    "LoadProcedure",
    "LoadProcedures",
    
    # Payment Tab - Thanh Toán
    "LoadPayment",
    "LoadPaymentInfo",
    "LoadPaymentHistory",
    "LoadThanhToan",
    "GetPayment",
    "LoadInvoice",
    "LoadReceipt",
    "LoadTransaction",
    "LoadTransactions",
    "LoadPaymentDetail",
    "LoadBill",
    
    # Images Tab - Hình Ảnh
    "LoadImage",
    "LoadImages",
    "LoadImageList",
    "LoadHinhAnh",
    "GetImages",
    "LoadCustomerImages",
    "LoadPhoto",
    "LoadPhotos",
    "LoadGallery",
    "LoadMedia",
    "LoadAttachment",
    "LoadAttachments",
    
    # Installment Tab - Trả Góp
    "LoadInstallment",
    "LoadInstallments",
    "LoadTraGop",
    "LoadDebt",
    "LoadDebtInfo",
    "GetInstallment",
    "LoadLoan",
    "LoadCreditInfo",
    "LoadPaymentPlan",
    
    # Transaction History Tab - Lịch Sử
    "LoadLichSu",
    "LoadTransactionHistory",
    "LoadActivityHistory",
    "LoadLog",
    "LoadLogs",
    "LoadAuditLog",
    
    # Appointments Tab - Lịch Hẹn
    "LoadAppointment",
    "LoadAppointments",
    "LoadAppointmentList",
    "LoadLichHen",
    "GetAppointments",
    "LoadCustomerSchedule",
    "LoadCustomerScheduleNext",
    "LoadSchedule",
    "LoadBooking",
    "LoadNextSchedule",
    "LoadUpcomingAppointments",
    
    # Complaint Tab
    "LoadComplaint",
    "LoadComplaints",
    "LoadComplaintList",
    "GetComplaint",
    "LoadFeedback",
    "LoadCustomerComplaint",
    
    # Additional/Extra
    "LoadStatusExtra",
    "LoadStatus",
    "LoadExtra",
    "LoadExtraInfo",
    "LoadMembership",
    "LoadMembershipInfo",
    "LoadPoints",
    "LoadRewards",
    "LoadVoucher",
    "LoadVouchers",
    "LoadPromotion",
    "LoadDiscount",
    "LoadNote",
    "LoadNotes",
    "LoadComment",
    "LoadComments",
    "LoadRemark",
    "LoadRemarks",
    
    # Prepaid Card - Thẻ trả trước
    "LoadPrepaidCard",
    "LoadPrepaid",
    "LoadCard",
    "LoadCards",
    "LoadTheTraTruoc",
    "LoadCardList",
    
    # Prescription - Đơn thuốc
    "LoadPrescription",
    "LoadDonThuoc",
    "LoadMedicine",
    "LoadMedicines",
    "LoadDrug",
    "LoadDrugs",
    
    # Teeth data (for dental)
    "LoadTeeth",
    "LoadTeethData",
    "LoadDental",
    "LoadDentalChart",
    
    # Actions
    "Save",
    "Update",
    "Create",
    "Delete",
    "Remove",
    
    # Other common patterns
    "GetAll",
    "GetById",
    "GetList",
    "GetDetail",
    "Search",
    "Filter",
    "Export",
    "Print",
    "LoadAll",
    "LoadList",
    "LoadDetail",
    "LoadDataTotal",
    "LoadDataDetail",
    "LoadDataGrid",
    "Refresh",
    "Reload",
]

# Các page liên quan đến Customer Detail
CUSTOMER_PAGES = [
    "/Customer/MainCustomer/",
    "/Customer/CustomerDetail/",
    "/Customer/CustomerProfile/",
    "/Customer/CustomerInfo/",
    "/Customer/CustomerView/",
    "/Customer/ViewCustomer/",
    "/Customer/DetailCustomer/",
]


class CustomerDetailScanner:
    """Scanner cho Customer Detail endpoints"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.results = {
            "scan_date": datetime.now().isoformat(),
            "base_url": BASE_URL,
            "working_handlers": [],
            "non_working_handlers": [],
            "endpoints_with_data": [],
            "endpoints_empty": [],
            "endpoints_need_params": [],
            "detailed_results": []
        }
    
    def decompress(self, data: str) -> Any:
        """Giải nén response base64+gzip"""
        try:
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, -zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except:
            try:
                return json.loads(data)
            except:
                return data
    
    def login(self) -> bool:
        """Đăng nhập và lấy token"""
        try:
            logger.info(f"Logging in as {USERNAME}...")
            resp = self.session.post(f"{BASE_URL}/api/Author/Login", json={
                "username": USERNAME,
                "password": PASSWORD,
                "passwordcrypt": "",
                "from": "",
                "sso": "",
                "ssotoken": ""
            })
            
            if resp.status_code == 200:
                data = resp.json()
                # Token nằm trong key 'Session' không phải 'Token'
                if data.get('Session'):
                    self.token = data['Session']
                    self.session.headers.update({
                        'Authorization': f'Bearer {self.token}'
                    })
                    logger.info(f"✅ Login successful! User: {data.get('FullName')} (ID: {data.get('ID')})")
                    return True
            
            logger.error(f"❌ Login failed: {resp.status_code} - {resp.text[:200]}")
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False
    
    def get_xsrf_token(self, page: str) -> Optional[str]:
        """Lấy XSRF token cho một page"""
        if page in self.xsrf_tokens:
            return self.xsrf_tokens[page]
        
        try:
            resp = self.session.get(f"{BASE_URL}{page}")
            if resp.status_code == 200:
                match = re.search(r'name="__RequestVerificationToken"[^>]*value="([^"]+)"', resp.text)
                if match:
                    self.xsrf_tokens[page] = match.group(1)
                    return self.xsrf_tokens[page]
        except:
            pass
        return None
    
    def call_handler(self, page: str, handler: str, body: dict = None, 
                     customer_id: str = None) -> Dict:
        """Gọi một handler và trả về kết quả chi tiết"""
        url = f"{BASE_URL}{page}?handler={handler}"
        if customer_id:
            url += f"&CustomerID={customer_id}"
        
        result = {
            "page": page,
            "handler": handler,
            "url": url,
            "method": "POST",
            "status_code": None,
            "response_size": 0,
            "content_type": None,
            "has_data": False,
            "data_type": None,
            "data_count": 0,
            "sample_data": None,
            "error": None,
            "working": False
        }
        
        try:
            xsrf = self.get_xsrf_token(page)
            headers = {}
            if xsrf:
                headers['RequestVerificationToken'] = xsrf
            
            resp = self.session.post(url, json=body or {}, headers=headers, timeout=30)
            result["status_code"] = resp.status_code
            result["response_size"] = len(resp.content)
            result["content_type"] = resp.headers.get('Content-Type', '')
            
            if resp.status_code == 200:
                result["working"] = True
                
                # Phân tích response
                content = resp.text.strip()
                
                # Check if HTML (page reload, not actual data)
                if '<html' in content.lower() or '<!DOCTYPE' in content.lower():
                    result["data_type"] = "HTML_PAGE"
                    result["has_data"] = False
                # Check empty responses
                elif content == "" or content == "0" or content == "null":
                    result["data_type"] = "EMPTY"
                    result["has_data"] = False
                    result["sample_data"] = content
                # Check for compressed data
                elif len(content) > 10 and not content.startswith('{') and not content.startswith('['):
                    try:
                        data = self.decompress(content)
                        result["data_type"] = "COMPRESSED_JSON"
                        result["has_data"] = True
                        
                        if isinstance(data, list):
                            result["data_count"] = len(data)
                            result["sample_data"] = data[:2] if len(data) > 0 else None
                        elif isinstance(data, dict):
                            result["data_count"] = len(data.keys())
                            result["sample_data"] = {k: v for k, v in list(data.items())[:5]}
                        else:
                            result["sample_data"] = str(data)[:500]
                    except:
                        result["data_type"] = "UNKNOWN"
                        result["sample_data"] = content[:200]
                # JSON data
                else:
                    try:
                        data = json.loads(content)
                        result["data_type"] = "JSON"
                        result["has_data"] = True
                        
                        if isinstance(data, list):
                            result["data_count"] = len(data)
                            result["sample_data"] = data[:2] if len(data) > 0 else []
                        elif isinstance(data, dict):
                            result["data_count"] = len(data.keys())
                            result["sample_data"] = {k: v for k, v in list(data.items())[:5]}
                    except:
                        result["data_type"] = "STRING"
                        result["sample_data"] = content[:200]
        
        except requests.exceptions.Timeout:
            result["error"] = "TIMEOUT"
        except Exception as e:
            result["error"] = str(e)
        
        return result
    
    def scan_all_handlers(self, customer_id: str = None):
        """Scan tất cả handlers cho Customer Detail pages"""
        logger.info("=" * 60)
        logger.info("SCANNING CUSTOMER DETAIL ENDPOINTS")
        logger.info("=" * 60)
        
        total_handlers = len(CUSTOMER_DETAIL_HANDLERS)
        total_pages = len(CUSTOMER_PAGES)
        
        for page in CUSTOMER_PAGES:
            logger.info(f"\n📄 Scanning page: {page}")
            
            for i, handler in enumerate(CUSTOMER_DETAIL_HANDLERS, 1):
                logger.info(f"  [{i}/{total_handlers}] Testing handler: {handler}")
                
                result = self.call_handler(page, handler, customer_id=customer_id)
                self.results["detailed_results"].append(result)
                
                if result["working"]:
                    if result["has_data"] and result["data_type"] not in ["HTML_PAGE", "EMPTY"]:
                        self.results["working_handlers"].append({
                            "page": page,
                            "handler": handler,
                            "data_type": result["data_type"],
                            "data_count": result["data_count"]
                        })
                        self.results["endpoints_with_data"].append(result)
                        logger.info(f"    ✅ WORKING - {result['data_type']} - {result['data_count']} items")
                    elif result["data_type"] == "EMPTY":
                        self.results["endpoints_empty"].append(result)
                        logger.info(f"    ⚠️ EMPTY RESPONSE")
                    elif result["data_type"] == "HTML_PAGE":
                        logger.info(f"    🔄 HTML PAGE (need different params)")
                else:
                    self.results["non_working_handlers"].append({
                        "page": page,
                        "handler": handler,
                        "error": result["error"]
                    })
                
                time.sleep(0.1)  # Rate limiting
        
        return self.results
    
    def scan_with_params(self, customer_id: str):
        """Scan handlers với CustomerID parameter"""
        logger.info(f"\n📊 Scanning with CustomerID: {customer_id}")
        
        main_page = "/Customer/MainCustomer/"
        
        # Body params có thể dùng với CustomerID
        body_params = [
            {},
            {"CustomerID": customer_id},
            {"customerId": customer_id},
            {"ID": customer_id},
            {"id": customer_id},
        ]
        
        for handler in CUSTOMER_DETAIL_HANDLERS:
            for body in body_params:
                result = self.call_handler(main_page, handler, body=body, customer_id=customer_id)
                
                if result["has_data"] and result["data_type"] not in ["HTML_PAGE", "EMPTY"]:
                    logger.info(f"✅ {handler} with body {body}: {result['data_type']} - {result['data_count']} items")
                    self.results["endpoints_with_data"].append({
                        **result,
                        "body_used": body
                    })
                    break
            
            time.sleep(0.1)
    
    def test_sample_customer(self):
        """Test với một customer ID mẫu"""
        # Customer IDs được mã hóa trong URL, cần tìm từ ListCustomer
        logger.info("\n🔍 Finding sample customer ID...")
        
        # Thử lấy customer list
        xsrf = self.get_xsrf_token("/Customer/ListCustomer/")
        headers = {'RequestVerificationToken': xsrf} if xsrf else {}
        
        today = datetime.now().strftime("%Y-%m-%d")
        body = {
            "dateFrom": "2025-01-01",
            "dateTo": today,
            "branchID": 0,
            "start": 0,
            "length": 10
        }
        
        resp = self.session.post(
            f"{BASE_URL}/Customer/ListCustomer/?handler=LoadData",
            json=body,
            headers=headers
        )
        
        if resp.status_code == 200:
            try:
                data = self.decompress(resp.text)
                if isinstance(data, list) and len(data) > 0:
                    sample_customer = data[0]
                    logger.info(f"Found customer: {sample_customer}")
                    return sample_customer
            except:
                logger.warning("Could not parse customer list")
        
        return None
    
    def generate_report(self):
        """Tạo báo cáo chi tiết"""
        report = []
        report.append("# 🔍 CUSTOMER DETAIL ENDPOINTS DEEP SCAN REPORT")
        report.append(f"\n**Scan Date**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"**Base URL**: {BASE_URL}")
        report.append(f"**User**: {USERNAME}")
        
        report.append("\n## 📊 SUMMARY")
        report.append(f"| Metric | Value |")
        report.append(f"|--------|-------|")
        report.append(f"| Total Handlers Tested | {len(CUSTOMER_DETAIL_HANDLERS)} |")
        report.append(f"| Working Handlers | {len(self.results['working_handlers'])} |")
        report.append(f"| Endpoints with Data | {len(self.results['endpoints_with_data'])} |")
        report.append(f"| Empty Responses | {len(self.results['endpoints_empty'])} |")
        
        report.append("\n## ✅ WORKING ENDPOINTS WITH DATA")
        if self.results['endpoints_with_data']:
            report.append("| Page | Handler | Data Type | Count | Sample |")
            report.append("|------|---------|-----------|-------|--------|")
            for ep in self.results['endpoints_with_data']:
                sample = str(ep.get('sample_data', ''))[:100]
                report.append(f"| {ep['page']} | {ep['handler']} | {ep['data_type']} | {ep['data_count']} | {sample} |")
        else:
            report.append("*No endpoints with data found*")
        
        report.append("\n## ⚠️ EMPTY RESPONSES (May need permissions)")
        if self.results['endpoints_empty']:
            report.append("| Page | Handler | Response |")
            report.append("|------|---------|----------|")
            for ep in self.results['endpoints_empty'][:30]:
                report.append(f"| {ep['page']} | {ep['handler']} | {ep.get('sample_data', 'empty')} |")
        
        report.append("\n## 📌 RECOMMENDED HANDLERS FOR CUSTOMER DETAIL")
        report.append("""
Based on UI tabs visible in the Customer Detail page:

| Tab | Vietnamese | Likely Handler | Status |
|-----|------------|----------------|--------|
| Info | Thông Tin | LoadIni, Loadata | ⚠️ Need test |
| History | Tiền Sử | LoadHistory, LoadMedicalHistory | ⚠️ Need test |
| Consultation | Tư vấn | LoadCustCare, LoadConsultation | ⚠️ Need test |
| Diagnosis | Chẩn Đoán | LoadDiagnosis | ⚠️ Need test |
| Services | Dịch Vụ | LoadService, LoadServiceList | ⚠️ Need test |
| Treatment | Điều trị | LoadTreatment, LoadProcedure | ⚠️ Need test |
| Payment | Thanh Toán | LoadPaymentInfo, LoadTransaction | ⚠️ Need test |
| Images | Hình Ảnh | LoadImages, LoadGallery | ⚠️ Need test |
| Installment | Trả Góp | LoadInstallment, LoadDebt | ⚠️ Need test |
| History | Lịch Sử | LoadTransactionHistory | ⚠️ Need test |
| Appointments | Lịch Hẹn | LoadAppointments, LoadSchedule | ⚠️ Need test |
| Complaint | Complaint | LoadComplaint | ⚠️ Need test |
""")
        
        return "\n".join(report)
    
    def save_results(self):
        """Lưu kết quả"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save JSON
        json_file = OUTPUT_DIR / f"customer_detail_scan_{timestamp}.json"
        with open(json_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, ensure_ascii=False, indent=2, default=str)
        logger.info(f"📁 Saved JSON: {json_file}")
        
        # Save Report
        report = self.generate_report()
        report_file = OUTPUT_DIR / f"customer_detail_report_{timestamp}.md"
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(report)
        logger.info(f"📁 Saved Report: {report_file}")
        
        return json_file, report_file


def main():
    """Main function"""
    scanner = CustomerDetailScanner()
    
    if not scanner.login():
        logger.error("Failed to login. Exiting.")
        return
    
    # Scan all handlers for MainCustomer page
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 1: Scan all handlers without CustomerID")
    logger.info("=" * 60)
    
    scanner.scan_all_handlers()
    
    # Try to get a sample customer
    logger.info("\n" + "=" * 60)
    logger.info("PHASE 2: Try with sample customer ID")
    logger.info("=" * 60)
    
    sample_customer = scanner.test_sample_customer()
    if sample_customer:
        customer_id = sample_customer.get('CustomerID') or sample_customer.get('ID')
        if customer_id:
            scanner.scan_with_params(str(customer_id))
    
    # Save results
    scanner.save_results()
    
    # Print summary
    print("\n" + "=" * 60)
    print("SCAN COMPLETE!")
    print("=" * 60)
    print(f"✅ Working handlers with data: {len(scanner.results['endpoints_with_data'])}")
    print(f"⚠️ Empty responses: {len(scanner.results['endpoints_empty'])}")
    print(f"❌ Non-working: {len(scanner.results['non_working_handlers'])}")


if __name__ == "__main__":
    main()
