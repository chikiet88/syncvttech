#!/usr/bin/env python3
"""
VTTech API Scanner - Phát hiện các API endpoints hoạt động
"""

import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_URL = "https://tmtaza.vttechsolution.com"

# Đăng nhập lấy token
def get_token():
    response = requests.post(
        f"{BASE_URL}/api/Author/Login",
        json={
            "username": "ittest123",
            "password": "ittest123",
            "passwordcrypt": "",
            "from": "",
            "sso": "",
            "ssotoken": ""
        }
    )
    return response.json().get("Session")

# Danh sách controllers phổ biến
CONTROLLERS = [
    "Home", "Author", "User", "Account", "Auth",
    "Customer", "Client", "Member", "Patient",
    "Booking", "Appointment", "Schedule", "Calendar",
    "Service", "Product", "Item", "Category",
    "Staff", "Employee", "Doctor", "Technician",
    "Branch", "Store", "Location", "Clinic",
    "Revenue", "Payment", "Invoice", "Bill", "Order",
    "Report", "Dashboard", "Statistic", "Chart",
    "Setting", "Config", "System", "Master",
    "Notification", "Message", "SMS", "Email",
    "Promotion", "Discount", "Voucher", "Coupon",
    "Inventory", "Stock", "Warehouse",
    "Commission", "Salary", "Payroll",
    "Treatment", "Procedure", "Record", "History",
    "Image", "Photo", "File", "Upload", "Media",
    "Comment", "Feedback", "Review", "Rating"
]

# Danh sách actions phổ biến
ACTIONS = [
    "List", "GetList", "GetAll", "All", "Index",
    "Get", "GetById", "Detail", "Info", "View",
    "Search", "Filter", "Find", "Query",
    "SessionData", "Init", "Load", "Data",
    "Summary", "Overview", "Statistics", "Dashboard"
]

def test_endpoint(token, controller, action):
    """Test một endpoint"""
    url = f"{BASE_URL}/api/{controller}/{action}"
    try:
        response = requests.post(
            url,
            json={},
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            timeout=5
        )
        return (controller, action, response.status_code, len(response.content))
    except:
        return (controller, action, 0, 0)

def main():
    print("🔐 Đang đăng nhập...")
    token = get_token()
    if not token:
        print("❌ Không thể đăng nhập!")
        return
    
    print(f"✅ Token lấy thành công")
    print("\n🔍 Đang scan API endpoints...\n")
    
    found_endpoints = []
    
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {}
        for controller in CONTROLLERS:
            for action in ACTIONS:
                future = executor.submit(test_endpoint, token, controller, action)
                futures[future] = (controller, action)
        
        total = len(futures)
        done = 0
        
        for future in as_completed(futures):
            done += 1
            controller, action, status, size = future.result()
            
            if status == 200:
                found_endpoints.append({
                    "endpoint": f"/api/{controller}/{action}",
                    "status": status,
                    "size": size
                })
                print(f"✅ /api/{controller}/{action} - {status} ({size} bytes)")
            
            # Progress
            if done % 100 == 0:
                print(f"   Progress: {done}/{total}")
    
    print(f"\n{'='*60}")
    print(f"📊 Kết quả: Tìm thấy {len(found_endpoints)} endpoints hoạt động")
    print(f"{'='*60}\n")
    
    for ep in found_endpoints:
        print(f"  {ep['endpoint']} ({ep['size']} bytes)")
    
    # Lưu kết quả
    with open("found_endpoints.json", "w") as f:
        json.dump(found_endpoints, f, indent=2)
    print(f"\n💾 Đã lưu kết quả vào found_endpoints.json")

if __name__ == "__main__":
    main()
