from database.db_repository import db
import logging

logging.basicConfig(level=logging.INFO)

db.connect()
print(f"Current customer count: {db.prisma.customer.count()}")

test_id = 999999
print(f"Upserting test customer {test_id}...")
db.prisma.customer.upsert(
    where={'id': test_id},
    data={
        'create': {'id': test_id, 'name': 'Test User'},
        'update': {'name': 'Test User Updated'}
    }
)

print(f"New customer count: {db.prisma.customer.count()}")
c = db.prisma.customer.find_unique(where={'id': test_id})
print(f"Found customer: {c.name if c else 'Not found'}")

db.prisma.customer.delete(where={'id': test_id})
print(f"Deleted test customer. Final count: {db.prisma.customer.count()}")
db.disconnect()
