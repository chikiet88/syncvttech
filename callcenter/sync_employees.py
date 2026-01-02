#!/usr/bin/env python3
"""
Sync nhân viên Call Center từ VTTech API
Endpoints:
  - /Marketing/TicketExtensionList/?handler=LoadData  (Danh sách Extension)
  - /Marketing/TicketGroupList/?handler=LoadData      (Nhóm nhân viên - Extension)
"""

import requests
import json
import base64
import zlib
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

# Add parent to path
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from callcenter.repository import repo
from callcenter.init_callcenter_db import init_callcenter_database, migrate_database

# Config
BASE_URL = "https://tmtaza.vttechsolution.com"
LOGIN_URL = f"{BASE_URL}/api/Author/Login"
COOKIES_FILE = Path(__file__).parent.parent / "cookies.txt"

# Credentials
CREDENTIALS = {
    "username": "ittest123",
    "password": "ittest123",
    "passwordcrypt": "",
    "from": "",
    "sso": "",
    "ssotoken": ""
}

# Data export path
DATA_OUTPUT = Path(__file__).parent.parent / "data_output"


class VTTechEmployeeSync:
    """Sync nhân viên Call Center từ VTTech"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False
        self.base_url = BASE_URL
        self.token = None
        self._login()
    
    def _login(self):
        """Đăng nhập và lấy Bearer token"""
        print("🔐 Đang đăng nhập VTTech...")
        
        try:
            response = self.session.post(
                LOGIN_URL,
                json=CREDENTIALS,
                headers={"Content-Type": "application/json"}
            )
            
            result = response.json()
            
            if result.get("Session"):
                self.token = result["Session"]
                print(f"✅ Đăng nhập thành công! User: {result.get('UserName')}")
                return True
            else:
                print(f"❌ Đăng nhập thất bại: {result.get('RESULT')}")
                return False
        except Exception as e:
            print(f"❌ Lỗi đăng nhập: {e}")
            return False
    
    def _decompress_response(self, data):
        """Giải nén response từ VTTech (base64 + gzip)"""
        try:
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return decompressed.decode('utf-8')
        except:
            return data
    
    def _get_headers(self):
        """Tạo headers cho API request"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def fetch_employees_from_session(self) -> List[Dict]:
        """
        Lấy danh sách nhân viên từ SessionData API (Table4)
        API này hoạt động ổn định với Bearer token
        
        NOTE: SessionData không chứa Extension - chỉ có thông tin cơ bản của employee
        """
        print("\n👥 Fetching Employees từ SessionData API...")
        
        result = self._call_api("/api/Home/SessionData")
        
        if result:
            # SessionData trả về dict với Tables: Table, Table1, ..., Table10
            # Table4 chứa danh sách nhân viên (~1620 records)
            
            # Table4 là Employee - kiểm tra cấu trúc
            if 'Table4' in result:
                table4 = result['Table4']
                if isinstance(table4, list) and len(table4) > 0:
                    # Check structure
                    sample = table4[0]
                    if 'ID' in sample and 'Name' in sample:
                        print(f"✅ Found employees in Table4: {len(table4)} records")
                        print(f"   Sample keys: {list(sample.keys())[:10]}")
                        return table4
            
            # Fallback: tìm table chứa employee data
            for i in range(11):
                table_key = f"Table{i}"
                if table_key in result:
                    table = result[table_key]
                    if isinstance(table, list) and len(table) > 0:
                        sample = table[0]
                        # Employee table có ID, Name, State, và không có Code (service có Code)
                        if 'ID' in sample and 'Name' in sample and 'State' in sample and 'Code' not in sample:
                            print(f"✅ Found employees in {table_key}: {len(table)} records")
                            return table
        
        print("⚠️ Không thể lấy SessionData")
        return []

    def _call_api(self, endpoint: str, data: dict = None) -> Optional[any]:
        """
        Gọi API VTTech với Bearer token
        """
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = self.session.post(
                url,
                json=data or {},
                headers=self._get_headers()
            )
            
            if response.status_code == 200:
                content = response.text
                # Thử giải nén nếu cần
                try:
                    decompressed = self._decompress_response(content)
                    return json.loads(decompressed)
                except:
                    try:
                        return json.loads(content)
                    except:
                        return content
            else:
                print(f"❌ API Error: {response.status_code} - {response.text[:200]}")
                return None
                
        except Exception as e:
            print(f"❌ Error calling API: {e}")
            return None
    
    def _get_xsrf_token(self, page_url: str) -> Optional[str]:
        """
        Lấy XSRF token từ HTML page
        Token nằm trong: <input name=__RequestVerificationToken value=...>
        """
        try:
            resp = self.session.get(
                f"{self.base_url}{page_url}",
                headers=self._get_headers()
            )
            if resp.status_code == 200:
                # Parse token from HTML
                match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
                if match:
                    token = match.group(1)
                    # Remove quotes if any
                    token = token.strip('"\'')
                    print(f"   🔑 Got XSRF token: {token[:20]}...")
                    return token
            return None
        except Exception as e:
            print(f"❌ Error getting XSRF token: {e}")
            return None
    
    def _call_page_api(self, page_url: str, handler: str = "LoadData") -> Optional[any]:
        """
        Gọi API dạng Page Handler với XSRF token
        Giống cách sync_customer_detail.py hoạt động
        """
        # Step 1: GET page để lấy XSRF token từ HTML
        xsrf_token = self._get_xsrf_token(page_url)
        
        if not xsrf_token:
            print(f"⚠️ Không lấy được XSRF token từ {page_url}")
            # Thử fallback lấy từ trang khác
            xsrf_token = self._get_xsrf_token("/Customer/MainCustomer?CustomerID=1")
        
        # Step 2: POST với xsrf-token header và form-urlencoded
        headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json, text/plain, */*',
            'X-Requested-With': 'XMLHttpRequest',
            'xsrf-token': xsrf_token or '',
            'Authorization': f'Bearer {self.token}'
        }
        
        data_url = f"{self.base_url}{page_url}?handler={handler}"
        
        try:
            # POST với form data rỗng
            response = self.session.post(data_url, headers=headers, data={})
            
            if response.status_code == 200:
                content = response.text
                # Kiểm tra nếu trả về HTML (lỗi)
                if content.strip().startswith('<!DOCTYPE') or content.strip().startswith('<html'):
                    print(f"⚠️ Response là HTML, không phải JSON")
                    return None
                    
                try:
                    decompressed = self._decompress_response(content)
                    return json.loads(decompressed)
                except:
                    try:
                        return json.loads(content)
                    except:
                        return content
            else:
                print(f"❌ Page API Error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Error calling Page API: {e}")
            return None
    
    def fetch_extension_list(self) -> List[Dict]:
        """
        Lấy danh sách Extension từ VTTech
        Endpoint: /Marketing/TicketExtensionList/?handler=LoadData
        
        NOTE: API này yêu cầu antiforgery token từ web session
        """
        print("\n📞 Fetching Extension List...")
        page_path = "/Marketing/TicketExtensionList/"
        
        # Thử với Page API (có XSRF token)
        result = self._call_page_api(page_path, "LoadData")
        
        if result:
            print(f"✅ TicketExtensionList response: {type(result)}")
            
            # Parse response
            if isinstance(result, list):
                return result
            elif isinstance(result, dict):
                for key in ['data', 'Data', 'items', 'Items', 'records', 'Table']:
                    if key in result and isinstance(result[key], list):
                        return result[key]
                return [result]
        
        # Fallback: Log warning và trả về empty
        print("⚠️ Không thể lấy Extension List (cần web session)")
        return []
    
    def fetch_ticket_groups(self) -> List[Dict]:
        """
        Lấy danh sách TicketGroup (nhóm nhân viên với Extension) từ VTTech
        Endpoint: /Marketing/TicketGroupList/?handler=LoadData
        
        NOTE: API này yêu cầu antiforgery token từ web session
        """
        print("\n👥 Fetching Ticket Groups (Nhân viên - Extension)...")
        page_path = "/Marketing/TicketGroupList/"
        
        # Thử với Page API (có XSRF token)
        result = self._call_page_api(page_path, "LoadData")
        
        if result:
            print(f"✅ TicketGroupList response: {type(result)}")
            
            # Parse response - có thể là list hoặc dict
            if isinstance(result, list):
                return result
            elif isinstance(result, dict):
                # Thử các key phổ biến
                for key in ['data', 'Data', 'items', 'Items', 'records', 'Table']:
                    if key in result and isinstance(result[key], list):
                        return result[key]
                return [result]  # Trả về như single item
        
        # Fallback: Log warning và trả về empty
        print("⚠️ Không thể lấy TicketGroupList (cần web session)")
        return []
    
    def parse_employee_from_group(self, group_data: Dict) -> List[Dict]:
        """
        Parse thông tin nhân viên từ TicketGroup data
        Mỗi group có thể chứa nhiều members/employees
        """
        employees = []
        
        # Kiểm tra nếu group_data chứa danh sách members
        members = group_data.get('Members') or group_data.get('members') or []
        if members:
            for member in members:
                emp = {
                    'vttech_id': member.get('Id') or member.get('EmployeeId'),
                    'name': member.get('Name') or member.get('EmployeeName'),
                    'code': member.get('Code') or member.get('EmployeeCode'),
                    'email': member.get('Email'),
                    'phone': member.get('Phone') or member.get('Mobile'),
                    'extension': member.get('Extension') or member.get('Ext'),
                    'group_id': group_data.get('Id'),
                    'group_name': group_data.get('Name') or group_data.get('GroupName'),
                    'department': member.get('Department') or group_data.get('Department'),
                    'position': member.get('Position'),
                    'is_active': member.get('IsActive', True),
                    'raw_data': member
                }
                employees.append(emp)
        else:
            # Nếu không có members, có thể group_data chính là employee
            if group_data.get('Extension') or group_data.get('Ext'):
                emp = {
                    'vttech_id': group_data.get('Id') or group_data.get('EmployeeId'),
                    'name': group_data.get('Name') or group_data.get('EmployeeName'),
                    'code': group_data.get('Code'),
                    'email': group_data.get('Email'),
                    'phone': group_data.get('Phone') or group_data.get('Mobile'),
                    'extension': group_data.get('Extension') or group_data.get('Ext'),
                    'group_id': group_data.get('GroupId'),
                    'group_name': group_data.get('GroupName'),
                    'department': group_data.get('Department'),
                    'position': group_data.get('Position'),
                    'is_active': group_data.get('IsActive', True),
                    'raw_data': group_data
                }
                employees.append(emp)
        
        return employees
    
    def sync_employees(self) -> Dict:
        """
        Sync tất cả nhân viên từ TicketGroupList
        """
        print("\n" + "="*60)
        print("🔄 SYNC NHÂN VIÊN CALL CENTER TỪ VTTECH")
        print("="*60)
        
        # Fetch groups
        groups = self.fetch_ticket_groups()
        print(f"📥 Fetched {len(groups)} groups/records")
        
        if not groups:
            print("⚠️ Không có dữ liệu")
            return {'success': 0, 'failed': 0, 'total': 0}
        
        # Parse employees from groups
        all_employees = []
        for group in groups:
            employees = self.parse_employee_from_group(group)
            all_employees.extend(employees)
            
            # Debug: print raw data
            print(f"  Group: {group.get('Name', 'N/A')} - {len(employees)} employees")
            if employees:
                for emp in employees:
                    print(f"    - {emp.get('name')} (Ext: {emp.get('extension')})")
        
        print(f"\n📊 Total employees parsed: {len(all_employees)}")
        
        # Save to database
        if all_employees:
            result = repo.upsert_employees_batch(all_employees)
            print(f"✅ Saved: {result['success']} | Failed: {result['failed']}")
            return {
                'success': result['success'],
                'failed': result['failed'],
                'total': len(all_employees)
            }
        
        return {'success': 0, 'failed': 0, 'total': 0}
    
    def get_session_data_employees(self) -> List[Dict]:
        """
        Thử lấy nhân viên từ SessionData nếu TicketGroupList không có
        """
        url = f"{self.base_url}/api/Home/SessionData"
        
        try:
            response = self.session.get(url)
            if response.status_code == 200:
                data = response.json()
                
                # SessionData có thể chứa Users/Employees
                employees = []
                
                for key in ['Users', 'Employees', 'Staff', 'Table']:
                    if key in data and isinstance(data[key], list):
                        for item in data[key]:
                            if item.get('Extension') or item.get('Ext'):
                                emp = {
                                    'vttech_id': item.get('Id'),
                                    'name': item.get('Name') or item.get('FullName'),
                                    'code': item.get('Code'),
                                    'email': item.get('Email'),
                                    'phone': item.get('Phone'),
                                    'extension': item.get('Extension') or item.get('Ext'),
                                    'group_name': item.get('GroupName') or item.get('Department'),
                                    'is_active': True,
                                    'raw_data': item
                                }
                                employees.append(emp)
                
                return employees
        except Exception as e:
            print(f"❌ Error: {e}")
        
        return []
    
    def sync_extensions(self) -> Dict:
        """
        Sync danh sách Extension từ TicketExtensionList
        Lưu vào file JSON và database
        """
        print("\n" + "="*60)
        print("📞 SYNC DANH SÁCH EXTENSION TỪ VTTECH")
        print("="*60)
        
        extensions = self.fetch_extension_list()
        print(f"📥 Fetched {len(extensions)} extensions")
        
        if extensions:
            # Save to JSON file
            DATA_OUTPUT.mkdir(parents=True, exist_ok=True)
            output_file = DATA_OUTPUT / "extensions.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(extensions, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved to {output_file}")
            
            # Save to database
            result = repo.upsert_extensions_batch(extensions)
            print(f"💾 Database: {result['success']} saved, {result['failed']} failed")
            
            # Debug: show sample data
            print("\n📋 Sample Extension Data:")
            for ext in extensions[:5]:
                ext_num = ext.get('Extension', 'N/A')
                ext_id = ext.get('ID', 'N/A')
                print(f"  - Ext: {ext_num} (ID: {ext_id})")
            
            return {'total': len(extensions), 'saved': result['success'], 'data': extensions}
        
        return {'total': 0, 'saved': 0, 'data': []}
    
    def sync_employees_from_session(self) -> Dict:
        """
        Sync nhân viên từ SessionData API
        Fallback khi không access được TicketGroupList
        """
        print("\n" + "="*60)
        print("🔄 SYNC NHÂN VIÊN TỪ SESSION DATA")
        print("="*60)
        
        employees_raw = self.fetch_employees_from_session()
        
        if not employees_raw:
            print("⚠️ Không lấy được dữ liệu nhân viên")
            return {'success': 0, 'failed': 0, 'total': 0}
        
        print(f"📥 Fetched {len(employees_raw)} employees từ SessionData")
        
        # Transform to employee format for database
        employees = []
        for emp in employees_raw:
            employee = {
                'vttech_id': emp.get('ID'),
                'name': emp.get('Name'),
                'code': None,  # SessionData không có code
                'email': None,
                'phone': None,
                'extension': None,  # SessionData không có extension
                'group_id': emp.get('GroupID'),
                'group_name': None,
                'department': None,
                'position': None,
                'is_active': emp.get('State', 0) == 0,  # State=0 là active
                'is_doctor': emp.get('IsDoctor', False),
                'is_assistant': emp.get('IsAssistant', False),
                'is_cskh': emp.get('IsCSKH', False),
                'is_cashier': emp.get('IsCashier', False),
                'is_marketing': emp.get('IsMarketing', False),
                'avatar': emp.get('Avatar'),
                'raw_data': emp
            }
            employees.append(employee)
        
        # Save to database
        result = repo.upsert_employees_batch(employees)
        
        print(f"\n📊 Kết quả:")
        print(f"  - Total: {len(employees)}")
        print(f"  - Saved: {result['success']}")
        print(f"  - Failed: {result['failed']}")
        
        # Show sample
        if employees:
            print(f"\n📋 Sample employees:")
            for emp in employees[:5]:
                roles = []
                if emp.get('is_doctor'): roles.append('Doctor')
                if emp.get('is_assistant'): roles.append('Assistant')
                if emp.get('is_cskh'): roles.append('CSKH')
                roles_str = ', '.join(roles) if roles else 'N/A'
                print(f"  - {emp['name']} (ID: {emp['vttech_id']}) - {roles_str}")
        
        return {
            'success': result['success'],
            'failed': result['failed'],
            'total': len(employees)
        }
    
    def sync_all(self) -> Dict:
        """
        Sync đầy đủ: Extensions + Employees
        
        Ghi chú:
        - Extensions và TicketGroupList cần web session với antiforgery token
        - Fallback: dùng SessionData để sync employees (không có Extension)
        """
        print("\n" + "="*60)
        print("🔄 FULL SYNC: EXTENSION + NHÂN VIÊN")
        print("="*60)
        
        results = {
            'extensions': {'total': 0},
            'employees': {'success': 0, 'failed': 0, 'total': 0}
        }
        
        # 1. Thử sync Extensions (có thể fail do cần antiforgery token)
        print("\n📞 [1/3] Sync Extensions...")
        ext_result = self.sync_extensions()
        results['extensions'] = ext_result
        
        # 2. Thử sync Employees từ TicketGroupList
        print("\n👥 [2/3] Sync Employees từ TicketGroupList...")
        emp_result = self.sync_employees()
        results['employees'] = emp_result
        
        # 3. Nếu không có từ TicketGroupList, dùng SessionData
        if emp_result['total'] == 0:
            print("\n📊 [3/3] Fallback: Sync Employees từ SessionData...")
            emp_result = self.sync_employees_from_session()
            results['employees'] = emp_result
            
            if emp_result['total'] > 0:
                print("\n⚠️ LƯU Ý: Dữ liệu từ SessionData KHÔNG có Extension!")
                print("   Để sync Extension, cần export từ web hoặc dùng Selenium.")
        
        # Summary
        print("\n" + "="*60)
        print("📊 KẾT QUẢ SYNC")
        print("="*60)
        print(f"  Extensions: {results['extensions']['total']}")
        print(f"  Employees:  {results['employees']['total']} (saved: {results['employees']['success']})")
        
        if results['extensions']['total'] == 0:
            print("\n⚠️ Extension sync cần web session với antiforgery token")
            print("   Giải pháp:")
            print("   1. Export Excel từ /Marketing/TicketExtensionList/")
            print("   2. Hoặc implement Selenium automation")
        
        return results


def run_employee_sync():
    """Chạy sync nhân viên"""
    # Init database
    init_callcenter_database()
    migrate_database()
    
    syncer = VTTechEmployeeSync()
    result = syncer.sync_employees()
    
    # If no results, try SessionData
    if result['total'] == 0:
        print("\n⚠️ TicketGroupList không có data, thử SessionData...")
        employees = syncer.get_session_data_employees()
        if employees:
            result = repo.upsert_employees_batch(employees)
            print(f"✅ Từ SessionData: {result['success']} employees")
    
    # Show summary
    print("\n" + "="*60)
    print("📊 THỐNG KÊ NHÂN VIÊN")
    print("="*60)
    
    employees = repo.get_employees()
    print(f"Tổng nhân viên: {len(employees)}")
    
    for emp in employees:
        print(f"  - {emp.get('name', 'N/A')} | Ext: {emp.get('extension', 'N/A')} | Group: {emp.get('group_name', 'N/A')}")
    
    return result


def run_full_sync():
    """Chạy full sync: Extensions + Employees"""
    # Init database
    init_callcenter_database()
    migrate_database()
    
    syncer = VTTechEmployeeSync()
    return syncer.sync_all()


def run_extension_sync():
    """Chạy sync chỉ Extensions"""
    syncer = VTTechEmployeeSync()
    return syncer.sync_extensions()


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    
    import argparse
    parser = argparse.ArgumentParser(description="Sync nhân viên và Extension từ VTTech")
    parser.add_argument('--full', action='store_true', help='Full sync (Extensions + Employees)')
    parser.add_argument('--extensions', action='store_true', help='Chỉ sync Extensions')
    args = parser.parse_args()
    
    if args.full:
        run_full_sync()
    elif args.extensions:
        run_extension_sync()
    else:
        run_employee_sync()
