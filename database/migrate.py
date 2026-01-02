#!/usr/bin/env python3
"""
VTTech Data Migration
Migrated to PostgreSQL via Prisma
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from db_repository import db as vttech_db

# Paths
BASE_DIR = Path(__file__).parent.parent
DATA_OUTPUT_DIR = BASE_DIR / "data_output"
DATA_DAILY_DIR = BASE_DIR / "data_daily"

def load_json(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return None

def migrate_master():
    print("\n📦 Migrating Master Data...")
    vttech_db.connect()
    
    # Branches
    data = load_json(DATA_OUTPUT_DIR / "branches.json")
    if data:
        count = vttech_db.upsert_branches(data)
        print(f"  ✅ branches: {count}")
        
    # Services
    data = load_json(DATA_OUTPUT_DIR / "services.json")
    if data:
        count = vttech_db.upsert_services(data)
        print(f"  ✅ services: {count}")
        
    # Employees
    data = load_json(DATA_OUTPUT_DIR / "employees.json")
    if data:
        count = vttech_db.upsert_employees(data)
        print(f"  ✅ employees: {count}")
        
    # Users
    data = load_json(DATA_OUTPUT_DIR / "users.json")
    if data:
        count = vttech_db.upsert_users(data)
        print(f"  ✅ users: {count}")

def migrate_revenue():
    print("\n📊 Migrating Daily Revenue...")
    vttech_db.connect()
    
    revenue_dir = DATA_DAILY_DIR / "revenue"
    if not revenue_dir.exists(): return
    
    total = 0
    for f in revenue_dir.glob("revenue_*.json"):
        date_str = f.stem.replace("revenue_", "")
        d = f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:8]}"
        data = load_json(f)
        if data:
            count = vttech_db.insert_daily_revenue_batch(d, data)
            total += count
            print(f"  ✅ {d}: {count} records")
    print(f"  📊 Total records: {total}")

def main():
    migrate_master()
    migrate_revenue()
    print("\n✅ Migration complete!")

if __name__ == '__main__':
    main()
