import requests
import json
import base64
import zlib
import re

BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

session = requests.Session()

def login():
    resp = session.post(f"{BASE_URL}/api/Author/Login", json={
        "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
    })
    data = resp.json()
    token = data.get("Session")
    session.cookies.set("WebToken", token)
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    resp = session.get(f"{BASE_URL}/Customer/ListCustomer")
    match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
    token = match.group(1) if match else ""
    return token

def decompress(data):
    try:
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        return data

def test():
    xsrf = login()
    customer_id = "186906"
    session.get(f"{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}")
    
    endpoints = [
        # ("/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadataTreatment"),
        ("/Customer/Service/TabList/TabList_Service/", "LoadInfo_Treatment_Plant"),
        ("/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadDetail"),
        ("/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadComboMain"),
        ("/Customer/History/HistoryList_Care/", "LoadataHistory"),
        ("/Customer/ScheduleList_Schedule/", "Loadata"),
        ("/Customer/Service/TabList/TabList_Service/", "LoadInitialize"),
        ("/Schedule/ScheduleList/", "Loadata"),
    ]
    
    for path, handler in endpoints:
        print(f"\n--- Testing {path}?handler={handler} ---")
        url = f"{BASE_URL}{path}?handler={handler}"
        resp = session.post(url, data={'__RequestVerificationToken': xsrf, 'CustomerID': customer_id}, 
                          headers={'X-Requested-With': 'XMLHttpRequest', 'xsrf-token': xsrf})
        if resp.status_code == 200:
            raw = resp.text
            if raw.startswith("<!DOCTYPE"):
                print("  Result: HTML (Redirect or Error)")
            else:
                data = decompress(raw)
                if isinstance(data, str):
                    print(f"  Result: Raw String (len {len(data)}) - {data[:100]}...")
                else:
                    print(f"  Result: {type(data)}")
                    if isinstance(data, dict):
                        for k, v in data.items():
                            if isinstance(v, list):
                                print(f"    Key '{k}': List with {len(v)} items")
                                if len(v) > 0:
                                    print(f"      Example: {str(v[0])[:100]}...")
                            else:
                                print(f"    Key '{k}': {type(v)}")
                    else:
                        print(f"  Content: {str(data)[:200]}...")
        else:
            print(f"  Result: Status Code {resp.status_code}")

    print("\n--- Testing Appointment with Date Range ---")
    call_handler_with_dates(session, xsrf, "/Customer/ScheduleList_Schedule/", "Loadata", customer_id)

if __name__ == "__main__":
    test()
