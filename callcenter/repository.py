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
    
    # ============== PBX RECORD METHODS ==============
    
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
    
    def upsert_pbx_record(self, data: Dict) -> bool:
        """Insert hoặc update PBX call record với format mới"""
        conn = self.get_conn()
        try:
            raw_data = json.dumps(data, ensure_ascii=False, default=str)
            
            # Convert epoch to datetime for legacy fields
            start_epoch = int(data.get('start_epoch', 0) or 0)
            end_epoch = int(data.get('end_epoch', 0) or 0)
            answer_epoch = int(data.get('answer_epoch', 0) or 0)
            
            start_time = datetime.fromtimestamp(start_epoch).isoformat() if start_epoch else None
            end_time = datetime.fromtimestamp(end_epoch).isoformat() if end_epoch else None
            answer_time = datetime.fromtimestamp(answer_epoch).isoformat() if answer_epoch else None
            
            conn.execute("""
                INSERT OR REPLACE INTO callcenter_records 
                (uuid, direction, caller_id_number, outbound_caller_id_number, 
                 destination_number, start_epoch, end_epoch, answer_epoch,
                 duration, billsec, sip_hangup_disposition, call_status, record_path,
                 caller_id, destination, start_time, answer_time, end_time, disposition,
                 raw_data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('uuid'),
                data.get('direction'),
                data.get('caller_id_number'),
                data.get('outbound_caller_id_number'),
                data.get('destination_number'),
                start_epoch,
                end_epoch,
                answer_epoch,
                int(data.get('duration', 0) or 0),
                int(data.get('billsec', 0) or 0),
                data.get('sip_hangup_disposition'),
                data.get('call_status'),
                data.get('record_path'),
                # Legacy fields
                data.get('caller_id_number'),  # caller_id = extension
                data.get('destination_number'),  # destination
                start_time,
                answer_time,
                end_time,
                data.get('call_status'),  # disposition = call_status
                raw_data,
                datetime.now().isoformat()
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"❌ Error upserting PBX record {data.get('uuid')}: {e}")
            return False
        finally:
            conn.close()
    
    def upsert_pbx_records_batch(self, records: List[Dict]) -> Dict[str, int]:
        """Insert nhiều PBX records cùng lúc"""
        conn = self.get_conn()
        success_count = 0
        failed_count = 0
        
        try:
            for data in records:
                try:
                    raw_data = json.dumps(data, ensure_ascii=False, default=str)
                    
                    start_epoch = int(data.get('start_epoch', 0) or 0)
                    end_epoch = int(data.get('end_epoch', 0) or 0)
                    answer_epoch = int(data.get('answer_epoch', 0) or 0)
                    
                    start_time = datetime.fromtimestamp(start_epoch).isoformat() if start_epoch else None
                    end_time = datetime.fromtimestamp(end_epoch).isoformat() if end_epoch else None
                    answer_time = datetime.fromtimestamp(answer_epoch).isoformat() if answer_epoch else None
                    
                    conn.execute("""
                        INSERT OR REPLACE INTO callcenter_records 
                        (uuid, direction, caller_id_number, outbound_caller_id_number, 
                         destination_number, start_epoch, end_epoch, answer_epoch,
                         duration, billsec, sip_hangup_disposition, call_status, record_path,
                         caller_id, destination, start_time, answer_time, end_time, disposition,
                         raw_data, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data.get('uuid'),
                        data.get('direction'),
                        data.get('caller_id_number'),
                        data.get('outbound_caller_id_number'),
                        data.get('destination_number'),
                        start_epoch,
                        end_epoch,
                        answer_epoch,
                        int(data.get('duration', 0) or 0),
                        int(data.get('billsec', 0) or 0),
                        data.get('sip_hangup_disposition'),
                        data.get('call_status'),
                        data.get('record_path'),
                        data.get('caller_id_number'),
                        data.get('destination_number'),
                        start_time,
                        answer_time,
                        end_time,
                        data.get('call_status'),
                        raw_data,
                        datetime.now().isoformat()
                    ))
                    success_count += 1
                except Exception as e:
                    print(f"❌ Error inserting PBX record {data.get('uuid')}: {e}")
                    failed_count += 1
            
            conn.commit()
        except Exception as e:
            print(f"❌ Error in batch insert: {e}")
        finally:
            conn.close()
        
        return {'success': success_count, 'failed': failed_count}
    
    # Legacy method for backward compatibility
    def upsert_record(self, data: Dict) -> bool:
        """Legacy: Insert hoặc update call record"""
        # Check if it's new PBX format
        if 'caller_id_number' in data or 'call_status' in data:
            return self.upsert_pbx_record(data)
        
        # Old format
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
        """Batch insert - auto detect format"""
        if records and ('caller_id_number' in records[0] or 'call_status' in records[0]):
            return self.upsert_pbx_records_batch(records)
        
        # Legacy batch insert
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
                    print(f"❌ Error inserting record: {e}")
                    failed_count += 1
            conn.commit()
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
    
    def get_records_by_extension(self, extension: str, date_from: date = None, date_to: date = None) -> List[Dict]:
        """Lấy records theo extension"""
        conn = self.get_conn()
        try:
            sql = "SELECT * FROM callcenter_records WHERE caller_id_number = ?"
            params = [extension]
            
            if date_from:
                start_epoch = int(datetime.combine(date_from, datetime.min.time()).timestamp())
                sql += " AND start_epoch >= ?"
                params.append(start_epoch)
            
            if date_to:
                end_epoch = int(datetime.combine(date_to, datetime.max.time()).timestamp())
                sql += " AND start_epoch <= ?"
                params.append(end_epoch)
            
            sql += " ORDER BY start_epoch DESC"
            
            cursor = conn.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_call_stats_by_status(self) -> Dict:
        """Thống kê cuộc gọi theo call_status"""
        conn = self.get_conn()
        try:
            cursor = conn.execute("""
                SELECT call_status, COUNT(*) as count,
                       SUM(duration) as total_duration,
                       SUM(billsec) as total_billsec
                FROM callcenter_records 
                GROUP BY call_status
            """)
            return {row['call_status']: {
                'count': row['count'],
                'total_duration': row['total_duration'] or 0,
                'total_billsec': row['total_billsec'] or 0
            } for row in cursor.fetchall()}
        finally:
            conn.close()
    
    # ============== EMPLOYEE METHODS ==============
    
    def upsert_employee(self, data: Dict) -> bool:
        """Insert hoặc update employee"""
        conn = self.get_conn()
        try:
            raw_data = json.dumps(data, ensure_ascii=False, default=str)
            
            conn.execute("""
                INSERT OR REPLACE INTO callcenter_employees 
                (vttech_id, name, code, email, phone, extension,
                 group_id, group_name, department, position, is_active,
                 raw_data, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('vttech_id') or data.get('Id'),
                data.get('name') or data.get('Name'),
                data.get('code') or data.get('Code'),
                data.get('email') or data.get('Email'),
                data.get('phone') or data.get('Phone'),
                data.get('extension') or data.get('Extension'),
                data.get('group_id') or data.get('GroupId'),
                data.get('group_name') or data.get('GroupName'),
                data.get('department') or data.get('Department'),
                data.get('position') or data.get('Position'),
                1 if data.get('is_active', True) else 0,
                raw_data,
                datetime.now().isoformat()
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"❌ Error upserting employee {data.get('name')}: {e}")
            return False
        finally:
            conn.close()
    
    def upsert_employees_batch(self, employees: List[Dict]) -> Dict[str, int]:
        """Batch insert employees"""
        conn = self.get_conn()
        success_count = 0
        failed_count = 0
        
        try:
            for data in employees:
                try:
                    raw_data = json.dumps(data, ensure_ascii=False, default=str)
                    
                    conn.execute("""
                        INSERT OR REPLACE INTO callcenter_employees 
                        (vttech_id, name, code, email, phone, extension,
                         group_id, group_name, department, position, is_active,
                         raw_data, updated_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        data.get('vttech_id') or data.get('Id'),
                        data.get('name') or data.get('Name'),
                        data.get('code') or data.get('Code'),
                        data.get('email') or data.get('Email'),
                        data.get('phone') or data.get('Phone'),
                        data.get('extension') or data.get('Extension'),
                        data.get('group_id') or data.get('GroupId'),
                        data.get('group_name') or data.get('GroupName'),
                        data.get('department') or data.get('Department'),
                        data.get('position') or data.get('Position'),
                        1 if data.get('is_active', True) else 0,
                        raw_data,
                        datetime.now().isoformat()
                    ))
                    success_count += 1
                except Exception as e:
                    print(f"❌ Error inserting employee: {e}")
                    failed_count += 1
            conn.commit()
        finally:
            conn.close()
        
        return {'success': success_count, 'failed': failed_count}
    
    def get_employees(self, active_only: bool = True) -> List[Dict]:
        """Lấy danh sách nhân viên"""
        conn = self.get_conn()
        try:
            sql = "SELECT * FROM callcenter_employees"
            if active_only:
                sql += " WHERE is_active = 1"
            sql += " ORDER BY name"
            
            cursor = conn.execute(sql)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_employee_by_extension(self, extension: str) -> Optional[Dict]:
        """Lấy nhân viên theo extension"""
        conn = self.get_conn()
        try:
            cursor = conn.execute(
                "SELECT * FROM callcenter_employees WHERE extension = ?",
                (extension,)
            )
            row = cursor.fetchone()
            return dict(row) if row else None
        finally:
            conn.close()
    
    def get_employee_call_stats(self, extension: str = None, 
                                date_from: date = None, date_to: date = None) -> List[Dict]:
        """Lấy thống kê cuộc gọi theo nhân viên"""
        conn = self.get_conn()
        try:
            sql = """
                SELECT 
                    e.id as employee_id,
                    e.vttech_id,
                    e.name as employee_name,
                    e.extension,
                    e.group_name,
                    COUNT(r.id) as total_calls,
                    SUM(CASE WHEN r.direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls,
                    SUM(CASE WHEN r.direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
                    SUM(CASE WHEN r.call_status = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
                    SUM(CASE WHEN r.call_status = 'CANCELED' THEN 1 ELSE 0 END) as canceled_calls,
                    SUM(CASE WHEN r.call_status = 'NO_ANSWER' THEN 1 ELSE 0 END) as no_answer_calls,
                    SUM(CASE WHEN r.call_status = 'BUSY' THEN 1 ELSE 0 END) as busy_calls,
                    COALESCE(SUM(r.duration), 0) as total_duration,
                    COALESCE(SUM(r.billsec), 0) as total_billsec,
                    COALESCE(AVG(r.billsec), 0) as avg_billsec
                FROM callcenter_employees e
                LEFT JOIN callcenter_records r ON e.extension = r.caller_id_number
            """
            
            where_clauses = ["e.is_active = 1"]
            params = []
            
            if extension:
                where_clauses.append("e.extension = ?")
                params.append(extension)
            
            if date_from:
                start_epoch = int(datetime.combine(date_from, datetime.min.time()).timestamp())
                where_clauses.append("(r.start_epoch >= ? OR r.id IS NULL)")
                params.append(start_epoch)
            
            if date_to:
                end_epoch = int(datetime.combine(date_to, datetime.max.time()).timestamp())
                where_clauses.append("(r.start_epoch <= ? OR r.id IS NULL)")
                params.append(end_epoch)
            
            if where_clauses:
                sql += " WHERE " + " AND ".join(where_clauses)
            
            sql += " GROUP BY e.id, e.extension ORDER BY total_calls DESC"
            
            cursor = conn.execute(sql, params)
            return [dict(row) for row in cursor.fetchall()]
        finally:
            conn.close()
    
    def get_employee_detail_calls(self, extension: str, 
                                   date_from: date = None, date_to: date = None,
                                   limit: int = 100) -> Dict:
        """Lấy chi tiết cuộc gọi của một nhân viên"""
        conn = self.get_conn()
        try:
            # Get employee info
            cursor = conn.execute(
                "SELECT * FROM callcenter_employees WHERE extension = ?",
                (extension,)
            )
            employee = cursor.fetchone()
            employee_data = dict(employee) if employee else None
            
            # Get calls
            sql = "SELECT * FROM callcenter_records WHERE caller_id_number = ?"
            params = [extension]
            
            if date_from:
                start_epoch = int(datetime.combine(date_from, datetime.min.time()).timestamp())
                sql += " AND start_epoch >= ?"
                params.append(start_epoch)
            
            if date_to:
                end_epoch = int(datetime.combine(date_to, datetime.max.time()).timestamp())
                sql += " AND start_epoch <= ?"
                params.append(end_epoch)
            
            sql += " ORDER BY start_epoch DESC LIMIT ?"
            params.append(limit)
            
            cursor = conn.execute(sql, params)
            calls = [dict(row) for row in cursor.fetchall()]
            
            # Get stats
            stats_sql = """
                SELECT 
                    COUNT(*) as total_calls,
                    SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls,
                    SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
                    SUM(CASE WHEN call_status = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
                    SUM(CASE WHEN call_status = 'CANCELED' THEN 1 ELSE 0 END) as canceled_calls,
                    SUM(duration) as total_duration,
                    SUM(billsec) as total_billsec
                FROM callcenter_records WHERE caller_id_number = ?
            """
            params_stats = [extension]
            
            if date_from:
                stats_sql += " AND start_epoch >= ?"
                params_stats.append(start_epoch)
            if date_to:
                stats_sql += " AND start_epoch <= ?"
                params_stats.append(end_epoch)
            
            cursor = conn.execute(stats_sql, params_stats)
            stats = dict(cursor.fetchone())
            
            return {
                'employee': employee_data,
                'calls': calls,
                'stats': stats
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
