#!/usr/bin/env python3
"""
VTTech Customer Detail Sync Script
Sử dụng cookies từ browser để sync dữ liệu customer detail

Cách lấy cookies:
1. Đăng nhập vào https://tmtaza.vttechsolution.com với tài khoản có quyền
2. Mở DevTools (F12) -> Application -> Cookies
3. Copy giá trị WebToken và XSRF-TOKEN
4. Hoặc export cookies.txt từ browser
"""

import requests
import json
import base64
import zlib
import re
import os
from datetime import datetime
from pathlib import Path

BASE_URL = 'https://tmtaza.vttechsolution.com'
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / 'data_sync' / 'customer_detail'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ============== CONFIGURATION ==============
USERNAME = os.environ.get('VTTECH_USERNAME', 'ittest123')
PASSWORD = os.environ.get('VTTECH_PASSWORD', 'ittest123')


def decompress(data: str):
    """Giải nén response base64+gzip"""
    try:
        data = data.strip('"')
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        try:
            return json.loads(data)
        except:
            return data


class CustomerDetailSync:
    def __init__(self, web_token=None, username=None, password=None):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            'Accept': '*/*',
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': BASE_URL,
        })
        
        self.token = None
        self.xsrf_token = None
        
        if web_token:
            self.token = web_token
            self.session.cookies.set('WebToken', web_token)
            print(f'✅ Using provided WebToken')
        elif username and password:
            self._login(username, password)
    
    def _login(self, username, password):
        """Đăng nhập và lấy token"""
        resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
            'username': username,
            'password': password,
            'passwordcrypt': '',
            'from': '',
            'sso': '',
            'ssotoken': ''
        })
        data = resp.json()
        
        if data.get('Session'):
            self.token = data['Session']
            self.session.cookies.set('WebToken', self.token)
            print(f'✅ Login: {data.get("FullName")} (ID: {data.get("ID")})')
            return True
        else:
            print(f'❌ Login failed: {data.get("RESULT")}')
            return False
    
    def _get_xsrf_token(self, page_url=None):
        """Lấy XSRF token từ Customer page"""
        # Phải GET trang Customer trước để khởi tạo session đúng cách
        resp = self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID=1')
        if resp.status_code == 200:
            match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
            if match:
                return match.group(1)
        return None
    
    def call_handler(self, page_url, handler, extra_data=None):
        """Gọi handler endpoint"""
        # Lấy XSRF token nếu chưa có
        if not self.xsrf_token:
            self.xsrf_token = self._get_xsrf_token('/Customer/MainCustomer?CustomerID=1')
        
        data = {}
        if extra_data:
            data.update(extra_data)
        
        resp = self.session.post(
            f'{BASE_URL}{page_url}?handler={handler}',
            data=data,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'xsrf-token': self.xsrf_token or '',
            }
        )
        
        if resp.status_code == 200 and not resp.text.startswith('<!DOCTYPE'):
            return decompress(resp.text)
        return None
    
    def sync_all_endpoints(self):
        """Sync tất cả customer detail endpoints"""
        print('\n' + '='*60)
        print('🔄 SYNCING CUSTOMER DETAIL DATA')
        print('='*60)
        
        endpoints = {
            # Tab Dịch vụ
            'service_initialize': ('/Customer/Service/TabList/TabList_Service/', 'LoadInitialize'),
            'service_tab': ('/Customer/Service/TabList/TabList_Service/', 'LoadataTab'),
            'service_list': ('/Customer/Service/TabList/TabList_Service/', 'LoadServiceTab'),
            'treatment_plant': ('/Customer/Service/TabList/TabList_Service/', 'LoadInfo_Treatment_Plant'),
            
            # Tab Điều trị
            'treatment_combo': ('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadComboMain'),
            'treatment_list': ('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadataTreatment'),
            
            # Thanh toán
            'payment': ('/Customer/Payment/PaymentList/PaymentList_Service/', 'LoadataPayment'),
            
            # Hình ảnh
            'image_folder': ('/Customer/CustomerImage/', 'LoadImageByFolder'),
            'image_template': ('/Customer/CustomerImage/', 'LoadTemplateForm'),
            
            # Trả góp
            'installment': ('/Customer/Installment/InstallmentList/', 'LoadDetail'),
            
            # Lịch sử
            'history': ('/Customer/History/HistoryList_Care/', 'LoadataHistory'),
            
            # Lịch hẹn
            'appointment_combo': ('/Appointment/AppointmentByDay/', 'LoadCombo'),
            'schedule': ('/Customer/ScheduleList_Schedule/', 'Loadata'),
            
            # Complaint
            'complaint': ('/Customer/ComplaintList/', 'Loadata'),
        }
        
        results = {}
        today = datetime.now().strftime('%Y%m%d')
        
        for name, (page, handler) in endpoints.items():
            print(f'\n📥 Syncing {name}...')
            data = self.call_handler(page, handler)
            
            if data is not None:
                results[name] = data
                
                # Count records
                if isinstance(data, list):
                    count = len(data)
                elif isinstance(data, dict):
                    count = sum(len(v) if isinstance(v, list) else 1 for v in data.values())
                else:
                    count = 1
                
                print(f'   ✅ {name}: {count} records')
                
                # Save individual file
                filepath = OUTPUT_DIR / f'{name}_{today}.json'
                with open(filepath, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
            else:
                print(f'   ❌ {name}: Failed')
        
        # Save combined file
        combined_file = OUTPUT_DIR / f'all_customer_detail_{today}.json'
        with open(combined_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        
        print(f'\n💾 Saved all data to {OUTPUT_DIR}')
        return results


def main():
    sync = CustomerDetailSync(username=USERNAME, password=PASSWORD)
    sync.sync_all_endpoints()


if __name__ == '__main__':
    main()
