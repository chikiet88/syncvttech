#!/usr/bin/env python3
"""
VTTech Database Repository
Các hàm tiện ích để đọc/ghi dữ liệu vào SQLite
"""

import sqlite3
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
import sys

sys.path.insert(0, str(Path(__file__).parent))
from init_db import get_connection, DB_PATH


class VTTechDB:
    """Database repository class"""
    
    def __init__(self):
        self.db_path = DB_PATH
    
    def get_conn(self):
        return get_connection()
    
    # ============== WRITE METHODS ==============
    
    def upsert_branch(self, data: Dict) -> bool:
        """Insert or update branch"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT OR REPLACE INTO branches (id, code, name, address, phone, email, is_active, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                data.get('ID'),
                data.get('Code'),
                data.get('Name'),
                data.get('Address'),
                data.get('Phone'),
                data.get('Email'),
                1 if data.get('IsActive', True) else 0,
                datetime.now().isoformat()
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error upserting branch: {e}")
            return False
        finally:
            conn.close()
    
    def upsert_daily_revenue(self, date: str, branch_id: int, data: Dict) -> bool:
        """Insert or update daily revenue"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT OR REPLACE INTO daily_revenue 
                (date, branch_id, branch_name, paid, paid_new, raise_amount, 
                 num_customers, num_appointments, num_checked_in, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                date,
                branch_id,
                data.get('BranchName'),
                data.get('Paid', 0),
                data.get('PaidNew', 0),
                data.get('Raise', 0),
                data.get('PaidNumCust', 0),
                data.get('App', 0),
                data.get('AppChecked', 0),
                datetime.now().isoformat()
            ))
            conn.commit()
            return True
        except Exception as e:
            print(f"Error upserting revenue: {e}")
            return False
        finally:
            conn.close()
    
    def insert_daily_revenue_batch(self, date: str, records: List[Dict]) -> int:
        """Insert nhiều records cùng lúc"""
        conn = self.get_conn()
        count = 0
        try:
            for data in records:
                conn.execute("""
                    INSERT OR REPLACE INTO daily_revenue 
                    (date, branch_id, branch_name, paid, paid_new, raise_amount, 
                     num_customers, num_appointments, num_checked_in)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    date,
                    data.get('BranchID'),
                    data.get('BranchName'),
                    data.get('Paid', 0),
                    data.get('PaidNew', 0),
                    data.get('Raise', 0),
                    data.get('PaidNumCust', 0),
                    data.get('App', 0),
                    data.get('AppChecked', 0)
                ))
                count += 1
            conn.commit()
        except Exception as e:
            print(f"Error batch insert: {e}")
        finally:
            conn.close()
        return count
    
    def log_crawl(self, crawl_date: str, crawl_type: str, status: str, 
                  records_count: int = 0, error_message: str = None, 
                  duration: float = None):
        """Log crawl history"""
        conn = self.get_conn()
        try:
            conn.execute("""
                INSERT INTO crawl_logs (crawl_date, crawl_type, status, records_count, error_message, duration_seconds)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (crawl_date, crawl_type, status, records_count, error_message, duration))
            conn.commit()
        except Exception as e:
            print(f"Error logging crawl: {e}")
        finally:
            conn.close()
    
    # ============== READ METHODS ==============
    
    def get_daily_revenue(self, date: str) -> List[Dict]:
        """Lấy doanh thu theo ngày"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT * FROM daily_revenue WHERE date = ? ORDER BY paid DESC
        """, (date,))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_revenue_range(self, start_date: str, end_date: str) -> List[Dict]:
        """Lấy doanh thu trong khoảng thời gian"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT * FROM daily_revenue 
            WHERE date BETWEEN ? AND ?
            ORDER BY date, branch_id
        """, (start_date, end_date))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_daily_summary(self, limit: int = 30) -> List[Dict]:
        """Lấy tổng hợp doanh thu theo ngày"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT * FROM v_daily_summary LIMIT ?
        """, (limit,))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_monthly_summary(self, limit: int = 12) -> List[Dict]:
        """Lấy tổng hợp doanh thu theo tháng"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT * FROM v_monthly_summary LIMIT ?
        """, (limit,))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_branch_performance(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        """Lấy hiệu suất chi nhánh"""
        conn = self.get_conn()
        
        if start_date and end_date:
            cursor = conn.execute("""
                SELECT 
                    branch_id,
                    branch_name,
                    COUNT(DISTINCT date) as days_active,
                    SUM(paid) as total_paid,
                    AVG(paid) as avg_daily_paid,
                    SUM(num_customers) as total_customers
                FROM daily_revenue
                WHERE date BETWEEN ? AND ?
                GROUP BY branch_id, branch_name
                ORDER BY total_paid DESC
            """, (start_date, end_date))
        else:
            cursor = conn.execute("SELECT * FROM v_branch_performance")
        
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_available_dates(self) -> List[str]:
        """Lấy danh sách các ngày có dữ liệu"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT DISTINCT date FROM daily_revenue ORDER BY date DESC
        """)
        result = [row['date'] for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_latest_date(self) -> Optional[str]:
        """Lấy ngày mới nhất có dữ liệu"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT MAX(date) as latest FROM daily_revenue
        """)
        row = cursor.fetchone()
        conn.close()
        return row['latest'] if row else None
    
    def get_branches(self) -> List[Dict]:
        """Lấy danh sách chi nhánh"""
        conn = self.get_conn()
        cursor = conn.execute("SELECT * FROM branches WHERE is_active = 1 ORDER BY name")
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_services(self, group_id: int = None) -> List[Dict]:
        """Lấy danh sách dịch vụ"""
        conn = self.get_conn()
        if group_id:
            cursor = conn.execute("SELECT * FROM services WHERE group_id = ? AND is_active = 1", (group_id,))
        else:
            cursor = conn.execute("SELECT * FROM services WHERE is_active = 1 ORDER BY name")
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_employees(self, branch_id: int = None) -> List[Dict]:
        """Lấy danh sách nhân viên"""
        conn = self.get_conn()
        if branch_id:
            cursor = conn.execute("SELECT * FROM employees WHERE branch_id = ? AND is_active = 1", (branch_id,))
        else:
            cursor = conn.execute("SELECT * FROM employees WHERE is_active = 1 ORDER BY name")
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    def get_master_counts(self) -> Dict[str, int]:
        """Đếm số lượng master data"""
        conn = self.get_conn()
        counts = {}
        
        for table in ['branches', 'services', 'service_groups', 'employees', 'users', 'customer_sources']:
            cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
            counts[table] = cursor.fetchone()['count']
        
        conn.close()
        return counts
    
    def get_crawl_logs(self, limit: int = 50) -> List[Dict]:
        """Lấy log crawl"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT * FROM crawl_logs ORDER BY created_at DESC LIMIT ?
        """, (limit,))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return result
    
    # ============== ANALYSIS METHODS ==============
    
    def compare_periods(self, period1_start: str, period1_end: str, 
                        period2_start: str, period2_end: str) -> Dict:
        """So sánh 2 giai đoạn"""
        conn = self.get_conn()
        
        result = {}
        for period_name, start, end in [
            ('period1', period1_start, period1_end),
            ('period2', period2_start, period2_end)
        ]:
            cursor = conn.execute("""
                SELECT 
                    SUM(paid) as total_paid,
                    SUM(paid_new) as total_paid_new,
                    SUM(num_customers) as total_customers,
                    COUNT(DISTINCT date) as days,
                    COUNT(DISTINCT branch_id) as branches
                FROM daily_revenue
                WHERE date BETWEEN ? AND ?
            """, (start, end))
            result[period_name] = dict(cursor.fetchone())
        
        # Calculate growth
        if result['period1']['total_paid'] and result['period2']['total_paid']:
            result['growth_rate'] = (
                (result['period2']['total_paid'] - result['period1']['total_paid']) 
                / result['period1']['total_paid'] * 100
            )
        
        conn.close()
        return result
    
    def get_trend(self, days: int = 30) -> List[Dict]:
        """Lấy xu hướng N ngày gần nhất"""
        conn = self.get_conn()
        cursor = conn.execute("""
            SELECT 
                date,
                SUM(paid) as total_paid,
                SUM(paid_new) as total_paid_new,
                SUM(num_customers) as total_customers
            FROM daily_revenue
            GROUP BY date
            ORDER BY date DESC
            LIMIT ?
        """, (days,))
        result = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return list(reversed(result))


# Singleton instance
db = VTTechDB()


if __name__ == "__main__":
    # Test
    print("Testing VTTechDB...")
    
    print(f"\n📊 Master counts: {db.get_master_counts()}")
    print(f"\n📅 Available dates: {db.get_available_dates()[:5]}")
    print(f"\n📈 Daily summary: {db.get_daily_summary(5)}")
