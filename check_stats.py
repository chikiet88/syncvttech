from database.db_repository import VTTechDB

def main():
    db = VTTechDB()
    db.connect()
    
    models = [
        "customer", "appointment", "treatment", "customerpayment", 
        "customercomplaint", "customerservicetab", "customertreatmentplan",
        "customerinstallment", "customercarehistory"
    ]
    
    print("\n--- Database Statistics ---")
    for model_name in models:
        model = getattr(db.prisma, model_name)
        count = model.count()
        print(f"{model_name:25}: {count}")
    
    db.disconnect()

if __name__ == "__main__":
    main()
