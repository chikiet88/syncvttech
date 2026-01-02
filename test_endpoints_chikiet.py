import requests
import json
import base64
import zlib
import re
from typing import Any, Dict

BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

class EndpointTester:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
        })
        self.token = None
        self.xsrf = None

    def login(self):
        resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
            'username': USERNAME, 'password': PASSWORD, 'passwordcrypt': '',
            'from': '', 'sso': '', 'ssotoken': ''
        })
        data = resp.json()
        self.token = data.get('Session')
        self.session.headers.update({'Authorization': f'Bearer {self.token}'})
        self.session.cookies.set('WebToken', self.token)
        print(f"Logged in as: {data.get('FullName')}")

    def get_xsrf(self):
        resp = self.session.get(f'{BASE_URL}/Customer/ListCustomer/')
        match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>\"]+)', resp.text)
        self.xsrf = match.group(1) if match else None
        print(f"XSRF: {self.xsrf[:20]}...")

    def decompress(self, data: str) -> Any:
        try:
            data = data.strip().strip('"')
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except:
            return data

    def test_handler(self, page, handler, customer_id):
        print(f"\nTesting {page}?handler={handler} for CustomerID={customer_id}")
        # Set context
        self.session.get(f'{BASE_URL}/Customer/MainCustomer?CustomerID={customer_id}')
        
        url = f'{BASE_URL}{page}?handler={handler}'
        data = {
            '__RequestVerificationToken': self.xsrf,
            'CustomerID': customer_id,
            '__CUSTOMERID': customer_id
        }
        resp = self.session.post(url, data=data)
        print(f"Status: {resp.status_code}")
        
        if resp.status_code == 200:
            content = resp.text
            if content.startswith('<!DOCTYPE'):
                print("Result: HTML (likely redirect or error)")
            else:
                decompressed = self.decompress(content)
                if isinstance(decompressed, (dict, list)):
                    print(f"Result: {type(decompressed).__name__}")
                    if isinstance(decompressed, dict):
                        print(f"Keys: {list(decompressed.keys())}")
                        for k, v in decompressed.items():
                            if isinstance(v, list):
                                print(f"  - {k}: {len(v)} items")
                                if len(v) > 0:
                                    print(f"    Sample ({k}): {v[0]}")
                    else:
                        print(f"Count: {len(decompressed)}")
                        if len(decompressed) > 0:
                            print(f"Sample: {decompressed[0]}")
                else:
                    print(f"Result: {content[:100]}...")

def main():
    tester = EndpointTester()
    tester.login()
    tester.get_xsrf()
    
    # Test with customer 186583 (recent)
    customer_id = 186583 
    
    # 1. Treatments ONLY
    tester.test_handler('/Customer/Treatment/TreatmentList/TreatmentList_Service/', 'LoadDetail', customer_id)
    
    # 2. Appointments ONLY
    tester.test_handler('/Customer/MainCustomer/', 'LoadCustomerScheduleNext', customer_id)

if __name__ == "__main__":
    main()
