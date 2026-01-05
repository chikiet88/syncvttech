import requests
import json
import base64
import zlib
import re

BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

def decompress(data):
    try:
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        return data

def call_handler_with_dates(session, xsrf, path, handler, customer_id):
    url = f"{BASE_URL}{path}?handler={handler}"
    payload = {
        '__RequestVerificationToken': xsrf, 
        'CustomerID': customer_id,
        'DateFrom': '2020-01-01',
        'DateTo': '2030-12-31',
        'from': '2020-01-01', 
        'to': '2030-12-31'
    }
    resp = session.post(url, data=payload, headers={'X-Requested-With': 'XMLHttpRequest', 'xsrf-token': xsrf})
    if resp.status_code == 200:
        raw = resp.text
        if raw.startswith("<!DOCTYPE"):
            print("  Result: HTML (Redirect or Error)")
        else:
            data = decompress(raw)
            if isinstance(data, list):
                print(f"  Result: List with {len(data)} items")
                if len(data) > 0:
                    print(f"  First item: {str(data[0])[:100]}...")
            elif isinstance(data, dict):
                 print(f"  Result: Dict with {list(data.keys())}")
            else:
                print(f"  Result: {type(data)}")
    else:
        print(f"  Result: Status Code {resp.status_code}")

def test():
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/Author/Login", json={
        "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
    })
    token = resp.json().get("Session")
    session.cookies.set("WebToken", token)
    session.headers.update({"Authorization": f"Bearer {token}"})
    
    resp = session.get(f"{BASE_URL}/Customer/ListCustomer")
    match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
    xsrf = match.group(1) if match else ""
    
    customer_id = "186580" # Known to have appointments
    session.get(f"{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}")
    
    print("\n--- Testing Appointment with Date Range ---")
    call_handler_with_dates(session, xsrf, "/Customer/ScheduleList_Schedule/", "Loadata", customer_id)

    print("\n--- Testing Treatment Plan via LoadDetail ---")
    # customer_id = "186906" # Known to have plans (maybe)
    call_handler_with_dates(session, xsrf, "/Customer/Treatment/TreatmentList/TreatmentList_Service/", "LoadDetail", customer_id)

if __name__ == "__main__":
    test()
