#!/usr/bin/env python3
"""
VTTech Dashboard API Server
Serve dữ liệu cho frontend báo cáo
Sử dụng SQLite database cho query nhanh
"""

from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from pathlib import Path
from datetime import datetime, timedelta
import json
import os
import sys

# Import database module
sys.path.insert(0, str(Path(__file__).parent / 'database'))
try:
    from db_repository import db as vttech_db
    USE_DATABASE = True
except ImportError:
    USE_DATABASE = False
    vttech_db = None

app = Flask(__name__, static_folder='dashboard')
CORS(app)

# Config
BASE_DIR = Path(__file__).parent
DATA_DAILY_DIR = BASE_DIR / "data_daily"
DATA_OUTPUT_DIR = BASE_DIR / "data_output"

def load_json(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def get_available_dates_from_files():
    """Lấy danh sách các ngày có dữ liệu từ files"""
    revenue_dir = DATA_DAILY_DIR / "revenue"
    if not revenue_dir.exists():
        return []
    
    dates = []
    for f in revenue_dir.glob("revenue_*.json"):
        date_str = f.stem.replace("revenue_", "")
        dates.append(f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}")
    
    return sorted(dates, reverse=True)

# ============== API ROUTES ==============

@app.route('/')
def index():
    """Serve main dashboard with navigation"""
    return send_from_directory('dashboard', 'analytics.html')

@app.route('/main')
def main_dashboard():
    """Serve main dashboard"""
    return send_from_directory('dashboard', 'main.html')

@app.route('/old')
def old_dashboard():
    """Serve old dashboard"""
    return send_from_directory('dashboard', 'index.html')

@app.route('/api/summary')
def api_summary():
    """Tổng quan dữ liệu"""
    
    if USE_DATABASE:
        # Use database
        dates = vttech_db.get_available_dates()
        master_counts = vttech_db.get_master_counts()
        
        total_revenue = 0
        branch_count = 0
        
        if dates:
            latest_revenue = vttech_db.get_daily_revenue(dates[0])
            total_revenue = sum(r.get('paid', 0) for r in latest_revenue)
            branch_count = len(latest_revenue)
        
        return jsonify({
            'latest_date': dates[0] if dates else None,
            'available_dates': dates[:30],
            'total_revenue': total_revenue,
            'branch_count': branch_count,
            'master_counts': master_counts,
            'source': 'database'
        })
    
    else:
        # Fallback to JSON files
        dates = get_available_dates_from_files()
    
    # Lấy dữ liệu ngày gần nhất
    latest_revenue = []
    total_revenue = 0
    
    if dates:
        latest_date = dates[0].replace("-", "")
        revenue_file = DATA_DAILY_DIR / "revenue" / f"revenue_{latest_date}.json"
        if revenue_file.exists():
            latest_revenue = load_json(revenue_file) or []
            total_revenue = sum(r.get('Paid', 0) for r in latest_revenue)
    
    # Lấy master data count
    master_counts = {}
    master_files = ['branches', 'services', 'employees', 'users']
    for name in master_files:
        data = load_json(DATA_OUTPUT_DIR / f"{name}.json")
        if data:
            master_counts[name] = len(data)
    
    return jsonify({
        'latest_date': dates[0] if dates else None,
        'available_dates': dates[:30],  # 30 ngày gần nhất
        'total_revenue': total_revenue,
        'branch_count': len(latest_revenue),
        'master_counts': master_counts
    })

@app.route('/api/revenue/<date>')
def api_revenue_by_date(date):
    """Doanh thu theo ngày"""
    if USE_DATABASE:
        data = vttech_db.get_daily_revenue(date)
        # Convert to match JSON format
        result = []
        for r in data:
            result.append({
                'BranchID': r.get('branch_id'),
                'BranchName': r.get('branch_name'),
                'Paid': r.get('paid', 0),
                'PaidNew': r.get('paid_new', 0),
                'Raise': r.get('raise_amount', 0),
                'PaidNumCust': r.get('num_customers', 0),
                'App': r.get('num_appointments', 0),
                'AppChecked': r.get('num_checked_in', 0)
            })
        return jsonify(result)
    
    # Fallback to JSON
    date_str = date.replace("-", "")
    filepath = DATA_DAILY_DIR / "revenue" / f"revenue_{date_str}.json"
    
    if not filepath.exists():
        return jsonify({'error': 'Không có dữ liệu'}), 404
    
    data = load_json(filepath)
    return jsonify(data)

@app.route('/api/revenue/range')
def api_revenue_range():
    """Doanh thu nhiều ngày"""
    if USE_DATABASE:
        data = vttech_db.get_daily_summary(30)
        result = []
        for r in data:
            result.append({
                'date': r.get('date'),
                'total': r.get('total_paid', 0),
                'total_new': r.get('total_paid_new', 0),
                'customers': r.get('total_customers', 0),
                'appointments': r.get('total_appointments', 0)
            })
        return jsonify(sorted(result, key=lambda x: x['date']))
    
    # Fallback to JSON
    dates = get_available_dates_from_files()
    
    result = []
    for date in dates[:30]:  # 30 ngày gần nhất
        date_str = date.replace("-", "")
        filepath = DATA_DAILY_DIR / "revenue" / f"revenue_{date_str}.json"
        if filepath.exists():
            data = load_json(filepath)
            if data:
                total = sum(r.get('Paid', 0) for r in data)
                total_new = sum(r.get('PaidNew', 0) for r in data)
                total_customers = sum(r.get('PaidNumCust', 0) for r in data)
                total_appointments = sum(r.get('App', 0) for r in data)
                result.append({
                    'date': date,
                    'total': total,
                    'total_new': total_new,
                    'customers': total_customers,
                    'appointments': total_appointments
                })
    
    return jsonify(sorted(result, key=lambda x: x['date']))

@app.route('/api/branches')
def api_branches():
    """Danh sách chi nhánh"""
    if USE_DATABASE:
        return jsonify(vttech_db.get_branches())
    data = load_json(DATA_OUTPUT_DIR / "branches.json")
    return jsonify(data or [])

@app.route('/api/services')
def api_services():
    """Danh sách dịch vụ"""
    if USE_DATABASE:
        return jsonify(vttech_db.get_services())
    data = load_json(DATA_OUTPUT_DIR / "services.json")
    return jsonify(data or [])

@app.route('/api/employees')
def api_employees():
    """Danh sách nhân viên"""
    if USE_DATABASE:
        branch_id = request.args.get('branch_id', type=int)
        return jsonify(vttech_db.get_employees(branch_id))
    data = load_json(DATA_OUTPUT_DIR / "employees.json")
    return jsonify(data or [])

@app.route('/api/master/<name>')
def api_master(name):
    """Lấy master data theo tên"""
    allowed = ['branches', 'services', 'employees', 'users', 'service_groups', 'customer_sources']
    if name not in allowed:
        return jsonify({'error': 'Invalid'}), 400
    
    data = load_json(DATA_OUTPUT_DIR / f"{name}.json")
    return jsonify(data or [])

# ============== NEW ANALYSIS ENDPOINTS ==============

@app.route('/api/analysis/monthly')
def api_monthly_summary():
    """Tổng hợp doanh thu theo tháng"""
    if USE_DATABASE:
        data = vttech_db.get_monthly_summary(12)
        return jsonify(data)
    return jsonify({'error': 'Database not available'}), 503

@app.route('/api/analysis/branches')
def api_branch_performance():
    """Hiệu suất chi nhánh"""
    if USE_DATABASE:
        start = request.args.get('start')
        end = request.args.get('end')
        data = vttech_db.get_branch_performance(start, end)
        return jsonify(data)
    return jsonify({'error': 'Database not available'}), 503

@app.route('/api/analysis/compare')
def api_compare_periods():
    """So sánh 2 giai đoạn"""
    if USE_DATABASE:
        p1_start = request.args.get('p1_start')
        p1_end = request.args.get('p1_end')
        p2_start = request.args.get('p2_start')
        p2_end = request.args.get('p2_end')
        
        if not all([p1_start, p1_end, p2_start, p2_end]):
            return jsonify({'error': 'Missing parameters'}), 400
        
        data = vttech_db.compare_periods(p1_start, p1_end, p2_start, p2_end)
        return jsonify(data)
    return jsonify({'error': 'Database not available'}), 503

@app.route('/api/analysis/trend')
def api_trend():
    """Xu hướng N ngày"""
    if USE_DATABASE:
        days = request.args.get('days', 30, type=int)
        data = vttech_db.get_trend(days)
        return jsonify(data)
    return jsonify({'error': 'Database not available'}), 503

@app.route('/api/crawl-logs')
def api_crawl_logs():
    """Log crawl history"""
    if USE_DATABASE:
        limit = request.args.get('limit', 50, type=int)
        data = vttech_db.get_crawl_logs(limit)
        return jsonify(data)
    return jsonify({'error': 'Database not available'}), 503

# ============== CALL CENTER API ROUTES ==============

def get_callcenter_conn():
    """Get connection to callcenter database"""
    import sqlite3
    cc_db_path = BASE_DIR / "database" / "callcenter.db"
    if not cc_db_path.exists():
        return None
    conn = sqlite3.connect(cc_db_path)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/api/callcenter/stats')
def api_callcenter_stats():
    """Call Center statistics"""
    conn = get_callcenter_conn()
    if not conn:
        return jsonify({'error': 'Call Center database not available', 'total_records': 0}), 200
    
    try:
        cursor = conn.cursor()
        
        # Total records
        cursor.execute("SELECT COUNT(*) as total FROM callcenter_records")
        total = cursor.fetchone()['total']
        
        # By direction
        cursor.execute("""
            SELECT direction, COUNT(*) as cnt 
            FROM callcenter_records 
            GROUP BY direction
        """)
        by_direction = {row['direction'] or 'unknown': row['cnt'] for row in cursor.fetchall()}
        
        # Today's calls
        cursor.execute("""
            SELECT COUNT(*) as cnt FROM callcenter_records 
            WHERE date(start_time) = date('now')
        """)
        today_calls = cursor.fetchone()['cnt']
        
        # By date (last 30 days)
        cursor.execute("""
            SELECT date(start_time) as date, COUNT(*) as count 
            FROM callcenter_records 
            WHERE start_time IS NOT NULL
            GROUP BY date(start_time) 
            ORDER BY date DESC 
            LIMIT 30
        """)
        by_date = [{'date': row['date'], 'count': row['count']} for row in cursor.fetchall()]
        by_date.reverse()
        
        # Last sync
        cursor.execute("""
            SELECT * FROM callcenter_sync_logs ORDER BY id DESC LIMIT 1
        """)
        last_sync_row = cursor.fetchone()
        last_sync = None
        if last_sync_row:
            last_sync = {
                'status': last_sync_row['status'],
                'date_range': f"{last_sync_row['date_from']} → {last_sync_row['date_to']}",
                'total_records': last_sync_row['total_records']
            }
        
        conn.close()
        
        return jsonify({
            'total_records': total,
            'by_direction': by_direction,
            'today_calls': today_calls,
            'by_date': by_date,
            'last_sync': last_sync
        })
    except Exception as e:
        return jsonify({'error': str(e), 'total_records': 0}), 200

@app.route('/api/callcenter/records')
def api_callcenter_records():
    """Get call records with pagination"""
    conn = get_callcenter_conn()
    if not conn:
        return jsonify({'error': 'Database not available', 'records': []}), 200
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 20, type=int)
    search = request.args.get('search', '')
    date = request.args.get('date', '')
    
    offset = (page - 1) * limit
    
    try:
        cursor = conn.cursor()
        
        sql = "SELECT * FROM callcenter_records WHERE 1=1"
        params = []
        
        if search:
            sql += " AND (caller_id LIKE ? OR destination LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%'])
        
        if date:
            sql += " AND date(start_time) = ?"
            params.append(date)
        
        sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(sql, params)
        records = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({'records': records, 'page': page, 'limit': limit})
    except Exception as e:
        return jsonify({'error': str(e), 'records': []}), 200

@app.route('/api/callcenter/sync-logs')
def api_callcenter_sync_logs():
    """Get call center sync logs"""
    conn = get_callcenter_conn()
    if not conn:
        return jsonify([])
    
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM callcenter_sync_logs 
            ORDER BY id DESC LIMIT 20
        """)
        logs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify(logs)
    except Exception as e:
        return jsonify([])

# ============== DATABASE VIEWER ROUTES ==============

@app.route('/db')
def db_viewer():
    """Serve database viewer"""
    return send_from_directory('dashboard', 'db.html')

@app.route('/api/db/tables')
def api_db_tables():
    """List all tables with row counts"""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available'}), 503
    
    conn = vttech_db.get_conn()
    cursor = conn.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
    """)
    tables = []
    for row in cursor.fetchall():
        name = row['name']
        count_cursor = conn.execute(f"SELECT COUNT(*) as count FROM {name}")
        count = count_cursor.fetchone()['count']
        tables.append({'name': name, 'count': count})
    conn.close()
    return jsonify(tables)

@app.route('/api/db/stats')
def api_db_stats():
    """Database statistics"""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available'}), 503
    
    import os
    db_path = BASE_DIR / "database" / "vttech.db"
    db_size = os.path.getsize(db_path) if db_path.exists() else 0
    
    # Format size
    if db_size > 1024 * 1024:
        size_str = f"{db_size / 1024 / 1024:.2f} MB"
    elif db_size > 1024:
        size_str = f"{db_size / 1024:.2f} KB"
    else:
        size_str = f"{db_size} B"
    
    conn = vttech_db.get_conn()
    cursor = conn.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
    """)
    tables = [row['name'] for row in cursor.fetchall()]
    
    total_records = 0
    for table in tables:
        count_cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
        total_records += count_cursor.fetchone()['count']
    
    conn.close()
    
    return jsonify({
        'table_count': len(tables),
        'total_records': total_records,
        'db_size': size_str
    })

@app.route('/api/db/query', methods=['POST'])
def api_db_query():
    """Execute SQL query (SELECT only)"""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available'}), 503
    
    data = request.get_json()
    sql = data.get('sql', '').strip()
    
    if not sql:
        return jsonify({'error': 'SQL query is required'}), 400
    
    # Security: Only allow SELECT queries
    sql_upper = sql.upper()
    if not sql_upper.startswith('SELECT'):
        return jsonify({'error': 'Chỉ cho phép SELECT queries'}), 400
    
    # Block dangerous keywords
    dangerous = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXEC', '--', ';--']
    for keyword in dangerous:
        if keyword in sql_upper:
            return jsonify({'error': f'Không cho phép sử dụng {keyword}'}), 400
    
    try:
        conn = vttech_db.get_conn()
        cursor = conn.execute(sql)
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'columns': columns,
            'rows': rows[:1000]  # Limit 1000 rows
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400


# ============== CUSTOMER SYNC API ROUTES ==============

@app.route('/api/customers')
def api_customers():
    """Get customers with pagination"""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available', 'records': []}), 503
    
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 50, type=int)
    search = request.args.get('search', '')
    branch_id = request.args.get('branch_id', type=int)
    
    offset = (page - 1) * limit
    
    try:
        conn = vttech_db.get_conn()
        
        sql = "SELECT c.*, b.name as branch_name FROM customers c LEFT JOIN branches b ON c.branch_id = b.id WHERE 1=1"
        params = []
        
        if search:
            sql += " AND (c.name LIKE ? OR c.phone LIKE ? OR c.code LIKE ?)"
            params.extend([f'%{search}%', f'%{search}%', f'%{search}%'])
        
        if branch_id:
            sql += " AND c.branch_id = ?"
            params.append(branch_id)
        
        # Count total
        count_sql = sql.replace("SELECT c.*, b.name as branch_name", "SELECT COUNT(*) as total")
        cursor = conn.execute(count_sql, params)
        total = cursor.fetchone()['total']
        
        sql += " ORDER BY c.id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor = conn.execute(sql, params)
        records = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'records': records,
            'total': total,
            'page': page,
            'limit': limit,
            'total_pages': (total + limit - 1) // limit
        })
    except Exception as e:
        return jsonify({'error': str(e), 'records': [], 'total': 0}), 200


@app.route('/api/customers/<int:customer_id>')
def api_customer_detail(customer_id):
    """Get customer detail with services, treatments, payments, etc."""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available'}), 503
    
    try:
        conn = vttech_db.get_conn()
        
        # Customer info
        cursor = conn.execute("""
            SELECT c.*, b.name as branch_name 
            FROM customers c 
            LEFT JOIN branches b ON c.branch_id = b.id 
            WHERE c.id = ?
        """, (customer_id,))
        customer = cursor.fetchone()
        
        if not customer:
            return jsonify({'error': 'Customer not found'}), 404
        
        customer_data = dict(customer)
        
        # Services
        cursor = conn.execute("SELECT * FROM customer_services WHERE customer_id = ?", (customer_id,))
        services = [dict(row) for row in cursor.fetchall()]
        
        # Treatments
        cursor = conn.execute("SELECT * FROM customer_treatments WHERE customer_id = ?", (customer_id,))
        treatments = [dict(row) for row in cursor.fetchall()]
        
        # Payments
        cursor = conn.execute("SELECT * FROM customer_payments WHERE customer_id = ?", (customer_id,))
        payments = [dict(row) for row in cursor.fetchall()]
        
        # Appointments
        cursor = conn.execute("SELECT * FROM customer_appointments WHERE customer_id = ?", (customer_id,))
        appointments = [dict(row) for row in cursor.fetchall()]
        
        # History
        cursor = conn.execute("SELECT * FROM customer_history WHERE customer_id = ?", (customer_id,))
        history = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'customer': customer_data,
            'services': services,
            'treatments': treatments,
            'payments': payments,
            'appointments': appointments,
            'history': history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/customers/stats')
def api_customers_stats():
    """Customer statistics"""
    if not USE_DATABASE:
        return jsonify({'error': 'Database not available'}), 503
    
    try:
        conn = vttech_db.get_conn()
        
        # Total customers
        cursor = conn.execute("SELECT COUNT(*) as total FROM customers")
        total_customers = cursor.fetchone()['total']
        
        # By branch
        cursor = conn.execute("""
            SELECT b.id, b.name, COUNT(c.id) as customer_count
            FROM branches b
            LEFT JOIN customers c ON b.id = c.branch_id
            GROUP BY b.id, b.name
            ORDER BY customer_count DESC
        """)
        by_branch = [dict(row) for row in cursor.fetchall()]
        
        # Customer detail stats
        detail_stats = {}
        for table in ['customer_services', 'customer_treatments', 'customer_payments', 'customer_appointments', 'customer_history']:
            try:
                cursor = conn.execute(f"SELECT COUNT(*) as cnt FROM {table}")
                detail_stats[table.replace('customer_', '')] = cursor.fetchone()['cnt']
            except:
                detail_stats[table.replace('customer_', '')] = 0
        
        # Sync logs
        cursor = conn.execute("""
            SELECT sync_date, COUNT(*) as count, SUM(records_count) as total_records
            FROM sync_logs
            GROUP BY sync_date
            ORDER BY sync_date DESC
            LIMIT 30
        """)
        sync_history = [dict(row) for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'total_customers': total_customers,
            'by_branch': by_branch,
            'detail_stats': detail_stats,
            'sync_history': sync_history
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sync-logs')
def api_sync_logs():
    """Get all sync logs"""
    if not USE_DATABASE:
        return jsonify([])
    
    log_type = request.args.get('type', '')  # 'customer', 'detail', 'all'
    limit = request.args.get('limit', 100, type=int)
    
    try:
        conn = vttech_db.get_conn()
        
        logs = []
        
        # Customer sync logs
        if log_type in ['', 'all', 'customer']:
            cursor = conn.execute("""
                SELECT 'customer' as log_type, sync_date, branch_name, records_count, status, created_at
                FROM sync_logs
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
            logs.extend([dict(row) for row in cursor.fetchall()])
        
        # Customer detail sync logs
        if log_type in ['', 'all', 'detail']:
            try:
                cursor = conn.execute("""
                    SELECT 'detail' as log_type, sync_date, customer_id, 
                           services_count, treatments_count, payments_count, 
                           appointments_count, history_count, status, created_at
                    FROM customer_detail_sync_logs
                    ORDER BY created_at DESC
                    LIMIT ?
                """, (limit,))
                logs.extend([dict(row) for row in cursor.fetchall()])
            except:
                pass
        
        conn.close()
        
        # Sort by created_at desc
        logs.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify(logs[:limit])
    except Exception as e:
        return jsonify([])


# ============== MAIN ==============

if __name__ == '__main__':
    # Tạo thư mục dashboard nếu chưa có
    dashboard_dir = BASE_DIR / "dashboard"
    dashboard_dir.mkdir(exist_ok=True)
    
    print("=" * 50)
    print("🚀 VTTech Dashboard Server")
    print("=" * 50)
    print(f"📁 Data directory: {DATA_DAILY_DIR}")
    print(f"💾 Database mode: {'ENABLED' if USE_DATABASE else 'DISABLED'}")
    print(f"🌐 Dashboard: http://localhost:5000")
    print(f"🗄️  DB Viewer: http://localhost:5000/db")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
