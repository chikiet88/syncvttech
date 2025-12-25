#!/usr/bin/env python3
"""
VTTech Data Migration
Chuyển dữ liệu từ JSON files sang SQLite database
"""

import json
import sqlite3
from pathlib import Path
from datetime import datetime
import sys

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from init_db import get_connection, init_database, DB_PATH

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_OUTPUT_DIR = BASE_DIR / "data_output"
DATA_DAILY_DIR = BASE_DIR / "data_daily"


def load_json(filepath):
    """Load JSON file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"  ⚠️ Error loading {filepath}: {e}")
        return None


def migrate_branches():
    """Migrate branches từ JSON"""
    print("\n📦 Migrating branches...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    # Thử load từ data_output trước
    data = load_json(DATA_OUTPUT_DIR / "branches.json")
    if not data:
        # Thử từ data_daily/master
        for f in (DATA_DAILY_DIR / "master").glob("branches_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No branches data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO branches (id, code, name, address, phone, email, is_active, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Code'),
                item.get('Name'),
                item.get('Address'),
                item.get('Phone'),
                item.get('Email'),
                1 if item.get('IsActive', True) else 0,
                datetime.now().isoformat()
            ))
            count += 1
        except Exception as e:
            print(f"  Error: {e}")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} branches")
    return count


def migrate_services():
    """Migrate services từ JSON"""
    print("\n📦 Migrating services...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "services.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("services_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No services data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO services (id, code, name, group_id, price, is_active, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Code'),
                item.get('Name'),
                item.get('ServiceGroupID') or item.get('GroupID'),
                item.get('Price', 0),
                1 if item.get('IsActive', True) else 0,
                datetime.now().isoformat()
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} services")
    return count


def migrate_service_groups():
    """Migrate service groups từ JSON"""
    print("\n📦 Migrating service_groups...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "service_groups.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("service_groups_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No service_groups data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO service_groups (id, code, name, parent_id, is_active)
                VALUES (?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Code'),
                item.get('Name'),
                item.get('ParentID'),
                1 if item.get('IsActive', True) else 0
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} service_groups")
    return count


def migrate_employees():
    """Migrate employees từ JSON"""
    print("\n📦 Migrating employees...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "employees.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("employees_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No employees data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO employees (id, code, name, branch_id, phone, email, is_active, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Code'),
                item.get('Name') or item.get('FullName'),
                item.get('BranchID'),
                item.get('Phone'),
                item.get('Email'),
                1 if item.get('IsActive', True) else 0,
                datetime.now().isoformat()
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} employees")
    return count


def migrate_users():
    """Migrate users từ JSON"""
    print("\n📦 Migrating users...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "users.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("users_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No users data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO users (id, username, full_name, email, phone, branch_id, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('UserName'),
                item.get('FullName') or item.get('Name'),
                item.get('Email'),
                item.get('Phone'),
                item.get('BranchID'),
                1 if item.get('IsActive', True) else 0
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} users")
    return count


def migrate_customer_sources():
    """Migrate customer sources từ JSON"""
    print("\n📦 Migrating customer_sources...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "customer_sources.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("customer_sources_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No customer_sources data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO customer_sources (id, code, name, parent_id, is_active)
                VALUES (?, ?, ?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Code'),
                item.get('Name'),
                item.get('ParentID'),
                1 if item.get('IsActive', True) else 0
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} customer_sources")
    return count


def migrate_cities():
    """Migrate cities từ JSON"""
    print("\n📦 Migrating cities...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    data = load_json(DATA_OUTPUT_DIR / "cities.json")
    if not data:
        for f in (DATA_DAILY_DIR / "master").glob("cities_*.json"):
            data = load_json(f)
            if data:
                break
    
    if not data:
        print("  ⚠️ No cities data found")
        return 0
    
    count = 0
    for item in data:
        try:
            cursor.execute("""
                INSERT OR REPLACE INTO cities (id, name, code)
                VALUES (?, ?, ?)
            """, (
                item.get('ID'),
                item.get('Name'),
                item.get('Code')
            ))
            count += 1
        except Exception as e:
            pass
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {count} cities")
    return count


def migrate_daily_revenue():
    """Migrate daily revenue từ JSON files"""
    print("\n📦 Migrating daily_revenue...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    revenue_dir = DATA_DAILY_DIR / "revenue"
    if not revenue_dir.exists():
        print("  ⚠️ No revenue directory found")
        return 0
    
    total_count = 0
    
    for filepath in sorted(revenue_dir.glob("revenue_*.json")):
        # Extract date from filename: revenue_20251223.json -> 2025-12-23
        date_str = filepath.stem.replace("revenue_", "")
        date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        
        data = load_json(filepath)
        if not data:
            continue
        
        count = 0
        for item in data:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO daily_revenue 
                    (date, branch_id, branch_name, paid, paid_new, raise_amount, 
                     num_customers, num_appointments, num_checked_in)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    date_formatted,
                    item.get('BranchID'),
                    item.get('BranchName'),
                    item.get('Paid', 0),
                    item.get('PaidNew', 0),
                    item.get('Raise', 0),
                    item.get('PaidNumCust', 0),
                    item.get('App', 0),
                    item.get('AppChecked', 0)
                ))
                count += 1
            except Exception as e:
                print(f"  Error: {e}")
        
        total_count += count
        print(f"  📅 {date_formatted}: {count} records")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {total_count} revenue records")
    return total_count


def migrate_daily_customers():
    """Migrate daily customers từ JSON files"""
    print("\n📦 Migrating daily_customers...")
    
    conn = get_connection()
    cursor = conn.cursor()
    
    customers_dir = DATA_DAILY_DIR / "customers"
    if not customers_dir.exists():
        print("  ⚠️ No customers directory found")
        return 0
    
    total_count = 0
    
    for filepath in sorted(customers_dir.glob("customers_*.json")):
        date_str = filepath.stem.replace("customers_", "")
        date_formatted = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        
        data = load_json(filepath)
        if not data:
            continue
        
        count = 0
        for item in data:
            try:
                cursor.execute("""
                    INSERT OR REPLACE INTO daily_customers 
                    (date, customer_id, branch_id, customer_name, phone, email, gender, source_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    date_formatted,
                    item.get('ID') or item.get('CustomerID'),
                    item.get('BranchID'),
                    item.get('Name') or item.get('FullName'),
                    item.get('Phone'),
                    item.get('Email'),
                    item.get('Gender'),
                    item.get('SourceID')
                ))
                count += 1
            except Exception as e:
                pass
        
        total_count += count
        print(f"  📅 {date_formatted}: {count} records")
    
    conn.commit()
    conn.close()
    print(f"  ✅ Migrated {total_count} customer records")
    return total_count


def run_migration():
    """Chạy toàn bộ migration"""
    print("=" * 60)
    print("🚀 VTTech Data Migration")
    print("=" * 60)
    
    # Init database
    print("\n📊 Initializing database...")
    init_database()
    
    # Migrate master data
    results = {}
    results['branches'] = migrate_branches()
    results['services'] = migrate_services()
    results['service_groups'] = migrate_service_groups()
    results['employees'] = migrate_employees()
    results['users'] = migrate_users()
    results['customer_sources'] = migrate_customer_sources()
    results['cities'] = migrate_cities()
    
    # Migrate fact data
    results['daily_revenue'] = migrate_daily_revenue()
    results['daily_customers'] = migrate_daily_customers()
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 MIGRATION SUMMARY")
    print("=" * 60)
    
    total = 0
    for table, count in results.items():
        print(f"  {table}: {count} records")
        total += count
    
    print(f"\n  📦 Total: {total} records")
    print(f"  💾 Database: {DB_PATH}")
    print("=" * 60)
    print("✅ Migration completed!")
    
    return results


if __name__ == "__main__":
    run_migration()
