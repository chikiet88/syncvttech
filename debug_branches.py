import requests
import json
import base64
import zlib
import logging

BASE_URL = "https://tmtaza.vttechsolution.com"
USERNAME = "ittest123"
PASSWORD = "ittest123"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'})

def decompress(data):
    s = data.strip().strip('"')
    if not s: return None
    try: return json.loads(s)
    except: pass
    try:
        decoded = base64.b64decode(s)
        decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
        return json.loads(decompressed.decode('utf-8'))
    except: pass
    return s

logger.info("🔐 Logging in...")
resp = session.post(f"{BASE_URL}/api/Author/Login", json={
    "username": USERNAME, "password": PASSWORD, "passwordcrypt": "", "from": "", "sso": "", "ssotoken": ""
})
data = resp.json()
if data.get("Session"):
    token = data["Session"]
    session.cookies.set("WebToken", token)
    logger.info("✅ Login success. Visiting ListCustomer...")
    session.get(f"{BASE_URL}/Customer/ListCustomer")
    
    logger.info("📍 Fetching SessionData...")
    resp = session.post(f"{BASE_URL}/api/Home/SessionData", json={})
    logger.info(f"Response Status: {resp.status_code}")
    logger.info(f"Response Length: {len(resp.text)}")
    logger.info(f"Response Preview: {resp.text[:200]}")
    
    result = decompress(resp.text)
    if result:
        if isinstance(result, dict) and "Table" in result:
            logger.info(f"✅ Found {len(result['Table'])} branches in Table")
        else:
            logger.info(f"❓ Result Type: {type(result)}")
            if isinstance(result, dict):
                logger.info(f"   Keys: {list(result.keys())}")
    else:
        logger.info("❌ Decompression failed or empty result")
else:
    logger.error(f"❌ Login failed: {data}")
