#!/usr/bin/env python3
"""
Call Center PBX API Client
Client để gọi API lấy CDR từ PBX
"""

import httpx
import logging
from datetime import date, datetime
from typing import List, Dict, Optional

from .config import config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('callcenter.api')


class PBXApiClient:
    """Client để giao tiếp với PBX API"""
    
    def __init__(self):
        self.api_url = config.pbx_api_url
        self.domain = config.pbx_domain
        self.api_key = config.pbx_api_key
        self.timeout = config.request_timeout
        self.batch_size = config.batch_size
    
    def _get_headers(self) -> Dict:
        """Tạo headers cho request"""
        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
        # Chỉ thêm Authorization header nếu có API key
        if self.api_key:
            headers['Authorization'] = f'Bearer {self.api_key}'
        return headers
    
    async def fetch_cdr_records(self, date_from: date, date_to: date, 
                                 offset: int = 0) -> Dict:
        """
        Lấy CDR records từ PBX API
        
        Args:
            date_from: Ngày bắt đầu
            date_to: Ngày kết thúc
            offset: Offset cho pagination
            
        Returns:
            Dict với keys: data, total, limit, offset
        """
        # Format datetime với space: YYYY-MM-DD HH:MM:SS
        from_str = f"{date_from.isoformat()} 00:00:00"
        to_str = f"{date_to.isoformat()} 23:59:59"
        
        params = {
            'domain': self.domain,
            'from': from_str,
            'to': to_str,
            'limit': self.batch_size,
            'offset': offset
        }
        
        logger.info(f"Fetching CDR records: {date_from} -> {date_to}, offset={offset}")
        
        try:
            async with httpx.AsyncClient(verify=False, timeout=self.timeout) as client:
                response = await client.get(
                    self.api_url,
                    params=params,
                    headers=self._get_headers()
                )
                
                if response.status_code == 200:
                    result = response.json()
                    data = result.get('data', [])
                    logger.info(f"✅ Fetched {len(data)} records")
                    return result
                else:
                    logger.error(f"❌ API error: {response.status_code} - {response.text}")
                    return {'data': [], 'total': 0, 'error': response.text}
                    
        except httpx.TimeoutException:
            logger.error(f"❌ Request timeout after {self.timeout}s")
            return {'data': [], 'total': 0, 'error': 'Request timeout'}
        except httpx.ConnectError as e:
            logger.error(f"❌ Connection error: {e}")
            return {'data': [], 'total': 0, 'error': str(e)}
        except Exception as e:
            logger.error(f"❌ Unexpected error: {e}")
            return {'data': [], 'total': 0, 'error': str(e)}
    
    async def fetch_all_cdr_records(
        self, 
        date_from: date, 
        date_to: date,
        batch_callback=None
    ) -> List[Dict]:
        """
        Lấy tất cả CDR records với pagination
        
        Args:
            date_from: Ngày bắt đầu
            date_to: Ngày kết thúc
            batch_callback: Optional callback function to process each batch
                           Signature: callback(records: List[Dict]) -> None
            
        Returns:
            List tất cả records
        """
        all_records = []
        offset = 0
        total_fetched = 0
        
        while True:
            result = await self.fetch_cdr_records(date_from, date_to, offset)
            
            if 'error' in result:
                logger.error(f"❌ Error fetching records: {result['error']}")
                break
            
            records = result.get('data', [])
            if not records:
                break
            
            # Call batch callback to save records immediately
            if batch_callback:
                try:
                    batch_callback(records)
                    logger.info(f"💾 Batch of {len(records)} records saved to database")
                except Exception as e:
                    logger.error(f"❌ Error in batch callback: {e}")
                
            all_records.extend(records)
            total_fetched += len(records)
            
            # Check pagination - API uses next_offset
            next_offset = result.get('next_offset')
            if next_offset is None or next_offset <= offset:
                # No more pages
                break
            
            offset = next_offset
            logger.info(f"📥 Progress: {len(all_records)} records fetched, next_offset={next_offset}")
        
        logger.info(f"✅ Total fetched: {len(all_records)} records")
        return all_records
    
    def test_connection(self) -> bool:
        """Test kết nối đến PBX API"""
        import asyncio
        
        async def _test():
            today = date.today()
            result = await self.fetch_cdr_records(today, today)
            return 'error' not in result
        
        try:
            return asyncio.run(_test())
        except Exception as e:
            logger.error(f"❌ Connection test failed: {e}")
            return False


# Singleton instance
api_client = PBXApiClient()


# Sync wrapper function for non-async usage
def fetch_cdr_sync(date_from: date, date_to: date) -> List[Dict]:
    """Synchronous wrapper để lấy CDR records"""
    import asyncio
    return asyncio.run(api_client.fetch_all_cdr_records(date_from, date_to))
