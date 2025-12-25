#!/usr/bin/env python3
"""
VTTech Complete Data Exporter
Xuất toàn bộ dữ liệu từ hệ thống VTTech TMTaza ra file

Author: Auto-generated
Date: 2025-12-24

Features:
- Export tất cả master data (services, employees, branches, users, etc.)
- Export dữ liệu theo ngày (revenue, appointments, etc.)
- Export ra CSV và JSON
- Hỗ trợ export từng phần hoặc toàn bộ
"""

import requests
import json
import base64
import zlib
import re
import os
import sys
import csv
import argparse
from datetime import datetime, timedelta
from pathlib import Path

# ============== CONFIG ==============
BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

BASE_DIR = Path(__file__).parent
EXPORT_DIR = BASE_DIR / "data_export"
EXPORT_DIR.mkdir(exist_ok=True)

# ============== HELPER FUNCTIONS ==============

def decompress(data):
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

def save_json(data, filename, directory=None):
    """Lưu dữ liệu ra JSON"""
    if directory:
        output_dir = EXPORT_DIR / directory
        output_dir.mkdir(exist_ok=True)
    else:
        output_dir = EXPORT_DIR
    
    filepath = output_dir / f"{filename}.json"
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"💾 Saved: {filepath}")
    return str(filepath)

def save_csv(data, filename, directory=None):
    """Lưu dữ liệu ra CSV"""
    if not data or not isinstance(data, list) or len(data) == 0:
        return None
    
    if directory:
        output_dir = EXPORT_DIR / directory
        output_dir.mkdir(exist_ok=True)
    else:
        output_dir = EXPORT_DIR
    
    filepath = output_dir / f"{filename}.csv"
    
    # Lấy tất cả keys từ tất cả items
    all_keys = set()
    for item in data:
        if isinstance(item, dict):
            all_keys.update(item.keys())
    
    with open(filepath, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=sorted(all_keys))
        writer.writeheader()
        for item in data:
            if isinstance(item, dict):
                writer.writerow(item)
    
    print(f"📄 Saved: {filepath}")
    return str(filepath)

# ============== API CLIENT ==============

class VTTechExporter:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.token = None
        self.xsrf_tokens = {}
        self.branches = []
        
    def login(self):
        """Đăng nhập"""
        print("🔐 Đang đăng nhập...")
        try:
            resp = self.session.post(
                f"{BASE_URL}/api/Author/Login",
                json={
                    "username": USERNAME,
                    "password": PASSWORD,
                    "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
                },
                timeout=30
            )
            data = resp.json()
            
            if data.get("Session"):
                self.token = data["Session"]
                self.session.cookies.set("WebToken", self.token)
                print(f"✅ Đăng nhập thành công: {data.get('FullName')}")
                return True
        except Exception as e:
            print(f"❌ Lỗi đăng nhập: {e}")
        return False
    
    def init_page(self, page_url):
        """Lấy XSRF token"""
        if page_url in self.xsrf_tokens:
            return True
        try:
            resp = self.session.get(f"{BASE_URL}{page_url}", timeout=30)
            if resp.status_code == 200:
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    self.xsrf_tokens[page_url] = match.group(1)
                    return True
        except:
            pass
        return False
    
    def call_handler(self, page_url, handler, data=None):
        """Gọi handler"""
        try:
            if not self.init_page(page_url):
                return None
            
            resp = self.session.post(
                f"{BASE_URL}{page_url}?handler={handler}",
                data=data or {},
                headers={
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'XSRF-TOKEN': self.xsrf_tokens.get(page_url, ''),
                },
                timeout=120
            )
            
            if resp.status_code == 200 and resp.content:
                return decompress(resp.text)
        except Exception as e:
            print(f"❌ Error {page_url}?handler={handler}: {e}")
        return None
    
    def call_api(self, endpoint, data=None):
        """Gọi API"""
        try:
            resp = self.session.post(
                f"{BASE_URL}{endpoint}",
                json=data or {},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.token}"
                },
                timeout=120
            )
            
            if resp.status_code == 200 and resp.content:
                return decompress(resp.text)
        except Exception as e:
            print(f"❌ Error {endpoint}: {e}")
        return None

    # ==========================================
    # EXPORT FUNCTIONS
    # ==========================================
    
    def export_all_master_data(self):
        """Export tất cả master data"""
        print("\n" + "=" * 60)
        print("📦 EXPORT MASTER DATA")
        print("=" * 60)
        
        result = self.call_api("/api/Home/SessionData", {})
        if not result:
            print("❌ Không thể lấy SessionData")
            return {}
        
        # Mapping tables
        tables = {
            "Table": "branches",
            "Table1": "teeth_data",
            "Table2": "services",
            "Table3": "service_groups",
            "Table4": "employees",
            "Table5": "users",
            "Table6": "cities",
            "Table7": "districts",
            "Table8": "countries",
            "Table9": "wards",
            "Table10": "customer_sources",
        }
        
        today = datetime.now().strftime("%Y%m%d")
        exported = {}
        
        for key, name in tables.items():
            if key in result:
                data = result[key]
                count = len(data)
                
                save_json(data, f"{name}_{today}", "master")
                save_csv(data, f"{name}_{today}", "master")
                
                exported[name] = count
                print(f"  ✅ {name}: {count} records")
                
                if name == 'branches':
                    self.branches = data
        
        print(f"\n📊 Total: {sum(exported.values())} records")
        return exported
    
    def export_branches_full(self):
        """Export chi nhánh với membership"""
        print("\n🏢 Export Branches & Membership...")
        
        result = self.call_handler("/Customer/ListCustomer/", "Initialize", {})
        if result:
            today = datetime.now().strftime("%Y%m%d")
            
            branches = result.get('Branch', [])
            memberships = result.get('Membership', [])
            
            save_json(branches, f"branches_full_{today}", "master")
            save_csv(branches, f"branches_full_{today}", "master")
            save_json(memberships, f"memberships_{today}", "master")
            save_csv(memberships, f"memberships_{today}", "master")
            
            print(f"  ✅ Branches: {len(branches)}")
            print(f"  ✅ Memberships: {len(memberships)}")
            
            self.branches = branches
            return result
        return {}
    
    def export_services_full(self):
        """Export services với type"""
        print("\n💅 Export Services Full...")
        
        today = datetime.now().strftime("%Y%m%d")
        all_data = {}
        
        # Service init data
        result = self.call_handler("/Service/ServiceList/", "LoadInit", {})
        if result:
            if isinstance(result, list):
                all_data['service_init'] = result
                save_json(result, f"service_init_{today}", "services")
        
        # Service types
        result = self.call_handler("/Service/ServiceList/", "LoadataServiceType", {})
        if result and isinstance(result, list):
            all_data['service_types'] = result
            save_json(result, f"service_types_{today}", "services")
            save_csv(result, f"service_types_{today}", "services")
            print(f"  ✅ Service types: {len(result)}")
        
        return all_data
    
    def export_employees_full(self):
        """Export employees với groups"""
        print("\n👨‍💼 Export Employees Full...")
        
        today = datetime.now().strftime("%Y%m%d")
        all_data = {}
        
        # Employee groups
        result = self.call_handler("/Employee/EmployeeList/", "LoadataEmployeeGroup", {})
        if result and isinstance(result, list):
            all_data['employee_groups'] = result
            save_json(result, f"employee_groups_{today}", "employees")
            save_csv(result, f"employee_groups_{today}", "employees")
            print(f"  ✅ Employee groups: {len(result)}")
        
        # Employees
        result = self.call_handler("/Employee/EmployeeList/", "LoadataEmployee", {})
        if result and isinstance(result, list):
            all_data['employees'] = result
            save_json(result, f"employees_full_{today}", "employees")
            save_csv(result, f"employees_full_{today}", "employees")
            print(f"  ✅ Employees: {len(result)}")
        
        return all_data
    
    def export_revenue_by_date(self, date_from, date_to):
        """Export revenue theo khoảng ngày"""
        print(f"\n💰 Export Revenue: {date_from} -> {date_to}")
        
        if not self.branches:
            self.export_branches_full()
        
        today = datetime.now().strftime("%Y%m%d")
        all_revenue = []
        
        for branch in self.branches:
            result = self.call_handler(
                "/Customer/ListCustomer/",
                "LoadDataTotal",
                {
                    'dateFrom': f"{date_from} 00:00:00",
                    'dateTo': f"{date_to} 23:59:59",
                    'branchID': branch['ID']
                }
            )
            
            if result and isinstance(result, list):
                for item in result:
                    item['BranchID'] = branch['ID']
                    item['BranchName'] = branch['Name']
                    item['DateFrom'] = date_from
                    item['DateTo'] = date_to
                all_revenue.extend(result)
                
                paid = result[0].get('Paid', 0) if result else 0
                print(f"  ✅ {branch['Name']}: {paid:,.0f} VND")
        
        if all_revenue:
            save_json(all_revenue, f"revenue_{today}", "revenue")
            save_csv(all_revenue, f"revenue_{today}", "revenue")
            
            total = sum(r.get('Paid', 0) for r in all_revenue)
            print(f"\n  💰 Total Revenue: {total:,.0f} VND")
        
        return all_revenue
    
    def export_daily_revenue(self, date_str):
        """Export revenue cho ngày cụ thể"""
        return self.export_revenue_by_date(date_str, date_str)
    
    def export_all(self, date_from=None, date_to=None):
        """Export tất cả dữ liệu"""
        print("\n" + "=" * 60)
        print("🚀 VTTECH FULL DATA EXPORT")
        print("=" * 60)
        
        if not self.login():
            return {"error": "Login failed"}
        
        results = {}
        
        # Master data
        results['master'] = self.export_all_master_data()
        results['branches'] = self.export_branches_full()
        results['services'] = self.export_services_full()
        results['employees'] = self.export_employees_full()
        
        # Daily data
        if not date_from:
            date_from = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not date_to:
            date_to = datetime.now().strftime("%Y-%m-%d")
        
        results['revenue'] = self.export_revenue_by_date(date_from, date_to)
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 EXPORT SUMMARY")
        print("=" * 60)
        
        total_records = 0
        for key, value in results.items():
            if isinstance(value, dict):
                count = sum(v if isinstance(v, int) else len(v) for v in value.values() if isinstance(v, (int, list)))
            elif isinstance(value, list):
                count = len(value)
            else:
                count = 0
            total_records += count
            print(f"  📁 {key}: {count} records")
        
        print(f"\n  📈 Total: {total_records} records")
        print(f"  📂 Output: {EXPORT_DIR}")
        print("=" * 60)
        print("✅ Export completed!")
        
        return results


# ============== MAIN ==============

def main():
    parser = argparse.ArgumentParser(description='VTTech Data Exporter')
    parser.add_argument('--master', action='store_true', help='Export master data only')
    parser.add_argument('--revenue', action='store_true', help='Export revenue only')
    parser.add_argument('--date', type=str, help='Date for revenue (YYYY-MM-DD)')
    parser.add_argument('--date-from', type=str, help='Start date (YYYY-MM-DD)')
    parser.add_argument('--date-to', type=str, help='End date (YYYY-MM-DD)')
    args = parser.parse_args()
    
    exporter = VTTechExporter()
    
    if not exporter.login():
        print("❌ Cannot login!")
        return
    
    if args.master:
        exporter.export_all_master_data()
        exporter.export_branches_full()
        exporter.export_services_full()
        exporter.export_employees_full()
    elif args.revenue:
        date_from = args.date_from or args.date or (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        date_to = args.date_to or args.date or datetime.now().strftime("%Y-%m-%d")
        exporter.export_branches_full()
        exporter.export_revenue_by_date(date_from, date_to)
    else:
        exporter.export_all(args.date_from, args.date_to)


if __name__ == "__main__":
    main()
