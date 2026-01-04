import requests
import json
import base64
import zlib
import re

BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

def decompress(data):
    try:
        data = data.strip('"')
        decoded = base64.b64decode(data)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except:
        try: return json.loads(data)
        except: return data

session = requests.Session()
# Login
resp = session.post(f'{BASE_URL}/api/Author/Login', json={
    'username': USERNAME, 'password': PASSWORD, 'passwordcrypt': '', 'from': '', 'sso': '', 'ssotoken': ''
})
token = resp.json().get('Session')
session.cookies.set('WebToken', token)

# Get Branches
resp = session.post(f'{BASE_URL}/api/Home/SessionData', json={}, headers={'Authorization': f'Bearer {token}'})
session_data = decompress(resp.text)
branches = session_data.get('Table', [])
print(f"Branches found: {len(branches)}")
for b in branches[:5]:
    print(f"  - ID: {b.get('ID')}, Name: {b.get('Name')}")

# Get XSRF
resp = session.get(f'{BASE_URL}/Customer/ListCustomer/')
match = re.search(r'name=__RequestVerificationToken[^>]*value=([^\s/>]+)', resp.text)
xsrf = match.group(1) if match else None
print(f"XSRF: {xsrf}")

from datetime import datetime
today_str = datetime.now().strftime('%Y-%m-%d')

# Load Data
for bid in [1, 2, 3]:
    print(f"\nTrying Branch ID: {bid}")
    resp = session.post(
        f'{BASE_URL}/Customer/ListCustomer/?handler=LoadData',
        data={
            '__RequestVerificationToken': xsrf,
            'dateFrom': '2000-01-01 00:00:00',
            'dateTo': f'{today_str} 23:59:59',
            'branchID': bid,
            'type': 5,
            'BeginID': 0,
            'Limit': 5
        },
        headers={'X-Requested-With': 'XMLHttpRequest', 'xsrf-token': xsrf}
    )

    data = decompress(resp.text)
    if data and isinstance(data, list) and len(data) > 0:
        print(f"✅ Data found for branch {bid}!")
        print(f"Full record for first customer (ID: {data[0].get('CustID') or data[0].get('ID')}):")
        print(json.dumps(data[0], indent=2, ensure_ascii=False))
        break
    else:
        print(f"❌ No data for branch {bid}")
else:
    print("\nNo customer data found in any tried branch.")
