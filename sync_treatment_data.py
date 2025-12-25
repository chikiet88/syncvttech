#!/usr/bin/env python3
"""
Sync Treatment Data từ VTTech TMTaza
Tác giả: GitHub Copilot
Ngày: 25/12/2024

Endpoints đã phát hiện:
- LoadComboMain: ServiceTab, ServiceCatTab, PatientRecord, TreatmentPlan
- LoadDetail: Chi tiết treatment với BS, PT, Tech assignments
- LoadPaymentInfo: Thông tin thanh toán
- LoadIni: Master data (Employees, Tele)
"""

import requests
import json
import base64
import zlib
import re
import os
from datetime import datetime
from typing import Optional, Dict, Any, List

BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

class TreatmentSyncer:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        })
        self.token = None
        self.xsrf = None
        self.output_dir = 'data_sync/treatments'
        os.makedirs(self.output_dir, exist_ok=True)
        
    def decompress_response(self, data: str) -> Any:
        """Decompress Base64 + GZip response"""
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
            
    def login(self) -> bool:
        """Login và lấy token"""
        try:
            resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
                'username': USERNAME,
                'password': PASSWORD,
                'passwordcrypt': '',
                'from': '',
                'sso': '',
                'ssotoken': ''
            })
            login_data = resp.json()
            
            if 'Session' in login_data:
                self.token = login_data['Session']
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                print(f'✓ Login thành công: {USERNAME}')
                return True
            else:
                print(f'✗ Login thất bại: {login_data}')
                return False
        except Exception as e:
            print(f'✗ Login error: {e}')
            return False
            
    def get_xsrf_token(self) -> bool:
        """Lấy XSRF token từ ListCustomer page"""
        try:
            resp = self.session.get(f'{BASE_URL}/Customer/ListCustomer/')
            match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>\"]+)', resp.text)
            if match:
                self.xsrf = match.group(1)
                print(f'✓ XSRF token: {self.xsrf[:50]}...')
                return True
            print('✗ Không tìm thấy XSRF token')
            return False
        except Exception as e:
            print(f'✗ XSRF error: {e}')
            return False
            
    def call_handler(self, path: str, handler: str, customer_id: str = None, extra_data: dict = None) -> Any:
        """Gọi handler endpoint"""
        url = f'{BASE_URL}{path}?handler={handler}'
        if customer_id:
            url += f'&CustomerID={customer_id}'
            
        data = {'__RequestVerificationToken': self.xsrf}
        if extra_data:
            data.update(extra_data)
            
        resp = self.session.post(url, data=data)
        
        if resp.status_code == 200:
            return self.decompress_response(resp.text)
        return None
        
    def get_treatment_combo(self, customer_id: str) -> Dict:
        """Lấy Treatment Combo data (ServiceTab, ServiceCatTab)"""
        return self.call_handler(
            '/Customer/Treatment/TreatmentList/TreatmentList_Service/',
            'LoadComboMain',
            customer_id
        )
        
    def get_treatment_detail(self, customer_id: str) -> Dict:
        """Lấy Treatment Detail"""
        return self.call_handler(
            '/Customer/Treatment/TreatmentList/TreatmentList_Service/',
            'LoadDetail',
            customer_id
        )
        
    def get_payment_info(self, customer_id: str) -> Dict:
        """Lấy Payment Info"""
        return self.call_handler(
            '/Customer/MainCustomer/',
            'LoadPaymentInfo',
            customer_id
        )
        
    def get_master_data(self, customer_id: str = None) -> Dict:
        """Lấy Master data (Employees, Tele)"""
        return self.call_handler(
            '/Customer/MainCustomer/',
            'LoadIni',
            customer_id
        )
        
    def sync_customer_treatment(self, customer_id: str) -> Dict:
        """Sync toàn bộ Treatment data cho 1 customer"""
        print(f'\n{"="*60}')
        print(f'Syncing Treatment for CustomerID: {customer_id}')
        print('='*60)
        
        result = {
            'customer_id': customer_id,
            'synced_at': datetime.now().isoformat(),
            'combo': None,
            'detail': None,
            'payment': None
        }
        
        # 1. Treatment Combo
        print('\n1. LoadComboMain...')
        combo = self.get_treatment_combo(customer_id)
        if combo:
            result['combo'] = combo
            print(f'   ✓ ServiceTab: {len(combo.get("ServiceTab", []))} items')
            print(f'   ✓ ServiceCatTab: {len(combo.get("ServiceCatTab", []))} items')
            print(f'   ✓ PatientRecord: {len(combo.get("PatientRecord", []))} items')
            print(f'   ✓ TreatmentPlan: {len(combo.get("TreatmentPlan", []))} items')
        else:
            print('   ✗ Không có data')
            
        # 2. Treatment Detail
        print('\n2. LoadDetail...')
        detail = self.get_treatment_detail(customer_id)
        if detail:
            result['detail'] = detail
            if isinstance(detail, dict):
                for key, val in detail.items():
                    if isinstance(val, list):
                        print(f'   ✓ {key}: {len(val)} items')
        else:
            print('   ✗ Không có data')
            
        # 3. Payment Info
        print('\n3. LoadPaymentInfo...')
        payment = self.get_payment_info(customer_id)
        if payment:
            result['payment'] = payment
            if isinstance(payment, list) and len(payment) > 0:
                p = payment[0]
                print(f'   ✓ PRICE_DISCOUNTED: {p.get("PRICE_DISCOUNTED", 0):,.0f}')
                print(f'   ✓ PAID: {p.get("PAID", 0):,.0f}')
                print(f'   ✓ PRICE_TREAT: {p.get("PRICE_TREAT", 0):,.0f}')
        else:
            print('   ✗ Không có data')
            
        return result
        
    def sync_batch(self, customer_ids: List[str]) -> List[Dict]:
        """Sync nhiều customers"""
        results = []
        for cid in customer_ids:
            result = self.sync_customer_treatment(cid)
            results.append(result)
        return results
        
    def save_results(self, data: Any, filename: str):
        """Lưu kết quả ra file"""
        filepath = os.path.join(self.output_dir, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f'\n✓ Đã lưu: {filepath}')
        
    def run_demo(self):
        """Demo sync với CustomerID 30056"""
        if not self.login():
            return
        if not self.get_xsrf_token():
            return
            
        # Demo với customer 30056
        customer_id = '30056'
        
        # Sync treatment
        result = self.sync_customer_treatment(customer_id)
        
        # Lưu kết quả
        date_str = datetime.now().strftime('%Y%m%d')
        self.save_results(result, f'treatment_{customer_id}_{date_str}.json')
        
        # Summary
        print('\n' + '='*60)
        print('SUMMARY')
        print('='*60)
        print(f'''
Customer ID: {customer_id}

Treatment Services:
''')
        if result['combo'] and result['combo'].get('ServiceTab'):
            for svc in result['combo']['ServiceTab']:
                print(f"  - [{svc['ID']}] {svc['Name']}")
                
        print(f'''
Payment Summary:
''')
        if result['payment'] and len(result['payment']) > 0:
            p = result['payment'][0]
            print(f"  Giá sau giảm: {p.get('PRICE_DISCOUNTED', 0):,.0f} VND")
            print(f"  Đã thanh toán: {p.get('PAID', 0):,.0f} VND")
            print(f"  Giá điều trị: {p.get('PRICE_TREAT', 0):,.0f} VND")
            print(f"  Số điện thoại: {p.get('PHONE', 'N/A')}")


def main():
    syncer = TreatmentSyncer()
    syncer.run_demo()


if __name__ == '__main__':
    main()
