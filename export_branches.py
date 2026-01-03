#!/usr/bin/env python3
import requests
import json
import base64
import zlib
import logging
from pathlib import Path

# ============== CONFIGURATION ==============
BASE_URL = 'https://tmtaza.vttechsolution.com'
USERNAME = 'ittest123'
PASSWORD = 'ittest123'

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

class BranchExporter:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        })
        self.token = None

    def decompress(self, data: str):
        try:
            data = data.strip('"')
            decoded = base64.b64decode(data)
            decompressed = zlib.decompress(decoded, 16 + zlib.MAX_WBITS)
            return json.loads(decompressed.decode('utf-8'))
        except Exception:
            try:
                return json.loads(data)
            except Exception:
                return data

    def login(self) -> bool:
        logger.info("🔐 Logging in...")
        try:
            resp = self.session.post(f'{BASE_URL}/api/Author/Login', json={
                'username': USERNAME, 'password': PASSWORD, 'passwordcrypt': '', 'from': '', 'sso': '', 'ssotoken': ''
            })
            data = resp.json()
            if data.get('Session'):
                self.token = data['Session']
                self.session.cookies.set('WebToken', self.token)
                logger.info(f"✅ Login success: {data.get('FullName')}")
                return True
            logger.error(f"❌ Login failed: {data}")
            return False
        except Exception as e:
            logger.error(f"❌ Login error: {e}")
            return False

    def export_branches(self):
        if not self.login():
            return

        logger.info("📍 Fetching SessionData for branches...")
        try:
            resp = self.session.post(
                f'{BASE_URL}/api/Home/SessionData', 
                json={},
                headers={'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
            )
            
            if resp.status_code == 200:
                result = self.decompress(resp.text)
                if isinstance(result, dict) and "Table" in result:
                    branches = result["Table"]
                    output_file = Path("branches.json")
                    with open(output_file, "w", encoding="utf-8") as f:
                        json.dump(branches, f, ensure_ascii=False, indent=4)
                    logger.info(f"✅ Successfully exported {len(branches)} branches to {output_file}")
                else:
                    logger.error("❌ Could not find branch table in response")
            else:
                logger.error(f"❌ API call failed with status {resp.status_code}")
        except Exception as e:
            logger.error(f"❌ Export error: {e}")

if __name__ == "__main__":
    BranchExporter().export_branches()
