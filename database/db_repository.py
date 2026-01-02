#!/usr/bin/env python3
"""
VTTech Database Repository
Sử dụng Prisma Client để giao tiếp với PostgreSQL
"""

import os
from datetime import datetime, date as py_date
from typing import List, Dict, Optional, Any
from prisma import Prisma
from prisma.models import (
    Branch, Service, Employee, DailyRevenue, CrawlLog, 
    Customer, Appointment, Treatment, ServiceGroup, 
    ServiceType, EmployeeGroup, CustomerSource, Membership,
    City, District, Ward, CustomerPayment, CustomerInstallment,
    CustomerComplaint, CustomerTreatmentPlan, CustomerServiceTab,
    CustomerCareHistory, MarketingTicketExtension, MarketingTicketGroup
)

class VTTechDB:
    """Database repository class using Prisma"""
    
    def __init__(self):
        self.prisma = Prisma()
        self.is_connected = False

    def connect(self):
        if not self.is_connected:
            self.prisma.connect()
            self.is_connected = True

    def disconnect(self):
        if self.is_connected:
            self.prisma.disconnect()
            self.is_connected = False

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()

    def _parse_date(self, d):
        if not d: return None
        if isinstance(d, datetime): return d
        if isinstance(d, py_date): return datetime.combine(d, datetime.min.time())
        try:
            if isinstance(d, str):
                if 'T' in d: return datetime.fromisoformat(d.replace('Z', '+00:00'))
                return datetime.strptime(d.split('.')[0], "%Y-%m-%d %H:%M:%S")
        except:
            try:
                return datetime.strptime(d, "%Y-%m-%d")
            except:
                return None
        return None

    # ============== WRITE METHODS ==============
    
    def upsert_branch(self, data: Dict) -> bool:
        """Insert or update branch"""
        self.connect()
        try:
            bid = int(data.get('ID'))
            self.prisma.branch.upsert(
                where={'id': bid},
                data={
                    'create': {
                        'id': bid,
                        'code': data.get('Code', data.get('ShortName', '')),
                        'name': data.get('Name'),
                        'address': data.get('Address', ''),
                        'phone': data.get('Phone', ''),
                        'email': data.get('Email', ''),
                        'is_active': 1 if data.get('IsActive', True) else 0,
                    },
                    'update': {
                        'code': data.get('Code', data.get('ShortName', '')),
                        'name': data.get('Name'),
                        'address': data.get('Address', ''),
                        'phone': data.get('Phone', ''),
                        'email': data.get('Email', ''),
                        'is_active': 1 if data.get('IsActive', True) else 0,
                        'updated_at': datetime.now()
                    }
                }
            )
            return True
        except Exception as e:
            return False

    def upsert_branches(self, branches: List[Dict]) -> int:
        count = 0
        for b in branches:
            if self.upsert_branch(b): count += 1
        return count
    
    def upsert_service(self, data: Dict) -> bool:
        self.connect()
        try:
            sid = int(data.get('ID'))
            self.prisma.service.upsert(
                where={'id': sid},
                data={
                    'create': {
                        'id': sid,
                        'code': data.get('Code', ''),
                        'name': data.get('Name'),
                        'group_id': data.get('GroupID', data.get('Type') or data.get('CatID')),
                        'price': float(data.get('Price', 0)),
                        'is_active': 1 if data.get('State', 1) == 1 else 0,
                    },
                    'update': {
                        'code': data.get('Code', ''),
                        'name': data.get('Name'),
                        'group_id': data.get('GroupID', data.get('Type') or data.get('CatID')),
                        'price': float(data.get('Price', 0)),
                        'is_active': 1 if data.get('State', 1) == 1 else 0,
                        'updated_at': datetime.now()
                    }
                }
            )
            return True
        except Exception as e:
            return False

    def upsert_services(self, services: List[Dict]) -> int:
        count = 0
        for s in services:
            if self.upsert_service(s): count += 1
        return count

    def upsert_service_groups(self, groups: List[Dict]) -> int:
        self.connect()
        count = 0
        for g in groups:
            try:
                gid = int(g.get('ID'))
                self.prisma.servicegroup.upsert(
                    where={'id': gid},
                    data={
                        'create': {'id': gid, 'code': g.get('Code', ''), 'name': g.get('Name'), 'parent_id': g.get('ParentID')},
                        'update': {'code': g.get('Code', ''), 'name': g.get('Name'), 'parent_id': g.get('ParentID')}
                    }
                )
                count += 1
            except: pass
        return count

    def upsert_employees(self, employees: List[Dict]) -> int:
        self.connect()
        count = 0
        for e in employees:
            try:
                eid = int(e.get('ID'))
                self.prisma.employee.upsert(
                    where={'id': eid},
                    data={
                        'create': {
                            'id': eid, 'code': e.get('Code', ''), 'name': e.get('Name'), 
                            'branch_id': e.get('BranchID'), 'position': e.get('Position', ''),
                            'phone': e.get('Phone', ''), 'email': e.get('Email', ''),
                            'is_active': 1 if e.get('State', 1) == 1 else 0,
                        },
                        'update': {
                            'code': e.get('Code', ''), 'name': e.get('Name'), 
                            'branch_id': e.get('BranchID'), 'position': e.get('Position', ''),
                            'phone': e.get('Phone', ''), 'email': e.get('Email', ''),
                            'is_active': 1 if e.get('State', 1) == 1 else 0,
                            'updated_at': datetime.now()
                        }
                    }
                )
                count += 1
            except: pass
        return count

    def upsert_users(self, users: List[Dict]) -> int:
        self.connect()
        count = 0
        for u in users:
            try:
                uid = int(u.get('ID'))
                self.prisma.user.upsert(
                    where={'id': uid},
                    data={
                        'create': {
                            'id': uid, 'username': u.get('Username', u.get('Name', '')),
                            'full_name': u.get('FullName', u.get('EmployeeName', u.get('Name', ''))),
                            'email': u.get('Email', ''), 'phone': u.get('Phone', ''),
                            'branch_id': u.get('BranchID'), 'role': str(u.get('RoleID', '')),
                        },
                        'update': {
                            'username': u.get('Username', u.get('Name', '')),
                            'full_name': u.get('FullName', u.get('EmployeeName', u.get('Name', ''))),
                            'email': u.get('Email', ''), 'phone': u.get('Phone', ''),
                            'branch_id': u.get('BranchID'), 'role': str(u.get('RoleID', '')),
                        }
                    }
                )
                count += 1
            except: pass
        return count

    def upsert_customer_sources(self, sources: List[Dict]) -> int:
        self.connect()
        count = 0
        for s in sources:
            try:
                sid = int(s.get('ID'))
                self.prisma.customersource.upsert(
                    where={'id': sid},
                    data={
                        'create': {'id': sid, 'code': s.get('Code', ''), 'name': s.get('Name'), 'parent_id': s.get('ParentID', s.get('SPID'))},
                        'update': {'code': s.get('Code', ''), 'name': s.get('Name'), 'parent_id': s.get('ParentID', s.get('SPID'))}
                    }
                )
                count += 1
            except: pass
        return count

    def upsert_daily_revenue(self, date_str: str, branch_id: int, data: Dict) -> bool:
        self.connect()
        try:
            dt = self._parse_date(date_str)
            if not dt: return False
            self.prisma.dailyrevenue.upsert(
                where={'date_branch_id': {'date': dt, 'branch_id': branch_id}},
                data={
                    'create': {
                        'date': dt, 'branch_id': branch_id, 'branch_name': data.get('BranchName'),
                        'paid': float(data.get('Paid', 0)), 'paid_new': float(data.get('PaidNew', 0)),
                        'raise_amount': float(data.get('Raise', 0)), 'num_customers': int(data.get('PaidNumCust', 0) or data.get('CustomerCount', 0)),
                        'num_appointments': int(data.get('App', 0)), 'num_checked_in': int(data.get('AppChecked', 0))
                    },
                    'update': {
                        'branch_name': data.get('BranchName'), 'paid': float(data.get('Paid', 0)),
                        'paid_new': float(data.get('PaidNew', 0)), 'raise_amount': float(data.get('Raise', 0)),
                        'num_customers': int(data.get('PaidNumCust', 0) or data.get('CustomerCount', 0)),
                        'num_appointments': int(data.get('App', 0)), 'num_checked_in': int(data.get('AppChecked', 0))
                    }
                }
            )
            return True
        except Exception as e:
            return False
    
    def insert_daily_revenue_batch(self, date_str: str, records: List[Dict]) -> int:
        count = 0
        for data in records:
            if self.upsert_daily_revenue(date_str, data.get('BranchID'), data): count += 1
        return count

    def upsert_customers(self, customers: List[Dict]) -> int:
        self.connect()
        count = 0
        
        # Pre-fetch existing IDs to avoid foreign key violations
        try:
            existing_branches = {b.id for b in self.prisma.branch.find_many()}
            existing_sources = {s.id for s in self.prisma.customersource.find_many()}
            existing_memberships = {m.id for m in self.prisma.membership.find_many()}
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Error pre-fetching IDs: {e}")
            existing_branches = set()
            existing_sources = set()
            existing_memberships = set()

        for c in customers:
            try:
                # Handle both ID and CustID
                cid = c.get('ID') or c.get('CustID')
                if cid is None:
                    continue
                cid = int(cid)
                
                # Parse necessary dates
                birthday = self._parse_date(c.get('Birthday', c.get('BirthDay')))
                created_at = self._parse_date(c.get('CreatedDate', c.get('CreateDate')))
                
                # Validate foreign keys
                branch_id = c.get('BranchID')
                if branch_id is not None:
                    branch_id = int(branch_id)
                    if branch_id not in existing_branches:
                        branch_id = None
                
                source_id = c.get('SourceID', c.get('CustomerSourceID'))
                if source_id is not None:
                    source_id = int(source_id)
                    if source_id not in existing_sources:
                        source_id = None
                
                membership_id = c.get('MembershipID')
                if membership_id is not None:
                    membership_id = int(membership_id)
                    if membership_id not in existing_memberships:
                        membership_id = None
                
                self.prisma.customer.upsert(
                    where={'id': cid},
                    data={
                        'create': {
                            'id': cid, 
                            'code': c.get('Code', c.get('CustCode', '')), 
                            'name': c.get('Name', c.get('CustomerName', c.get('CustName', ''))),
                            'phone': c.get('Phone', c.get('Mobile', c.get('CustPhone', ''))), 
                            'email': c.get('Email', ''),
                            'gender': int(c.get('Gender', c.get('Sex', 0)) or 0), 
                            'birthday': birthday,
                            'address': c.get('Address', ''), 
                            'city_id': c.get('CityID'), 
                            'district_id': c.get('DistrictID'),
                            'ward_id': c.get('WardID'), 
                            'branch_id': branch_id, 
                            'source_id': source_id, 
                            'membership_id': membership_id,
                            'total_spent': float(c.get('TotalSpent', c.get('TotalPaid', 0) or 0)), 
                            'total_debt': float(c.get('TotalDebt', c.get('Debt', 0) or 0)),
                            'point': int(c.get('Point', 0) or 0), 
                            'created_at': created_at or datetime.now()
                        },
                        'update': {
                            'code': c.get('Code', c.get('CustCode', '')), 
                            'name': c.get('Name', c.get('CustomerName', c.get('CustName', ''))),
                            'phone': c.get('Phone', c.get('Mobile', c.get('CustPhone', ''))), 
                            'email': c.get('Email', ''),
                            'gender': int(c.get('Gender', c.get('Sex', 0)) or 0), 
                            'birthday': birthday,
                            'address': c.get('Address', ''), 
                            'city_id': c.get('CityID'), 
                            'district_id': c.get('DistrictID'),
                            'ward_id': c.get('WardID'), 
                            'branch_id': branch_id, 
                            'source_id': source_id, 
                            'membership_id': membership_id,
                            'total_spent': float(c.get('TotalSpent', c.get('TotalPaid', 0) or 0)), 
                            'total_debt': float(c.get('TotalDebt', c.get('Debt', 0) or 0)),
                            'point': int(c.get('Point', 0) or 0), 
                            'updated_at': datetime.now()
                        }
                    }
                )
                count += 1
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error upserting customer {c.get('ID') or c.get('CustID')}: {e}")
        return count

    def upsert_appointments(self, appointments: List[Dict]) -> int:
        self.connect()
        count = 0
        for a in appointments:
            try:
                aid = int(a.get('ID'))
                self.prisma.appointment.upsert(
                    where={'id': aid},
                    data={
                        'create': {
                            'id': aid, 'customer_id': a.get('CustomerID'), 'customer_name': a.get('CustomerName', a.get('Name', '')),
                            'phone': a.get('Phone', a.get('Mobile', '')), 'branch_id': a.get('BranchID'), 'branch_name': a.get('BranchName', ''),
                            'service_id': a.get('ServiceID'), 'service_name': a.get('ServiceName', ''),
                            'employee_id': a.get('EmployeeID', a.get('DoctorID')), 'employee_name': a.get('EmployeeName', a.get('DoctorName', '')),
                            'appointment_date': self._parse_date(a.get('AppointmentDate', a.get('DateApp', a.get('Date')))),
                            'status': int(a.get('Status', 0)), 'note': a.get('Note', ''),
                        },
                        'update': {
                            'customer_id': a.get('CustomerID'), 'customer_name': a.get('CustomerName', a.get('Name', '')),
                            'phone': a.get('Phone', a.get('Mobile', '')), 'branch_id': a.get('BranchID'), 'branch_name': a.get('BranchName', ''),
                            'service_id': a.get('ServiceID'), 'service_name': a.get('ServiceName', ''),
                            'employee_id': a.get('EmployeeID', a.get('DoctorID')), 'employee_name': a.get('EmployeeName', a.get('DoctorName', '')),
                            'appointment_date': self._parse_date(a.get('AppointmentDate', a.get('DateApp', a.get('Date')))),
                            'status': int(a.get('Status', 0)), 'note': a.get('Note', ''), 'updated_at': datetime.now()
                        }
                    }
                )
                count += 1
            except: pass
        return count

    def upsert_customer_payment(self, customer_id: int, data: Dict) -> bool:
        self.connect()
        try:
            pid = data.get('ID') or data.get('PaymentID')
            if pid: pid = int(pid)
            self.prisma.customerpayment.upsert(
                where={'customer_id_payment_id': {'customer_id': customer_id, 'payment_id': pid}},
                data={
                    'create': {
                        'customer_id': customer_id, 'payment_id': pid, 'amount': float(data.get('Amount', data.get('Paid', 0)) or 0),
                        'payment_date': self._parse_date(data.get('PaymentDate', data.get('Date'))),
                        'payment_method': data.get('PaymentMethod', data.get('Method', '') or ''),
                        'note': data.get('Note', data.get('Remark', '') or ''), 'signature_data': data.get('Signature', '') or ''
                    },
                    'update': {
                        'amount': float(data.get('Amount', data.get('Paid', 0)) or 0),
                        'payment_date': self._parse_date(data.get('PaymentDate', data.get('Date'))),
                        'payment_method': data.get('PaymentMethod', data.get('Method', '') or ''),
                        'note': data.get('Note', data.get('Remark', '') or ''), 'signature_data': data.get('Signature', '') or ''
                    }
                }
            )
            return True
        except: return False

    def upsert_customer_service_tab(self, customer_id: int, data: Dict) -> bool:
        self.connect()
        try:
            sid = data.get('ID') or data.get('TabID')
            if sid: sid = int(sid)
            self.prisma.customerservicetab.upsert(
                where={'id': sid},
                data={
                    'create': {
                        'id': sid,
                        'customer_id': customer_id,
                        'service_id': data.get('ServiceID'),
                        'service_name': data.get('ServiceName', data.get('Name')),
                        'quantity': int(data.get('Quantity', 1) or 1),
                        'price': float(data.get('Price', 0) or 0),
                        'discount': float(data.get('Discount', 0) or 0),
                        'total': float(data.get('Total', 0) or 0),
                        'created_at': self._parse_date(data.get('CreatedDate', data.get('Date'))),
                        'status': str(data.get('Status', ''))
                    },
                    'update': {
                        'customer_id': customer_id,
                        'service_id': data.get('ServiceID'),
                        'service_name': data.get('ServiceName', data.get('Name')),
                        'quantity': int(data.get('Quantity', 1) or 1),
                        'price': float(data.get('Price', 0) or 0),
                        'discount': float(data.get('Discount', 0) or 0),
                        'total': float(data.get('Total', 0) or 0),
                        'created_at': self._parse_date(data.get('CreatedDate', data.get('Date'))),
                        'status': str(data.get('Status', ''))
                    }
                }
            )
            return True
        except: return False

    def upsert_customer_care_history(self, customer_id: int, data: Dict) -> bool:
        self.connect()
        try:
            hid = data.get('ID') or data.get('HistoryID')
            if hid: hid = int(hid)
            self.prisma.customercarehistory.upsert(
                where={'id': hid},
                data={
                    'create': {
                        'id': hid,
                        'customer_id': customer_id,
                        'action_type': data.get('ActionType', data.get('Type', '')),
                        'action_date': self._parse_date(data.get('ActionDate', data.get('Date'))),
                        'employee_name': data.get('EmployeeName', data.get('User', '')),
                        'note': data.get('Note', data.get('Content', ''))
                    },
                    'update': {
                        'customer_id': customer_id,
                        'action_type': data.get('ActionType', data.get('Type', '')),
                        'action_date': self._parse_date(data.get('ActionDate', data.get('Date'))),
                        'employee_name': data.get('EmployeeName', data.get('User', '')),
                        'note': data.get('Note', data.get('Content', ''))
                    }
                }
            )
            return True
        except: return False

    def log_crawl(self, crawl_date: str, crawl_type: str, status: str, 
                  records_count: int = 0, error_message: str = None, 
                  duration: float = None):
        self.connect()
        try:
            dt = self._parse_date(crawl_date)
            self.prisma.crawllog.create(
                data={
                    'crawl_date': dt or datetime.now(), 'crawl_type': crawl_type, 'status': status,
                    'records_count': records_count, 'error_message': error_message, 'duration_seconds': duration
                }
            )
        except: pass
    
    # ============== READ METHODS ==============
    
    def get_available_dates(self) -> List[str]:
        """Lấy danh sách các ngày có dữ liệu doanh thu"""
        self.connect()
        # Prisma doesn't support SELECT DISTINCT in a simple way for dates, use raw query
        result = self.prisma.query_raw('SELECT DISTINCT date FROM daily_revenue ORDER BY date DESC')
        return [r['date'].split('T')[0] if isinstance(r['date'], str) else r['date'].strftime('%Y-%m-%d') for r in result]

    def get_daily_revenue(self, date_str: str) -> List[Dict]:
        """Lấy doanh thu chi tiết theo ngày"""
        self.connect()
        dt = self._parse_date(date_str)
        if not dt: return []
        records = self.prisma.dailyrevenue.find_many(where={'date': dt}, order={'paid': 'desc'})
        return [r.dict() for r in records]

    def get_daily_summary(self, limit: int = 30) -> List[Dict]:
        """Tổng hợp doanh thu theo ngày"""
        self.connect()
        # Aggregation query
        query = """
            SELECT 
                date,
                SUM(paid) as total_paid,
                SUM(paid_new) as total_paid_new,
                SUM(num_customers) as total_customers,
                SUM(num_appointments) as total_appointments
            FROM daily_revenue
            GROUP BY date
            ORDER BY date DESC
            LIMIT $1
        """
        result = self.prisma.query_raw(query, limit)
        return result

    def get_monthly_summary(self, months: int = 12) -> List[Dict]:
        self.connect()
        query = """
            SELECT 
                TO_CHAR(date, 'YYYY-MM') as month,
                SUM(paid) as total_paid,
                SUM(num_customers) as total_customers,
                COUNT(DISTINCT branch_id) as branch_count
            FROM daily_revenue
            GROUP BY month
            ORDER BY month DESC
            LIMIT $1
        """
        return self.prisma.query_raw(query, months)

    def get_master_counts(self) -> Dict[str, int]:
        self.connect()
        return {
            'branches': self.prisma.branch.count(),
            'services': self.prisma.service.count(),
            'employees': self.prisma.employee.count(),
            'users': self.prisma.user.count(),
            'customers': self.prisma.customer.count()
        }
    
    def get_branches(self) -> List[Dict]:
        self.connect()
        records = self.prisma.branch.find_many(order={'name': 'asc'})
        return [r.dict() for r in records]

    def get_services(self) -> List[Dict]:
        self.connect()
        records = self.prisma.service.find_many(order={'name': 'asc'})
        return [r.dict() for r in records]

    def get_employees(self, branch_id: Optional[int] = None) -> List[Dict]:
        self.connect()
        where = {'branch_id': branch_id} if branch_id else {}
        records = self.prisma.employee.find_many(where=where, order={'name': 'asc'})
        return [r.dict() for r in records]

    def get_crawl_logs(self, limit: int = 50) -> List[Dict]:
        self.connect()
        records = self.prisma.crawllog.find_many(order={'created_at': 'desc'}, take=limit)
        return [r.dict() for r in records]

    def get_branch_performance(self, start_date: str = None, end_date: str = None) -> List[Dict]:
        self.connect()
        query = """
            SELECT 
                branch_id,
                branch_name,
                SUM(paid) as total_paid,
                SUM(num_customers) as total_customers,
                SUM(num_appointments) as total_appointments
            FROM daily_revenue
            WHERE 1=1
        """
        params = []
        if start_date:
            query += " AND date >= $1"
            params.append(self._parse_date(start_date))
        if end_date:
            query += " AND date <= $" + str(len(params) + 1)
            params.append(self._parse_date(end_date))
        
        query += " GROUP BY branch_id, branch_name ORDER BY total_paid DESC"
        return self.prisma.query_raw(query, *params)
        
    def get_trend(self, days: int = 30) -> List[Dict]:
        return self.get_daily_summary(days)

# Singleton instance
db = VTTechDB()
