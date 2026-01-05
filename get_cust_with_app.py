import sqlite3

def test():
    conn = sqlite3.connect('database/vttech.db')
    cursor = conn.cursor()
    cursor.execute("SELECT customer_id FROM customer_appointments LIMIT 5;")
    rows = cursor.fetchall()
    print("Customer IDs with appointments in SQLite:")
    for r in rows:
        print(r[0])
    conn.close()

if __name__ == "__main__":
    test()
