#!/usr/bin/env python3
"""
Call Center Database Repository
Các hàm tiện ích để đọc/ghi dữ liệu CDR vào SQLite
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Any

from .init_callcenter_db import get_connection, DB_PATH


class CallCenterRepository:
    """Repository class cho Call Center database"""
    
    def __init__(self):
        self.db_path = DB_PATH
    
    def get_conn(self):
        return get_connection()
    
    # ============== RECORD METHODS ==============
    
    def record_exists(self, uuid: str) -> bool:
        """Kiểm tra record đã tồn tại chưa"""
        conn = self.get_conn()
        try:
            cursor = conn.execute(
                "SELECT 1 FROM callcenter_records WHERE uuid = ?", 
                (uuid,)
            )
            return cursor.fetchone() is not None
        finally:
            conn.close()
    
    def upsert_record(self, data: Dict) -> bool:
        """Insert hoặc update call record"""
        conn = self.get_conn()
        try:
            raw_data = json.dumps(data, ensure_ascii=False, default=str)
            
            conn.execute("""
                INSERT OR REPLACE INTO callcenter_records 
                (uuid, caller_id, caller_name, destination, direction,
                 duration, billsec, start_time, answer_time, end_time,
                 disposition, recording_path, raw_data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('uuid'),
                data.get('caller_id'),
                data.get('caller_name'),
                data.get('destination'),
                data.get('direction'),
                data.get('duration', 0),
                data.get('billsec', 0),
                data.get('start_time'),
                data.get('answer_time'),
                data.get('end_time'),
                data.get('disposition'),
                data.get('recording_path'),
                raw_data,
                datetime.now().isoformat()
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"❌ Error upserting record {data.get('uuid')}: {e}")
            return False
        finally:
            conn.close()
    
    def upsert_records_batch(self, records: List[Dict]) -> Dict[str, int]:
        """Insert nhiều records cùng lúc"""
        conn = self.get_conn()
        success_count = 0
        failed_count = 0
        
        try:
            for data in records:
                try:
                    raw_data = json.dumps(data, ensure_ascii=False, default=str)
                    
                    conn.execute("""
                        INSERT OR REPLACE INTO callcenter_records 
                        (uuid, caller_id, caller_name, destination, direction,
                         duration, billsec, start_time, answer_time, end_time,
                         disposition, recording_path, raw_data, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data.get('uuid'),
                        data.get('caller_id'),
                        data.get('caller_name'),
                        data.get('destination'),
                        data.get('direction'),
                        data.get('duration', 0),
                        data.get('billsec', 0),
                        data.get('start_time'),
                        data.get('answer_time'),
                        data.get('end_time'),
                        data.get('disposition'),
                        data.get('recording_path'),
                        raw_data,
                        datetime.now().isoformat()
                    ))
                    success_count += 1
                except Exception as e:
                    print(f"❌ Error inserting record {data.get('uuid')}: {e}")
                    failed_count += 1
            
            conn.commit()
        except Exception as e:
            print(f"❌ Error in batch insert: {e}")
        finally:
            conn.close()
        
        return {'success': success_count, 'failed': failed_count}
    
    def get_record_by_uuid(self, uuid: str) -> Optional[Dict]:
        """Lấy record theo UUID"""
        conn = self.get_conn()
        try:
            cursor = conn.execute(
                "SELECT * FROM callcenter_records WHERE uuid = ?", 
                (uuid,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    def get_records_by_date(self, check_date: date) -> List[Dict]:
        """Lấy tất cả records của một ngày"""
        conn = self.get_conn()
        try:
            date_str = check_date.isoformat()
            next_date_str = (check_date + timedelta(days=1)).isoformat()
            
            cursor = conn.execute("""
                SELECT * FROM callcenter_records 
                WHERE start_time >= ? AND start_time < ?
                ORDER BY start_time
            """, (date_str, next_date_str))
            
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_uuids_by_date(self, check_date: date) -> set:
        """Lấy danh sách UUID của một ngày"""
        conn = self.get_conn()
        try:
            date_str = check_date.isoformat()
            next_date_str = (check_date + timedelta(days=1)).isoformat()
            
            cursor = conn.execute("""
                SELECT uuid FROM callcenter_records 
                WHERE start_time >= ? AND start_time < ?
            """, (date_str, next_date_str))
            
            return {row['uuid'] for row in cursor.fetchall()}
        finally:
            conn.close()
    
    def get_total_records(self) -> int:
        """Đếm tổng số records"""
        conn = self.get_conn()
        try:
            cursor = conn.execute("SELECT COUNT(*) FROM callcenter_records")
            return cursor.fetchone()[0]
        finally:
            conn.close()
    
    def get_records_stats(self) -> Dict:
        """Lấy thống kê records"""
        conn = self.get_conn()
        try:
            # Total records
            cursor = conn.execute("SELECT COUNT(*) FROM callcenter_records")
            total = cursor.fetchone()[0]
            
            # By direction
            cursor = conn.execute("""
                SELECT direction, COUNT(*) as count 
                FROM callcenter_records 
                GROUP BY direction
            """)
            by_direction = {row['direction']: row['count'] for row in cursor.fetchall()}
            
            # By disposition
            cursor = conn.execute("""
                SELECT disposition, COUNT(*) as count 
                FROM callcenter_records 
                GROUP BY disposition
            """)
            by_disposition = {row['disposition']: row['count'] for row in cursor.fetchall()}
            
            # Date range
            cursor = conn.execute("""
                SELECT MIN(start_time) as min_date, MAX(start_time) as max_date 
                FROM callcenter_records
            """)
            row = cursor.fetchone()
            
            return {
                'total': total,
                'by_direction': by_direction,
                'by_disposition': by_disposition,
                'min_date': row['min_date'],
                'max_date': row['max_date']
            }
        finally:
            conn.close()
    
    # ============== SYNC LOG METHODS ==============
    
    def create_sync_log(self, sync_type: str, date_from: date, date_to: date) -> int:
        """Tạo sync log mới"""
        conn = self.get_conn()
        try:
            cursor = conn.execute("""
                INSERT INTO callcenter_sync_logs 
                (sync_type, status, start_time, date_from, date_to)
                VALUES (?, 'running', ?, ?, ?)
            """, (
                sync_type,
                datetime.now().isoformat(),
                date_from.isoformat(),
                date_to.isoformat()
            ))
            conn.commit()
            return cursor.lastrowid
        finally:
            conn.close()
    
    def update_sync_log(self, log_id: int, status: str, total_records: int = 0,
                        success_count: int = 0, failed_count: int = 0,
                        error_message: str = None, failed_items: List = None) -> bool:
        """Cập nhật sync log"""
        conn = self.get_conn()
        try:
            failed_items_json = json.dumps(failed_items) if failed_items else None
            
            conn.execute("""
                UPDATE callcenter_sync_logs 
                SET status = ?, end_time = ?, total_records = ?,
                    success_count = ?, failed_count = ?,
                    error_message = ?, failed_items = ?, updated_at = ?
                WHERE id = ?
            """, (
                status,
                datetime.now().isoformat(),
                total_records,
                success_count,
                failed_count,
                error_message,
                failed_items_json,
                datetime.now().isoformat(),
                log_id
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"❌ Error updating sync log: {e}")
            return False
        finally:
            conn.close()
    
    def increment_retry_count(self, log_id: int) -> bool:
        """Tăng retry count của sync log"""
        conn = self.get_conn()
        try:
            conn.execute("""
                UPDATE callcenter_sync_logs 
                SET retry_count = retry_count + 1, status = 'retrying', updated_at = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), log_id))
            conn.commit()
            return True
        finally:
            conn.close()
    
    def get_failed_sync_logs(self, max_retries: int = 3, limit: int = 3) -> List[Dict]:
        """Lấy danh sách sync logs đã thất bại cần retry"""
        conn = self.get_conn()
        try:
            cursor = conn.execute("""
                SELECT * FROM callcenter_sync_logs 
                WHERE status IN ('failed', 'partial') AND retry_count < ?
                ORDER BY created_at ASC
                LIMIT ?
            """, (max_retries, limit))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_last_sync_log(self, sync_type: str = None) -> Optional[Dict]:
        """Lấy sync log gần nhất"""
        conn = self.get_conn()
        try:
            if sync_type:
                cursor = conn.execute("""
                    SELECT * FROM callcenter_sync_logs 
                    WHERE sync_type = ?
                    ORDER BY created_at DESC LIMIT 1
                """, (sync_type,))
            else:
                cursor = conn.execute("""
                    SELECT * FROM callcenter_sync_logs 
                    ORDER BY created_at DESC LIMIT 1
                """)
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    def get_sync_logs(self, limit: int = 10) -> List[Dict]:
        """Lấy danh sách sync logs gần đây"""
        conn = self.get_conn()
        try:
            cursor = conn.execute("""
                SELECT * FROM callcenter_sync_logs 
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()


# Singleton instance
repo = CallCenterRepository()
