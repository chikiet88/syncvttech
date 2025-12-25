#!/usr/bin/env python3
"""
Sync nhân viên Call Center từ VTTech API
Endpoint: /Marketing/TicketGroupList/?handler=LoadData
"""

import requests
import json
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
COOKIES_FILE = Path(__file__).parent.parent / "cookies.txt"


class VTTechEmployeeSync:
    """Sync nhân viên Call Center từ VTTech"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.verify = False
        self.base_url = BASE_URL
        self._load_cookies()
    
    def _load_cookies(self):
        """Load cookies từ file"""
        if COOKIES_FILE.exists():
            with open(COOKIES_FILE) as f:
                for line in f:
                    line = line.strip()
                    if '=' in line and not line.startswith('#'):
                        parts = line.split('=', 1)
                        if len(parts) == 2:
                            self.session.cookies.set(parts[0].strip(), parts[1].strip())
            print(f"✅ Loaded cookies from {COOKIES_FILE}")
    
    def _get_xsrf_token(self) -> Optional[str]:
        """Lấy XSRF token từ cookies"""
        token = self.session.cookies.get('XSRF-TOKEN')
        if token:
            import urllib.parse
            return urllib.parse.unquote(token)
        return None
    
    def fetch_ticket_groups(self) -> List[Dict]:
        """
        Lấy danh sách TicketGroup (nhóm nhân viên) từ VTTech
        Endpoint: /Marketing/TicketGroupList/?handler=LoadData
        """
        url = f"{self.base_url}/Marketing/TicketGroupList/"
        
        # First get the page to get XSRF token
        self.session.get(url)
        
        xsrf_token = self._get_xsrf_token()
        
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        }
        if xsrf_token:
            headers['RequestVerificationToken'] = xsrf_token
        
        # Gọi handler LoadData
        data_url = f"{url}?handler=LoadData"
        
        try:
            response = self.session.post(data_url, headers=headers, json={})
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ TicketGroupList response: {type(result)}")
                
                # Parse response - có thể là list hoặc dict
                if isinstance(result, list):
                    return result
                elif isinstance(result, dict):
                    # Thử các key phổ biến
                    for key in ['data', 'Data', 'items', 'Items', 'records', 'Table']:
                        if key in result:
                            return result[key] if isinstance(result[key], list) else []
                    return [result]  # Trả về như single item
                
                return []
            else:
                print(f"❌ Error: {response.status_code} - {response.text[:500]}")
                return []
                
        except Exception as e:
            print(f"❌ Error fetching ticket groups: {e}")
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


if __name__ == "__main__":
    import urllib3
    urllib3.disable_warnings()
    
    run_employee_sync()
