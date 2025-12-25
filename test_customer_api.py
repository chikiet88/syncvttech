#!/usr/bin/env python3
"""
VTTech Customer API Crawler
Crawl dữ liệu khách hàng từ webapp TMTaza
"""

import requests
import json
import base64
import zlib
import re
import os
from datetime import datetime, timedelta

BASE_URL = "https://tmtaza.vttechsolution.com"

class VTTechCustomerCrawler:
    def __init__(self, username="ittest123", password="ittest123"):
        self.session = requests.Session()
        self.username = username
        self.password = password
        self.token = None
        self.xsrf_token = None
        self.output_dir = "data_output"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def decompress(self, data):
        """Giải nén response base64+gzip"""
        try:
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except:
            try:
                return json.loads(data)
            except:
                return data
    
    def login(self):
        """Đăng nhập và lấy token"""
        print("🔐 Đang đăng nhập...")
        resp = self.session.post(
            f"{BASE_URL}/api/Author/Login",
            json={
                "username": self.username,
                "password": self.password,
                "passwordcrypt": "",
                "from": "",
                "sso": "",
                "ssotoken": ""
            }
        )
        data = resp.json()
        self.token = data.get("Session")
        self.session.cookies.set("WebToken", self.token)
        print(f"✅ Đăng nhập thành công: {data.get('FullName')}")
        return True
    
    def init_page(self, page_url):
        """Khởi tạo trang và lấy XSRF token"""
        resp = self.session.get(f"{BASE_URL}{page_url}")
        if resp.status_code == 200:
            # Tìm XSRF token từ hidden input
            match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
            if match:
                self.xsrf_token = match.group(1)
                return True
        return False
    
    def call_handler(self, page_url, handler, data):
        """Gọi handler với XSRF token"""
        resp = self.session.post(
            f"{BASE_URL}{page_url}?handler={handler}",
            data=data,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest',
                'XSRF-TOKEN': self.xsrf_token or '',
                'Accept': '*/*',
                'Origin': BASE_URL,
                'Referer': f'{BASE_URL}{page_url}'
            }
        )
        if resp.status_code == 200 and resp.content:
            return self.decompress(resp.text)
        return None
    
    def get_initialize(self, page_url="/Customer/ListCustomer/"):
        """Lấy dữ liệu khởi tạo (Branch, Membership, etc.)"""
        self.init_page(page_url)
        return self.call_handler(page_url, "Initialize", {})
    
    def get_customer_total(self, date_from, date_to, branch_id=0):
        """Lấy tổng hợp khách hàng"""
        self.init_page("/Customer/ListCustomer/")
        return self.call_handler(
            "/Customer/ListCustomer/",
            "LoadDataTotal",
            {
                'dateFrom': date_from,
                'dateTo': date_to,
                'branchID': branch_id
            }
        )
    
    def get_customer_list(self, date_from, date_to, branch_id=0, start=0, length=100):
        """Lấy danh sách khách hàng"""
        self.init_page("/Customer/ListCustomer/")
        return self.call_handler(
            "/Customer/ListCustomer/",
            "LoadData",
            {
                'dateFrom': date_from,
                'dateTo': date_to,
                'branchID': branch_id,
                'start': start,
                'length': length
            }
        )
    
    def save_json(self, data, filename):
        """Lưu dữ liệu ra file JSON"""
        filepath = os.path.join(self.output_dir, f"{filename}.json")
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"💾 Đã lưu: {filepath}")
        return filepath


def main():
    print("=" * 60)
    print("🚀 VTTech Customer API Crawler")
    print("=" * 60)
    
    crawler = VTTechCustomerCrawler()
    crawler.login()
    
    # Lấy dữ liệu khởi tạo (Branch, Membership)
    print("\n📋 Đang lấy dữ liệu khởi tạo...")
    init_data = crawler.get_initialize()
    if init_data:
        print(f"✅ Branches: {len(init_data.get('Branch', []))} chi nhánh")
        print(f"✅ Memberships: {len(init_data.get('Membership', []))} loại")
        crawler.save_json(init_data, "customer_init_data")
    
    # Lấy dữ liệu tháng này
    today = datetime.now()
    date_from = today.replace(day=1).strftime("%Y-%m-%d 00:00:00")
    date_to = today.strftime("%Y-%m-%d 23:59:59")
    
    print(f"\n📅 Khoảng ngày: {date_from} - {date_to}")
    
    # Lấy tổng hợp theo từng chi nhánh
    print("\n📊 Đang lấy tổng hợp khách hàng theo chi nhánh...")
    all_totals = []
    
    if init_data and 'Branch' in init_data:
        for branch in init_data['Branch']:
            total = crawler.get_customer_total(date_from, date_to, branch['ID'])
            if total:
                for t in total:
                    t['BranchID'] = branch['ID']
                    t['BranchName'] = branch['Name']
                all_totals.extend(total)
                print(f"  ✅ {branch['Name']}: Paid={total[0].get('Paid', 0)}")
    
    if all_totals:
        crawler.save_json(all_totals, f"customer_totals_by_branch_{today.strftime('%Y%m%d')}")
    
    # Lấy danh sách khách hàng (tất cả chi nhánh)
    print("\n👥 Đang lấy danh sách khách hàng...")
    customers = crawler.get_customer_list(date_from, date_to, length=1000)
    if customers and isinstance(customers, list) and len(customers) > 0:
        print(f"✅ Số khách hàng: {len(customers)}")
        crawler.save_json(customers, f"customer_list_{today.strftime('%Y%m%d')}")
    else:
        print("   Không có dữ liệu khách hàng mới trong khoảng ngày này")
        
        # Thử với khoảng ngày rộng hơn
        print("\n   Thử với 3 tháng gần nhất...")
        date_from_3m = (today - timedelta(days=90)).strftime("%Y-%m-%d 00:00:00")
        customers = crawler.get_customer_list(date_from_3m, date_to, length=1000)
        if customers and isinstance(customers, list) and len(customers) > 0:
            print(f"✅ Số khách hàng (3 tháng): {len(customers)}")
            crawler.save_json(customers, f"customer_list_3months_{today.strftime('%Y%m%d')}")
    
    print("\n" + "=" * 60)
    print("✅ Hoàn tất!")
    print("=" * 60)


if __name__ == "__main__":
    main()
