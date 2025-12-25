#!/usr/bin/env python3
"""
VTTech Data Crawler
Crawl dữ liệu từ hệ thống VTTech (tmtaza.vttechsolution.com)

Dữ liệu có thể lấy từ /api/Home/SessionData:
- Table: Chi nhánh (17 rows) - ID, Name, ShortName
- Table1: Teeth data (32 rows)
- Table2: Dịch vụ/Services (1728 rows) - ID, Name, Code, Color, Type, State
- Table3: Nhóm dịch vụ/Groups (86 rows) - ID, Color, Name  
- Table4: Nhân viên/Employees (1618 rows) - ID, Name, Avatar, GroupID, State, roles
- Table5: Users (1067 rows) - ID, Name, Avatar, RoleID, EmployeeName
- Table6: Tỉnh/Cities (34 rows)
- Table7: Quận/Districts (34 rows)
- Table8: Countries (242 rows) - ID, Name, Icon
- Table9: Phường/Wards (3321 rows) - ID, Name, DistrictID
- Table10: Customer sources (34 rows) - ID, Name, SPID
"""

import requests
import json
import base64
import zlib
import gzip
from datetime import datetime
import os
import csv

# Config
BASE_URL = "https://tmtaza.vttechsolution.com"
LOGIN_URL = f"{BASE_URL}/api/Author/Login"

# Thông tin đăng nhập
CREDENTIALS = {
    "username": "ittest123",
    "password": "ittest123",
    "passwordcrypt": "",
    "from": "",
    "sso": "",
    "ssotoken": ""
}

# Mapping tên bảng
TABLE_NAMES = {
    "Table": "branches",           # Chi nhánh
    "Table1": "teeth_data",        # Dữ liệu răng (dental)
    "Table2": "services",          # Dịch vụ
    "Table3": "service_groups",    # Nhóm dịch vụ
    "Table4": "employees",         # Nhân viên
    "Table5": "users",             # Users với role
    "Table6": "cities",            # Tỉnh/Thành phố
    "Table7": "districts",         # Quận/Huyện
    "Table8": "countries",         # Quốc gia
    "Table9": "wards",             # Phường/Xã
    "Table10": "customer_sources"  # Nguồn khách hàng
}

class VTTechCrawler:
    def __init__(self):
        self.token = None
        self.session = requests.Session()
        self.output_dir = "data_output"
        os.makedirs(self.output_dir, exist_ok=True)
        
    def decompress_response(self, data):
        """Giải nén response từ VTTech (base64 + gzip)"""
        try:
            # Decode base64
            decoded = base64.b64decode(data)
            # Decompress với pako/zlib
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return decompressed.decode('utf-8')
        except Exception as e:
            # Nếu không nén thì trả về nguyên bản
            return data
    
    def login(self):
        """Đăng nhập và lấy token"""
        print("🔐 Đang đăng nhập...")
        
        response = self.session.post(
            LOGIN_URL,
            json=CREDENTIALS,
            headers={"Content-Type": "application/json"}
        )
        
        result = response.json()
        
        if result.get("Session"):
            self.token = result["Session"]
            print(f"✅ Đăng nhập thành công!")
            print(f"   User: {result.get('UserName')}")
            print(f"   FullName: {result.get('FullName')}")
            print(f"   ID: {result.get('ID')}")
            return True
        else:
            print(f"❌ Đăng nhập thất bại: {result.get('RESULT')}")
            return False
    
    def get_headers(self):
        """Tạo headers cho API request"""
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.token}"
        }
    
    def call_api(self, endpoint, data=None):
        """Gọi API với xử lý response nén"""
        url = f"{BASE_URL}{endpoint}"
        
        try:
            response = self.session.post(
                url,
                json=data or {},
                headers=self.get_headers()
            )
            
            if response.status_code == 200:
                content = response.text
                # Thử giải nén nếu có
                try:
                    decompressed = self.decompress_response(content)
                    return json.loads(decompressed)
                except:
                    try:
                        return json.loads(content)
                    except:
                        return content
            else:
                print(f"❌ API Error: {response.status_code}")
                return None
                
        except Exception as e:
            print(f"❌ Request Error: {e}")
            return None

    def get_home_session_data(self):
        """Lấy session data"""
        print("\n📊 Đang lấy Session Data...")
        result = self.call_api("/api/Home/SessionData", {})
        if result:
            print("✅ Session Data retrieved")
            return result
        return None
    
    def save_table_to_csv(self, table_data, filename):
        """Lưu bảng dữ liệu ra file CSV"""
        if not table_data:
            return None
            
        filepath = os.path.join(self.output_dir, f"{filename}.csv")
        
        with open(filepath, 'w', newline='', encoding='utf-8') as f:
            if table_data:
                writer = csv.DictWriter(f, fieldnames=table_data[0].keys())
                writer.writeheader()
                writer.writerows(table_data)
        
        return filepath
    
    def process_session_data(self, session_data):
        """Xử lý và lưu từng bảng từ Session Data"""
        print("\n📁 Đang xử lý và lưu dữ liệu...\n")
        
        results = {}
        
        for table_key, table_name in TABLE_NAMES.items():
            if table_key in session_data:
                table_data = session_data[table_key]
                row_count = len(table_data)
                
                # Lưu CSV
                csv_path = self.save_table_to_csv(table_data, table_name)
                
                # Lưu JSON
                json_path = os.path.join(self.output_dir, f"{table_name}.json")
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(table_data, f, ensure_ascii=False, indent=2)
                
                results[table_name] = {
                    "rows": row_count,
                    "csv": csv_path,
                    "json": json_path
                }
                
                print(f"  ✅ {table_name}: {row_count} rows")
                
        return results

def main():
    print("=" * 60)
    print("🚀 VTTech Data Crawler - TMTaza")
    print("=" * 60)
    
    crawler = VTTechCrawler()
    
    # Đăng nhập
    if not crawler.login():
        print("❌ Không thể đăng nhập!")
        return
    
    print(f"\n🔑 Token: {crawler.token[:50]}...")
    
    # Lấy Session Data (chứa tất cả dữ liệu master)
    session_data = crawler.get_home_session_data()
    
    if not session_data:
        print("❌ Không thể lấy Session Data!")
        return
    
    # Xử lý và lưu từng bảng
    results = crawler.process_session_data(session_data)
    
    # In tổng kết
    print("\n" + "=" * 60)
    print("📊 TỔNG KẾT DỮ LIỆU ĐÃ CRAWL")
    print("=" * 60)
    
    total_rows = 0
    for name, info in results.items():
        print(f"  📄 {name}: {info['rows']} rows")
        total_rows += info['rows']
    
    print(f"\n  📈 Tổng: {total_rows} records")
    print(f"  📁 Thư mục: {crawler.output_dir}/")
    
    print("\n" + "=" * 60)
    print("✅ Hoàn tất crawl dữ liệu!")
    print("=" * 60)
    
    # Thông tin bổ sung
    print("\n📝 GHI CHÚ:")
    print("   - Webapp TMTaza sử dụng API internal khác với Central API")
    print("   - Central API (/api/Client/Autho) yêu cầu đăng ký IsPro=1")
    print("   - Để lấy dữ liệu Customer, Booking cần sử dụng trình duyệt")
    print("     hoặc phân tích thêm JavaScript handlers của webapp")


if __name__ == "__main__":
    main()
