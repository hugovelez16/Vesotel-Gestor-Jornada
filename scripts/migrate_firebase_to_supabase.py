import firebase_admin
from firebase_admin import credentials, firestore
from supabase import create_client, Client
import os
from datetime import datetime

# CONFIGURATION
# ---------------------------------------------------------
# Path to your Firebase Service Account Key JSON file
FIREBASE_CREDENTIALS_PATH = "serviceAccountKey.json" 

# Supabase Project URL and Service Role Key (NOT Anon Key)
SUPABASE_URL = "https://rathgyhmfqcmcfzbtozb.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhdGhneWhtZnFjbWNmemJ0b3piIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDY5MDk1MCwiZXhwIjoyMDgwMjY2OTUwfQ.2HmIPcejMblPSGrK-IdeDsyURpw5-iRw3A9dnoRhj_A"

# App ID used in Firestore paths
APP_ID = "vesotel-app-v1" 
# ---------------------------------------------------------

def init_services():
    # Initialize Firebase
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_CREDENTIALS_PATH)
        firebase_admin.initialize_app(cred)
    db_firebase = firestore.client()

    # Initialize Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    return db_firebase, supabase

def migrate_users(db_firebase, supabase):
    print("Migrating Users...")
    # Note: This migrates user profiles from Firestore 'artifacts/{APP_ID}/public/data/users'
    # It does NOT migrate Firebase Auth users to Supabase Auth. 
    # You might need to export/import Auth users separately or handle it via Supabase Auth migration tools.
    
    users_ref = db_firebase.collection(f"artifacts/{APP_ID}/public/data/users")
    docs = users_ref.stream()
    
    count = 0
    for doc in docs:
        data = doc.to_dict()
        uid = doc.id
        
        user_payload = {
            "id": uid,
            "email": data.get("email"),
            "first_name": data.get("firstName"),
            "last_name": data.get("lastName"),
            # "created_at": data.get("createdAt") # Convert timestamp if needed
        }
        
        try:
            # Upsert to 'users' table (assuming you created a public.users table or use auth.users triggers)
            # Ideally, insert into a public 'profiles' table linked to auth.users
            response = supabase.table("profiles").upsert(user_payload).execute()
            count += 1
        except Exception as e:
            print(f"Error migrating user {uid}: {e}")
            
    print(f"Migrated {count} users.")

def migrate_settings(db_firebase, supabase):
    print("Migrating User Settings...")
    # Iterate over users to find their settings
    # Path: artifacts/{APP_ID}/users/{uid}/settings/config
    
    # We need a list of user UIDs first. 
    # In a real scenario, we might iterate known users or use a recursive function if structure allows.
    # Here, we'll fetch users from the public profile list again to get IDs.
    users_ref = db_firebase.collection(f"artifacts/{APP_ID}/public/data/users")
    user_docs = users_ref.stream()
    
    count = 0
    for user_doc in user_docs:
        uid = user_doc.id
        settings_ref = db_firebase.document(f"artifacts/{APP_ID}/users/{uid}/settings/config")
        settings_snap = settings_ref.get()
        
        if settings_snap.exists:
            data = settings_snap.to_dict()
            
            settings_payload = {
                "user_id": uid,
                "hourly_rate": data.get("hourlyRate"),
                "daily_rate": data.get("dailyRate"),
                "coordination_rate": data.get("coordinationRate"),
                "night_rate": data.get("nightRate"),
                "is_gross": data.get("isGross", False),
            }
            
            try:
                supabase.table("user_settings").upsert(settings_payload).execute()
                count += 1
            except Exception as e:
                print(f"Error migrating settings for {uid}: {e}")

    print(f"Migrated settings for {count} users.")

def migrate_work_logs(db_firebase, supabase):
    print("Migrating Work Logs...")
    
    users_ref = db_firebase.collection(f"artifacts/{APP_ID}/public/data/users")
    user_docs = users_ref.stream()
    
    total_logs = 0
    for user_doc in user_docs:
        uid = user_doc.id
        logs_ref = db_firebase.collection(f"artifacts/{APP_ID}/users/{uid}/work_logs")
        logs = logs_ref.stream()
        
        for log in logs:
            data = log.to_dict()
            log_id = log.id
            
            # Handle Dates
            # Firestore timestamps need conversion to ISO strings or Python datetime
            created_at = data.get("createdAt")
            if created_at:
                created_at = created_at.isoformat()
            
            log_payload = {
                "id": log_id,
                "user_id": uid,
                "type": data.get("type"),
                "date": data.get("date"),
                "start_date": data.get("startDate"),
                "end_date": data.get("endDate"),
                "start_time": data.get("startTime"),
                "end_time": data.get("endTime"),
                "duration": data.get("duration"),
                "amount": data.get("amount"),
                "description": data.get("description"),
                "has_coordination": data.get("hasCoordination", False),
                "has_night": data.get("hasNight", False),
                "created_at": created_at
            }
            
            try:
                supabase.table("work_logs").upsert(log_payload).execute()
                total_logs += 1
            except Exception as e:
                print(f"Error migrating log {log_id}: {e}")
                
    print(f"Migrated {total_logs} work logs.")

if __name__ == "__main__":
    print("Starting Migration...")
    try:
        db, sb = init_services()
        migrate_users(db, sb)
        migrate_settings(db, sb)
        migrate_work_logs(db, sb)
        print("Migration Completed Successfully.")
    except Exception as e:
        print(f"Migration Failed: {e}")
