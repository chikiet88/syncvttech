from database.db_repository import db
from datetime import datetime

def check_customers():
    db.connect()
    # Check customers created today or recently
    today = datetime.now().strftime('%Y-%m-%d')
    print(f"Checking customers in DB...")
    
    total = db.prisma.customer.count()
    with_branch = db.prisma.customer.count(where={'branch_id': {'not': None}})
    without_branch = db.prisma.customer.count(where={'branch_id': None})
    
    print(f"Total customers: {total}")
    print(f"With branch_id: {with_branch}")
    print(f"Without branch_id: {without_branch}")
    
    # Show last 5 customers
    print("\nLast 5 customers:")
    last_5 = db.prisma.customer.find_many(
        take=5,
        order={'created_at': 'desc'},
        include={'branch': True}
    )
    for c in last_5:
        branch_name = c.branch.name if c.branch else "None"
        print(f"  - ID: {c.id}, Name: {c.name}, Branch: {branch_name} (ID: {c.branch_id})")

if __name__ == "__main__":
    check_customers()
