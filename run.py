#!/usr/bin/env python3
"""
VTTech TMTaza - Main Runner
Chạy dự án với 1 lệnh duy nhất
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from datetime import datetime, timedelta

BASE_DIR = Path(__file__).parent

def clear_screen():
    os.system('clear' if os.name != 'nt' else 'cls')

def print_header():
    print("\033[95m" + "=" * 50 + "\033[0m")
    print("\033[95m" + "   🚀 VTTech TMTaza - Project Runner" + "\033[0m")
    print("\033[95m" + "=" * 50 + "\033[0m")
    print()

def print_menu():
    print("\033[96m📋 Chọn chức năng:\033[0m")
    print()
    print("  \033[94m--- VTTech Data ---\033[0m")
    print("  \033[93m1.\033[0m 🌐 Chạy Dashboard Server \033[92m(Call Center Dashboard mới!)\033[0m")
    print("  \033[93m2.\033[0m 🔄 Chạy Cron Crawler (hôm qua)")
    print("  \033[93m3.\033[0m 🔄 Chạy Cron Crawler (hôm nay)")
    print("  \033[93m4.\033[0m 🔄 Chạy Cron Crawler (ngày tùy chọn)")
    print("  \033[93m5.\033[0m 📅 Chạy Cron Crawler (khoảng thời gian)")
    print("  \033[93m6.\033[0m 📦 Chạy Cron Crawler + Master Data")
    print("  \033[93m7.\033[0m 🗄️  Migrate dữ liệu vào Database")
    print("  \033[93m8.\033[0m 📊 Xem thống kê Database")
    print("  \033[93m9.\033[0m 🔧 Cài đặt Cron Job tự động")
    print()
    print("  \033[94m--- Customer Sync (NEW) ---\033[0m")
    print("  \033[93m20.\033[0m 👥 Sync Customers by Branch (hôm nay)")
    print("  \033[93m21.\033[0m 👥 Sync Customers by Branch (ngày tùy chọn)")
    print("  \033[93m22.\033[0m 👥 Sync Customers by Branch (khoảng thời gian)")
    print("  \033[93m23.\033[0m 📋 Sync Customer Detail (từ customers đã sync)")
    print("  \033[93m24.\033[0m 🔄 Full Sync: Branch → Customers → Details")
    print("  \033[93m25.\033[0m 📊 Xem thống kê Customer Sync")
    print()
    print("  \033[94m--- Call Center ---\033[0m")
    print("  \033[93m10.\033[0m 📞 Sync PBX Calls (hôm qua)")
    print("  \033[93m11.\033[0m 📞 Sync PBX Calls (ngày tùy chọn)")
    print("  \033[93m12.\033[0m 📞 Sync PBX Calls (khoảng thời gian)")
    print("  \033[93m13.\033[0m 👤 Sync Nhân viên từ VTTech")
    print("  \033[93m14.\033[0m 📊 Xem thống kê Call Center")
    print("  \033[93m15.\033[0m 🔄 Full Sync: PBX + Nhân viên")
    print("  \033[93m16.\033[0m 🔧 Cài đặt Cron Job Call Center")
    print()
    print("  \033[91m0.\033[0m ❌ Thoát")
    print()

def run_server():
    """Chạy Dashboard Server"""
    print("\n\033[92m🌐 Đang khởi động Dashboard Server...\033[0m")
    print("\033[90m   URL: http://localhost:5000\033[0m")
    print("\033[90m   Nhấn Ctrl+C để dừng\033[0m\n")
    
    try:
        subprocess.run([sys.executable, str(BASE_DIR / "dashboard_server.py")])
    except KeyboardInterrupt:
        print("\n\033[93m⏹️  Server đã dừng.\033[0m")

def run_cron(date_str=None, full=False):
    """Chạy Cron Crawler"""
    cmd = [sys.executable, str(BASE_DIR / "cron_crawler.py")]
    
    if date_str:
        cmd.extend(["--date", date_str])
    
    if full:
        cmd.append("--full")
    
    print(f"\n\033[92m🔄 Đang chạy Cron Crawler...\033[0m")
    if date_str:
        print(f"\033[90m   Ngày: {date_str}\033[0m")
    if full:
        print(f"\033[90m   Mode: Full (bao gồm Master Data)\033[0m")
    print()
    
    subprocess.run(cmd)
    
    print("\n\033[92m✅ Hoàn tất!\033[0m")
    input("\nNhấn Enter để tiếp tục...")

def run_migrate():
    """Migrate dữ liệu"""
    print("\n\033[92m🗄️  Đang migrate dữ liệu...\033[0m\n")
    subprocess.run([sys.executable, str(BASE_DIR / "database" / "migrate.py")])
    input("\nNhấn Enter để tiếp tục...")

def show_db_stats():
    """Hiển thị thống kê database"""
    print("\n\033[92m📊 Thống kê Database:\033[0m\n")
    
    try:
        sys.path.insert(0, str(BASE_DIR / 'database'))
        from db_repository import db
        
        counts = db.get_master_counts()
        dates = db.get_available_dates()
        summary = db.get_daily_summary(5)
        
        print("\033[96m📦 Master Data:\033[0m")
        for table, count in counts.items():
            print(f"   • {table}: {count:,} records")
        
        print(f"\n\033[96m📅 Ngày có dữ liệu: {len(dates)} ngày\033[0m")
        if dates:
            print(f"   • Mới nhất: {dates[0]}")
            print(f"   • Cũ nhất: {dates[-1]}")
        
        if summary:
            print(f"\n\033[96m💰 Doanh thu gần đây:\033[0m")
            for s in summary[:5]:
                total = s.get('total_paid', 0)
                print(f"   • {s['date']}: {total:,.0f} VND")
        
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
        print("\033[90m   Hãy chạy migrate trước (option 6)\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")

def setup_cron():
    """Cài đặt cron job"""
    print("\n\033[92m🔧 Cài đặt Cron Job:\033[0m\n")
    
    cron_script = BASE_DIR / "setup_cron.sh"
    if cron_script.exists():
        subprocess.run(["bash", str(cron_script)])
    else:
        print("\033[91m❌ File setup_cron.sh không tồn tại\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


# ============== CALL CENTER FUNCTIONS ==============

def run_callcenter_sync(date_from=None, date_to=None):
    """Chạy Call Center Sync"""
    print("\n\033[92m📞 Đang chạy Call Center Sync...\033[0m")
    
    try:
        # Activate venv if needed
        venv_python = BASE_DIR / "venv" / "bin" / "python"
        python_cmd = str(venv_python) if venv_python.exists() else sys.executable
        
        if date_from:
            if date_to:
                print(f"\033[90m   Khoảng thời gian: {date_from} -> {date_to}\033[0m")
                cmd = [python_cmd, "-m", "callcenter.cli", "sync", "--date", date_from, "--to-date", date_to]
            else:
                print(f"\033[90m   Ngày: {date_from}\033[0m")
                cmd = [python_cmd, "-m", "callcenter.cli", "sync", "--date", date_from]
        else:
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"\033[90m   Ngày: {yesterday} (hôm qua)\033[0m")
            cmd = [python_cmd, "-m", "callcenter.cli", "sync"]
        
        print()
        subprocess.run(cmd, cwd=str(BASE_DIR))
        
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def setup_callcenter_cron():
    """Cài đặt cron job cho Call Center"""
    print("\n\033[92m🔧 Cài đặt Cron Job Call Center:\033[0m\n")
    
    cron_script = BASE_DIR / "callcenter" / "setup_cron.sh"
    if cron_script.exists():
        subprocess.run(["bash", str(cron_script)])
    else:
        print("\033[91m❌ File callcenter/setup_cron.sh không tồn tại\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def run_employee_sync():
    """Sync nhân viên từ VTTech"""
    print("\n\033[92m👤 Đang sync nhân viên từ VTTech...\033[0m")
    print("\033[90m   API: /Marketing/TicketGroupList/?handler=LoadData\033[0m\n")
    
    try:
        cmd = [sys.executable, str(BASE_DIR / "callcenter" / "sync_employees.py")]
        result = subprocess.run(cmd, cwd=str(BASE_DIR))
        
        if result.returncode == 0:
            print("\n\033[92m✅ Sync nhân viên hoàn tất!\033[0m")
        else:
            print("\n\033[91m❌ Có lỗi khi sync nhân viên!\033[0m")
            
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def run_full_callcenter_sync(date_from=None, date_to=None):
    """Chạy Full Sync: PBX + Nhân viên"""
    print("\n\033[92m🔄 FULL SYNC CALL CENTER\033[0m")
    print("=" * 50)
    
    # Step 1: Sync Employees
    print("\n\033[96m📍 BƯỚC 1: Sync Nhân viên từ VTTech\033[0m")
    print("-" * 40)
    
    try:
        cmd1 = [sys.executable, str(BASE_DIR / "callcenter" / "sync_employees.py")]
        result1 = subprocess.run(cmd1, cwd=str(BASE_DIR))
        
        if result1.returncode == 0:
            print("\033[92m✅ Bước 1 hoàn thành!\033[0m")
        else:
            print("\033[93m⚠️  Bước 1 có lỗi (tiếp tục sync PBX)...\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Lỗi bước 1: {e}\033[0m")
    
    # Step 2: Sync PBX
    print("\n\033[96m📞 BƯỚC 2: Sync PBX Calls\033[0m")
    print("-" * 40)
    
    try:
        venv_python = BASE_DIR / "venv" / "bin" / "python"
        python_cmd = str(venv_python) if venv_python.exists() else sys.executable
        
        if date_from:
            if date_to:
                print(f"\033[90m   Khoảng thời gian: {date_from} -> {date_to}\033[0m")
                cmd2 = [python_cmd, "-m", "callcenter.cli", "sync", "--date", date_from, "--to-date", date_to]
            else:
                print(f"\033[90m   Ngày: {date_from}\033[0m")
                cmd2 = [python_cmd, "-m", "callcenter.cli", "sync", "--date", date_from]
        else:
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"\033[90m   Ngày: {yesterday} (hôm qua)\033[0m")
            cmd2 = [python_cmd, "-m", "callcenter.cli", "sync"]
        
        print()
        result2 = subprocess.run(cmd2, cwd=str(BASE_DIR))
        
        if result2.returncode == 0:
            print("\033[92m✅ Bước 2 hoàn thành!\033[0m")
        else:
            print("\033[91m❌ Bước 2 có lỗi!\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Lỗi bước 2: {e}\033[0m")
    
    print("\n" + "=" * 50)
    print("\033[92m🎉 FULL SYNC CALL CENTER HOÀN TẤT!\033[0m")
    print("=" * 50)
    
    input("\nNhấn Enter để tiếp tục...")


def show_callcenter_stats_detail():
    """Hiển thị thống kê Call Center chi tiết với nhân viên"""
    print("\n\033[92m📊 Thống kê Call Center (Chi tiết):\033[0m\n")
    
    try:
        import sqlite3
        db_path = BASE_DIR / "database" / "callcenter.db"
        
        if not db_path.exists():
            print("\033[91m❌ Database chưa được tạo!\033[0m")
            print("\033[90m   Hãy chạy sync trước.\033[0m")
            input("\nNhấn Enter để tiếp tục...")
            return
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Tổng quan
        print("\033[96m📞 Tổng quan Cuộc gọi:\033[0m")
        
        cursor = conn.execute("SELECT COUNT(*) as count FROM callcenter_records")
        total_calls = cursor.fetchone()['count']
        print(f"   • Tổng cuộc gọi: {total_calls:,}")
        
        # Thống kê theo direction
        cursor = conn.execute("""
            SELECT direction, COUNT(*) as count 
            FROM callcenter_records 
            GROUP BY direction
        """)
        for row in cursor.fetchall():
            direction = row['direction'] or 'unknown'
            print(f"   • {direction}: {row['count']:,}")
        
        # Thống kê theo status
        cursor = conn.execute("""
            SELECT call_status, COUNT(*) as count 
            FROM callcenter_records 
            WHERE call_status IS NOT NULL
            GROUP BY call_status
            ORDER BY count DESC
            LIMIT 5
        """)
        print("\n\033[96m📈 Theo trạng thái:\033[0m")
        for row in cursor.fetchall():
            status = row['call_status'] or 'unknown'
            print(f"   • {status}: {row['count']:,}")
        
        # Thống kê nhân viên
        cursor = conn.execute("SELECT COUNT(*) as count FROM callcenter_employees")
        emp_count = cursor.fetchone()['count']
        print(f"\n\033[96m👥 Nhân viên: {emp_count:,}\033[0m")
        
        if emp_count > 0:
            # Top nhân viên có nhiều cuộc gọi
            cursor = conn.execute("""
                SELECT 
                    e.name,
                    e.extension,
                    COUNT(p.id) as call_count,
                    SUM(CASE WHEN p.direction = 'outbound' THEN 1 ELSE 0 END) as outbound_count,
                    SUM(CASE WHEN p.direction = 'inbound' THEN 1 ELSE 0 END) as inbound_count
                FROM callcenter_employees e
                LEFT JOIN callcenter_records p ON e.extension = p.caller_id_number 
                    OR e.extension = p.destination_number
                GROUP BY e.id, e.name, e.extension
                HAVING call_count > 0
                ORDER BY call_count DESC
                LIMIT 10
            """)
            
            print("\n\033[96m🏆 Top nhân viên (theo số cuộc gọi):\033[0m")
            for row in cursor.fetchall():
                print(f"   • {row['name']} (ext: {row['extension']}): {row['call_count']} cuộc")
                print(f"     └─ Gọi ra: {row['outbound_count']} | Gọi vào: {row['inbound_count']}")
        
        # Cuộc gọi gần đây
        cursor = conn.execute("""
            SELECT 
                caller_id_number,
                destination_number,
                direction,
                call_status,
                duration,
                created_at
            FROM callcenter_records
            ORDER BY created_at DESC
            LIMIT 5
        """)
        
        print("\n\033[96m📜 Cuộc gọi gần đây:\033[0m")
        for row in cursor.fetchall():
            direction_icon = "📤" if row['direction'] == 'outbound' else "📥"
            status_icon = "✅" if row['call_status'] == 'ANSWERED' else "❌"
            duration = row['duration'] or 0
            print(f"   {direction_icon} {row['caller_id_number']} → {row['destination_number']} {status_icon} ({duration}s)")
        
        conn.close()
        
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
        import traceback
        traceback.print_exc()
    
    input("\nNhấn Enter để tiếp tục...")


# ============== CUSTOMER SYNC FUNCTIONS ==============

def run_customer_by_branch_sync(date_str=None, date_from=None, date_to=None):
    """Chạy sync khách hàng theo branch"""
    print("\n\033[92m👥 Đang chạy Sync Customers by Branch...\033[0m")
    
    cmd = [sys.executable, str(BASE_DIR / "sync_customer_by_branch.py")]
    
    if date_from and date_to:
        cmd.extend(["--date-from", date_from, "--date-to", date_to])
        print(f"\033[90m   Khoảng thời gian: {date_from} → {date_to}\033[0m")
    elif date_str:
        cmd.extend(["--date", date_str])
        print(f"\033[90m   Ngày: {date_str}\033[0m")
    else:
        today = datetime.now().strftime("%Y-%m-%d")
        cmd.extend(["--date", today])
        print(f"\033[90m   Ngày: {today} (hôm nay)\033[0m")
    
    print()
    
    try:
        subprocess.run(cmd)
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def run_customer_detail_sync(date_str=None, limit=None):
    """Chạy sync chi tiết khách hàng"""
    print("\n\033[92m📋 Đang chạy Sync Customer Detail...\033[0m")
    
    cmd = [sys.executable, str(BASE_DIR / "sync_customer_detail_full.py")]
    
    if date_str:
        cmd.extend(["--date", date_str])
        print(f"\033[90m   Lấy customers từ ngày: {date_str}\033[0m")
    else:
        today = datetime.now().strftime("%Y-%m-%d")
        cmd.extend(["--date", today])
        print(f"\033[90m   Lấy customers từ ngày: {today} (hôm nay)\033[0m")
    
    if limit:
        cmd.extend(["--limit", str(limit)])
        print(f"\033[90m   Giới hạn: {limit} customers\033[0m")
    
    print()
    
    try:
        subprocess.run(cmd)
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def run_full_customer_sync(date_str=None):
    """Chạy full sync: Branch → Customers → Details"""
    if not date_str:
        date_str = datetime.now().strftime("%Y-%m-%d")
    
    print("\n\033[92m🔄 FULL SYNC: Branch → Customers → Details\033[0m")
    print(f"\033[90m   Ngày: {date_str}\033[0m")
    print()
    
    # Confirm
    confirm = input("\033[93m⚠️  Tiếp tục? (y/n): \033[0m").strip().lower()
    if confirm != 'y':
        print("\033[93m⏹️  Đã hủy.\033[0m")
        input("\nNhấn Enter để tiếp tục...")
        return
    
    print("\n" + "=" * 60)
    
    # Step 1: Sync customers by branch
    print("\n\033[96m📍 BƯỚC 1: Sync Customers by Branch\033[0m")
    print("-" * 40)
    
    try:
        cmd1 = [sys.executable, str(BASE_DIR / "sync_customer_by_branch.py"), "--date", date_str]
        result1 = subprocess.run(cmd1, capture_output=False)
        
        if result1.returncode == 0:
            print("\033[92m✅ Bước 1 hoàn thành!\033[0m")
        else:
            print("\033[91m❌ Bước 1 có lỗi!\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Lỗi bước 1: {e}\033[0m")
    
    print()
    
    # Step 2: Sync customer details
    print("\n\033[96m📋 BƯỚC 2: Sync Customer Detail\033[0m")
    print("-" * 40)
    
    try:
        cmd2 = [sys.executable, str(BASE_DIR / "sync_customer_detail_full.py"), "--date", date_str]
        result2 = subprocess.run(cmd2, capture_output=False)
        
        if result2.returncode == 0:
            print("\033[92m✅ Bước 2 hoàn thành!\033[0m")
        else:
            print("\033[91m❌ Bước 2 có lỗi!\033[0m")
    except Exception as e:
        print(f"\033[91m❌ Lỗi bước 2: {e}\033[0m")
    
    print("\n" + "=" * 60)
    print("\033[92m🎉 FULL SYNC HOÀN TẤT!\033[0m")
    print("=" * 60)
    
    input("\nNhấn Enter để tiếp tục...")


def show_customer_sync_stats():
    """Hiển thị thống kê Customer Sync"""
    print("\n\033[92m📊 Thống kê Customer Sync:\033[0m\n")
    
    try:
        import sqlite3
        db_path = BASE_DIR / "database" / "vttech.db"
        
        if not db_path.exists():
            print("\033[91m❌ Database chưa được tạo!\033[0m")
            print("\033[90m   Hãy chạy sync trước.\033[0m")
            input("\nNhấn Enter để tiếp tục...")
            return
        
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        
        # Thống kê branches
        cursor = conn.execute("SELECT COUNT(*) as count FROM branches")
        branches_count = cursor.fetchone()['count']
        
        # Thống kê customers
        cursor = conn.execute("SELECT COUNT(*) as count FROM customers")
        customers_count = cursor.fetchone()['count']
        
        # Thống kê customer detail
        detail_tables = [
            ('customer_services', 'Services'),
            ('customer_treatments', 'Treatments'),
            ('customer_payments', 'Payments'),
            ('customer_appointments', 'Appointments'),
            ('customer_history', 'History')
        ]
        
        print("\033[96m📦 Master Data:\033[0m")
        print(f"   • Branches: {branches_count:,}")
        print(f"   • Customers: {customers_count:,}")
        
        print("\n\033[96m📋 Customer Detail:\033[0m")
        for table, label in detail_tables:
            try:
                cursor = conn.execute(f"SELECT COUNT(*) as count FROM {table}")
                count = cursor.fetchone()['count']
                print(f"   • {label}: {count:,}")
            except:
                print(f"   • {label}: 0 (bảng chưa có)")
        
        # Thống kê theo branch
        print("\n\033[96m👥 Customers theo Branch:\033[0m")
        cursor = conn.execute("""
            SELECT b.name, COUNT(c.id) as customer_count
            FROM branches b
            LEFT JOIN customers c ON b.id = c.branch_id
            GROUP BY b.id, b.name
            HAVING customer_count > 0
            ORDER BY customer_count DESC
            LIMIT 10
        """)
        for row in cursor.fetchall():
            print(f"   • {row['name']}: {row['customer_count']} khách")
        
        # Sync logs gần đây
        print("\n\033[96m📜 Sync Logs gần đây:\033[0m")
        try:
            cursor = conn.execute("""
                SELECT sync_date, branch_name, records_count, status
                FROM sync_logs
                ORDER BY created_at DESC
                LIMIT 10
            """)
            for row in cursor.fetchall():
                status_icon = "✅" if row['status'] == 'success' else "⚠️"
                print(f"   {status_icon} {row['sync_date']} | {row['branch_name']}: {row['records_count']} records")
        except:
            print("   (Chưa có sync logs)")
        
        conn.close()
        
    except Exception as e:
        print(f"\033[91m❌ Lỗi: {e}\033[0m")
    
    input("\nNhấn Enter để tiếp tục...")


def get_custom_date():
    """Nhập ngày tùy chọn"""
    print("\n\033[96m📅 Nhập ngày (YYYY-MM-DD):\033[0m")
    print(f"\033[90m   Ví dụ: {datetime.now().strftime('%Y-%m-%d')}\033[0m")
    
    date_str = input("\n   > ").strip()
    
    # Validate
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        print("\033[91m❌ Ngày không hợp lệ!\033[0m")
        return None

def get_date_range():
    """Nhập khoảng thời gian"""
    print("\n\033[96m📅 Nhập khoảng thời gian:\033[0m")
    print(f"\033[90m   Format: YYYY-MM-DD\033[0m")
    print()
    
    start_str = input("   Từ ngày: ").strip()
    try:
        start_date = datetime.strptime(start_str, "%Y-%m-%d")
    except ValueError:
        print("\033[91m❌ Ngày bắt đầu không hợp lệ!\033[0m")
        return None, None
    
    end_str = input("   Đến ngày: ").strip()
    try:
        end_date = datetime.strptime(end_str, "%Y-%m-%d")
    except ValueError:
        print("\033[91m❌ Ngày kết thúc không hợp lệ!\033[0m")
        return None, None
    
    if end_date < start_date:
        print("\033[91m❌ Ngày kết thúc phải sau ngày bắt đầu!\033[0m")
        return None, None
    
    return start_date, end_date

def run_cron_range(start_date, end_date, delay_seconds=5):
    """
    Chạy Cron Crawler cho khoảng thời gian với rate limiting
    
    Args:
        start_date: datetime - ngày bắt đầu
        end_date: datetime - ngày kết thúc  
        delay_seconds: int - delay giữa các request (tránh rate limit)
    """
    # Tính số ngày
    total_days = (end_date - start_date).days + 1
    
    print(f"\n\033[96m📅 Crawl từ {start_date.strftime('%Y-%m-%d')} đến {end_date.strftime('%Y-%m-%d')}\033[0m")
    print(f"\033[90m   Tổng: {total_days} ngày\033[0m")
    print(f"\033[90m   Delay: {delay_seconds}s giữa mỗi ngày (tránh rate limit)\033[0m")
    print()
    
    # Confirm
    confirm = input("\033[93m⚠️  Tiếp tục? (y/n): \033[0m").strip().lower()
    if confirm != 'y':
        print("\033[93m⏹️  Đã hủy.\033[0m")
        return
    
    print("\n" + "=" * 50)
    
    success_count = 0
    fail_count = 0
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime("%Y-%m-%d")
        day_num = (current_date - start_date).days + 1
        
        print(f"\n\033[96m[{day_num}/{total_days}] 📅 {date_str}\033[0m")
        
        # Chạy cron với retry
        max_retries = 3
        retry_delay = 30  # delay khi bị rate limit
        
        for attempt in range(max_retries):
            try:
                cmd = [sys.executable, str(BASE_DIR / "cron_crawler.py"), "--date", date_str]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
                
                # Check for rate limit / 409 errors
                if "429" in result.stdout or "429" in result.stderr:
                    print(f"\033[93m   ⚠️  Rate limited! Đợi {retry_delay}s...\033[0m")
                    time.sleep(retry_delay)
                    retry_delay *= 2  # exponential backoff
                    continue
                
                if "409" in result.stdout or "409" in result.stderr:
                    print(f"\033[93m   ⚠️  Conflict (409)! Đợi {retry_delay}s...\033[0m")
                    time.sleep(retry_delay)
                    continue
                
                if result.returncode == 0:
                    # Tìm tổng doanh thu trong output
                    if "Tổng doanh thu" in result.stdout:
                        for line in result.stdout.split('\n'):
                            if "Tổng doanh thu" in line:
                                print(f"\033[92m   ✅ {line.strip()}\033[0m")
                                break
                    else:
                        print(f"\033[92m   ✅ Thành công\033[0m")
                    success_count += 1
                    break
                else:
                    if attempt < max_retries - 1:
                        print(f"\033[93m   ⚠️  Lỗi, thử lại ({attempt + 2}/{max_retries})...\033[0m")
                        time.sleep(10)
                    else:
                        print(f"\033[91m   ❌ Thất bại sau {max_retries} lần thử\033[0m")
                        fail_count += 1
                        
            except subprocess.TimeoutExpired:
                print(f"\033[91m   ❌ Timeout!\033[0m")
                fail_count += 1
                break
            except Exception as e:
                print(f"\033[91m   ❌ Lỗi: {e}\033[0m")
                fail_count += 1
                break
        
        # Delay giữa các ngày để tránh quá tải
        if current_date < end_date:
            print(f"\033[90m   ⏳ Đợi {delay_seconds}s...\033[0m")
            time.sleep(delay_seconds)
        
        current_date += timedelta(days=1)
    
    # Summary
    print("\n" + "=" * 50)
    print(f"\033[96m📊 KẾT QUẢ:\033[0m")
    print(f"   ✅ Thành công: {success_count}/{total_days} ngày")
    if fail_count > 0:
        print(f"   ❌ Thất bại: {fail_count} ngày")
    print("=" * 50)
    
    input("\nNhấn Enter để tiếp tục...")

def main():
    while True:
        clear_screen()
        print_header()
        print_menu()
        
        choice = input("\033[96m👉 Chọn (0-25): \033[0m").strip()
        
        if choice == "1":
            run_server()
        
        elif choice == "2":
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            run_cron(yesterday)
        
        elif choice == "3":
            today = datetime.now().strftime("%Y-%m-%d")
            run_cron(today)
        
        elif choice == "4":
            date = get_custom_date()
            if date:
                run_cron(date)
        
        elif choice == "5":
            # Khoảng thời gian với rate limiting
            start_date, end_date = get_date_range()
            if start_date and end_date:
                # Hỏi delay
                print("\n\033[96m⏱️  Delay giữa mỗi ngày (giây)?\033[0m")
                print("\033[90m   Khuyến nghị: 5-10s để tránh rate limit\033[0m")
                delay_input = input("   Delay (mặc định 5): ").strip()
                delay = int(delay_input) if delay_input.isdigit() else 5
                delay = max(3, min(60, delay))  # Min 3s, max 60s
                
                run_cron_range(start_date, end_date, delay)
        
        elif choice == "6":
            yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
            run_cron(yesterday, full=True)
        
        elif choice == "7":
            run_migrate()
        
        elif choice == "8":
            show_db_stats()
        
        elif choice == "9":
            setup_cron()
        
        # Call Center options
        elif choice == "10":
            run_callcenter_sync()
        
        elif choice == "11":
            date = get_custom_date()
            if date:
                run_callcenter_sync(date_from=date)
        
        elif choice == "12":
            start_date, end_date = get_date_range()
            if start_date and end_date:
                run_callcenter_sync(
                    date_from=start_date.strftime("%Y-%m-%d"),
                    date_to=end_date.strftime("%Y-%m-%d")
                )
        
        elif choice == "13":
            run_employee_sync()
        
        elif choice == "14":
            show_callcenter_stats_detail()
        
        elif choice == "15":
            print("\n\033[96m🔄 Full Sync Call Center:\033[0m")
            print("  1. Sync hôm qua")
            print("  2. Sync ngày tùy chọn")
            print("  3. Sync khoảng thời gian")
            sub_choice = input("\n   Chọn (1-3): ").strip()
            
            if sub_choice == "1":
                run_full_callcenter_sync()
            elif sub_choice == "2":
                date = get_custom_date()
                if date:
                    run_full_callcenter_sync(date_from=date)
            elif sub_choice == "3":
                start_date, end_date = get_date_range()
                if start_date and end_date:
                    run_full_callcenter_sync(
                        date_from=start_date.strftime("%Y-%m-%d"),
                        date_to=end_date.strftime("%Y-%m-%d")
                    )
        
        elif choice == "16":
            setup_callcenter_cron()
        
        # Customer Sync options (NEW)
        elif choice == "20":
            # Sync Customers by Branch - hôm nay
            today = datetime.now().strftime("%Y-%m-%d")
            run_customer_by_branch_sync(date_str=today)
        
        elif choice == "21":
            # Sync Customers by Branch - ngày tùy chọn
            date = get_custom_date()
            if date:
                run_customer_by_branch_sync(date_str=date)
        
        elif choice == "22":
            # Sync Customers by Branch - khoảng thời gian
            start_date, end_date = get_date_range()
            if start_date and end_date:
                run_customer_by_branch_sync(
                    date_from=start_date.strftime("%Y-%m-%d"),
                    date_to=end_date.strftime("%Y-%m-%d")
                )
        
        elif choice == "23":
            # Sync Customer Detail
            print("\n\033[96m📋 Sync Customer Detail:\033[0m")
            print("  1. Sync từ customers hôm nay")
            print("  2. Sync từ customers ngày tùy chọn")
            print("  3. Test với số lượng giới hạn")
            sub_choice = input("\n   Chọn (1-3): ").strip()
            
            if sub_choice == "1":
                today = datetime.now().strftime("%Y-%m-%d")
                run_customer_detail_sync(date_str=today)
            elif sub_choice == "2":
                date = get_custom_date()
                if date:
                    run_customer_detail_sync(date_str=date)
            elif sub_choice == "3":
                date = get_custom_date()
                if date:
                    limit_str = input("   Số lượng customers (mặc định 10): ").strip()
                    limit = int(limit_str) if limit_str.isdigit() else 10
                    run_customer_detail_sync(date_str=date, limit=limit)
        
        elif choice == "24":
            # Full Sync
            print("\n\033[96m🔄 Full Sync:\033[0m")
            print("  1. Sync hôm nay")
            print("  2. Sync ngày tùy chọn")
            sub_choice = input("\n   Chọn (1-2): ").strip()
            
            if sub_choice == "1":
                today = datetime.now().strftime("%Y-%m-%d")
                run_full_customer_sync(date_str=today)
            elif sub_choice == "2":
                date = get_custom_date()
                if date:
                    run_full_customer_sync(date_str=date)
        
        elif choice == "25":
            show_customer_sync_stats()
        
        elif choice == "0":
            print("\n\033[93m👋 Tạm biệt!\033[0m\n")
            break
        
        else:
            print("\n\033[91m❌ Lựa chọn không hợp lệ!\033[0m")
            input("Nhấn Enter để thử lại...")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n\033[93m👋 Tạm biệt!\033[0m\n")
