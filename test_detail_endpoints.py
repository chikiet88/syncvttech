import requests
import json
import base64
import zlib

BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

session = requests.Session()

def login():
    resp = session.post(f"{BASE_URL}/api/Author/Login", json={"username": USERNAME, "password": PASSWORD})
    data = resp.json()
    token = data.get("Session")
    session.headers.update({"Authorization": f"Bearer {token}"})
    return token

def decompress(data):
    try:
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        return json.loads(data)

def call_handler(path, handler, customer_id):
    resp = session.get(f"{BASE_URL}/Customer/ListCustomer/")
    import re
    match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>\"]+)', resp.text)
    token = match.group(1) if match else ""
    
    session.get(f"{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}")
    
    url = f"{BASE_URL}{path}?handler={handler}&CustomerID={customer_id}"
    resp = session.post(url, data={"__RequestVerificationToken": token})
    if resp.status_code == 200:
        return decompress(resp.text)
    return None

def test():
    login()
    customer_id = "186903" # Known customer ID from log
    
    endpoints = [
        ("/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadataTreatment"),
        ("/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadDetail"),
        ("/Customer/ScheduleList_Schedule/", "Loadata"),
        ("/Appointment/ScheduleList/", "Loadata"),
        ("/Customer/History/HistoryList_Care/", "LoadataHistory"),
        ("/Customer/Installment/InstallmentList/", "LoadDetail"),
    ]
    
    for path, handler in endpoints:
        print(f"\nTesting {path}?handler={handler}")
        res = call_handler(path, handler, customer_id)
        if res:
            if isinstance(res, list):
                print(f"  Result: List with {len(res)} items")
                if len(res) > 0:
                    print(f"  First item keys: {list(res[0].keys())}")
            elif isinstance(res, dict):
                print(f"  Result: Dict with keys {list(res.keys())}")
            else:
                print(f"  Result: {type(res)}")
        else:
            print("  Result: None")

if __name__ == "__main__":
    test()
