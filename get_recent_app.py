import sqlite3

def test():
    conn = sqlite3.connect('database/vttech.db')
    cursor = conn.cursor()
    cursor.execute("SELECT customer_id, appointment_date FROM customer_appointments ORDER BY appointment_date DESC LIMIT 10;")
    rows = cursor.fetchall()
    print("Recent Customer IDs with appointments in SQLite:")
    for r in rows:
        print(f"ID: {r[0]}, Date: {r[1]}")
    conn.close()

if __name__ == "__main__":
    test()
